import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";

import "./globals.css";
import SmoothScrolling from "@/components/SmoothScrolling";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CHILL VERSE",
  description:
    "Discover and explore the vibrant world of 2D VERSE with your friends. Dive into an engaging multiplayer RPG experience filled with adventure and fun.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SmoothScrolling>
          <ClerkProvider>{children}</ClerkProvider>
        </SmoothScrolling>
      </body>
    </html>
  );
}
