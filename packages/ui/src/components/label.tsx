"use client";

import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Label` (shadcn v4 `base-nova`).
 *
 * Source: `shadcn` registry. A native `<label>`; association happens through
 * `htmlFor`. Forms compose it through `Field` / `FieldLabel` rather than
 * laying out raw labels and controls.
 *
 * Required state is not drawn here: the control carries `required` /
 * `aria-required` so assistive tech reports it, and `FieldDescription` can
 * spell it out in text. A visual-only asterisk would be a second, weaker
 * source of truth.
 */
export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
