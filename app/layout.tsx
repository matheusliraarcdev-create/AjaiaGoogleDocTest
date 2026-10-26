import type { Metadata } from "next";
import { Fraunces, Literata, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const serif = Literata({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: { default: "Folio", template: "%s · Folio" },
  description: "A lightweight shared document editor for internal drafts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
