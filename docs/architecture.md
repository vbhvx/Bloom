# System Architecture: Goal-First Financial Intelligence Platform (Bloom)

## 1. Architectural Philosophy

Bloom is designed around a fundamental fintech premise: **start with retail investors' life goals, ground numerical projections in deterministic mathematics, and strictly segregate educational guidance from regulated advice and live trade routing.**

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                            │
│  Next.js 15 App Router • Tailwind CSS • Responsive Responsive UI     │
│  - Financial Overview Dashboard       - Interactive Scenario Simulator │
│  - Instrument Discovery & Comparison  - AI Financial Assistant (Grounded)│
│  - RBI Account Aggregator Consents    - Regulatory Feature Gate Audit  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Runtime Typed APIs (Zod)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Domain & Security Services                       │
│                                                                        │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────┐ │
│  │ Financial Calculation │ │ Regulatory Feature   │ │ AI Assistant   │ │
│  │ Engine (Decimal.js)   │ │ Gatekeeper           │ │ Grounded       │ │
│  │ - 30-digit precision  │ │ - SEBI IA 2013 Check │ │ Knowledge      │ │
│  │ - Annuity/Lump Sum    │ │ - Live Broker Gate   │ │ Retriever      │ │
│  │ - Inflation Indexing  │ │ - AA Sandbox Rules   │ │ - Citations    │ │
│  └───────────────────────┘ └──────────────────────┘ └────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Provider-Adapter Abstraction Layer                  │
│                                                                        │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────┐ │
│  │ Simulated Fixtures    │ │ AMFI Live Market     │ │ Account        │ │
│  │ - Deterministic Seed  │ │ - Official Daily NAV │ │ Aggregator     │ │
│  │ - source=SIMULATED    │ │ - 10,000+ Schemes    │ │ - Setu Gateway │ │
│  │ - Reset Protection    │ │ - EOD NAV Parser     │ │ - Read-Only    │ │
│  └───────────────────────┘ └──────────────────────┘ └────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Brokerage Integration Adapter (Zerodha Kite Connect Sandbox)     │  │
│  │ - Itemized STT, Stamp Duty, SEBI turnover fees, Idempotency Keys │  │
│  │ - Hard Server-Side Gate: Live execution rejected with 403        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   Data Persistence & Audit Tier                        │
│            PostgreSQL 16 Relational Engine + Prisma ORM               │
│  - users, profiles, goals, scenarios, accounts, holdings, audit_events │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Modules

### 2.1 Financial Calculation Engine (`src/server/finance/calculations.ts`)
- **Isolation:** Completely decoupled from HTTP route handlers and external network state.
- **Precision:** Configured with `decimal.js` at 30-digit precision with `Decimal.ROUND_HALF_UP`.
- **Reproducibility:** Every planning scenario is tagged with `formulaVersion: "v1.0.0"` and saves all raw inputs, compounding methods, and output metrics in the database.
- **Formulas:** Implements Lump Sum FV, Ordinary Annuities (end-of-period), Annuities Due (start-of-period), Required Contributions, Inflation-Adjusted Purchasing Power Targets, and Real Returns via the Fisher equation.

### 2.2 Provider-Adapter Architecture (`src/server/providers/`)
The system enforces strict data provenance by tagging all price, holding, and account records with provenance metadata:
- `providerId`: Identity of upstream feed (`AMFI`, `SIMULATED_FIXTURES`, `SETU_AA`, `ZERODHA`).
- `dataStatus`: Data state (`REALTIME`, `DELAYED`, `END_OF_DAY`, `STALE`, `UNAVAILABLE`).
- `isSimulated`: Boolean flag. A simulated observation is never presented as a real market quote.
- `validityStatus`: Provenance verification status (`VALID`, `STALE`, `DISCREPANT`).

### 2.3 Regulatory Feature Gatekeeper (`src/server/security/gates.ts`)
- Implements server-side guards for regulated activities under Indian financial laws.
- Features like `PERSONALIZED_SECURITIES_ADVICE` and `LIVE_BROKERAGE_EXECUTION` are evaluated against `regulatory_approvals` in PostgreSQL.
- Prohibited endpoints return structured `403 Forbidden` responses with statutory citations (e.g. SEBI Investment Advisers Regulations 2013).

### 2.4 Grounded AI Financial Assistant (`src/server/ai/assistantService.ts`)
- Uses database-backed knowledge chunks from official regulators (SEBI circulars, RBI directives, Union Budget 2024 tax acts).
- Every claim made by the assistant is accompanied by verified citations with relevance scores and source titles.
- Prompt injection filters and compliance guardrails detect and refuse unauthorized stock tip requests or instructions to override platform controls.

---

## 3. Data Isolation and Reset Mechanism

1. **User Isolation:** All private endpoints require a verified JWT session (`requireAuth(req)`) and enforce row-level ownership checks (`goal.userId === authUser.userId`).
2. **Safe Demo Reset:** The `/api/v1/demo/reset` endpoint inspects `user.isDemoUser`. It strictly forbids resetting non-demo accounts, ensuring real investor data cannot be purged by demo actions.

