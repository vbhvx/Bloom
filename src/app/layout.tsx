import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Bloom | Goal-First Investing & Financial Intelligence Platform",
  description:
    "Personalized goal-first financial planning, deterministic compounding calculations, and transparent investment education for Indian retail investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-950 text-gray-100 min-h-screen flex flex-col font-sans antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-800/80 bg-navy-900/40 text-xs text-gray-400 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800/60 pb-6">
              <div>
                <span className="font-semibold text-gray-200">Bloom Financial Intelligence</span>
                <p className="text-gray-400 mt-0.5">
                  Goal-first financial planning platform powered by deterministic arithmetic & approved sources.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <a href="/compliance" className="hover:text-bloom-400 transition-colors">
                  Regulatory Register
                </a>
                <a href="/learn" className="hover:text-bloom-400 transition-colors">
                  Educational Content
                </a>
                <a href="/explore" className="hover:text-bloom-400 transition-colors">
                  Investment Discovery
                </a>
                <a href="/connections" className="hover:text-bloom-400 transition-colors">
                  Account Aggregator Consent
                </a>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 space-y-1">
              <p>
                <strong>Statutory Regulatory Notice:</strong> Bloom is an educational financial planning and intelligence platform. It does not provide personalized securities advice, stock recommendations, or discretionary portfolio management. Any future regulated capabilities remain subject to registration under SEBI (Investment Advisers) Regulations, 2013 or execution partnerships under the SEBI Execution-Only Platforms (EOP) framework.
              </p>
              <p>
                Mutual Fund investments are subject to market risks; read all scheme-related documents carefully. Past performance is not an indicator of future returns.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

