import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Card` (shadcn v4 `base-nova`, adapted).
 *
 * Source: `shadcn` registry (Base UI variant). Adaptations:
 *
 * - `ring-border` + `shadow-od-2` — Mintlify's border-driven card: a whisper
 *   border plus a micro ambient shadow, not a heavy drop shadow.
 * - `--card-spacing` is 24px (Mintlify's card padding), and drives the card
 *   padding from one place.
 * - `CardTitle` uses the heading font role and 600 weight, and renders a
 *   real `<h3>` (upstream renders a `<div>`) so card titles are reachable
 *   through the document outline.
 *
 * Composition is full: `Card` › `CardHeader` (`CardTitle`, `CardDescription`,
 * `CardAction`) › `CardContent` › `CardFooter`. `size="sm"` tightens the
 * spacing for dense lists.
 *
 * Depth is hierarchical only — it must never be used to signal trust level.
 * When a card is clickable, render a real control inside it so keyboard and
 * screen-reader users get a genuine target; a `<div>` with `onClick` is not
 * acceptable.
 */
export function Card({
  className,
  size = "default",
  ...props
}: ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-border shadow-od-2 [--card-spacing:--spacing(6)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

export type CardTitleProps = ComponentProps<"h2"> & {
  /**
   * Heading level. Defaults to `h3`, which is right when the card sits inside a
   * page that already has a heading. A card that *is* the page — the sign-in
   * card — passes `1`, so the document outline starts at the visible title
   * instead of skipping from an `h1` down to an `h3`.
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

const CARD_TITLE_HEADINGS = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

export function CardTitle({ className, level = 3, ...props }: CardTitleProps) {
  const Heading = CARD_TITLE_HEADINGS[level];
  return (
    <Heading
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-semibold group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}
