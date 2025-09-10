import "./globals.css";
import type { Metadata, Viewport } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { KeetaProvider } from "../keeta/KeetaContext";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export const metadata: Metadata = {
  title: "KTA — Keeta Network Arcade (Frontend)",
  description: "Blackjack-only frontend scaffold (web3 coming soon)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <KeetaProvider>
          <Header />
          <main className="container py-6 min-h-[calc(100dvh-7rem)]">{children}</main>
          <Footer />
        </KeetaProvider>
      </body>
    </html>
  );
}
