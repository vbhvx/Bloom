"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  FileText,
  Scale,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
} from "lucide-react";

interface GateRecord {
  featureKey: string;
  featureName: string;
  status: "ENABLED" | "DISABLED" | "SANDBOX_ONLY" | "REVIEW_REQUIRED";
  governingAuthority: string;
  legalBasis: string;
  justification: string;
  reviewedBy: string;
  reviewDate: string;
  notes?: string;
}

interface OrderPreviewResult {
  symbol: string;
  exchange: string;
  quantity: number;
  estimatedPrice: string;
  estimatedTotal: string;
  brokerageFee: string;
  sebiTurnoverFee: string;
  sttCtt: string;
  stampDuty: string;
  estimatedNetValue: string;
  confirmationToken: string;
}

export default function ComplianceRegisterPage() {
  const [gates, setGates] = useState<GateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Brokerage sandbox test state
  const [testSymbol, setTestSymbol] = useState("NIFTY50_INDEX");
  const [testQty, setTestQty] = useState(10);
  const [preview, setPreview] = useState<OrderPreviewResult | null>(null);
  const [orderResult, setOrderResult] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    async function loadGates() {
      try {
        const res = await fetch("/api/v1/compliance/gates");
        if (res.ok) {
          const data = await res.json();
          setGates(data.gates || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadGates();
  }, []);

  async function handlePreview() {
    setOrderResult(null);
    try {
      const res = await fetch("/api/v1/brokerage/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: testSymbol,
          exchange: "NSE",
          transactionType: "BUY",
          quantity: Number(testQty),
          estimatedUnitPrice: 184.42,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPreview(data.preview);
      } else {
        alert(data.error?.message || "Preview failed");
      }
    } catch {
      alert("Error generating order preview");
    }
  }

  async function handleExecuteOrder(attemptLive: boolean) {
    if (!preview) return;
    setExecuting(true);
    setOrderResult(null);
    try {
      const res = await fetch("/api/v1/brokerage/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: testSymbol,
          exchange: "NSE",
          transactionType: "BUY",
          productType: "CNC",
          orderType: "MARKET",
          quantity: Number(testQty),
          price: 184.42,
          idempotencyKey: `idem-manual-${Date.now()}`,
          userConfirmationToken: preview.confirmationToken,
          isSandbox: !attemptLive,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrderResult(
          `✓ SUCCESS: ${data.orderResult?.message} (Order ID: ${data.orderResult?.orderId})`
        );
      } else {
        setOrderResult(
          `✕ GATE BLOCKED (${res.status} Forbidden): ${data.error?.message || "Action prohibited by server-side compliance gate."}`
        );
      }
    } catch {
      setOrderResult("Network error testing order execution.");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-bloom-400" />
          Regulatory Compliance Register & Feature Gates
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Server-side access controls, statutory authority registers, and verified partner boundary enforcement.
        </p>
      </div>

      {/* Feature Gates Table */}
      <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-bloom-400" />
            Live Regulatory Feature Gate Statuses
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            The platform server strictly blocks prohibited endpoints at the API layer regardless of UI state.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading regulatory approvals...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-gray-400 font-semibold text-[11px]">
                  <th className="p-3">Feature Name & Key</th>
                  <th className="p-3">Authority</th>
                  <th className="p-3">Gate Status</th>
                  <th className="p-3">Governing Legal Basis</th>
                  <th className="p-3">Compliance Justification</th>
                  <th className="p-3">Review Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {gates.map((g) => {
                  const isEnabled = g.status === "ENABLED";
                  const isSandbox = g.status === "SANDBOX_ONLY";
                  return (
                    <tr key={g.featureKey} className="hover:bg-gray-800/20 transition-colors">
                      <td className="p-3">
                        <strong className="text-white block">{g.featureName}</strong>
                        <span className="font-mono text-[10px] text-gray-500">{g.featureKey}</span>
                      </td>
                      <td className="p-3 font-semibold text-gray-300">{g.governingAuthority}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isEnabled
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                              : isSandbox
                              ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                              : "bg-rose-950 text-rose-300 border border-rose-800/60"
                          }`}
                        >
                          {g.status}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-gray-300">{g.legalBasis}</td>
                      <td className="p-3 text-[11px] text-gray-400 max-w-xs">{g.justification}</td>
                      <td className="p-3 text-[10px] text-gray-500 font-mono">
                        {new Date(g.reviewDate).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Brokerage Sandbox Verification Console */}
      <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-bloom-400" />
            Interactive Brokerage Order & Gate Verification Console
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Test transparent fee calculation in sandbox mode, and verify that attempting live exchange routing is strictly rejected by the server-side gate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Target Instrument</label>
            <input
              type="text"
              value={testSymbol}
              onChange={(e) => setTestSymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Quantity (Units)</label>
            <input
              type="number"
              min="1"
              value={testQty}
              onChange={(e) => setTestQty(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handlePreview}
              className="w-full py-2 rounded-xl bg-bloom-600 hover:bg-bloom-500 text-gray-950 font-semibold text-xs"
            >
              Generate Transparent Fee Preview
            </button>
          </div>
        </div>

        {/* Preview Output */}
        {preview && (
          <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-4 animate-fade-in text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-gray-500 block text-[11px]">Gross Investment</span>
                <span className="text-sm font-bold text-white">₹{preview.estimatedTotal}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Brokerage Fee</span>
                <span className="text-sm font-bold text-emerald-400">₹{preview.brokerageFee} (₹0 Delivery)</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Securities Transaction Tax (STT)</span>
                <span className="text-sm font-bold text-amber-400">₹{preview.sttCtt}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Stamp Duty + SEBI Fee</span>
                <span className="text-sm font-bold text-gray-200">₹{preview.stampDuty}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-gray-400">Net Estimated Payable: </span>
                <strong className="text-base text-white">₹{preview.estimatedNetValue}</strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExecuteOrder(false)}
                  disabled={executing}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-bloom-400 font-semibold text-xs border border-gray-700 disabled:opacity-50"
                >
                  Test Sandbox Order
                </button>
                <button
                  onClick={() => handleExecuteOrder(true)}
                  disabled={executing}
                  className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-semibold text-xs border border-rose-800/60 disabled:opacity-50"
                  title="Should be rejected with 403 Forbidden under regulatory gate"
                >
                  Attempt Live Order (Gate Test)
                </button>
              </div>
            </div>

            {orderResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono ${
                  orderResult.startsWith("✓")
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                    : "bg-rose-950/60 border-rose-800 text-rose-300"
                }`}
              >
                {orderResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

