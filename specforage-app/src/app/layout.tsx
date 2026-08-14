import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpecForge — Product Intelligence Pipeline",
  description:
    "Turn messy distributor catalog rows into structured, UNSPSC-classified product records. Universal across any product category.",
  keywords: [
    "product data",
    "UNSPSC classification",
    "catalog enrichment",
    "product intelligence",
    "industrial commerce",
  ],
  openGraph: {
    title: "SpecForge — Product Intelligence Pipeline",
    description:
      "Turn messy distributor catalog rows into structured, UNSPSC-classified product records.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[#0D0D0D] text-[#E8E8E8] antialiased">
        {children}
      </body>
    </html>
  );
}
