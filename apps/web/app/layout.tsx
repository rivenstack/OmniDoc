import type { Metadata } from "next";
import { DirectionProvider, ThemeProvider } from "@omnidoc/ui";
import { locale } from "./locale";
import "./globals.css";

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
    // Single `lang`/`dir` source (D-01 §8, a11y §7.1): both attributes are
    // read from `./locale` here and nowhere else. `suppressHydrationWarning`
    // is required because next-themes writes the theme class pre-hydration.
    <html lang={locale.lang} dir={locale.dir} suppressHydrationWarning>
      <body>
        <DirectionProvider direction={locale.dir}>
          <ThemeProvider>{children}</ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
