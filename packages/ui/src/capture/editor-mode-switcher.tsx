"use client";

import {
  IconChevronDown,
  IconCode,
  IconMarkdown,
  IconPencil,
  type Icon,
} from "@tabler/icons-react";
import { Button } from "../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { cn } from "../lib/utils";

export type EditorMode = "normal" | "markdown" | "text";

export type EditorModeSwitcherProps = {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  className?: string;
};

const MODES: ReadonlyArray<{
  id: EditorMode;
  label: string;
  icon: Icon;
}> = [
  { id: "normal", label: "Normal", icon: IconPencil },
  { id: "markdown", label: "Markdown", icon: IconMarkdown },
  { id: "text", label: "Text", icon: IconCode },
];

/**
 * Capture block — `EditorModeSwitcher`.
 *
 * One control, not four: a labelled icon button showing the current mode that
 * opens a menu of the editing modes. The radio group in the menu keeps the
 * selection semantics (`menuitemradio` + `aria-checked`), so the current mode
 * is still announced rather than conveyed by styling alone.
 *
 * Viewing is not a mode — every mode renders live, and "no editing" is the
 * separate lock control on the capture surface.
 */
export function EditorModeSwitcher({
  mode,
  onModeChange,
  className,
}: EditorModeSwitcherProps) {
  const current = MODES.find((item) => item.id === mode) ?? MODES[0];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Editor mode: ${current.label}`}
            className={cn(
              "gap-1.5 text-muted-foreground data-popup-open:text-foreground",
              className,
            )}
          />
        }
      >
        <CurrentIcon aria-hidden="true" className="size-4" />
        {current.label}
        <IconChevronDown aria-hidden="true" className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as EditorMode)}
        >
          {MODES.map((item) => {
            const ModeIcon = item.icon;
            return (
              <DropdownMenuRadioItem
                key={item.id}
                value={item.id}
                // Base UI radio items default to keeping the menu open after a
                // pick. For a mode picker the pick *is* the whole interaction,
                // so the menu must dismiss like a regular menu item.
                closeOnClick
              >
                <ModeIcon aria-hidden="true" className="size-4" />
                {item.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
