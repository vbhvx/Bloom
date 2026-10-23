"use client";

import { useState } from "react";
import {
  BookOpen,
  Search,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Percent,
  Layers,
  HelpCircle,
  FileText,
  ExternalLink,
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  content: string;
  source: string;
  sourceUrl?: string;
}

interface GlossaryItem {
  term: string;
  fullName: string;
  definition: string;
  example: string;
  category: "MUTUAL_FUNDS" | "TAX" | "GOV_SCHEMES" | "MATH" | "REGULATORY";
}

const LESSONS: Lesson[] = [
  {
    id: "lesson-compounding",
    title: "The Mathematics of Compounding: Why Time Beats Timing",
    category: "FOUNDATIONS",
    readTime: "3 min read",
    summary: "How reinvesting returns produces exponential growth rather than linear addition.",
    content: `Compounding is the mathematical process where an asset's earnings, from either capital gains or interest, are reinvested to generate their own additional earnings over time.\n\nIn simple interest, your principal earns a fixed amount every year: ₹1,00,000 at 10% yields ₹10,000 every single year.\n\nIn compound interest, year 1 yields ₹10,000, bringing your balance to ₹1,10,000. In year 2, you earn 10% on ₹1,10,000 = ₹11,000. Over 20 years, a simple 10% rate turns ₹1,00,000 into ₹6,72,750—over 6.7x the original capital. Starting 5 years earlier frequently matters far more than saving twice as much later.`,
    source: "Bloom Financial Mathematics Standard v1.0",
  },
  {
    id: "lesson-inflation",
    title: "Inflation: The Silent Wealth Destroyer",
    category: "RISK & ECONOMICS",
    readTime: "4 min read",
    summary: "Why keeping money in standard savings accounts loses purchasing power each year.",
    content: `Inflation is the rate at which the general level of prices for goods and services rises, eroding purchasing power.\n\nIf headline retail inflation in India is 6% per annum, an item that costs ₹100 today will cost ₹106 next year. If your money rests in a traditional bank savings account earning 3% per annum, after tax you are losing approximately 3% in real purchasing power every single year.\n\nReal Return = (Nominal Return - Inflation) / (1 + Inflation).\nTo grow wealth in real terms, investments must deliver a net post-tax return greater than the prevailing inflation rate.`,
    source: "Reserve Bank of India (RBI) Monetary Policy Framework",
    sourceUrl: "https://rbi.org.in",
  },
  {
    id: "lesson-taxation-2024",
    title: "Capital Gains Taxation in India (Union Budget 2024 Rules)",
    category: "TAXATION",
    readTime: "5 min read",
    summary: "Comprehensive guide to revised LTCG (12.5%) and STCG (20%) tax amendments.",
    content: `The Union Budget (Finance No. 2 Act 2024) significantly altered capital gains taxation:\n\n1. Long-Term Capital Gains (LTCG) on Listed Equity & Mutual Funds: Held for > 12 months. Tax rate increased to 12.5% (from 10%). However, the annual tax-free exemption limit was raised from ₹1,00,000 to ₹1,25,000 per financial year.\n\n2. Short-Term Capital Gains (STCG) on Equity: Held for 12 months or less. Tax rate increased to 20% (from 15%).\n\n3. Specified Debt Mutual Funds: Acquired after April 1, 2023 with < 35% equity are taxed as short-term gains at your applicable income tax slab rate.`,
    source: "Ministry of Finance, Government of India (Finance Act 2024)",
    sourceUrl: "https://incometaxindia.gov.in",
  },
  {
    id: "lesson-mutual-funds",
    title: "Understanding Mutual Funds, NAV & Direct Plans",
    category: "INVESTING",
    readTime: "4 min read",
    summary: "How Net Asset Value works and why Direct Plans save thousands in broker commissions.",
    content: `A Mutual Fund pools money from thousands of retail investors to purchase a diversified portfolio of stocks, bonds, or gold managed by professional fund managers.\n\nNet Asset Value (NAV): The market price per unit of the fund, calculated at the end of each business day by dividing net scheme assets by total units issued.\n\nDirect vs Regular Plans: Direct plans bypass distributor commissions, featuring a lower Total Expense Ratio (TER). Over a 15-20 year SIP horizon, the 0.5% to 1.0% annual commission difference saved in a Direct Plan often amounts to 15-25% higher total accumulated corpus!`,
    source: "SEBI (Mutual Funds) Regulations, 1996 & AMFI Guidelines",
    sourceUrl: "https://www.amfiindia.com",
  },
];

