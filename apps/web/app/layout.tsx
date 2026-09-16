import type { Metadata } from "next";
import { locale } from "./locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniDoc",
  description: "Multi-tenant AI/RAG note and knowledge SaaS (scaffold stub)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale.lang} dir={locale.dir}>
      <body>{children}</body>
    </html>
  );
}
