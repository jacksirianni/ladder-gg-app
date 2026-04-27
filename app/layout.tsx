import type { Metadata } from "next";
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

const description =
  "Bracket generation, team registration, match reporting, and entry tracking — for friend groups, Discord communities, dorms, and office crews.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ladder-gg-app.vercel.app"),
  title: {
    default: "LADDER.gg — Run gaming leagues with your crew",
    template: "%s · LADDER.gg",
  },
  description,
  applicationName: "LADDER.gg",
  authors: [{ name: "LADDER.gg" }],
  keywords: [
    "gaming league",
    "tournament bracket",
    "single elimination",
    "Discord tournament",
    "dorm tournament",
    "office tournament",
    "league management",
  ],
  openGraph: {
    title: "LADDER.gg — Run gaming leagues with your crew",
    description,
    type: "website",
    siteName: "LADDER.gg",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "LADDER.gg — Run gaming leagues with your crew",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
