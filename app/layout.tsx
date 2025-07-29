import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";

import "./globals.css";
import SmoothScrolling from "@/components/SmoothScrolling";
import Image from "next/image";

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
        {/* Only show this on mobile, hide rest of content */}
        <div className=" md:hidden fixed top-0 left-0 w-full h-full min-h-screen z-50 bg-black text-white flex flex-col items-center justify-center text-center">
          <Image
            src={
              "https://i.pinimg.com/736x/9a/37/a3/9a37a37cc4881997a3786e61f0b25c47.jpg"
            }
            alt="Mobile View"
            width={500}
            height={500}
            className=""
          ></Image>
          <span className="text-lg pt-10 font-bold">VIEW IN DESKTOP</span>
        </div>
        {/* Only show app content on desktop */}
        <div className="hidden md:block">
          <SmoothScrolling>
            <ClerkProvider>{children}</ClerkProvider>
          </SmoothScrolling>
        </div>
      </body>
    </html>
  );
}
