import { describe, expect, it } from "vitest";
import { captureCommand, isActiveRoute, mobileNav, primaryNav } from "./nav";

/**
 * Shell nav structure — regression guards for the duplicated-capture defect.
 *
 * `nav.tsx` is the single description of the shell's IA, and the bug (a
 * "New note" nav entry *and* a dedicated capture control) was a structural one,
 * so it is asserted structurally rather than through a render.
 */
describe("shell nav structure", () => {
  it("keeps capture out of the nav lists", () => {
    // Capture is a control the shell renders (sidebar `newNoteAction` slot,
    // tab-bar centre), never a destination in the list. Listing it as well put
    // two identical "New note" controls in the expanded sidebar and two
    // indistinguishable pencil icons in the rail.
    expect(primaryNav.map((item) => item.id)).toEqual([
      "inbox",
      "notes",
      "search",
      "ask",
    ]);
    expect(mobileNav.map((item) => item.id)).toEqual(
      primaryNav.map((item) => item.id),
    );
  });

  it("never links a nav item at a route the app does not serve yet", () => {
    // The old capture entry pointed at `/notes/new`, which 404s until F-04
    // ships the editor.
    expect(primaryNav.map((item) => item.href)).not.toContain("/notes/new");
  });

  it("offers capture as a palette command instead of a nav destination", () => {
    expect(captureCommand.id).toBe("capture");
    expect(captureCommand.label).toBe("New note");
    // A command, not a link: the host supplies the handler (the same hook point
    // the chrome button calls), so there is one capture behaviour.
    expect("href" in captureCommand).toBe(false);
  });

  it("marks the current route without a physical-direction assumption", () => {
    expect(isActiveRoute("/notes", "/notes")).toBe(true);
    expect(isActiveRoute("/notes/42", "/notes")).toBe(true);
    expect(isActiveRoute("/notes-archive", "/notes")).toBe(false);
    expect(isActiveRoute("/", "/")).toBe(true);
  });
});
