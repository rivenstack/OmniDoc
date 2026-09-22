"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Search, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";
import { buttonVariants } from "../button";
import { Input } from "../input";
import { Spinner } from "../spinner";
import {
  PALETTE_CLOSE_LABEL,
  PALETTE_DESCRIPTION,
  PALETTE_EMPTY_COPY,
  PALETTE_INPUT_LABEL,
  PALETTE_LOADING_COPY,
  PALETTE_TITLE,
} from "./copy";
import type { CommandPaletteItem } from "./types";

/** Marker attribute so focus navigation never depends on DOM structure. */
const ITEM_ATTR = "data-palette-item";

const LIST_ID = "command-palette-results";

const paletteItemClassName = cn(
  "flex w-full flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-start outline-none",
  "text-od-body-sm text-popover-foreground",
  "hover:bg-accent hover:text-accent-foreground",
  "focus-visible:bg-accent focus-visible:text-accent-foreground",
);

/**
 * Layout & shell — `CommandPalette` (D-01 component inventory §1).
 *
 * Source: `shadcn (command → Base UI Dialog + Combobox)`. States: `closed ·
 * open · loading · empty · results`.
 *
 * ## Why Dialog + a plain results list, not `cmdk`
 *
 * The inventory names the shadcn `command` composition. shadcn's `command` is
 * built on `cmdk`, which is **not** a pinned dependency in ADR-0003. Adding it
 * would be a new component-base dependency introduced by an F-* slice — exactly
 * the kind of decision ADR-0003 says must be re-opened rather than assumed. So
 * this is the documented Base UI equivalent: `Dialog` supplies the modal
 * behaviour (focus trap, Escape, focus restore, scroll lock) and the palette
 * supplies search + a keyboard-complete results list. The dialog is the `open`
 * state; the results list is the `results`/`empty`/`loading` state.
 *
 * ## Accessibility contract
 *
 * - Focus **traps** inside while open (Base UI `modal`), `Escape` closes it, and
 *   focus returns to whatever was focused before it opened — the trigger
 *   (shell spec §7.4, a11y §2).
 * - The search field is the first tabbable element, so opening the palette puts
 *   the caret where the user expects it.
 * - `ArrowDown`/`ArrowUp` move between the field and the results; `Enter` on a
 *   result activates it. Every result is a real `<button>`/`<a>`, so pointer,
 *   keyboard, and screen-reader users get the same surface (a11y §1.1, §3).
 * - The result count is announced **once**, politely, from a status region — no
 *   per-keystroke chatter and no per-token streaming (a11y §1.4–1.5).
 * - RTL-readiness: the panel is centred with flex/grid logic and the scrim uses
 *   symmetric insets, so no inline-axis offset is hard-coded.
 *
 * ## Props, not data
 *
 * Items arrive as props. The component filters the list it was given and never
 * fetches, so it holds no fixture authority — S-03 owns the corpus (see the F-02
 * handoff).
 */
export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  /** Search in flight. Renders the `loading` state instead of results. */
  loading?: boolean;
  /** Controlled query. Omit to let the palette own the query state. */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Called when a result is chosen, in addition to the item's own handler. */
  onSelect?: (item: CommandPaletteItem) => void;
  /** Overrides the default "No matches." copy for the `empty` state. */
  emptyMessage?: ReactNode;
  className?: string;
};

