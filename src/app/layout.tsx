/** Root typography, dark theme and the Pyre Witness app icons. */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Pyre Witness",
  description: "Snap any device, see where it belongs in your plant and what risk it brings.",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/brand/mark-dark.png", type: "image/png", sizes: "1024x1024" },
    ],
    shortcut: "/brand/favicon-32.png",
    apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  themeColor: "#070b10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            document.documentElement.dataset.theme = localStorage.getItem("pw-theme") === "light" ? "light" : "dark";
          } catch {
            document.documentElement.dataset.theme = "dark";
          }
        ` }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
