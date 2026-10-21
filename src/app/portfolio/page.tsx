"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Wallet,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  HelpCircle,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface Holding {
  id: string;
  symbol: string;
  name: string;
  category: string;
  assetClass: string;
  units: string;
  averageBuyPrice: string;
  currentPrice: string;
  totalInvested: string;
  currentValuation: string;
  unrealizedGainLoss: string;
  unrealizedGainLossPercent: number;
  currency: string;
  sourceType: "SIMULATED" | "CONNECTED" | "MANUAL";
  accountName: string;
  accountType: string;
  isSimulated: boolean;
  snapshotTimestamp: string;
}

interface PortfolioSummary {
  totalNetWorth: string;
  liquidCashBalance: string;
  investedValuation: string;
  currency: string;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const [sumRes, holdRes] = await Promise.all([
          fetch("/api/v1/portfolio/summary"),
          fetch("/api/v1/portfolio/holdings"),
        ]);

        if (sumRes.ok) {
          const s = await sumRes.json();
          setSummary(s.summary);
        }
        if (holdRes.ok) {
          const h = await holdRes.json();
          setHoldings(h.holdings || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-bloom-400" />
            Portfolio Visibility & Holdings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Aggregated view of holdings, current market valuations, and strict source provenance tagging.
          </p>
        </div>
      </div>

      {/* Disclosures & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-1">
          <span className="text-xs text-gray-400 font-medium">Total Net Worth</span>
          <div className="text-2xl font-bold text-white">
            {summary ? formatINR(summary.totalNetWorth) : "₹10,32,600"}
          </div>
          <p className="text-[11px] text-gray-500">Liquid Cash + Total Invested Market Assets</p>
        </div>

        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-1">
          <span className="text-xs text-cyan-400 font-medium">Withdrawable Bank Cash</span>
          <div className="text-2xl font-bold text-cyan-400">
            {summary ? formatINR(summary.liquidCashBalance) : "₹1,50,000"}
          </div>
          <p className="text-[11px] text-cyan-300/70">Unencumbered savings balance ready for deployment</p>
        </div>

        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-1">
          <span className="text-xs text-bloom-400 font-medium">Invested Holdings Valuation</span>
          <div className="text-2xl font-bold text-bloom-400">
            {summary ? formatINR(summary.investedValuation) : "₹8,82,600"}
          </div>
          <p className="text-[11px] text-bloom-300/70">Subject to market NAVs and applicable exit taxes</p>
        </div>
      </div>

      {/* Important Statutory Notice Banner */}
      <div className="rounded-xl bg-amber-950/30 border border-amber-800/40 p-4 text-xs text-amber-200/90 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-amber-300 block">Withdrawable Cash vs Estimated Valuations:</span>
          <span>
            Investment valuations represent estimated current market observations. They are not withdrawable cash balances. Realizing investments is subject to trading hours, settlement cycles (T+1 in India), redemption locks, and applicable capital gains taxes (12.5% LTCG above ₹1.25 Lakh).
          </span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-bloom-400" />
            Current Holdings & Asset Provenance
          </h2>
          <span className="text-xs text-gray-400">{holdings.length} Positions Tracked</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading holdings snapshot...</div>
        ) : holdings.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No holdings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-gray-400 font-semibold text-[11px]">
                  <th className="p-3">Instrument & Symbol</th>
                  <th className="p-3">Account & Category</th>
                  <th className="p-3">Units</th>
                  <th className="p-3">Avg Buy Price</th>
                  <th className="p-3">Current NAV / Price</th>
                  <th className="p-3">Current Valuation</th>
                  <th className="p-3">Unrealized Gain / Loss</th>
                  <th className="p-3 text-right">Data Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {holdings.map((h) => {
                  const isGain = Number(h.unrealizedGainLoss) >= 0;
                  return (
                    <tr key={h.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white">{h.name}</div>
                        <span className="text-[10px] text-bloom-400 font-mono">{h.symbol}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-200">{h.accountName}</div>
                        <span className="text-[10px] text-gray-400">
                          {h.category} • {h.assetClass}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-gray-300">{h.units}</td>
                      <td className="p-3 font-mono text-gray-300">{formatINR(h.averageBuyPrice)}</td>
                      <td className="p-3 font-mono text-white font-semibold">{formatINR(h.currentPrice)}</td>
                      <td className="p-3 font-mono font-bold text-white">{formatINR(h.currentValuation)}</td>
                      <td className="p-3 font-mono font-semibold">
                        <div
                          className={`flex items-center gap-1 ${
                            isGain ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isGain ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isGain ? "+" : ""}
                            {formatINR(h.unrealizedGainLoss)} ({h.unrealizedGainLossPercent}%)
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            h.sourceType === "SIMULATED"
                              ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                              : h.sourceType === "CONNECTED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                              : "bg-blue-950 text-blue-300 border border-blue-800/40"
                          }`}
                        >
                          {h.sourceType}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