export function CommandPalette({
  open,
  onOpenChange,
  items,
  loading = false,
  query,
  onQueryChange,
  onSelect,
  emptyMessage,
  className,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [internalQuery, setInternalQuery] = useState("");

  const isQueryControlled = query !== undefined;
  const activeQuery = isQueryControlled ? query : internalQuery;

  const handleQueryChange = (next: string) => {
    if (!isQueryControlled) setInternalQuery(next);
    onQueryChange?.(next);
  };

  // An uncontrolled palette must not reopen holding a stale query.
  useEffect(() => {
    if (!open && !isQueryControlled) setInternalQuery("");
  }, [open, isQueryControlled]);

  const normalizedQuery = activeQuery.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((item) => {
      const haystack = `${item.label} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const itemElements = () =>
    listRef.current
      ? Array.from(
          listRef.current.querySelectorAll<HTMLElement>(`[${ITEM_ATTR}]`),
        )
      : [];

  const focusItemAt = (index: number) => {
    const elements = itemElements();
    if (elements.length === 0) return;
    const clamped = Math.max(0, Math.min(index, elements.length - 1));
    elements[clamped]?.focus();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItemAt(0);
    }
  };

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    index: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItemAt(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index === 0) inputRef.current?.focus();
      else focusItemAt(index - 1);
    }
  };

  const activate = (item: CommandPaletteItem) => {
    item.onSelect?.();
    onSelect?.(item);
    onOpenChange(false);
  };

  const statusText = loading
    ? PALETTE_LOADING_COPY
    : `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        {/* D-01 defines no scrim/overlay token. This is the neutral-950
            primitive at 50% used purely as a scrim; it is recorded as a bounded
            gap for a future D-01 overlay token rather than invented as a role
            (inventory §13: components consume semantic tokens). */}
        <Dialog.Backdrop
          data-slot="command-palette-backdrop"
          className={cn(
            "fixed inset-0 z-50 bg-od-neutral-950/50",
            "transition-opacity duration-[var(--od-duration-fast)] ease-standard motion-reduce:transition-none",
            // Base UI animates only what its state attributes select. Without
            // these the `transition-opacity` above had no second value to move
            // to, so opacity stayed pinned at 1 and the scrim popped in and out.
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />

        {/* Flex-centred viewport: centring is done by layout, not by an inline
            transform, so nothing breaks if the locale direction changes. */}
        <Dialog.Viewport
          data-slot="command-palette-viewport"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[12vh]"
        >
          <Dialog.Popup
            data-slot="command-palette"
            initialFocus={inputRef}
            className={cn(
              "flex w-full max-w-[40rem] flex-col overflow-hidden rounded-lg",
              "border border-border bg-popover text-popover-foreground shadow-od-3",
              // Fade + a 2% settle. The reduced-motion static equivalent is
              // `motion-reduce:transition-none` (D-01 §6.1): the state styles
              // still apply, but the swap is instant instead of eased.
              "transition-[opacity,scale] duration-[var(--od-duration-fast)] ease-standard motion-reduce:transition-none",
              "data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0",
              className,
            )}
          >
            <Dialog.Title className="sr-only">{PALETTE_TITLE}</Dialog.Title>
            <Dialog.Description className="sr-only">
              {PALETTE_DESCRIPTION}
            </Dialog.Description>

            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search
                aria-hidden="true"
                className="size-4 shrink-0 text-od-text-tertiary"
              />
              <Input
                ref={inputRef}
                type="search"
                value={activeQuery}
                aria-label={PALETTE_INPUT_LABEL}
                aria-controls={LIST_ID}
                onChange={(event) => handleQueryChange(event.target.value)}
                onKeyDown={handleInputKeyDown}
                className="h-12 border-0 bg-transparent ps-0 pe-0 shadow-none focus-visible:outline-none"
              />
              <Dialog.Close
                aria-label={PALETTE_CLOSE_LABEL}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "size-8 shrink-0 rounded-md",
                )}
              >
                <X aria-hidden="true" className="size-4" />
              </Dialog.Close>
            </div>

            <div className="max-h-[60vh] min-h-0 overflow-y-auto p-1">
              {loading ? (
                <div
                  data-slot="command-palette-loading"
                  className="flex items-center gap-2 px-3 py-6 text-od-body-sm text-od-text-secondary"
                >
                  <Spinner size="sm" label={PALETTE_LOADING_COPY} />
                  <span>{PALETTE_LOADING_COPY}</span>
                </div>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <p
                  data-slot="command-palette-empty"
                  className="px-3 py-6 text-od-body-sm text-od-text-secondary"
                >
                  {emptyMessage ?? PALETTE_EMPTY_COPY}
                </p>
              ) : null}

              {!loading && filtered.length > 0 ? (
                <ul
                  id={LIST_ID}
                  ref={listRef}
                  data-slot="command-palette-results"
                  className="flex flex-col"
                >
                  {filtered.map((item, index) => {
                    const itemContent = (
                      <>
                        <bdi className="truncate font-medium">{item.label}</bdi>
                        {item.description ? (
                          <span className="truncate text-od-micro text-od-text-tertiary">
                            {item.description}
                          </span>
                        ) : null}
                      </>
                    );

                    // Results are real controls: a link when the item navigates
                    // (so middle-click / open-in-new-tab keep working) and a
                    // button otherwise.
                    return (
                      <li key={item.id}>
                        {item.href ? (
                          <a
                            data-palette-item=""
                            href={item.href}
                            onClick={() => activate(item)}
                            onKeyDown={(event) =>
                              handleItemKeyDown(event, index)
                            }
                            className={paletteItemClassName}
                          >
                            {itemContent}
                          </a>
                        ) : (
                          <button
                            data-palette-item=""
                            type="button"
                            onClick={() => activate(item)}
                            onKeyDown={(event) =>
                              handleItemKeyDown(event, index)
                            }
                            className={paletteItemClassName}
                          >
                            {itemContent}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {/* Announced once per change, politely. Deliberately not a live
                  region on the list itself, which would announce every item. */}
              <p role="status" aria-live="polite" className="sr-only">
                {statusText}
              </p>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
