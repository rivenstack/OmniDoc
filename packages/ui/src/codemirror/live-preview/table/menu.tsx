"use client";

/**
 * The table cell context menu (F-15 Task 3.3 Rev 2, plan Task D.3).
 *
 * `OBS-1.14.4-MENU-002` is a **separate, `@user`-directed** menu for a rendered
 * table cell (plan §4.6, S4 capture 2026-10-16; recorded as directed, never as a
 * parity claim). It is not the general editor menu: it exists **only** for a
 * right-click that lands in a cell, which is why the trigger is the `<table>`
 * itself and why the grid declines to intercept every other right-click.
 *
 * ## The project component, not a hand-rolled menu
 *
 * This is the project's `ContextMenu` (Task 3.2, Base UI's own `ContextMenu`
 * primitive) — the same component the callout uses. That gives the menu its
 * pointer anchoring, submenu hover/focus behaviour, keyboard navigation and the
 * portalled popup; the S4 *look* is the shared dropdown shell's.
 *
 * ## Sections come from `menu-model.ts`
 *
 * The array is built by the pure `menuSections()` (the **Task 6.3 seam**), so
 * this file only maps it to elements. The separators *inside* a submenu are the
 * one presentation detail kept here: the pure array stays a flat item list, and
 * the renderer groups ids by verb (add / move / align / modify) the way the S4
 * capture does.
 *
 * ## Activation resolves against the live model
 *
 * A right-click can leave uncommitted text in a cell, and a rebuild may replace
 * the grid while the menu is open. So the anchor is captured **at open time**
 * and every activation passes it through `clampCellRef` against the model the
 * grid collected *now* (the Task 3.2 hardening lesson). `run` is the grid's own
 * executor, so the command acts on the collected model and the widget's one
 * write pipeline — no menu-specific mutation path exists.
 *
 * ## Focus
 *
 * Opening the menu moves focus into the portal, which the grid must not read as
 * "the user left the table" (it would commit and rebuild the table under the
 * open menu). The popup therefore carries `data-table-menu`, and the grid
 * ignores focus moves into it. On close, the grid decides where focus goes: a
 * command's `StructureResult.focus` wins; a dismissed menu returns focus to the
 * anchor cell.
 */

import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumns,
  IconCopy,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconSortAscending,
  IconSortDescending,
  IconTableOptions,
  IconTrash,
} from "@tabler/icons-react";
import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../../../components/context-menu";
import type { TableCommandRun } from "./grid";
import type { TableCellRef, TableModel } from "./model";
import {
  menuSections,
  runMenuCommand,
  type TableMenuCommandId,
  type TableMenuItemSpec,
  type TableMenuSection,
} from "./menu-model";
import { clampCellRef } from "./selection";

/** A Tabler icon component (all icons in this file share the type). */
type TableMenuIcon = typeof IconTableOptions;

/** One small icon per command (plan §4.6; Tabler, `D-6`). */
const MENU_ICONS: Record<TableMenuCommandId, TableMenuIcon> = {
  "row.add-above": IconRowInsertTop,
  "row.add-below": IconRowInsertBottom,
  "row.move-up": IconArrowUp,
  "row.move-down": IconArrowDown,
  "row.duplicate": IconCopy,
  "row.delete": IconTrash,
  "column.add-left": IconColumnInsertLeft,
  "column.add-right": IconColumnInsertRight,
  "column.move-left": IconArrowLeft,
  "column.move-right": IconArrowRight,
  "column.align-left": IconAlignLeft,
  "column.align-center": IconAlignCenter,
  "column.align-right": IconAlignRight,
  "column.duplicate": IconCopy,
  "column.delete": IconTrash,
  "sort.asc": IconSortAscending,
  "sort.desc": IconSortDescending,
};

/** The radio value an alignment item carries (`left` / `center` / `right`). */
function alignmentValue(id: TableMenuCommandId): string {
  return id.replace("column.align-", "");
}

/**
 * Which visual group an item belongs to inside its submenu.
 *
 * S4 separates add / move / align / modify; duplicate and delete are one
 * "modify" group. The grouping is derived from the id, so it cannot drift when
 * an item is removed for being unavailable (`Move row up` on the first row).
 */
function itemGroup(id: TableMenuCommandId): string {
  const verb = id.split(".")[1]?.split("-")[0] ?? "";
  if (verb === "duplicate" || verb === "delete") return "modify";
  return verb;
}

