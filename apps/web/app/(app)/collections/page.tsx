import type { Metadata } from "next";
import { appName } from "@omnidoc/contracts";
import {
  Button,
  CollectionsUnavailable,
  ContentRegion,
  PageHeader,
} from "@omnidoc/ui";
import { NoteRowLink } from "../organize-links";

export const metadata: Metadata = {
  title: `Collections — ${appName}`,
};

/**
 * Collections — honest placeholder (F-05).
 *
 * `system-ux.md` §1 lists Collections as an optional light folders-or-tags
 * surface, but S-02 has no `collections`/`tags` operation and `Note` carries no
 * folder/tag field. The F-05 work ticket's soft-stop is explicit: *"build the
 * honest Collections placeholder, log the gap, and escalate the contract
 * change; do not fork a shape."* So there is no tree, no tag chips, and no
 * create action here — inventing a client-side model would be a second
 * authority for something the server has not agreed to store.
 *
 * The contract change is escalated to Commander; until it lands, capture stays
 * structure-free (`system-ux.md` §1) and Inbox and Notes show the same set.
 */
export default function CollectionsPage() {
  return (
    <ContentRegion>
      <PageHeader
        title="Collections"
        description="Optional light folders or tags. Not required to capture."
      />
      <CollectionsUnavailable>
        <Button variant="outline" render={<NoteRowLink href="/inbox" />}>
          Browse notes
        </Button>
      </CollectionsUnavailable>
    </ContentRegion>
  );
}
