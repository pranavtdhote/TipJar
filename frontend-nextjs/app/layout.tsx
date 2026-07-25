import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0a1612",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tipjar-protocol.vercel.app"),
  title: "TipJar | Securely Cinematic Contributions",
  description: "Direct, transparent Ethereum contributions for creators with permanent on-chain message recording on Ethereum Sepolia. Zero platform cut.",
  keywords: ["Ethereum", "Sepolia", "Web3", "TipJar", "Smart Contract", "MetaMask", "Solidity", "Creator Economy"],
  authors: [{ name: "TipJar Protocol" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "TipJar — Securely Cinematic Contributions",
    description: "Send ETH tips with permanent on-chain messages recorded on Ethereum Sepolia.",
    type: "website",
    siteName: "TipJar Protocol",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "TipJar Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TipJar — Securely Cinematic Contributions",
    description: "Transparent Ethereum tip jar for creators with permanent on-chain notes.",
    images: ["/icon.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background selection:bg-primary selection:text-on-primary text-on-surface antialiased">
        <div className="grain-overlay" />
        {children}
      </body>
    </html>
  );
}
