"use client";

import { useEffect, useState } from "react";
import {
  Link2,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Trash2,
  CheckCircle2,
  Lock,
  Plus,
  ExternalLink,
} from "lucide-react";

interface Connection {
  id: string;
  providerCode: string;
  providerName: string;
  providerCategory: string;
  status: "ACTIVE" | "REVOKED" | "PENDING" | "EXPIRED";
  consentId?: string;
  permittedScopes: {
    fiTypes?: string[];
    readOnly?: boolean;
    fetchFrequency?: string;
  };
  consentGrantedAt?: string;
  consentExpiresAt?: string;
  lastSyncAt?: string;
  syncError?: string;
  isSandbox: boolean;
  recentSyncRuns: Array<{
    id: string;
    status: string;
    recordsFetched: number;
    startedAt: string;
  }>;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function loadConnections() {
    try {
      const res = await fetch("/api/v1/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
  }, []);

  async function handleStartConsent() {
    setConnecting(true);
    try {
      const res = await fetch("/api/v1/connections/SETU_AA/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fiTypes: ["DEPOSIT", "TERM_DEPOSIT", "MUTUAL_FUNDS"],
          purposeCode: "WEALTH_PLANNING_PORTFOLIO_AGGREGATION",
          dataLifeMonths: 12,
          fetchFrequency: "MONTHLY",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage("Account Aggregator consent successfully generated and synced!");
        loadConnections();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.error?.message || "Failed to start connection");
      }
    } catch {
      alert("Network error connecting to Account Aggregator");
    } finally {
      setConnecting(false);
    }
  }

  async function handleRevoke(connectionId: string) {
    if (!confirm("Revoke this consent? Bloom will immediately lose read access and cancel future syncs.")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/connections/${connectionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Consent successfully revoked.");
        loadConnections();
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error?.message || "Failed to revoke consent");
      }
    } catch {
      alert("Network error revoking consent");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Link2 className="w-6 h-6 text-bloom-400" />
            Financial Account Connections & Consents
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Authorized Account Aggregator (AA) integrations, explicit consent parameters, and immediate revocation controls.
          </p>
        </div>

        <button
          onClick={handleStartConsent}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bloom-600 hover:bg-bloom-500 text-gray-950 font-semibold text-xs transition-all shadow-md shadow-bloom-600/20 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{connecting ? "Initiating Consent..." : "Connect Account (Setu AA)"}</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Security Principles Banner */}
      <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-bloom-400" />
          Strict RBI Account Aggregator Guarantees
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
          <div className="space-y-1">
            <strong className="text-gray-200 block">No Passwords or OTPs:</strong>
            <span>Bloom never requests or stores your netbanking passwords or OTPs. Authorization happens through encrypted RBI AA handles.</span>
          </div>
          <div className="space-y-1">
            <strong className="text-gray-200 block">Read-Only Scopes:</strong>
            <span>Connections are strictly read-only for balance and statement aggregation. No provider connection can execute payments or transfers.</span>
          </div>
          <div className="space-y-1">
            <strong className="text-gray-200 block">Unconditional Revocation:</strong>
            <span>You retain complete ownership over your data. You may revoke consent at any moment with one click.</span>
          </div>
        </div>
      </div>

      {/* Connections List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Active Account Authorizations</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading account connections...</div>
        ) : connections.length === 0 ? (
          <div className="p-10 rounded-2xl bg-gray-900/60 border border-gray-800 text-center space-y-3">
            <Link2 className="w-8 h-8 text-gray-500 mx-auto" />
            <h3 className="text-sm font-semibold text-gray-200">No Account Connections Configured</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Connect an account via our Account Aggregator sandbox to import verified mutual fund folios and bank balances.
            </p>
            <button
              onClick={handleStartConsent}
              className="px-4 py-2 rounded-xl bg-bloom-600 text-gray-950 font-semibold text-xs"
            >
              Start Sandbox Connection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {connections.map((c) => {
              const isActive = c.status === "ACTIVE";
              return (
                <div
                  key={c.id}
                  className="rounded-2xl bg-gray-900/70 border border-gray-800 p-5 space-y-4 hover:border-gray-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{c.providerName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isActive
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                              : "bg-gray-800 text-gray-400 border border-gray-700"
                          }`}
                        >
                          {c.status}
                        </span>
                        {c.isSandbox && (
                          <span className="text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                            Sandbox
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono">Consent ID: {c.consentId || c.id}</p>
                    </div>

                    {isActive && (
                      <button
                        onClick={() => handleRevoke(c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 text-xs font-semibold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke Consent</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-400">
                    <div>
                      <span className="block text-[11px] text-gray-500">Permitted Scopes</span>
                      <span className="font-medium text-gray-300">
                        {c.permittedScopes?.fiTypes?.join(", ") || "DEPOSIT, MUTUAL_FUNDS"} (Read-Only)
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-gray-500">Granted On</span>
                      <span className="font-medium text-gray-300">
                        {c.consentGrantedAt
                          ? new Date(c.consentGrantedAt).toLocaleDateString("en-IN")
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-gray-500">Consent Expires</span>
                      <span className="font-medium text-gray-300">
                        {c.consentExpiresAt
                          ? new Date(c.consentExpiresAt).toLocaleDateString("en-IN")
                          : "12 Months"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

