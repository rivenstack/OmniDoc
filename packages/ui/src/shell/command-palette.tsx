"use client";

import type { ReactNode } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "../components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/dialog";
import { cn } from "../lib/utils";

export type CommandPaletteAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  onSelect?: () => void;
};

export type CommandPaletteGroup = {
  heading: string;
  actions: CommandPaletteAction[];
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandPaletteGroup[];
  title?: string;
  description?: string;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
};

/**
 * Shell block — `CommandPalette`.
 *
 * `Cmd/Ctrl+K` palette composed from the copied-in `Command` primitive inside
 * a Base UI `Dialog`. Base UI owns the focus trap and restore; the hotkey and
 * the trigger element are owned by `useCommandPalette`. Groups are supplied by
 * the app so navigation stays in the app layer.
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  title = "Command palette",
  description = "Search destinations and actions.",
  placeholder = "Type a command or search…",
  emptyMessage = "No matching commands.",
  className,
}: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden rounded-xl! p-0 sm:max-w-lg",
          className,
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <Command
          label={title}
          className="rounded-xl! bg-popover"
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups.map((group, index) => (
              <div key={group.heading}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={group.heading}>
                  {group.actions.map((action) => (
                    <CommandItem
                      key={action.id}
                      value={action.label}
                      onSelect={() => {
                        onOpenChange(false);
                        action.onSelect?.();
                      }}
                    >
                      {action.icon}
                      <span className="truncate">{action.label}</span>
                      {action.shortcut && (
                        <CommandShortcut>{action.shortcut}</CommandShortcut>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
