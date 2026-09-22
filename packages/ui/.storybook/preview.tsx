import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect, type ReactNode } from "react";
import { DirectionProvider, ThemeProvider } from "../src/providers";
import "../src/styles/globals.css";
import "./preview.css";

/**
 * Storybook preview — global providers and the two review globals.
 *
 * Every story renders inside the same provider stack the application uses:
 * `ThemeProvider` (class-driven `.dark` token remap, D-01 §2.3) and
 * `DirectionProvider` (Base UI's single runtime direction source, a11y §7.1).
 * Stories therefore cannot accidentally demonstrate a state the app cannot
 * reach — there is no second token authority and no second direction source.
 *
 * `DirectionProvider` is pinned to `ltr`: `en` is the only shipping locale and
 * RTL is **deferred, not closed**. The provider sets no DOM `dir`, so the
 * stories exercise the same "no component owns direction" rule the app does.
 *
 * ## Motion global
 *
 * A real `prefers-reduced-motion` preference cannot be forced from a story, so
 * the `Motion` toolbar toggles a class that the harness stylesheet mirrors the
 * product's media query under. That gives every animated state a reviewable
 * static equivalent. See `.storybook/preview.css` — it is test tooling, not a
 * product mechanism.
 */

function MotionEmulator({
  reduced,
  children,
}: {
  reduced: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("od-emulate-reduced-motion", reduced);
    return () => root.classList.remove("od-emulate-reduced-motion");
  }, [reduced]);

  return <>{children}</>;
}

const withOmniDocProviders: Decorator = (Story, context) => {
  const theme = (context.globals.theme as string | undefined) ?? "light";
  const reducedMotion = context.globals.motion === "reduced";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem={false}
      forcedTheme={theme}
    >
      <DirectionProvider direction="ltr">
        <MotionEmulator reduced={reducedMotion}>
          <div className="min-h-32 bg-background p-6 text-foreground">
            <Story />
          </div>
        </MotionEmulator>
      </DirectionProvider>
    </ThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withOmniDocProviders],
  tags: ["autodocs"],
  globalTypes: {
    theme: {
      description: "D-01 theme (light / dark token remap)",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
    motion: {
      description: "Motion preference (mirrors prefers-reduced-motion)",
      toolbar: {
        title: "Motion",
        icon: "transfer",
        items: [
          { value: "full", title: "Full motion" },
          { value: "reduced", title: "Reduced motion" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
    motion: "full",
  },
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // The a11y addon surfaces violations in the panel and fails the story when
    // the interaction/a11y test runner is used. Accessibility is a release gate
    // (AGENTS.md), so the catalogue defaults to failing rather than warning.
    a11y: {
      test: "error",
    },
    options: {
      storySort: {
        order: ["Shell", "Navigation & workspace", "Foundations"],
      },
    },
  },
};

export default preview;
