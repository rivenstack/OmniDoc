"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UseCommandPaletteResult = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open programmatically and remember the element to restore focus to. */
  openPalette: () => void;
};

/**
 * Shell hook — command palette open state, `Cmd/Ctrl+K` hotkey, and focus
 * restore.
 *
 * Base UI `Dialog` owns the focus trap; this hook owns the global hotkey and
 * returns focus to the element that was focused when the palette opened (the
 * palette is keyboard-invoked, so there is no persistent trigger element) —
 * the F-02 a11y gate requires focus restore, not just Escape dismissal.
 */
export function useCommandPalette(): UseCommandPaletteResult {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const restoreFocus = useCallback(() => {
    const target = restoreRef.current;
    if (target && typeof target.focus === "function") {
      // Defer until Base UI has finished unmounting the popup.
      requestAnimationFrame(() => target.focus());
    }
  }, []);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        restoreFocus();
      }
    },
    [restoreFocus],
  );

  const openPalette = useCallback(() => {
    if (!openRef.current) {
      restoreRef.current =
        typeof document !== "undefined"
          ? (document.activeElement as HTMLElement | null)
          : null;
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => {
          if (!previous) {
            restoreRef.current =
              document.activeElement as HTMLElement | null;
          }
          return !previous;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, onOpenChange, openPalette };
}
