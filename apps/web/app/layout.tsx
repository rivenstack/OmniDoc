import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { DirectionProvider, ThemeProvider, TooltipProvider } from "@omnidoc/ui";
import { locale } from "./locale";
import "./globals.css";

/**
 * Mintlify design language fonts (chosen 2026-09-23): Inter for everything,
 * Geist Mono for code and identifiers. `next/font` self-hosts both at build
 * time — no runtime request to a third party, no layout shift. The token
 * layer (`packages/ui/src/styles/tokens.css`) consumes `--font-inter` /
 * `--font-geist-mono` with a system-stack fallback, so Storybook, tests and
 * plain-CSS consumers still render without the app.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OmniDoc",
  description: "Multi-tenant AI/RAG note and knowledge SaaS (scaffold stub)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Single `lang`/`dir` source: both attributes are read from `./locale`
    // here and nowhere else. `suppressHydrationWarning` is required because
    // next-themes writes the theme class pre-hydration.
    <html
      lang={locale.lang}
      dir={locale.dir}
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <DirectionProvider direction={locale.dir}>
          <ThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
