"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBlockquote,
  IconBold,
  IconCode,
  IconCodeDots,
  IconH1,
  IconH2,
  IconH3,
  IconItalic,
  IconList,
  IconListNumbers,
  IconMinus,
  IconStrikethrough,
} from "@tabler/icons-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Separator } from "../components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/tooltip";
import { IconButton } from "../components/icon-button";
import { cn } from "../lib/utils";

/**
 * The vertical rule between toolbar groups.
 *
 * `Separator` renders `data-vertical:self-stretch`, which beats the row's
 * `items-center` on that one child. With an explicit height the stretch cannot
 * apply, so the item falls back to the start of the cross axis and the rule sits
 * against the top of the toolbar instead of centred.
 *
 * The fix is to stop fighting it: no height, and margin on both sides so
 * `stretch` resolves to "fill the row, minus the insets" — centred by
 * construction rather than by out-specifying a variant.
 */
const TOOLBAR_SEPARATOR_CLASS = "mx-1 my-0.5";

/**
 * The app shell's top bar is `h-14` and `sticky top-0`
 * (`apps/web/app/(app)/shell.tsx`), so the toolbar parks directly under it.
 */
const TOOLBAR_STICKY_CLASS = "sticky top-14 z-20";

/** The shell's top-bar height, used when no toolbar is on screen to measure. */
const TOP_BAR_HEIGHT = 56;

/** How far above the selection the inline bubble floats. */
const BUBBLE_CLEARANCE = 44;

/** The gap under the selection when the bubble has to drop below it. */
const BUBBLE_DROP = 8;

/**
 * The bottom edge of the chrome above the body: the sticky formatting toolbar
 * when one is on screen, otherwise the shell's top bar.
 *
 * Measured rather than assumed — the toolbar wraps onto a second row on narrow
 * viewports, and the bubble has to clear whatever is actually there. A zero
 * height means the toolbar is not laid out (jsdom, or detached), so the top bar
 * stands in for it.
 */
function topChromeBottom(): number {
  const sticky = document.querySelector(
    '[data-slot="formatting-toolbar-sticky"]',
  );
  const rect = sticky?.getBoundingClientRect();
  return rect && rect.height > 0 ? rect.bottom : TOP_BAR_HEIGHT;
}

/**
 * Capture block — formatting toolbar (option C: a sticky row for block-level
 * commands, plus a selection toolbar for inline marks).
 *
 * Both surfaces issue the same commands, and every command ends with
 * `.focus()`, so focus returns to the document the user was editing. The sticky
 * row is the **complete** set of controls and is keyboard-reachable; the
 * selection toolbar is a pointer convenience on top of it. That split is
 * deliberate: nothing becomes mouse-only because a bubble exists
 * (`ui-qa-checklist.md` §1.1).
 *
 * Toolbar buttons call `preventDefault` on mousedown. Without it the browser
 * moves focus out of the editable surface before the command runs, and the
 * command applies to a collapsed selection — formatting that silently does
 * nothing.
 *
 * Why not TipTap's own `BubbleMenu`: it lives in `@tiptap/react/menus` and needs
 * `@tiptap/extension-bubble-menu`, which is not one of this project's pinned
 * editor packages. This positions from the DOM selection instead and adds no
 * dependency. The tradeoff is accepted and recorded in `docs/design/now.md`.
 */
