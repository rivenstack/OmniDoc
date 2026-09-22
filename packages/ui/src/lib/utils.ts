import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Conditional class composition for copied-in shadcn/Base UI components.
 *
 * `clsx` handles conditional/array/object inputs; `tailwind-merge` collapses
 * conflicting Tailwind utilities so a consumer-supplied `className` always
 * wins over the component's defaults.
 *
 * ## Why the merge config is extended
 *
 * tailwind-merge ships knowledge of Tailwind's *default* scales only. The D-01
 * text scale is custom (`text-od-body-sm`, `text-od-micro`, …), so without this
 * config tailwind-merge classifies those as colour utilities and treats
 * `text-od-body-sm` + `text-od-text-secondary` as the **same** group: it keeps
 * the last one and silently drops the size. The component then renders at the
 * inherited body size instead of its role, with no build or test signal. Naming
 * the scale roles as a font-size group makes size and colour merge as the two
 * independent axes they are.
 *
 * Keep this list in step with the `--text-od-*` roles in
 * `src/styles/tokens.css` (D-01 §3.1).
 */
const OD_TEXT_SIZE_CLASSES = [
  "od-display",
  "od-h1",
  "od-h2",
  "od-h3",
  "od-body",
  "od-body-sm",
  "od-caption",
  "od-micro",
] as const;

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...OD_TEXT_SIZE_CLASSES] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