const GLOSSARY: GlossaryItem[] = [
  {
    term: "SIP",
    fullName: "Systematic Investment Plan",
    definition:
      "A disciplined investment method where a fixed amount is automatically invested into a mutual fund scheme at regular intervals (typically monthly).",
    example: "Investing ₹10,000 on the 5th of every month into an Index Fund.",
    category: "MUTUAL_FUNDS",
  },
  {
    term: "NAV",
    fullName: "Net Asset Value",
    definition:
      "The net value of an investment fund's assets less its liabilities, divided by the number of shares outstanding. Disclosed daily for mutual funds.",
    example: "If a fund's net assets are ₹100 Crore with 1 Crore units, NAV is ₹100.",
    category: "MUTUAL_FUNDS",
  },
  {
    term: "LTCG",
    fullName: "Long Term Capital Gains",
    definition:
      "Tax on profits made from selling an investment held past a defined threshold (12 months for equity, 24/36 months for other assets). Under Budget 2024, equity LTCG is taxed at 12.5% above ₹1.25 Lakh exemption.",
    example: "Selling equity shares held for 2 years with ₹2,00,000 profit incurs tax on ₹75,000 at 12.5%.",
    category: "TAX",
  },
  {
    term: "STCG",
    fullName: "Short Term Capital Gains",
    definition:
      "Tax on profits from the sale of an asset held for less than the long-term holding period. Listed equities held for ≤12 months are taxed at 20% under Section 111A.",
    example: "Buying a stock in January and selling in August with ₹50,000 profit is taxed at 20%.",
    category: "TAX",
  },
  {
    term: "PPF",
    fullName: "Public Provident Fund",
    definition:
      "A 15-year central government statutory savings scheme offering triple tax exemption (EEE): contribution deduction u/s 80C, tax-free interest, and 100% tax-free maturity.",
    example: "Depositing ₹1.5 Lakh/year into SBI PPF earning 7.10% guaranteed sovereign interest.",
    category: "GOV_SCHEMES",
  },
  {
    term: "SGB",
    fullName: "Sovereign Gold Bond",
    definition:
      "Government securities denominated in grams of gold issued by the RBI. Pays 2.50% annual coupon interest, and capital gains on 8-year maturity redemption are completely tax-free.",
    example: "Buying 10 grams of SGB avoids making charges and physical gold storage costs.",
    category: "GOV_SCHEMES",
  },
  {
    term: "NPS",
    fullName: "National Pension System",
    definition:
      "PFRDA-regulated voluntary retirement vehicle offering an exclusive ₹50,000 extra tax deduction under Section 80CCD(1B) beyond Section 80C limits.",
    example: "Investing ₹50,000/year in NPS Tier I saves up to ₹15,600 tax for 30% slab taxpayers.",
    category: "GOV_SCHEMES",
  },
  {
    term: "CAGR",
    fullName: "Compound Annual Growth Rate",
    definition:
      "The constant annual rate at which an investment would have grown if it grew at a steady rate over multiple years. Smoothes out market volatility.",
    example: "An investment growing from ₹1 Lakh to ₹2 Lakh over 5 years has a CAGR of ~14.87%.",
    category: "MATH",
  },
  {
    term: "Expense Ratio (TER)",
    fullName: "Total Expense Ratio",
    definition:
      "The annual percentage fee deducted daily from a mutual fund's NAV by the asset management company to cover fund management, compliance, and operating expenses.",
    example: "An index fund with 0.15% TER deducts just ₹15 per ₹10,000 invested per year.",
    category: "MUTUAL_FUNDS",
  },
  {
    term: "Account Aggregator (AA)",
    fullName: "RBI NBFC-Account Aggregator",
    definition:
      "An RBI-regulated entity enabling secure, encrypted, consent-based digital financial data sharing between financial institutions without sharing bank login credentials.",
    example: "Using Setu or Finvu to share mutual fund statements with Bloom with revocable consent.",
    category: "REGULATORY",
  },
  {
    term: "SEBI",
    fullName: "Securities and Exchange Board of India",
    definition:
      "The statutory regulatory body established by the Government of India in 1992 to protect investor interests and regulate the securities and mutual funds market.",
    example: "SEBI mandates scheme categorisation rules and risk-o-meter disclosures.",
    category: "REGULATORY",
  },
];

