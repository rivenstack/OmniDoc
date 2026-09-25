import { describe, expect, it } from "vitest";

import {
  importStatusFromJob,
  importStatusLabel,
  importStatusMessage,
  indexIncompleteNotice,
  isIndexComplete,
} from "./import-status";

describe("wire to product status", () => {
  it("shows a running job as indexing", () => {
    expect(importStatusFromJob("running")).toBe("indexing");
  });

  it("passes the unambiguous wire values through", () => {
    expect(importStatusFromJob("pending")).toBe("pending");
    expect(importStatusFromJob("ready")).toBe("ready");
    expect(importStatusFromJob("partial")).toBe("partial");
    expect(importStatusFromJob("failed")).toBe("failed");
  });

  it("covers every status the contract can send", () => {
    const wire = ["pending", "running", "ready", "failed", "partial"] as const;

    for (const status of wire) {
      expect(importStatusMessage(importStatusFromJob(status))).not.toBe("");
    }
  });
});

describe("index completeness", () => {
  it("treats only ready as complete", () => {
    expect(isIndexComplete("ready")).toBe(true);
  });

  it("does not treat a partial index as complete", () => {
    // REC-02: indexing lag is a first-class state, not silent success.
    expect(isIndexComplete("partial")).toBe(false);
    expect(isIndexComplete("indexing")).toBe(false);
    expect(isIndexComplete("pending")).toBe(false);
    expect(isIndexComplete("failed")).toBe(false);
  });

  it("says nothing when every file is indexed", () => {
    expect(indexIncompleteNotice(["ready", "ready"])).toBeNull();
    expect(indexIncompleteNotice([])).toBeNull();
  });

  it("warns while a file is still indexing", () => {
    const notice = indexIncompleteNotice(["ready", "indexing"]);

    expect(notice).toMatch(/not everything is indexed/i);
    expect(notice).toMatch(/1 still indexing/);
    expect(notice).toMatch(/may miss content/i);
  });

  it("warns while a file is only queued", () => {
    expect(indexIncompleteNotice(["pending"])).toMatch(/1 still indexing/);
  });

  it("keeps partial and failed visible rather than folding them into ready", () => {
    const notice = indexIncompleteNotice(["partial", "failed", "ready"]);

    expect(notice).toMatch(/1 partly indexed/);
    expect(notice).toMatch(/1 failed/);
    expect(notice).not.toMatch(/still indexing/);
  });

  it("names every reason at once", () => {
    const notice = indexIncompleteNotice(["indexing", "partial", "failed"]);

    expect(notice).toMatch(/1 still indexing/);
    expect(notice).toMatch(/1 partly indexed/);
    expect(notice).toMatch(/1 failed/);
  });

  it("gives a failed file a label that is not a success word", () => {
    expect(importStatusLabel("failed")).toBe("Failed");
    expect(importStatusLabel("ready")).toBe("Ready");
    expect(importStatusMessage("failed")).toMatch(/not searchable/i);
  });
});
