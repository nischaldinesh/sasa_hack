import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AppNav from "@/components/AppNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "SoonerSwipe", template: "%s · SoonerSwipe" },
  description: "Swipe on OU events, find a ride with other Sooners, and split gas fairly.",
  applicationName: "SoonerSwipe",
};

export const viewport: Viewport = {
  themeColor: "#841617",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page font-sans text-zinc-900">
        <AppNav />
        <div className="flex w-full flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
