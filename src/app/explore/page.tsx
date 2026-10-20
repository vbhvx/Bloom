"use client";

import { useEffect, useState } from "react";
import {
  Compass,
  Search,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";

interface Instrument {
  id: string;
  symbol: string;
  name: string;
  category: string;
  assetClass: string;
  riskLevel: string;
  expenseRatio?: string;
  lockInDays: number;
  taxNotes?: string;
  minInvestment?: string;
  isSimulated: boolean;
  latestObservation?: {
    price: string;
    sourceTimestamp: string;
    dataStatus: string;
    isSimulated: boolean;
  };
}

interface ComparisonItem {
  symbol: string;
  name: string;
  category: string;
  assetClass: string;
  riskLevel: string;
  expenseRatioPercent: string;
  lockInPeriodText: string;
  liquidityRating: string;
  taxationSummary: string;
  minimumInvestment: string;
  suitableHorizonYears: string;
  sourceProvenance: string;
  downsideRiskScenario: string;
}

export default function ExploreAndComparePage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetClass, setSelectedAssetClass] = useState("ALL");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    "NIFTY50_INDEX",
    "SGB_SERIES_VI",
    "PPF_SCHEME",
  ]);
  const [comparisonData, setComparisonData] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  // Load instruments
  async function loadInstruments(query = "") {
    try {
      const url = `/api/v1/instruments?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInstruments(data.instruments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Fetch comparison
  async function runComparison(symbols: string[]) {
    if (symbols.length < 2) return;
    setComparing(true);
    try {
      const res = await fetch("/api/v1/investments/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrumentSymbols: symbols,
          horizonMonths: 60,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComparisonData(data.comparisonMatrix || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setComparing(false);
    }
  }

  useEffect(() => {
    loadInstruments();
    runComparison(selectedSymbols);
  }, []);

  function toggleSymbol(sym: string) {
    let next: string[];
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length <= 2) {
        alert("Please select at least 2 instruments to compare.");
        return;
      }
      next = selectedSymbols.filter((s) => s !== sym);
    } else {
      if (selectedSymbols.length >= 4) {
        alert("You can compare up to 4 instruments simultaneously.");
        return;
      }
      next = [...selectedSymbols, sym];
    }
    setSelectedSymbols(next);
    runComparison(next);
  }

  const filteredInstruments = instruments.filter((inst) => {
    const matchesCat =
      selectedAssetClass === "ALL" || inst.assetClass === selectedAssetClass;
    return matchesCat;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Compass className="w-6 h-6 text-bloom-400" />
          Investment Discovery & Comparison
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Explore Indian asset classes, analyze structural trade-offs (costs, liquidity, lock-in, tax), and compare instruments side-by-side without black-box rankings.
        </p>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-bloom-400" />
              Side-by-Side Attribute Comparison Matrix
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Comparing {comparisonData.length} selected asset classes across regulatory, cost, and tax characteristics.
            </p>
          </div>
          <span className="text-[11px] text-gray-400 bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-700">
            Select 2 to 4 instruments below to update
          </span>
        </div>

        {comparing ? (
          <div className="p-8 text-center text-xs text-gray-400">Updating comparison matrix...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-gray-400 font-semibold text-[11px]">
                  <th className="p-3 w-44">Attribute</th>
                  {comparisonData.map((c) => (
                    <th key={c.symbol} className="p-3 font-bold text-white min-w-56">
                      <div className="flex items-center justify-between">
                        <span>{c.name}</span>
                        <button
                          onClick={() => toggleSymbol(c.symbol)}
                          className="text-gray-500 hover:text-red-400 text-xs ml-1"
                          title="Remove from comparison"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="text-[10px] font-normal text-bloom-400 block mt-0.5">
                        {c.category} • {c.assetClass}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                <tr>
                  <td className="p-3 font-semibold text-gray-400">Risk Volatility</td>
                  {comparisonData.map((c) => (
                    <td key={c.symbol} className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.riskLevel === "VERY_HIGH" || c.riskLevel === "HIGH"
                            ? "bg-red-950 text-red-300 border border-red-800/50"
                            : c.riskLevel === "MODERATE"
                            ? "bg-amber-950 text-amber-300 border border-amber-800/50"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                        }`}
                      >
                        {c.riskLevel}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-400">Cost / Expense Ratio</td>
                  {comparisonData.map((c) => (
                    <td key={c.symbol} className="p-3 font-mono font-bold text-gray-200">
                      {c.expenseRatioPercent}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-400">Lock-in & Liquidity</td>
                  {comparisonData.map((c) => (
                    <td key={c.symbol} className="p-3">
                      <div className="font-medium text-gray-200">{c.lockInPeriodText}</div>
                      <span className="text-[10px] text-gray-400">Liquidity: {c.liquidityRating}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-400">Tax Treatment</td>
                  {comparisonData.map((c) => (
                    <td key={c.symbol} className="p-3 text-[11px] text-gray-300 leading-normal">
                      {c.taxationSummary}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-400">Downside Scenarios</td>
                  {comparisonData.map((c) => (
                    <td key={c.symbol} className="p-3 text-[11px] text-amber-200/90 leading-normal">
                      {c.downsideRiskScenario}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-400">Min Investment</td>
                  {comparisonData.map((c) => (
                    <td key={c.symbol} className="p-3 font-mono text-gray-200">
                      {c.minimumInvestment}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-400">Ideal Time Horizon</td>
                  {comparisonData.map((c) => (
                    <td key={c.symbol} className="p-3 text-emerald-400 font-medium">
                      {c.suitableHorizonYears}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instrument Catalog with Search & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white">Select Instruments to Compare</h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search or enter AMFI scheme..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  loadInstruments(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bloom-500"
              />
            </div>

            <select
              value={selectedAssetClass}
              onChange={(e) => setSelectedAssetClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 focus:outline-none"
            >
              <option value="ALL">All Asset Classes</option>
              <option value="EQUITY">Equity (Index / Active)</option>
              <option value="DEBT">Debt (PPF / FDs)</option>
              <option value="COMMODITY">Commodity (SGB Gold)</option>
              <option value="HYBRID">Hybrid (NPS)</option>
              <option value="CASH_EQUIVALENT">Liquid Cash</option>
            </select>
          </div>
        </div>

        {/* Instruments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstruments.map((inst) => {
            const isSelected = selectedSymbols.includes(inst.symbol);
            return (
              <div
                key={inst.id}
                onClick={() => toggleSymbol(inst.symbol)}
                className={`rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-bloom-950/40 border-bloom-500/80 shadow-md shadow-bloom-600/10"
                    : "bg-gray-900/60 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                      {inst.category} • {inst.assetClass}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border transition-colors ${
                        isSelected
                          ? "bg-bloom-500 text-gray-950 border-bloom-400"
                          : "border-gray-700 text-transparent hover:border-gray-500"
                      }`}
                    >
                      ✓
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{inst.name}</h4>
                    <span className="text-[11px] text-gray-400 font-mono">{inst.symbol}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 pt-2 border-t border-gray-800/60">
                    <div>
                      <span>Expense Ratio: </span>
                      <strong className="text-gray-200">
                        {inst.expenseRatio ? `${(Number(inst.expenseRatio) * 100).toFixed(2)}%` : "0%"}
                      </strong>
                    </div>
                    <div>
                      <span>Lock-in: </span>
                      <strong className="text-gray-200">
                        {inst.lockInDays === 0 ? "Liquid" : `${inst.lockInDays}d`}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-400">
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
                    {inst.isSimulated ? "Simulated Fixture" : "Verified AMFI"}
                  </span>
                  <span className="text-bloom-400 font-semibold">
                    {isSelected ? "Comparing" : "+ Click to Compare"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

