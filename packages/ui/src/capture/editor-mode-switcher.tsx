"use client";

import { cn } from "../lib/utils";

export type EditorMode = "normal" | "markdown" | "text" | "reading";

export type EditorModeSwitcherProps = {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  className?: string;
};

const MODES: { id: EditorMode; label: string; tooltip: string }[] = [
  { id: "normal", label: "Normal", tooltip: "Visual rich text editor" },
  { id: "markdown", label: "Markdown", tooltip: "Obsidian-style live preview" },
  { id: "text", label: "Text", tooltip: "Raw markdown source (no preview)" },
  { id: "reading", label: "Reading", tooltip: "Read-only preview" },
];

/**
 * Accessible mode switcher for note editing surfaces.
 */
export function EditorModeSwitcher({
  mode,
  onModeChange,
  className,
}: EditorModeSwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Editor display mode"
      data-slot="editor-mode-switcher"
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium",
        className,
      )}
    >
      {MODES.map((item) => {
        const isSelected = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            title={item.tooltip}
            onClick={() => onModeChange(item.id)}
            className={cn(
              "rounded-md px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
