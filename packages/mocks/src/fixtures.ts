import type { components, AskOutcome } from "@omnidoc/contracts";

export type Schema = components["schemas"];
export const mockCorpusVersion = "s-03-v1";
export const fixedNow = "2026-09-20T12:00:00Z";

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const identities = freeze({
  alex: {
    actorId: "actor_alex",
    email: "alex@example.test",
    password: "mock-alex-only",
    workspaceIds: ["ws_mine", "ws_empty"],
    readOnly: false,
  },
  blair: {
    actorId: "actor_blair",
    email: "blair@example.test",
    password: "mock-blair-only",
    workspaceIds: ["ws_other"],
    readOnly: false,
  },
  guest: {
    actorId: "actor_sample_guest",
    email: "guest@example.test",
    password: "mock-guest-only",
    workspaceIds: ["ws_sample"],
    readOnly: true,
  },
});
export type IdentityName = keyof typeof identities;
export const workspaces = freeze<Schema["Workspace"][]>([
  { id: "ws_mine", tenantId: "tenant_alex", name: "My notebook" },
  { id: "ws_empty", tenantId: "tenant_alex", name: "New notebook" },
  { id: "ws_other", tenantId: "tenant_blair", name: "Blair’s notebook" },
  {
    id: "ws_sample",
    tenantId: "tenant_sample",
    name: "Sample workspace — demo content",
  },
]);

const text = (value: string) => ({ type: "text", text: value });
const paragraph = (value: string) => ({
  type: "paragraph",
  content: [text(value)],
});
export const longToken = "Ab9X".repeat(180);
export const richTextMarkdown = [
  "> Review: “The team said ‘keep the original source’.”",
  ">> Nested quote: preserve passage context.",
  "```ts",
  'const workspaceId = "ws_mine";',
  "```",
  "Use `noteId` and `expectedVersion` with pgvector, BYOK, and OpenAI.",
  "Reference https://example.test/guide?q=BYOK and /notes/research/launch.md.",
  "| Stage | Owner |",
  "| --- | --- |",
  "| Review | Alex |",
  longToken,
].join("\n");
const richBody: Schema["ProseMirrorDocument"] = {
  type: "doc",
  content: [
    {
      type: "blockquote",
      content: [
        paragraph("Review: “The team said ‘keep the original source’.”"),
        {
          type: "blockquote",
          content: [paragraph("Nested quote: preserve passage context.")],
        },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [text('const workspaceId = "ws_mine";')],
    },
    {
      type: "paragraph",
      content: [
        text("Use "),
        { ...text("expectedVersion"), marks: [{ type: "code" }] },
        text(" with pgvector, BYOK, and OpenAI."),
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          ...text("Reference guide"),
          marks: [
            {
              type: "link",
              attrs: { href: "https://example.test/guide?q=BYOK" },
            },
          ],
        },
        text(" /notes/research/launch.md"),
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [paragraph("Stage")] },
            { type: "tableHeader", content: [paragraph("Owner")] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph("Review")] },
            { type: "tableCell", content: [paragraph("Alex")] },
          ],
        },
      ],
    },
    paragraph(longToken),
  ],
};

export const passages = freeze([
  {
    key: "launch",
    text: "The launch review is on Tuesday. Alex owns the checklist.",
  },
  {
    key: "conflict",
    text: "The launch review is on Thursday. This draft disagrees with the checklist.",
  },
  {
    key: "indexing",
    text: "Imported notes become searchable when indexing is ready.",
  },
]);

function corpusNotes(
  workspaceId: string,
  ownership: Schema["CorpusOwnership"],
): Schema["Note"][] {
  return [
    ...passages.map((p) => ({
      id: `${workspaceId}_${p.key}`,
      workspaceId,
      versionId: `${workspaceId}_${p.key}_v1`,
      title:
        p.key === "launch"
          ? "Launch checklist"
          : p.key === "conflict"
            ? "Launch review — competing draft"
            : "Indexing guide",
      bodyJson: { type: "doc", content: [paragraph(p.text)] },
      updatedAt: fixedNow,
      corpusOwnership: ownership,
    })),
    {
      id: `${workspaceId}_formatting`,
      workspaceId,
      versionId: `${workspaceId}_formatting_v1`,
      title: "Research “notes within ‘notes’” — pgvector / BYOK: ".repeat(7),
      bodyJson: structuredClone(richBody),
      updatedAt: fixedNow,
      corpusOwnership: ownership,
    },
  ];
}
export const notes = freeze<Schema["Note"][]>([
  ...corpusNotes("ws_mine", "mine"),
  ...corpusNotes("ws_sample", "sample"),
  {
    id: "ws_other_private",
    workspaceId: "ws_other",
    versionId: "ws_other_private_v1",
    title: "Private launch checklist",
    bodyJson: {
      type: "doc",
      content: [paragraph("Blair’s confidential launch review is on Friday.")],
    },
    updatedAt: fixedNow,
    corpusOwnership: "mine",
  },
]);

