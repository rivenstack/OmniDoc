"use client";

import { Menu } from "@base-ui/react/menu";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { buttonVariants } from "../button";
import { THEME_OPTIONS, THEME_TOGGLE_LABEL } from "./copy";

const themeIcon = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

/**
 * Navigation & workspace — `ThemeToggle` (D-01 inventory §2).
 *
 * Source: `shadcn` (`DropdownMenu` → Base UI `Menu`). States: `light · dark ·
 * system`.
 *
 * The three options are `Menu.RadioItem`s inside a `Menu.RadioGroup`, so the
 * selected theme is exposed as `menuitemradio` + `aria-checked` rather than only
 * as a highlighted row. The accessible name ("Switch theme") is static while the
 * icon follows the theme — the name therefore cannot drift with the visual.
 *
 * Hydration: `next-themes` cannot know the resolved theme during SSR, so the
 * trigger renders the `system` icon until mounted. Rendering the resolved icon
 * before mount would produce a server/client mismatch; a brief neutral icon is
 * the correct trade.
 *
 * `Menu.Trigger` is rendered natively (no `render` prop) so Base UI keeps the
 * DOM ref it needs for positioning. All theming stays token-level — nothing here
 * branches on theme to change colour, only to choose an icon.
 */
export type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (mounted ? theme : "system") ?? "system";
  const CurrentIcon =
    themeIcon[current as keyof typeof themeIcon] ?? themeIcon.system;

  return (
    <Menu.Root>
      <Menu.Trigger
        nativeButton
        data-slot="theme-toggle"
        aria-label={THEME_TOGGLE_LABEL}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "rounded-md",
          className,
        )}
      >
        <CurrentIcon aria-hidden="true" className="size-4" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          align="end"
          sideOffset={6}
          className="z-50 outline-none"
        >
          <Menu.Popup
            data-slot="theme-toggle-popup"
            className={cn(
              "min-w-40 rounded-lg border border-border bg-popover p-1",
              "text-popover-foreground shadow-od-2 outline-none",
              // Anchored menus grow from the trigger: Base UI publishes the
              // computed origin as `--transform-origin`.
              "origin-[var(--transform-origin)]",
              "transition-[opacity,scale] duration-[var(--od-duration-fast)] ease-standard motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            )}
          >
            <Menu.RadioGroup
              value={current}
              onValueChange={(value) => setTheme(String(value))}
            >
              {THEME_OPTIONS.map((option) => {
                const Icon = themeIcon[option.value];
                return (
                  <Menu.RadioItem
                    key={option.value}
                    value={option.value}
                    data-slot="theme-toggle-option"
                    className={cn(
                      "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 outline-none",
                      "text-od-body-sm select-none",
                      "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {option.label}
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
