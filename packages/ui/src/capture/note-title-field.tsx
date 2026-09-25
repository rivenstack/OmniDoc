import type { ChangeEvent } from "react";
import { Input } from "../components/input";
import { cn } from "../lib/utils";

export type NoteTitleFieldProps = {
  /** Must match the input's `id` so the label is associated. */
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Fires on blur/commit — the surface uses this to flush a pending save. */
  onCommit?: () => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Capture block — `NoteTitleField` (document-first, option A).
 *
 * The title is the page's own heading, so it is a borderless large field rather
 * than a boxed control: the note is the page, and a card around the title would
 * make the body look like a form field.
 *
 * Two things that are **not** visual choices:
 *
 * - The label is real and visually hidden, never dropped in favour of the
 *   placeholder. A placeholder vanishes the moment there is a value, so it
 *   cannot name the control (`ui-qa-checklist.md` §2.1) — and an empty note
 *   whose only name is "Untitled" leaves AT with nothing to announce.
 * - The value is controlled by the surface, because the title participates in
 *   the same save cycle as the body.
 */
export function NoteTitleField({
  id,
  value,
  onValueChange,
  onCommit,
  placeholder = "Untitled",
  label = "Note title",
  disabled,
  className,
}: NoteTitleFieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        data-slot="note-title"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.target.value)
        }
        onBlur={onCommit}
        // A title is one line in the document sense, but it must not clip: the
        // overflow behaviour is the same rule as any long unbroken string
        // (`ui-qa-checklist.md` §5.9, §6.3).
        className={cn(
          "h-auto rounded-none border-0 bg-transparent p-0 text-3xl font-medium tracking-tight shadow-none",
          // `dark:bg-input/30` from the primitive has to be named explicitly:
          // `bg-transparent` alone does not beat it in dark mode, and the title
          // would keep a visible box.
          "dark:bg-transparent",
          "placeholder:text-muted-foreground/60 focus-visible:border-0 focus-visible:ring-0",
          "break-words text-foreground",
        )}
      />
    </div>
  );
}
