import { redirect } from "next/navigation";

/**
 * App home. Notes is the shell's primary list, so `/` forwards there. (The
 * default unfiled home, Inbox, left the shell on 2026-10-12 — see
 * `apps/web/app/(app)/nav.ts`.) The shell lives in the `(app)` group layout.
 */
export default function AppHomePage() {
  redirect("/notes");
}
