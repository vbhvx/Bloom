"use client";

import Link from "next/navigation";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  TrendingUp,
  Target,
  BookOpen,
  PieChart,
  ShieldCheck,
  MessageSquare,
  Link2,
  Sparkles,
  RotateCcw,
  Compass,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Overview", icon: TrendingUp },
    { href: "/goals", label: "Goals & Planning", icon: Target },
    { href: "/learn", label: "Learn & Glossary", icon: BookOpen },
    { href: "/explore", label: "Explore & Compare", icon: Compass },
    { href: "/portfolio", label: "Portfolio", icon: PieChart },
    { href: "/connections", label: "Bank & AA", icon: Link2 },
    { href: "/assistant", label: "AI Assistant", icon: MessageSquare },
    { href: "/compliance", label: "Regulatory Gates", icon: ShieldCheck },
  ];

  async function handleResetDemo() {
    if (!confirm("Reset demo data? This will restore clean demo goals and accounts without touching real users.")) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch("/api/v1/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage("Demo data restored!");
        setTimeout(() => {
          setResetMessage(null);
          window.location.reload();
        }, 1200);
      } else {
        alert(data.error?.message || "Failed to reset demo");
      }
    } catch {
      alert("Network error resetting demo data.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-navy-900/90 backdrop-blur-md">
      {/* Demo Mode & Regulatory Banner */}
      <div className="bg-amber-950/60 border-b border-amber-800/40 px-4 py-1.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[11px] bg-amber-900/80 px-2 py-0.5 rounded text-amber-200 border border-amber-700/50">
            Simulated Demo Mode
          </span>
          <span className="text-amber-300/90 hidden sm:inline">
            Viewing simulated Indian market fixtures & sandbox accounts. Live advice & brokerage execution remain strictly gated.
          </span>
        </div>
        <div className="flex items-center gap-3">
          {resetMessage && (
            <span className="text-emerald-400 font-medium text-xs animate-fade-in">{resetMessage}</span>
          )}
          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-amber-900/80 hover:bg-amber-800 text-amber-100 border border-amber-700 transition-colors disabled:opacity-50"
            title="Restore default demo fixtures"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-bloom-600 to-bloom-400 flex items-center justify-center shadow-lg shadow-bloom-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-gray-950" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Bloom
                </span>
                <span className="text-[10px] block text-bloom-400 font-medium tracking-wide uppercase">
                  Goal-First Finance
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-bloom-950/80 text-bloom-300 border border-bloom-800/60 shadow-sm"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-bloom-400" : "text-gray-400"}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Right Controls: User Profile Indicator & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-800/80 border border-gray-700/60 text-xs text-gray-300">
              <div className="w-6 h-6 rounded-full bg-bloom-600/30 text-bloom-300 font-semibold flex items-center justify-center text-[10px] border border-bloom-500/30">
                AS
              </div>
              <span className="font-medium text-gray-200">Aarav Sharma</span>
              <span className="text-[10px] text-amber-400/90 font-mono bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/40">
                Demo
              </span>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-800 bg-navy-950 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-bloom-950 text-bloom-300 border border-bloom-800"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 text-bloom-400" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
}

