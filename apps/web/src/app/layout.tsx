import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { QueryProvider } from "@/components/providers/query-provider";
import { PwaProvider } from "./serwist-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "negosyoOS · A practical Business OS for Philippine SMEs", template: "%s · negosyoOS" },
  description: "Know what your business needs next with a practical operating system for sales, inventory, customers, cash flow, and daily operations.",
  applicationName: "negosyoOS",
  icons: { icon: "/brand/negosyoos-mark.png", apple: "/brand/negosyoos-mark.png" },
  openGraph: {
    type: "website",
    locale: "en_PH",
    title: "Know what your business needs next",
    description: "Take a free five-minute business health assessment and turn the result into a practical system for your Philippine SME.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "negosyoOS — Know what your business needs next." }],
  },
  twitter: { card: "summary_large_image", title: "Know what your business needs next", description: "A practical Business OS for Philippine SMEs.", images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-PH"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col"><PwaProvider><QueryProvider>{children}</QueryProvider></PwaProvider></body>
    </html>
  );
}
