"use client"

/**
 * Callout icons (F-15 Rev 2, plan Task 3.2).
 *
 * The artifact resolves a callout's icon from a CSS custom property
 * (`OBS-1.14.4-CALLOUT-009`); OmniDoc's design language uses **Tabler**
 * (`D-6`), so each type maps to a Tabler icon here. The mapping follows the
 * artifact's own table (`CALLOUT-001`): clipboard-list for summary, flame for
 * tip/important, check for success, help for question, alert-triangle for
 * warning, x for failure, zap for danger/error, bug, list for example, quote,
 * and the pencil the base `note` rule carries.
 *
 * These are the real Tabler components, not copied path data — the icon set
 * stays upgradeable with the dependency.
 */

import {
  IconAlertTriangle,
  IconBolt,
  IconBug,
  IconCheck,
  IconClipboardList,
  IconFlame,
  IconHelpCircle,
  IconInfoCircle,
  IconList,
  IconPencil,
  IconQuote,
  IconSquareCheck,
  IconX,
  type IconProps,
} from "@tabler/icons-react"
import type { ComponentType } from "react"

/** The icon names `CALLOUT_TYPES` refers to. */
export type CalloutIconName =
  | "clipboard-list"
  | "info"
  | "check-circle"
  | "flame"
  | "check"
  | "help-circle"
  | "alert-triangle"
  | "x"
  | "bolt"
  | "bug"
  | "list"
  | "quote"
  | "pencil"

/** Icon name → Tabler component. */
export const CALLOUT_ICONS: Record<CalloutIconName, ComponentType<IconProps>> = {
  "clipboard-list": IconClipboardList,
  info: IconInfoCircle,
  "check-circle": IconSquareCheck,
  flame: IconFlame,
  check: IconCheck,
  "help-circle": IconHelpCircle,
  "alert-triangle": IconAlertTriangle,
  x: IconX,
  bolt: IconBolt,
  bug: IconBug,
  list: IconList,
  quote: IconQuote,
  pencil: IconPencil,
}

/** The Tabler component for an icon name, falling back to the pencil. */
export function calloutIcon(name: string): ComponentType<IconProps> {
  return CALLOUT_ICONS[name as CalloutIconName] ?? IconPencil
}
