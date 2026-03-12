import type { Metadata } from "next";
import { Merriweather_Sans } from "next/font/google";
import "./globals.css";

const merriweatherSans = Merriweather_Sans({
  weight: ["300", "400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-merriweather-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bidblender.io"),
  title: "BidBlender — Opportunity Intelligence Platform",
  description:
    "Know where to compete before you start writing bids. BidBlender maps organisations, networks, and opportunities to reveal where work is actually winnable.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={merriweatherSans.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
