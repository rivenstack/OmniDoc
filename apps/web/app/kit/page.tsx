import type { Metadata } from "next";
import { KitGallery } from "./kit-gallery";

export const metadata: Metadata = {
  title: "UI kit — OmniDoc",
  description: "Stock shadcn primitives. Not a product screen.",
};

export default function KitPage() {
  return (
    <main>
      <KitGallery />
    </main>
  );
}
