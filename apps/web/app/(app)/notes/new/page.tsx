import { ContentRegion, PageHeader } from "@omnidoc/ui";

export default function NewNotePage() {
  return (
    <ContentRegion>
      <PageHeader
        title="New note"
        description="The TipTap editor lands with F-04. A note is creatable with a title and body only — no folder or tag required first."
      />
    </ContentRegion>
  );
}