export function FormattingToolbar({
  editor,
  className,
}: {
  editor: Editor;
  className?: string;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
      h1: instance.isActive("heading", { level: 1 }),
      h2: instance.isActive("heading", { level: 2 }),
      h3: instance.isActive("heading", { level: 3 }),
      bulletList: instance.isActive("bulletList"),
      orderedList: instance.isActive("orderedList"),
      blockquote: instance.isActive("blockquote"),
      codeBlock: instance.isActive("codeBlock"),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  return (
    <TooltipProvider>
      {/*
        Sticky row. Scrolling up to reach a button and back down to the caret is
        the one cost this block must not charge the user — `capture.md` §3 asks
        for exactly this on mobile, and the desk is no different.

        The **wrapper** carries the opaque `bg-background` surface, not the
        toolbar itself: `bg-muted/30` on a sticky element would let the text it
        is covering read through it, and swapping the panel for a solid slab
        would change the look it has in flow. Stacked, the two surfaces
        composite to the same tint in either position.

        `className` stays on the toolbar, where callers already put it.
      */}
      <div
        data-slot="formatting-toolbar-sticky"
        className={cn(TOOLBAR_STICKY_CLASS, "bg-background py-1")}
      >
        <div
          data-slot="formatting-toolbar"
          role="toolbar"
          aria-label="Formatting"
          aria-orientation="horizontal"
          className={cn(
            "flex flex-wrap items-center gap-0.5 rounded-lg border bg-muted/30 p-1",
            className,
          )}
        >
          <ToolbarButton
            label="Undo"
            disabled={!state.canUndo}
            onRun={() => editor.chain().focus().undo().run()}
          >
            <IconArrowBackUp aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!state.canRedo}
            onRun={() => editor.chain().focus().redo().run()}
          >
            <IconArrowForwardUp aria-hidden="true" className="size-4" />
          </ToolbarButton>

          <Separator
            orientation="vertical"
            className={TOOLBAR_SEPARATOR_CLASS}
          />

          {(
            [
              {
                label: "Heading 1",
                icon: <IconH1 aria-hidden="true" className="size-4" />,
                pressed: state.h1,
                run: () =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run(),
              },
              {
                label: "Heading 2",
                icon: <IconH2 aria-hidden="true" className="size-4" />,
                pressed: state.h2,
                run: () =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run(),
              },
              {
                label: "Heading 3",
                icon: <IconH3 aria-hidden="true" className="size-4" />,
                pressed: state.h3,
                run: () =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run(),
              },
            ] as const
          ).map((item) => (
            <ToolbarButton
              key={item.label}
              label={item.label}
              pressed={item.pressed}
              onRun={item.run}
            >
              {item.icon}
            </ToolbarButton>
          ))}

          <Separator
            orientation="vertical"
            className={TOOLBAR_SEPARATOR_CLASS}
          />

          <ToolbarButton
            label="Bullet list"
            pressed={state.bulletList}
            onRun={() => editor.chain().focus().toggleBulletList().run()}
          >
            <IconList aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            pressed={state.orderedList}
            onRun={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <IconListNumbers aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            pressed={state.blockquote}
            onRun={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <IconBlockquote aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Code block"
            pressed={state.codeBlock}
            onRun={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <IconCodeDots aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Divider"
            onRun={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <IconMinus aria-hidden="true" className="size-4" />
          </ToolbarButton>

          <Separator
            orientation="vertical"
            className={TOOLBAR_SEPARATOR_CLASS}
          />

          <ToolbarButton
            label="Bold"
            pressed={state.bold}
            onRun={() => editor.chain().focus().toggleBold().run()}
          >
            <IconBold aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            pressed={state.italic}
            onRun={() => editor.chain().focus().toggleItalic().run()}
          >
            <IconItalic aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            pressed={state.strike}
            onRun={() => editor.chain().focus().toggleStrike().run()}
          >
            <IconStrikethrough aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Inline code"
            pressed={state.code}
            onRun={() => editor.chain().focus().toggleCode().run()}
          >
            <IconCode aria-hidden="true" className="size-4" />
          </ToolbarButton>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Inline marks for a live text selection.
 *
 * Rendered only while a non-empty selection sits inside the editor surface, so
 * it never leaves invisible-but-tabbable buttons behind. It is positioned from
 * the DOM selection because that is the only measurement available without
 * adding a positioning dependency.
 *
 * `translateX(-50%)` is centring, not a direction choice: it lands the toolbar
 * on the same midpoint under either direction, so it needs no logical
 * equivalent (`architecture.md` §8 is about start/end alignment, not centring).
 */
export function SelectionToolbar({
  editor,
  className,
}: {
  editor: Editor;
  className?: string;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
    }),
  });
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    function update() {
      const selection =
        typeof window === "undefined" ? null : window.getSelection?.();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPosition(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!editor.view.dom.contains(range.commonAncestorContainer)) {
        setPosition(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      // jsdom returns an all-zero rect, and a zero-size rect also means the
      // selection is not being painted (e.g. a collapsed block selection).
      if (rect.width === 0 && rect.height === 0) {
        setPosition(null);
        return;
      }
      setPosition({
        // Flip below when there is no room above the selection. The ceiling is
        // the chrome, not the top of the viewport: with the toolbar pinned
        // there, `rect.top > 56` would park the bubble on the very row it is a
        // duplicate of.
        top:
          rect.top - BUBBLE_CLEARANCE >= topChromeBottom()
            ? rect.top - BUBBLE_CLEARANCE
            : rect.bottom + BUBBLE_DROP,
        left: rect.left + rect.width / 2,
      });
    }

    editor.on("selectionUpdate", update);
    document.addEventListener("selectionchange", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      document.removeEventListener("selectionchange", update);
    };
  }, [editor]);

  if (!position) {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        data-slot="selection-toolbar"
        role="toolbar"
        aria-label="Text formatting"
        style={{ top: position.top, left: position.left }}
        className={cn(
          "fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md",
          className,
        )}
      >
        <ToolbarButton
          label="Bold"
          pressed={state.bold}
          onRun={() => editor.chain().focus().toggleBold().run()}
        >
          <IconBold aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          pressed={state.italic}
          onRun={() => editor.chain().focus().toggleItalic().run()}
        >
          <IconItalic aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          pressed={state.strike}
          onRun={() => editor.chain().focus().toggleStrike().run()}
        >
          <IconStrikethrough aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          pressed={state.code}
          onRun={() => editor.chain().focus().toggleCode().run()}
        >
          <IconCode aria-hidden="true" className="size-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}

type ToolbarButtonProps = {
  label: string;
  children: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onRun: () => void;
};

function ToolbarButton({
  label,
  children,
  pressed,
  disabled,
  onRun,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <IconButton
            label={label}
            size="icon-sm"
            variant={pressed ? "secondary" : "ghost"}
            pressed={pressed}
            disabled={disabled}
            onMouseDown={(event) => {
              // Keep the browser selection inside the editor, or the command
              // applies to nothing.
              event.preventDefault();
            }}
            onClick={onRun}
          >
            {children}
          </IconButton>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
