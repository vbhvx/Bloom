"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Target,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  PiggyBank,
  CheckCircle2,
  Clock,
  Plus,
  Compass,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  PieChart,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface Goal {
  id: string;
  title: string;
  category: string;
  targetAmount: string;
  currency: string;
  targetDate: string;
  currentAllocatedSavings: string;
  monthlyContribution: string;
  priority: string;
  progressPercent: number;
  remainingMonths: number;
}

interface PortfolioSummary {
  totalNetWorth: string;
  liquidCashBalance: string;
  investedValuation: string;
  currency: string;
}

interface Allocation {
  assetClass: string;
  value: string;
  percentage: number;
}

export default function DashboardOverview() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Form state for creating new goal
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("WEALTH_CREATION");
  const [newTargetAmount, setNewTargetAmount] = useState("1000000");
  const [newTargetMonths, setNewTargetMonths] = useState(36);
  const [newCurrentSavings, setNewCurrentSavings] = useState("100000");
  const [newMonthlySIP, setNewMonthlySIP] = useState("20000");
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Fetch goals
        const goalsRes = await fetch("/api/v1/goals");
        if (goalsRes.ok) {
          const gData = await goalsRes.json();
          setGoals(gData.goals || []);
        }

        // Fetch portfolio summary
        const portRes = await fetch("/api/v1/portfolio/summary");
        if (portRes.ok) {
          const pData = await portRes.json();
          setPortfolio(pData.summary || null);
          setAllocations(pData.assetAllocation || []);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + Number(newTargetMonths));

      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          targetAmount: Number(newTargetAmount),
          currency: "INR",
          targetDate: targetDate.toISOString(),
          currentAllocatedSavings: Number(newCurrentSavings),
          monthlyContribution: Number(newMonthlySIP),
          priority: "HIGH",
        }),
      });

      if (res.ok) {
        setShowGoalModal(false);
        // Reload goals
        const refreshed = await fetch("/api/v1/goals");
        const data = await refreshed.json();
        setGoals(data.goals || []);
        setNewTitle("");
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create goal");
      }
    } catch {
      alert("Network error creating goal.");
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Namaste, Aarav
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-normal">
              Profile: Moderate Risk
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Track your financial goals, evaluate trade-offs, and monitor investments with verified provenance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bloom-600 hover:bg-bloom-500 text-gray-950 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-bloom-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Goal</span>
          </button>
          <a
            href="/assistant"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-200 font-medium text-xs border border-gray-700/60 transition-all"
          >
            <MessageSquare className="w-4 h-4 text-bloom-400" />
            <span>Ask AI Assistant</span>
          </a>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth Card */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Total Tracked Net Worth</span>
            <Wallet className="w-4 h-4 text-bloom-400" />
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              {portfolio ? formatINR(portfolio.totalNetWorth) : "₹10,32,600"}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/40 text-[10px]">
                Simulated Data
              </span>
              <span>Across 3 Accounts</span>
            </div>
          </div>
        </div>

        {/* Liquid Cash vs Invested */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Liquid Bank Balance</span>
            <PiggyBank className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              {portfolio ? formatINR(portfolio.liquidCashBalance) : "₹1,50,000"}
            </span>
            <p className="text-[11px] text-cyan-300/80">Withdrawable Cash in HDFC Savings</p>
          </div>
        </div>

        {/* Invested Valuation */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Market Investments</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              {portfolio ? formatINR(portfolio.investedValuation) : "₹8,82,600"}
            </span>
            <p className="text-[11px] text-indigo-300/80">Mutual Funds, SGBs & PPF</p>
          </div>
        </div>

        {/* Active Goals Meter */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Active Financial Goals</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              {goals.length} Goals
            </span>
            <p className="text-[11px] text-emerald-300/80">All deterministic plans active</p>
          </div>
        </div>
      </div>

      {/* Goal Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-bloom-400" />
              Your Priority Financial Goals
            </h2>
            <p className="text-xs text-gray-400">
              Deterministic calculations based on exact compounding and inflation assumptions.
            </p>
          </div>
          <a href="/goals" className="text-xs text-bloom-400 hover:text-bloom-300 font-medium flex items-center gap-1">
            <span>Manage All Goals</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {loading ? (
          <div className="p-8 rounded-2xl bg-gray-900/40 border border-gray-800 text-center text-gray-400 text-xs">
            Loading your financial goals...
          </div>
        ) : goals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-gray-900/40 border border-gray-800 text-center space-y-3">
            <Target className="w-8 h-8 text-gray-500 mx-auto" />
            <h3 className="text-sm font-semibold text-gray-200">No Goals Created Yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Start by defining a personal financial goal like an Emergency Fund or Home Purchase.
            </p>
            <button
              onClick={() => setShowGoalModal(true)}
              className="px-4 py-2 rounded-xl bg-bloom-600 text-gray-950 font-semibold text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.map((g) => {
              const targetDateStr = new Date(g.targetDate).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              });
              return (
                <div
                  key={g.id}
                  className="rounded-2xl bg-gray-900/70 border border-gray-800/80 p-5 space-y-4 hover:border-gray-700 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {g.category.replace("_", " ")}
                      </span>
                      <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {targetDateStr} ({g.remainingMonths}m left)
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{g.title}</h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-bloom-400 tracking-tight">
                          {formatINR(g.currentAllocatedSavings)}
                        </span>
                        <span className="text-xs text-gray-400">of {formatINR(g.targetAmount)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-bloom-600 to-bloom-400 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, g.progressPercent))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>{g.progressPercent}% Funded</span>
                        <span>Planned SIP: {formatINR(g.monthlyContribution)}/m</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Priority: <strong className="text-gray-200">{g.priority}</strong>
                    </span>
                    <a
                      href={`/goals/${g.id}`}
                      className="text-xs font-semibold text-bloom-400 hover:text-bloom-300 flex items-center gap-1 group"
                    >
                      <span>Simulate Scenarios</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Asset Allocation & Provenance Notice Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Class Allocation */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-bloom-400" />
                Portfolio Asset Allocation
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Diversification breakdown across Equities, Debt, Gold & Liquid cash.
              </p>
            </div>
            <a href="/portfolio" className="text-xs text-bloom-400 hover:text-bloom-300 font-medium">
              View Holdings →
            </a>
          </div>

          <div className="space-y-3 pt-2">
            {allocations.map((a) => (
              <div key={a.assetClass} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-300">{a.assetClass.replace("_", " ")}</span>
                  <span className="text-gray-400">
                    {formatINR(a.value)} ({a.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      a.assetClass === "EQUITY"
                        ? "bg-bloom-500"
                        : a.assetClass === "COMMODITY"
                        ? "bg-amber-500"
                        : a.assetClass === "DEBT"
                        ? "bg-blue-500"
                        : "bg-cyan-500"
                    }`}
                    style={{ width: `${Math.max(2, a.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provenance & Methodology Explanations */}
        <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Financial Provenance
          </h3>
          <ul className="text-xs text-gray-400 space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Decimal Accuracy:</strong> Calculations run using 30-digit decimal arithmetic, eliminating JavaScript binary floating-point round-off flaws.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Data Provenance:</strong> Simulated demo records are strictly segregated from real accounts. Mutual Fund NAVs verify against official AMFI feeds.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Downside Scenarios:</strong> Projections display baseline, adverse downside (-3.5% CAGR), and inflation-adjusted targets rather than guaranteed promises.
              </span>
            </li>
          </ul>
          <div className="pt-2">
            <a
              href="/compliance"
              className="block text-center text-xs py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium border border-gray-700/60 transition-colors"
            >
              Inspect Regulatory Compliance Register
            </a>
          </div>
        </div>
      </div>

      {/* Create Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-bloom-400" />
                Create Financial Goal
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher Education or Car Purchase"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-bloom-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-bloom-500"
                  >
                    <option value="EMERGENCY_FUND">Emergency Fund</option>
                    <option value="HOME_PURCHASE">Home Purchase</option>
                    <option value="RETIREMENT">Retirement</option>
                    <option value="EDUCATION">Education</option>
                    <option value="WEALTH_CREATION">Wealth Creation</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Target Horizon (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={newTargetMonths}
                    onChange={(e) => setNewTargetMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-bloom-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={newTargetAmount}
                    onChange={(e) => setNewTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-bloom-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Current Allocated Savings (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newCurrentSavings}
                    onChange={(e) => setNewCurrentSavings(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-bloom-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Planned Monthly SIP Contribution (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={newMonthlySIP}
                  onChange={(e) => setNewMonthlySIP(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-bloom-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700 text-[11px] text-gray-400">
                <strong>Methodology:</strong> Bloom will automatically compute Baseline (10% CAGR), Favorable (12.5%), Adverse (6.5%), and Inflation-Adjusted targets for this goal.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-bloom-600 hover:bg-bloom-500 text-gray-950 font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : "Save & Calculate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
