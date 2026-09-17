import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  ASK_SSE_EVENT_NAMES,
  ASK_SUCCESS_OUTCOMES,
  appName,
} from "./index";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const openapiPath = join(repoRoot, "docs/api/openapi.yaml");
const askSsePath = join(repoRoot, "docs/api/ask-sse.md");

type JsonSchema = {
  $ref?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  enum?: unknown[];
  required?: string[];
  writeOnly?: boolean;
};

type OpenApiDoc = {
  openapi: string;
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, JsonSchema>;
  };
};

function loadOpenApi(): OpenApiDoc {
  return parseYaml(readFileSync(openapiPath, "utf8")) as OpenApiDoc;
}

function schemaName(ref: string): string {
  const prefix = "#/components/schemas/";
  if (!ref.startsWith(prefix)) {
    throw new Error(`Unsupported $ref: ${ref}`);
  }
  return ref.slice(prefix.length);
}

function resolve(doc: OpenApiDoc, schema: JsonSchema, seen = new Set<string>()): JsonSchema {
  if (!schema.$ref) {
    return schema;
  }
  const name = schemaName(schema.$ref);
  if (seen.has(name)) {
    return {};
  }
  seen.add(name);
  const target = doc.components.schemas[name];
  if (!target) {
    throw new Error(`Missing schema ${name}`);
  }
  return resolve(doc, target, seen);
}

function collectPropertyNames(
  doc: OpenApiDoc,
  schema: JsonSchema,
  names: Set<string>,
  seen = new Set<string>(),
): void {
  const resolved = resolve(doc, schema, seen);
  for (const key of Object.keys(resolved.properties ?? {})) {
    names.add(key);
    const property = resolved.properties?.[key];
    if (property) {
      collectPropertyNames(doc, property, names, new Set(seen));
    }
  }
  if (resolved.items) {
    collectPropertyNames(doc, resolved.items, names, new Set(seen));
  }
  if (resolved.additionalProperties && typeof resolved.additionalProperties === "object") {
    collectPropertyNames(doc, resolved.additionalProperties, names, new Set(seen));
  }
  for (const branch of [...(resolved.oneOf ?? []), ...(resolved.allOf ?? []), ...(resolved.anyOf ?? [])]) {
    collectPropertyNames(doc, branch, names, new Set(seen));
  }
}

const REQUIRED_PATHS = [
  "/actuator/health",
  "/api/v1/session",
  "/api/v1/workspaces",
  "/api/v1/workspaces/{workspaceId}/invites",
  "/api/v1/workspaces/{workspaceId}/notes",
  "/api/v1/notes/{noteId}",
  "/api/v1/notes/{noteId}/soft-delete",
  "/api/v1/notes/{noteId}/purge",
  "/api/v1/ingestion-jobs",
  "/api/v1/ingestion-jobs/{jobId}",
  "/api/v1/search/lexical",
  "/api/v1/search/hybrid",
  "/api/v1/ask",
  "/api/v1/vault",
  "/api/v1/vault/{vaultRecordId}",
  "/api/v1/vault/{vaultRecordId}/rotate",
  "/api/v1/vault/{vaultRecordId}/revoke",
  "/api/v1/vault/{vaultRecordId}/verify",
  "/api/v1/usage",
  "/api/v1/usage/limits",
  "/api/v1/runtime-mode",
  "/api/v1/exports/workspace",
  "/api/v1/exports/notes",
  "/api/v1/exports/{exportId}",
] as const;

const SECRET_PROPERTY_NAMES = new Set([
  "plaintext",
  "plaintextKey",
  "credential",
  "apiKey",
  "secret",
  "key",
  "password",
]);

const MONEY_PROPERTY_NAMES = new Set([
  "currency",
  "usd",
  "dollars",
  "billing",
  "invoice",
  "price",
  "charge",
]);