/** The submenu's items, in order, split into their separator-separated groups. */
function groupedItems(
  items: readonly TableMenuItemSpec[],
): { key: string; items: TableMenuItemSpec[] }[] {
  const groups: { key: string; items: TableMenuItemSpec[] }[] = [];
  for (const item of items) {
    const key = itemGroup(item.id);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

export type TableContextMenuProps = {
  /** The gate's model — used for availability and the alignment check. */
  readonly model: TableModel;
  /**
   * The anchor cell captured when the menu opened, or `null` before any
   * right-click. Nothing is rendered for the popup until an anchor exists.
   */
  readonly cell: TableCellRef | null;
  /** A locked note renders the table with no trigger and no menu at all. */
  readonly editable: boolean;
  /** The grid's command executor (collected model + one write pipeline). */
  readonly run: TableCommandRun;
  /**
   * The menu closed. `commandRan` tells the grid whether a command already
   * named the focus target, so only a dismissed menu returns focus to the
   * anchor (plan D.3 focus rules).
   */
  readonly onClose?: (commandRan: boolean) => void;
  /** The table's `<thead>`/`<tbody>` — the trigger element is the table. */
  readonly children: React.ReactNode;
};

/**
 * The table's context-menu island.
 *
 * The trigger is the `<table>` itself (Base UI merges the trigger props onto the
 * `render` element and keeps the children passed here), so a right-click on any
 * cell opens the menu at the pointer without a wrapper element. A locked note
 * renders a bare table: no trigger, no portal, no commands.
 */
export function TableContextMenu({
  model,
  cell,
  editable,
  run,
  onClose,
  children,
}: TableContextMenuProps) {
  const commandRan = React.useRef(false);
  /**
   * The anchor captured at open time. A render can happen while the menu is
   * open (the grid re-renders for hover/drag state), and activation must use the
   * cell the user right-clicked, not whatever a later render passed down.
   */
  const anchorRef = React.useRef<TableCellRef | null>(null);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        commandRan.current = false;
        anchorRef.current = cell;
        return;
      }
      onClose?.(commandRan.current);
    },
    [cell, onClose],
  );

  const activate = React.useCallback(
    (id: TableMenuCommandId) => {
      const anchor = anchorRef.current ?? cell;
      if (!anchor) return;
      commandRan.current = true;
      // Run the command **after** the menu has closed. Base UI focuses the menu
      // item/trigger as part of closing, and a synchronous command's own focus
      // restore (the structure result's target, applied by the widget's write
      // pipeline) is then overwritten — focus fell to `body` instead of the new
      // header (probed 2026-10-25). The resolver still runs the command against
      // the model the grid collects at that moment, and clamps the anchor
      // against it, so a table that shrank under the open menu is safe.
      setTimeout(() => {
        run((live) => runMenuCommand(id, live, clampCellRef(anchor, live)));
      }, 0);
    },
    [cell, run],
  );

  if (!editable) {
    return <table className="cm-live-table">{children}</table>;
  }

  const anchor = clampCellRef(
    anchorRef.current ?? cell ?? { row: 0, col: 0 },
    model,
  );
  const alignment = model.alignments[anchor.col] ?? "left";
  const sections = menuSections(model, anchor);

  const menuItem = (spec: TableMenuItemSpec) => {
    const Icon = MENU_ICONS[spec.id];
    return (
      <ContextMenuItem
        key={spec.id}
        data-menu-command={spec.id}
        onClick={() => activate(spec.id)}
      >
        <Icon size={16} stroke={1.75} aria-hidden="true" />
        <span>{spec.label}</span>
      </ContextMenuItem>
    );
  };

  const radioItem = (spec: TableMenuItemSpec) => {
    const Icon = MENU_ICONS[spec.id];
    return (
      <ContextMenuRadioItem
        key={spec.id}
        value={alignmentValue(spec.id)}
        data-menu-command={spec.id}
        // A radio item does not close the menu by default; every activation in
        // this menu does (plan D.3: "every item dispatches its command and
        // closes").
        closeOnClick
      >
        <Icon size={16} stroke={1.75} aria-hidden="true" />
        <span>{spec.label}</span>
      </ContextMenuRadioItem>
    );
  };

  const submenu = (section: TableMenuSection & { kind: "submenu" }) => {
    const submenuIcon: TableMenuIcon =
      section.id === "row" ? IconTableOptions : IconColumns;
    return (
      <ContextMenuSub key={section.id}>
        <ContextMenuSubTrigger data-menu-section={section.id}>
          {React.createElement(submenuIcon, {
            size: 16,
            stroke: 1.75,
            "aria-hidden": "true",
          })}
          <span>{section.label}</span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent data-table-menu="true">
          {groupedItems(section.items).map((group, index) => (
            <React.Fragment key={group.key}>
              {index > 0 ? <ContextMenuSeparator /> : null}
              {group.key === "align" ? (
                <ContextMenuRadioGroup
                  value={alignment}
                  onValueChange={(value: unknown) =>
                    activate(
                      `column.align-${String(value)}` as TableMenuCommandId,
                    )
                  }
                >
                  {group.items.map(radioItem)}
                </ContextMenuRadioGroup>
              ) : (
                group.items.map(menuItem)
              )}
            </React.Fragment>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  };

  return (
    <ContextMenu onOpenChange={handleOpenChange}>
      <ContextMenuTrigger render={<table className="cm-live-table" />}>
        {children}
      </ContextMenuTrigger>
      {cell ? (
        <ContextMenuContent data-table-menu="true">
          {sections.map((section, index) => {
            if (section.kind === "separator") {
              return <ContextMenuSeparator key={`separator-${index}`} />;
            }
            if (section.kind === "item") return menuItem(section.item);
            return submenu(section);
          })}
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  );
}
