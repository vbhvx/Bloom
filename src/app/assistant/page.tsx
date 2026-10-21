"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Target,
  ExternalLink,
  Bot,
  User,
} from "lucide-react";

interface Citation {
  sourceTitle: string;
  quote: string;
  url?: string;
  relevanceScore: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isGatedRefusal?: boolean;
  calculatedScenario?: unknown;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "What is the new LTCG tax rate on mutual funds under Budget 2024?",
  "How does inflation affect my long term purchasing power?",
  "Calculate SIP required to accumulate ₹25 Lakhs in 5 years at 10% CAGR",
  "Which specific stock should I buy today for guaranteed profit?",
  "What is the difference between PPF and Sovereign Gold Bonds?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content:
        "Hello Aarav! I am Bloom's Financial Intelligence Assistant. I explain financial planning principles in plain language, verify facts against approved Indian regulatory sources (SEBI, RBI, Ministry of Finance), and invoke deterministic compounding calculators.\n\nHow can I help you plan your personal financial goals today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(textToSend?: string) {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/assistant/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: query.substring(0, 30),
          mode: "EDUCATION",
        }),
      });

      const convData = await res.json();
      const conversationId = convData.conversation?.id;

      const msgRes = await fetch(
        `/api/v1/assistant/conversations/${conversationId || "conv-direct"}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
          }),
        }
      );

      const msgData = await msgRes.json();

      const assistantMsg: Message = {
        id: msgData.messageId || `ast-${Date.now()}`,
        role: "assistant",
        content: msgData.reply,
        citations: msgData.citations || [],
        isGatedRefusal: msgData.isGatedRefusal || false,
        calculatedScenario: msgData.calculatedScenario,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error communicating with the grounded assistant service.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-bloom-400" />
          AI Financial Planning Assistant
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Grounded in official regulatory sources and linked directly to the deterministic calculation engine.
        </p>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="space-y-2">
        <span className="text-xs text-gray-400 font-medium">Try a suggested question:</span>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 text-xs text-left transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-6 min-h-[460px] flex flex-col justify-between space-y-4">
        <div className="space-y-5 overflow-y-auto max-h-[520px] pr-2">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-bloom-600/20 text-bloom-400 border border-bloom-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 max-w-xl text-xs space-y-3 ${
                    isUser
                      ? "bg-bloom-600 text-gray-950 font-medium ml-12"
                      : m.isGatedRefusal
                      ? "bg-amber-950/40 border border-amber-800/60 text-amber-200"
                      : "bg-gray-800/80 border border-gray-700/60 text-gray-200"
                  }`}
                >
                  <div className="leading-relaxed whitespace-pre-line">{m.content}</div>

                  {/* Citations Box */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="pt-3 border-t border-gray-700/60 space-y-2 text-[11px]">
                      <span className="font-semibold text-bloom-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Citations:
                      </span>
                      {m.citations.map((c, i) => (
                        <div key={i} className="p-2 rounded-lg bg-gray-950/60 border border-gray-800 text-gray-300 space-y-1">
                          <strong className="text-white block">{c.sourceTitle}</strong>
                          <p className="italic text-gray-400">&quot;{c.quote}&quot;</p>
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-bloom-400 hover:underline inline-flex items-center gap-1 text-[10px]"
                            >
                              Official Source <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 text-right">{m.timestamp}</div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gray-800 text-gray-300 border border-gray-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-gray-400">
              <div className="w-8 h-8 rounded-xl bg-bloom-600/20 text-bloom-400 border border-bloom-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span className="animate-pulse">Retrieving approved sources and calculating...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 pt-3 border-t border-gray-800"
        >
          <input
            type="text"
            placeholder="Ask about goals, SIP math, Indian taxes, or asset classes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bloom-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-bloom-600 hover:bg-bloom-500 text-gray-950 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

