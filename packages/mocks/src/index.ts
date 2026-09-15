// S-01a stub. The deterministic mock corpus (architecture.md section 9
// themes) is produced in S-03. Tagged scope:tooling so apps/web cannot
// depend on it by default (ADR-0002: web -> ui + contracts only);
// dev-time MSW consumption gets an explicit exception in S-03, not a
// silent widening.
export const mockCorpusVersion = "s-01a-stub";
