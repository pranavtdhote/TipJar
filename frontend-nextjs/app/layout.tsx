import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TipJar | Securely Cinematic Contributions",
  description: "Direct, transparent Ethereum contributions for creators with permanent on-chain message recording on Ethereum Sepolia. Zero platform cut.",
  keywords: ["Ethereum", "Sepolia", "Web3", "TipJar", "Smart Contract", "MetaMask", "Solidity", "Creator Economy"],
  openGraph: {
    title: "TipJar — Securely Cinematic Contributions",
    description: "Send ETH tips with permanent on-chain messages recorded on Ethereum Sepolia.",
    type: "website",
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
