import type { Metadata } from "next";
import { appName } from "@omnidoc/contracts";
import { ContentRegion } from "@omnidoc/ui";
import { CaptureClient } from "../capture-client";

export const metadata: Metadata = {
  title: `New note — ${appName}`,
};

/**
 * New note (F-04).
 *
 * "New note" lands **directly in the editor** — `docs/design/system-ux.md` §1
 * makes capture possible without choosing a folder or tag first, so this route
 * has no intermediate step, no dialog, and no required metadata. A note is a
 * title and a body; nothing reaches the server until one of them has content.
 */
export default function NewNotePage() {
  return (
    <ContentRegion>
      <CaptureClient note={null} />
    </ContentRegion>
  );
}
