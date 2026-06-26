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

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

export const metadata: Metadata = {
  title: {
    default: "Master Setting",
    template: "%s | Master Setting",
  },
  description:
    "Track your Pokémon TCG master set collection — mark which cards you own, see what's missing, and follow your progress from first card to complete.",
  keywords: ["Pokémon TCG", "master set", "card collection tracker", "Pokémon card tracker", "binder tracker", "set completion"],
  metadataBase: baseUrl ? new URL(baseUrl) : null,
  openGraph: {
    title: "Master Setting",
    description:
      "Track your Pokémon TCG master set collection — mark which cards you own, see what's missing, and follow your progress.",
    type: "website",
    url: baseUrl || undefined,
  },
  twitter: {
    card: "summary",
    title: "Master Setting",
    description:
      "Track your Pokémon TCG master set collection — mark which cards you own, see what's missing, and follow your progress.",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f121a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
