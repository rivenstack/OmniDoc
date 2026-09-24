"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Shell wiring — route-change focus management (ui-qa-checklist §1.3).
 *
 * On client-side navigation, move focus to the new page's heading so keyboard
 * and screen-reader users are not left at `<body>`. The heading is
 * `tabIndex={-1}` (see `PageHeader`), so this adds no tab stop. The first
 * render is skipped: focus should not jump on initial load.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const heading = document.querySelector<HTMLElement>(
      "[data-slot='page-heading']",
    );
    const fallback = document.getElementById("content");
    (heading ?? fallback)?.focus();
  }, [pathname]);

  return null;
}
