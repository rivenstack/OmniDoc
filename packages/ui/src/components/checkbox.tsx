"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Checkbox` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry (Base UI `Checkbox`). Adaptations, all deliberate:
 *
 * - **`cn` import rewritten.** The registry emits `import { cn } from "cn"`,
 *   which would add a second `cn` package beside this project's own
 *   (`packages/ui/src/lib/utils.ts`). Rewritten on copy-in, so no `cn`
 *   dependency exists.
 * - **`rounded-[4px]` → `rounded-xs`.** Identical value (both 4px) expressed
 *   as a token step instead of an arbitrary literal.
 * - **Full-opacity focus and error rings.** Upstream `/50` and `/20` tints do
 *   not reach the 3:1 non-text contrast bar on white; same rule as `Input`
 *   and `Button`.
 *
 * - **`disabled:` → `data-disabled:`.** Base UI renders the checkbox as a
 *   `<span role="checkbox">`, not a `<button>`, so the upstream `disabled:`
 *   utilities can never match — `:disabled` does not apply to a `span`, and a
 *   disabled checkbox would have looked fully interactive. Base UI emits
 *   `data-disabled`, which the token layer already maps to a variant.
 *
 * States covered: unchecked · checked · focus · invalid · disabled.
 *
 * Indeterminate is **not** implemented. A half-checked box that cannot report
 * `aria-checked="mixed"` is worse than no checkbox, and nothing needs
 * tri-state yet; add it with the matching ARIA value when something does.
 *
 * The checked appearance is driven by Base UI's `data-checked` attribute
 * rather than a prop, so the visual state and the accessibility tree cannot
 * drift apart.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-xs border border-input transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive aria-invalid:aria-checked:border-primary dark:bg-input/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        {/* Decorative: the root carries the checked state for assistive tech. */}
        <IconCheck aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
