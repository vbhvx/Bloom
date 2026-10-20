"use client";

import { use, useEffect, useState, useMemo } from "react";
import {
  Target,
  TrendingUp,
  ArrowLeft,
  Sliders,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Info,
  Save,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  calculatePlanningScenarios,
  ScenarioResult,
} from "@/server/finance/calculations";
import { formatINR } from "@/lib/decimal";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface GoalDetail {
  id: string;
  title: string;
  description?: string;
  category: string;
  targetAmount: string;
  currency: string;
  targetDate: string;
  currentAllocatedSavings: string;
  monthlyContribution: string;
  priority: string;
  scenarios: Array<{
    id: string;
    name: string;
    baselineFV: string;
    favorableFV: string;
    adverseFV: string;
    totalContributions: string;
    baselineGrowth: string;
    calculatedAt: string;
  }>;
}

export default function GoalScenarioPlannerPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = use(params);

  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive Scenario Inputs
  const [returnRate, setReturnRate] = useState(10.0); // 10%
  const [inflationRate, setInflationRate] = useState(6.0); // 6%
  const [monthlySIP, setMonthlySIP] = useState(25000);
  const [currentSavings, setCurrentSavings] = useState(200000);
  const [horizonMonths, setHorizonMonths] = useState(60);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGoal() {
      try {
        const res = await fetch(`/api/v1/goals/${goalId}`);
        if (res.ok) {
          const data = await res.json();
          const g = data.goal as GoalDetail;
          setGoal(g);

          // Initialize sliders from goal values
          setCurrentSavings(Number(g.currentAllocatedSavings) || 0);
          setMonthlySIP(Number(g.monthlyContribution) || 0);

          const targetDate = new Date(g.targetDate);
          const now = new Date();
          const diffMonths = Math.max(
            1,
            Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
          );
          setHorizonMonths(diffMonths);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchGoal();
  }, [goalId]);

  // Compute deterministic scenario outputs in real-time
  const scenarioResult: ScenarioResult | null = useMemo(() => {
    if (!goal) return null;
    try {
      const favorable = Math.min(25, returnRate + 2.5);
      const adverse = Math.max(0, returnRate - 3.5);

      return calculatePlanningScenarios({
        targetAmount: goal.targetAmount,
        currentSavings,
        monthlyContribution: monthlySIP,
        timeHorizonMonths: horizonMonths,
        baselineReturnRateAnnual: (returnRate / 100).toFixed(4),
        favorableReturnRateAnnual: (favorable / 100).toFixed(4),
        adverseReturnRateAnnual: (adverse / 100).toFixed(4),
        inflationRateAnnual: (inflationRate / 100).toFixed(4),
        currency: goal.currency || "INR",
      });
    } catch (e) {
      console.error("Calculation error:", e);
      return null;
    }
  }, [goal, currentSavings, monthlySIP, horizonMonths, returnRate, inflationRate]);

  async function handleSaveScenario() {
    if (!goal || !scenarioResult) return;
    setIsSavingScenario(true);
    try {
      const res = await fetch(`/api/v1/goals/${goalId}/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${returnRate}% Return (${horizonMonths}m Plan)`,
          baselineReturnRateAnnual: returnRate / 100,
          favorableReturnRateAnnual: (returnRate + 2.5) / 100,
          adverseReturnRateAnnual: Math.max(0, (returnRate - 3.5) / 100),
          inflationRateAnnual: inflationRate / 100,
          monthlyContribution: monthlySIP,
          currentSavings,
          timeHorizonMonths: horizonMonths,
        }),
      });

      if (res.ok) {
        setSaveSuccessMessage("Scenario snapshot successfully saved to database!");
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      }
    } catch {
      alert("Error saving scenario");
    } finally {
      setIsSavingScenario(false);
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-xs text-gray-400">Loading goal scenario planner...</div>;
  }

  if (!goal || !scenarioResult) {
    return (
      <div className="p-8 text-center text-xs text-red-400">
        Goal not found or calculation input error.
      </div>
    );
  }

  const chartData = scenarioResult.trajectory.map((pt) => ({
    label: pt.month === 0 ? "Now" : `M${pt.month}`,
    invested: Number(pt.totalInvested),
    baseline: Number(pt.baselineValue),
    favorable: Number(pt.favorableValue),
    adverse: Number(pt.adverseValue),
    targetInflation: Number(pt.inflationAdjustedTarget),
  }));

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <a
            href="/goals"
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Goals
          </a>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-bloom-400" />
            {goal.title}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Target: <strong>{formatINR(goal.targetAmount)}</strong> • Category: {goal.category.replace("_", " ")} • Target Date: {new Date(goal.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccessMessage && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saveSuccessMessage}
            </span>
          )}
          <button
            onClick={handleSaveScenario}
            disabled={isSavingScenario}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bloom-600 hover:bg-bloom-500 text-gray-950 font-semibold text-xs tracking-wide shadow-md shadow-bloom-600/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingScenario ? "Saving..." : "Save Scenario Snapshot"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Scenario Controls & Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Interactive Sliders Workbench */}
        <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-bloom-400" />
              Scenario Assumption Sliders
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">v1.0 Decimal Engine</span>
          </div>

          {/* Slider 1: Return Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Assumed Baseline Return (CAGR)</span>
              <span className="font-bold text-bloom-400">{returnRate.toFixed(1)}% p.a.</span>
            </div>
            <input
              type="range"
              min="4"
              max="18"
              step="0.5"
              value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
              className="w-full accent-bloom-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>4% (Conservative FD)</span>
              <span>10% (Hybrid/Index)</span>
              <span>18% (Aggressive Equity)</span>
            </div>
          </div>

          {/* Slider 2: Inflation Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Assumed Annual Inflation</span>
              <span className="font-bold text-amber-400">{inflationRate.toFixed(1)}% p.a.</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="0.5"
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>3% (Low)</span>
              <span>6% (Historical RBI Target)</span>
              <span>10% (High Inflation)</span>
            </div>
          </div>

          {/* Slider 3: Monthly SIP */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Monthly SIP Contribution</span>
              <span className="font-bold text-indigo-400">{formatINR(monthlySIP)}/m</span>
            </div>
            <input
              type="range"
              min="1000"
              max="150000"
              step="1000"
              value={monthlySIP}
              onChange={(e) => setMonthlySIP(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>₹1,000/m</span>
              <span>₹50,000/m</span>
              <span>₹1.5L/m</span>
            </div>
          </div>

          {/* Slider 4: Time Horizon */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-medium">Time Horizon</span>
              <span className="font-bold text-gray-200">
                {horizonMonths} Months ({(horizonMonths / 12).toFixed(1)} Years)
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="360"
              step="6"
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
              className="w-full accent-gray-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>6 Months</span>
              <span>5 Years</span>
              <span>30 Years</span>
            </div>
          </div>

          {/* Quick Input: Current Savings */}
          <div className="space-y-1.5 pt-2 border-t border-gray-800">
            <label className="text-xs text-gray-300 font-medium block">Starting Allocated Savings (₹)</label>
            <input
              type="number"
              step="5000"
              value={currentSavings}
              onChange={(e) => setCurrentSavings(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white text-xs font-mono"
            />
          </div>
        </div>

        {/* Right 2 Cols: Scenario Cards & Interactive Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Output Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Baseline */}
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4 space-y-1">
              <span className="text-[11px] text-gray-400 block font-medium">
                Baseline ({returnRate.toFixed(1)}%)
              </span>
              <span className="text-lg font-bold text-bloom-400">
                {formatINR(scenarioResult.outputs.baselineFV)}
              </span>
              <span className="text-[10px] text-gray-500 block">Expected middle projection</span>
            </div>

            {/* Favorable */}
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4 space-y-1">
              <span className="text-[11px] text-gray-400 block font-medium">
                Favorable ({(returnRate + 2.5).toFixed(1)}%)
              </span>
              <span className="text-lg font-bold text-emerald-400">
                {formatINR(scenarioResult.outputs.favorableFV)}
              </span>
              <span className="text-[10px] text-gray-500 block">Strong bull cycle</span>
            </div>

            {/* Adverse Downside */}
            <div className="rounded-xl bg-gray-900/80 border border-amber-900/40 bg-amber-950/20 p-4 space-y-1">
              <span className="text-[11px] text-amber-300 block font-medium">
                Adverse ({Math.max(0, returnRate - 3.5).toFixed(1)}%)
              </span>
              <span className="text-lg font-bold text-amber-400">
                {formatINR(scenarioResult.outputs.adverseFV)}
              </span>
              <span className="text-[10px] text-amber-400/70 block">Market stress cushion</span>
            </div>

            {/* Inflation Adjusted Target */}
            <div className="rounded-xl bg-gray-900/80 border border-indigo-900/40 bg-indigo-950/20 p-4 space-y-1">
              <span className="text-[11px] text-indigo-300 block font-medium">
                Inflation Target ({inflationRate}%)
              </span>
              <span className="text-lg font-bold text-indigo-400">
                {formatINR(scenarioResult.outputs.inflationAdjustedTarget)}
              </span>
              <span className="text-[10px] text-indigo-300/70 block">Target in future purchasing power</span>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-bloom-400" />
                  Growth Trajectory & Downside Band
                </h3>
                <p className="text-[11px] text-gray-400">
                  Visualizing contributions vs baseline growth vs adverse scenario over {horizonMonths} months.
                </p>
              </div>
              <div className="text-xs text-gray-300 font-medium">
                Total Out-of-Pocket Invested:{" "}
                <strong className="text-white">{formatINR(scenarioResult.outputs.totalContributions)}</strong>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFavorable" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorAdverse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      borderColor: "#374151",
                      borderRadius: "0.75rem",
                      fontSize: "0.75rem",
                    }}
                    formatter={(val: any) => [formatINR(Number(val) || 0)]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Area
                    type="monotone"
                    dataKey="favorable"
                    name="Favorable (+2.5%)"
                    stroke="#10b981"
                    fill="url(#colorFavorable)"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline (Expected)"
                    stroke="#22c55e"
                    fill="url(#colorBaseline)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="adverse"
                    name="Adverse Downside"
                    stroke="#f59e0b"
                    fill="url(#colorAdverse)"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    name="Total Invested Capital"
                    stroke="#9ca3af"
                    strokeDasharray="4 4"
                    fill="none"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plain-Language Financial Trade-off Analysis */}
          <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-bloom-400" />
              Transparent Trade-Off Analysis
            </h4>
            <div className="text-xs text-gray-300 space-y-2 leading-relaxed">
              <p>
                • <strong>Target Feasibility:</strong> Under your current plan (₹{monthlySIP.toLocaleString("en-IN")}/month at {returnRate}% CAGR), you are projected to reach{" "}
                <strong className="text-bloom-400">{formatINR(scenarioResult.outputs.baselineFV)}</strong>.{" "}
                {scenarioResult.outputs.isTargetMetInBaseline ? (
                  <span className="text-emerald-400">This fully meets your target of {formatINR(goal.targetAmount)}.</span>
                ) : (
                  <span className="text-amber-400">
                    There is a shortfall of {formatINR(Math.abs(Number(scenarioResult.outputs.targetShortfallOrSurplus)))}. To bridge this shortfall, your required monthly contribution is <strong>{formatINR(scenarioResult.outputs.requiredMonthlyContribution)}/m</strong>.
                  </span>
                )}
              </p>
              <p>
                • <strong>Downside Resilience:</strong> If financial markets suffer extended downturns and yield only {Math.max(0, returnRate - 3.5).toFixed(1)}% CAGR, your portfolio is estimated at{" "}
                <strong className="text-amber-400">{formatINR(scenarioResult.outputs.adverseFV)}</strong>. Notice that even under adverse returns, compounding your monthly savings creates substantial capital above your contributions.
              </p>
              <p>
                • <strong>Inflation Impact:</strong> At an assumed inflation of {inflationRate}% per annum, goods and services costing {formatINR(goal.targetAmount)} today will cost{" "}
                <strong className="text-indigo-400">{formatINR(scenarioResult.outputs.inflationAdjustedTarget)}</strong> by the end of {horizonMonths} months.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
