"use client";

import {
  DirectionProvider as BaseDirectionProvider,
  type TextDirection,
} from "@base-ui/react/direction-provider";
import type { ReactNode } from "react";

export type { TextDirection };

export type DirectionProviderProps = {
  /**
   * The runtime reading direction for Base UI primitives.
   *
   * Must come from the single locale source (`apps/web/app/locale.ts`) — never
   * from a component-local literal, a prop threaded from user content, or a
   * media/JS guess (D-01 §8; a11y §7.1).
   */
  direction: TextDirection;
  children: ReactNode;
};

/**
 * Foundations / primitives — `DirectionProvider` (inventory §3).
 *
 * Source: `shadcn` (`direction`, Base UI `DirectionProvider` 1.8.0).
 *
 * D-01 §8 / a11y §7.1 make this the **single runtime direction source** for
 * Base UI primitives. `lang`/`dir` on `<html>` remain the single DOM source and
 * are set from the same locale module by the root layout; this provider only
 * supplies the runtime value that overlay placement and direction-aware
 * positioning read.
 *
 * Only `ltr` is live. RTL locale support is **deferred, not closed**: this
 * component exists as readiness plumbing, and nothing may claim RTL support
 * while that gate is open (a11y §1.10).
 */
export function DirectionProvider({
  direction,
  children,
}: DirectionProviderProps) {
  return (
    <BaseDirectionProvider direction={direction}>
      {children}
    </BaseDirectionProvider>
  );
}