export default function LearnAndGlossaryPage() {
  const [activeTab, setActiveTab] = useState<"LESSONS" | "GLOSSARY">("LESSONS");
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(LESSONS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [glossaryCategory, setGlossaryCategory] = useState<string>("ALL");

  const filteredGlossary = GLOSSARY.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = glossaryCategory === "ALL" || item.category === glossaryCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-bloom-400" />
            Financial Education & Glossary
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Grounded educational lessons, Indian taxation frameworks, and plain-language financial definitions.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("LESSONS")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "LESSONS" ? "bg-bloom-600 text-gray-950 shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Lessons ({LESSONS.length})
          </button>
          <button
            onClick={() => setActiveTab("GLOSSARY")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "GLOSSARY" ? "bg-bloom-600 text-gray-950 shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Glossary ({GLOSSARY.length})
          </button>
        </div>
      </div>

      {activeTab === "LESSONS" ? (
        /* Lessons View: Side-by-side selection */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lessons List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lessons</h3>
            {LESSONS.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedLesson(l)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedLesson.id === l.id
                    ? "bg-bloom-950/40 border-bloom-600/70 shadow-sm"
                    : "bg-gray-900/60 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span className="font-semibold text-bloom-400">{l.category}</span>
                  <span>{l.readTime}</span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">{l.title}</h4>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{l.summary}</p>
              </div>
            ))}
          </div>

          {/* Lesson Content View */}
          <div className="lg:col-span-2 rounded-2xl bg-gray-900/70 border border-gray-800 p-6 space-y-6">
            <div className="space-y-2 border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-bloom-950 text-bloom-300 border border-bloom-800/60">
                  {selectedLesson.category}
                </span>
                <span className="text-xs text-gray-400">{selectedLesson.readTime}</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{selectedLesson.title}</h2>
            </div>

            <div className="prose prose-invert text-xs text-gray-300 leading-relaxed whitespace-pre-line">
              {selectedLesson.content}
            </div>

            <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-bloom-400" />
                Verified Source: <strong className="text-gray-200">{selectedLesson.source}</strong>
              </span>
              {selectedLesson.sourceUrl && (
                <a
                  href={selectedLesson.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bloom-400 hover:underline flex items-center gap-1"
                >
                  Official Link <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Glossary View */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search financial terms (e.g. SIP, LTCG, SGB, NAV)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bloom-500"
              />
            </div>
            <select
              value={glossaryCategory}
              onChange={(e) => setGlossaryCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="MUTUAL_FUNDS">Mutual Funds</option>
              <option value="TAX">Taxation</option>
              <option value="GOV_SCHEMES">Gov Schemes (PPF/SGB/NPS)</option>
              <option value="MATH">Financial Mathematics</option>
              <option value="REGULATORY">Regulatory & AA</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGlossary.map((item) => (
              <div
                key={item.term}
                className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-3 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-base font-bold text-white tracking-tight">{item.term}</span>
                    <span className="text-[11px] block text-bloom-400 font-medium">{item.fullName}</span>
                  </div>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{item.definition}</p>
                <div className="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80 text-[11px] text-gray-400">
                  <strong className="text-gray-300">Practical Example:</strong> {item.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

