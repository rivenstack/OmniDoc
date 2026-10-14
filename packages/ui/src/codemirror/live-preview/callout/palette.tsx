"use client";

/**
 * The "Other…" callout-type picker (F-15 Rev 2, plan Task 3.2).
 *
 * `OBS-1.14.4-CALLOUT-005` says the "Other…" item opens a picker whose items are
 * the alias list. The artifact uses its own command/quick-switcher UI; OmniDoc
 * adapts that to the project's **command palette** (`CommandDialog` + `cmdk`),
 * so the full type list is searchable — which is the point of the item.
 *
 * The list is the base `note` type plus the 13 canonical types (`-001`).
 * `important` is included as canonical, following the artifact rather than the
 * help page (which calls it a `tip` alias).
 */

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../components/command";
import { calloutIcon } from "./icons";
import { defaultCalloutTitle } from "./parse";
import { CALLOUT_TYPES, NOTE_CALLOUT_TYPE } from "./types";

/** The types the palette lists, in the help page's order. */
export const CALLOUT_PALETTE_TYPES: readonly string[] = [
  NOTE_CALLOUT_TYPE.id,
  "summary",
  "info",
  "todo",
  "tip",
  "important",
  // Everything not named above, in canonical order.
  ...CALLOUT_TYPES.map((spec) => spec.id).filter(
    (id) => !["summary", "info", "todo", "tip", "important"].includes(id),
  ),
];

export type CalloutTypePaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen type id; the caller writes it to the document. */
  onPick: (type: string) => void;
};

/** The searchable "all callout types" palette. */
export function CalloutTypePalette({
  open,
  onOpenChange,
  onPick,
}: CalloutTypePaletteProps) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Callout type"
      description="Search for a callout type"
    >
      <Command>
        <CommandInput placeholder="Search callout types…" />
        <CommandList>
          <CommandEmpty>No callout type found.</CommandEmpty>
          {CALLOUT_PALETTE_TYPES.map((type) => {
            const spec =
              CALLOUT_TYPES.find((entry) => entry.id === type) ??
              NOTE_CALLOUT_TYPE;
            const Icon = calloutIcon(spec.icon);
            return (
              <CommandItem
                key={type}
                value={type}
                onSelect={() => {
                  onPick(type);
                  onOpenChange(false);
                }}
              >
                <Icon className="size-4" aria-hidden />
                {defaultCalloutTitle(type)}
              </CommandItem>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