describe("@omnidoc/contracts", () => {
  const doc = loadOpenApi();
  const askSse = readFileSync(askSsePath, "utf8");

  it("keeps the appName export for the web scaffold boundary", () => {
    expect(appName).toBe("OmniDoc");
  });

  it("is OpenAPI 3.x and lists every required path", () => {
    expect(doc.openapi).toMatch(/^3\./);
    for (const path of REQUIRED_PATHS) {
      expect(doc.paths, path).toHaveProperty(path);
    }
  });

  it("covers identity, notes, ingestion, search, ask, vault, usage, mode, and export operations", () => {
    expect(Object.keys(doc.paths["/api/v1/session"] ?? {})).toEqual(
      expect.arrayContaining(["get", "post", "delete"]),
    );
    expect(doc.paths["/api/v1/ask"]).toHaveProperty("post");
    expect(doc.paths["/api/v1/runtime-mode"]).toHaveProperty("get");
    expect(doc.paths["/api/v1/runtime-mode"]).toHaveProperty("put");
  });

  it("keeps vault response schemas free of secret-bearing fields", () => {
    const vaultResponseSchemas = ["VaultMetadata", "VaultMetadataList", "VaultVerification"];
    for (const name of vaultResponseSchemas) {
      const names = new Set<string>();
      collectPropertyNames(doc, { $ref: `#/components/schemas/${name}` }, names);
      for (const secret of SECRET_PROPERTY_NAMES) {
        expect(names, `${name} must not expose ${secret}`).not.toContain(secret);
      }
    }
  });

  it("marks vault request credentials write-only", () => {
    const store = doc.components.schemas.StoreVaultRequest;
    const rotate = doc.components.schemas.RotateVaultRequest;
    expect(store.properties?.plaintextKey?.writeOnly).toBe(true);
    expect(rotate.properties?.plaintextKey?.writeOnly).toBe(true);
  });

  it("keeps Ask success outcomes on Answer, not ErrorBody", () => {
    const errorCodes = new Set(doc.components.schemas.ErrorCode.enum ?? []);
    const outcomes = doc.components.schemas.AskOutcome.enum ?? [];
    expect(outcomes).toEqual([...ASK_SUCCESS_OUTCOMES]);
    expect(doc.components.schemas.Answer.required).toEqual(
      expect.arrayContaining(["outcome", "text", "citations"]),
    );
    expect(doc.components.schemas.ErrorBody.required).toEqual(
      expect.arrayContaining(["code", "detail"]),
    );
    expect(doc.components.schemas.ErrorBody.properties).not.toHaveProperty("outcome");
    expect(doc.components.schemas.Answer.properties).not.toHaveProperty("code");
    for (const exclusive of ["supported", "no_supported_answer", "refused_policy"] as const) {
      expect(errorCodes.has(exclusive)).toBe(false);
    }
  });

  it("pins runtime mode to the three accepted values", () => {
    expect(doc.components.schemas.RuntimeMode.enum).toEqual([
      "mock",
      "operator_free_tier",
      "customer_key",
    ]);
  });

  it("allows usage to be unavailable without inventing billing fields", () => {
    const usageNames = new Set<string>();
    collectPropertyNames(doc, { $ref: "#/components/schemas/UsageSnapshot" }, usageNames);
    collectPropertyNames(doc, { $ref: "#/components/schemas/RemainingLimits" }, usageNames);
    expect(usageNames.has("status")).toBe(true);
    expect(doc.components.schemas.UsageUnavailable.properties?.status?.enum).toEqual([
      "unavailable",
    ]);
    for (const money of MONEY_PROPERTY_NAMES) {
      expect(usageNames).not.toContain(money);
    }
  });

  it("aligns SSE event names with the companion spec", () => {
    expect([...ASK_SSE_EVENT_NAMES]).toEqual([
      "generating",
      "claim",
      "completed",
      "truncated",
      "error",
    ]);
    for (const name of ASK_SSE_EVENT_NAMES) {
      expect(askSse).toContain(`event: ${name}`);
    }
    expect(askSse).toContain("Last-Event-ID");
  });

  it("requires citations to identify note, version, chunk, anchor, and preview", () => {
    expect(doc.components.schemas.Citation.required).toEqual(
      expect.arrayContaining(["noteId", "versionId", "chunkId", "anchor", "preview"]),
    );
    expect(doc.components.schemas.Citation.properties).toHaveProperty("updatedAt");
    expect(doc.components.schemas.Citation.properties).toHaveProperty("corpusOwnership");
  });

  it("declares Ask as an SSE success stream", () => {
    const askPost = doc.paths["/api/v1/ask"]?.post as {
      responses?: { "200"?: { content?: Record<string, unknown> } };
    };
    expect(askPost.responses?.["200"]?.content).toHaveProperty("text/event-stream");
  });
});
