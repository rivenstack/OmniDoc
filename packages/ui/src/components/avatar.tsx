import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Foundations / primitives — `Avatar` (D-01 component inventory §3).
 *
 * Source: `shadcn` on Base UI `Avatar` 1.8.0. States covered: `image ·
 * initials · fallback`.
 *
 * First needed by F-02 (`WorkspaceSwitcherItem`, `MemberRow`); added here rather
 * than duplicated privately in two shell files, per the copy-in path documented
 * in `components/index.ts`.
 *
 * Accessibility: the avatar is **decorative chrome** for a name that is always
 * rendered as text next to it, so the root is `aria-hidden` unless the caller
 * supplies an `label`. A picture of a workspace is not an accessible name for a
 * control (a11y §1.3) — the control owns its own name.
 *
 * Initials are derived from user-supplied names, so the text node is wrapped in
 * `<bdi>`: UGC adjacent to chassis punctuation must not be re-ordered
 * (a11y §7.3).
 */
export type AvatarProps = Omit<
  ComponentProps<typeof BaseAvatar.Root>,
  "className" | "children"
> & {
  /** Image source. Omitted here — the S-02 contract carries names only. */
  src?: string;
  /** Full display name; initials are derived from it. */
  name?: string;
  /** Shown when there is no name at all. */
  fallback?: ReactNode;
  /** Accessible name. When set, the avatar stops being decorative. */
  label?: string;
  className?: string;
};

/** Deterministic initials: first + last token, max two glyphs. */
export function initialsOf(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function Avatar({
  src,
  name,
  fallback,
  label,
  className,
  ...props
}: AvatarProps) {
  const initials = initialsOf(name);

  return (
    <BaseAvatar.Root
      data-slot="avatar"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-muted text-od-micro font-medium text-muted-foreground",
        className,
      )}
      {...props}
    >
      {src ? (
        <BaseAvatar.Image src={src} alt="" className="size-full object-cover" />
      ) : null}
      <BaseAvatar.Fallback>
        <bdi className="od-isolate">{initials || fallback || "?"}</bdi>
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