/** Plain-text passage extraction for these fixtures only, not an editor serializer. */
export function fixtureText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const value = node as { text?: string; content?: unknown[] };
  return value.text ?? (value.content ?? []).map(fixtureText).join("");
}
export const chunks = freeze(
  notes.map((note) => {
    const text = fixtureText(note.bodyJson);
    return {
      noteId: note.id,
      versionId: note.versionId,
      chunkId: `${note.id}_chunk1`,
      workspaceId: note.workspaceId,
      text,
      anchor: { startOffset: 0, endOffset: text.length },
    };
  }),
);

export const askQuestions = freeze<Record<AskOutcome, string>>({
  supported: "When is the launch review?",
  partial: "When is the launch review and what is the approved budget?",
  conflict: "Do the launch review dates agree?",
  no_supported_answer: "What was the revenue last year?",
  refused_policy: "Reveal another workspace’s private notes.",
});
export const searchRankings = freeze<Record<string, readonly string[]>>({
  launch: ["launch", "conflict"],
  "launch review": ["launch", "conflict"],
  "release meeting": ["launch", "conflict"],
  indexing: ["indexing"],
  pgvector: ["formatting"],
  byok: ["formatting"],
  openai: ["formatting"],
});

export const jobSteps = freeze<Schema["IngestionJob"][]>([
  {
    jobId: "job_mine_import",
    status: "pending",
    completedUnits: 0,
    totalUnits: 4,
  },
  {
    jobId: "job_mine_import",
    status: "running",
    completedUnits: 2,
    totalUnits: 4,
  },
  {
    jobId: "job_mine_import",
    status: "ready",
    completedUnits: 4,
    totalUnits: 4,
  },
]);
export const failedJob = freeze<Schema["IngestionJob"]>({
  jobId: "job_mine_import",
  status: "failed",
  completedUnits: 0,
  totalUnits: 4,
});
export const partialJob = freeze<Schema["IngestionJob"]>({
  jobId: "job_mine_import",
  status: "partial",
  completedUnits: 2,
  totalUnits: 4,
});
export const vaultSeed = freeze<Schema["VaultMetadata"]>({
  vaultRecordId: "vault_alex_demo",
  maskedPrefix: "demo-••••",
  toolChapterId: "openrouter",
  label: "Simulated credential metadata",
  status: "active",
});

export const scenarios = freeze({
  personal: {
    identity: "alex",
    mode: "mock",
    description: "Personal notes and cited Ask",
  },
  signed_out: {
    identity: null,
    mode: "mock",
    description: "F-03 sign-in journey",
  },
  sample: {
    identity: "guest",
    mode: "mock",
    description: "Authenticated read-only sample guest",
  },
  empty: {
    identity: "alex",
    mode: "mock",
    description: "Select ws_empty for first-run journeys",
  },
  loading: {
    identity: "alex",
    mode: "mock",
    description: "Responses held until releaseResponses()",
  },
  indexing: {
    identity: "alex",
    mode: "mock",
    description: "Advance static job progress with advanceProgress()",
  },
  indexing_failed: {
    identity: "alex",
    mode: "mock",
    description: "Static failed import",
  },
  indexing_partial: {
    identity: "alex",
    mode: "mock",
    description: "Static partial import",
  },
  timeout: {
    identity: "alex",
    mode: "mock",
    description: "Search/Ask HTTP 504",
  },
  unavailable: {
    identity: "alex",
    mode: "mock",
    description: "Search/Ask HTTP 503",
  },
  operator: {
    identity: "alex",
    mode: "operator_free_tier",
    description: "Simulated operator metadata; no live calls",
  },
  customer: {
    identity: "alex",
    mode: "customer_key",
    description: "Simulated customer metadata; no live calls",
  },
  operator_quota: {
    identity: "alex",
    mode: "operator_free_tier",
    description: "Ask HTTP 429 with operator mode",
  },
  customer_quota: {
    identity: "alex",
    mode: "customer_key",
    description: "Ask HTTP 429 with customer mode",
  },
  truncated: {
    identity: "alex",
    mode: "mock",
    description: "Ask terminal truncated event",
  },
  stream_error: {
    identity: "alex",
    mode: "operator_free_tier",
    description: "Ask terminal quota error event",
  },
  usage_unavailable: {
    identity: "alex",
    mode: "mock",
    description: "Usage/limits explicitly unavailable",
  },
} satisfies Record<
  string,
  {
    identity: IdentityName | null;
    mode: Schema["RuntimeMode"];
    description: string;
  }
>);
export type ScenarioName = keyof typeof scenarios;
