"use client";

import { useEffect, useState } from "react";
import {
  Target,
  Plus,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  DollarSign,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: string;
  currency: string;
  targetDate: string;
  currentAllocatedSavings: string;
  monthlyContribution: string;
  priority: string;
  status: string;
  progressPercent: number;
  remainingMonths: number;
  latestScenario?: {
    baselineFV: string;
    favorableFV: string;
    adverseFV: string;
    requiredMonthlyContribution: string;
  };
}

export default function GoalsListPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("WEALTH_CREATION");
  const [targetAmount, setTargetAmount] = useState("2000000");
  const [months, setMonths] = useState(60);
  const [currentSavings, setCurrentSavings] = useState("200000");
  const [monthlySIP, setMonthlySIP] = useState("25000");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);

  async function loadGoals() {
    try {
      const res = await fetch("/api/v1/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + Number(months));

      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          targetAmount: Number(targetAmount),
          currency: "INR",
          targetDate: targetDate.toISOString(),
          currentAllocatedSavings: Number(currentSavings),
          monthlyContribution: Number(monthlySIP),
          priority,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setTitle("");
        loadGoals();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create goal");
      }
    } catch {
      alert("Error submitting goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-bloom-400" />
            Financial Goals & Planning
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Build personal goals with target dates, contribution plans, and verifiable compounding scenarios.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bloom-600 hover:bg-bloom-500 text-gray-950 font-semibold text-xs transition-all shadow-lg shadow-bloom-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="p-12 rounded-2xl bg-gray-900/60 border border-gray-800 text-center space-y-4">
          <Target className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-base font-semibold text-gray-200">No Goals Created</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            A goal-first investing strategy begins with defining what you are saving for.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-bloom-600 text-gray-950 text-xs font-semibold"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const targetDateStr = new Date(goal.targetDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6 hover:border-gray-700 transition-all space-y-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {goal.category.replace("_", " ")}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          goal.priority === "HIGH"
                            ? "bg-red-950 text-red-400 border border-red-800/60"
                            : "bg-blue-950 text-blue-400 border border-blue-800/60"
                        }`}
                      >
                        {goal.priority} Priority
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{goal.title}</h2>
                    {goal.description && <p className="text-xs text-gray-400">{goal.description}</p>}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">Target Date</span>
                      <span className="text-sm font-semibold text-gray-200">{targetDateStr}</span>
                      <span className="text-[11px] text-gray-500 block">({goal.remainingMonths} months left)</span>
                    </div>
                    <a
                      href={`/goals/${goal.id}`}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-bloom-400 font-semibold text-xs border border-gray-700 transition-colors"
                    >
                      <span>Simulate & Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Progress bar & Metric row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-950/50 border border-gray-800/60 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Target Amount</span>
                    <span className="text-base font-bold text-white">{formatINR(goal.targetAmount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Current Allocated Savings</span>
                    <span className="text-base font-bold text-bloom-400">
                      {formatINR(goal.currentAllocatedSavings)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Monthly Planned Contribution</span>
                    <span className="text-base font-bold text-indigo-400">
                      {formatINR(goal.monthlyContribution)}/m
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Baseline Projected Value (at 10%)</span>
                    <span className="text-base font-bold text-emerald-400">
                      {goal.latestScenario
                        ? formatINR(goal.latestScenario.baselineFV)
                        : formatINR(goal.targetAmount)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-bloom-600 to-bloom-400"
                      style={{ width: `${Math.min(100, Math.max(3, goal.progressPercent))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>{goal.progressPercent}% of target currently saved</span>
                    <span>
                      {goal.latestScenario && (
                        <span>
                          Required SIP to reach target:{" "}
                          <strong className="text-gray-200">
                            {formatINR(goal.latestScenario.requiredMonthlyContribution)}/m
                          </strong>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Financial Goal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Retirement Corpus 2040"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white"
                  >
                    <option value="WEALTH_CREATION">Wealth Creation</option>
                    <option value="RETIREMENT">Retirement</option>
                    <option value="HOME_PURCHASE">Home Purchase</option>
                    <option value="EMERGENCY_FUND">Emergency Fund</option>
                    <option value="EDUCATION">Education</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Horizon (Months)</label>
                  <input
                    type="number"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Current Savings (₹)</label>
                  <input
                    type="number"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-1">Monthly Planned SIP (₹)</label>
                <input
                  type="number"
                  value={monthlySIP}
                  onChange={(e) => setMonthlySIP(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-bloom-600 text-gray-950 font-semibold"
                >
                  {saving ? "Saving..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

