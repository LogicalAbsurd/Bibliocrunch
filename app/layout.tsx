import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bibliocrunch — Numerical Hermeneutics Workbench",
  description:
    "Fold Biblical book, chapter, verse, ordinal, factor, and text-number structures into explorable three-dimensional geometry.",
  other: {
    "codex-preview": "development",
    "application-name": "Bibliocrunch",
    author: "Christopher W. Mahl",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
