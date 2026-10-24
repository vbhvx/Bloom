# Statutory Regulatory Register & Governance Matrix

**Entity / Operating Role:** Educational Financial Planning & Intelligence Platform  
**Jurisdiction:** Republic of India  
**Governing Authorities:** Securities and Exchange Board of India (SEBI), Reserve Bank of India (RBI), Ministry of Finance, Pension Fund Regulatory and Development Authority (PFRDA).

---

## 1. Compliance Register & Feature Gates

The platform enforces server-side feature gates in PostgreSQL (`regulatory_approvals` table) and code guards (`src/server/security/gates.ts`). Disclaimers do not substitute for statutory registrations or bilateral agreements.

| Feature Key | Governing Authority | Legal Basis | Current Status | Operating Rationale |
|---|---|---|---|---|
| `SIMULATED_DATA_EXPLORATION` | Platform Policy | General educational simulation | **ENABLED** | Deterministic simulation fixtures with explicit `isSimulated=true` markers. |
| `LIVE_MARKET_DATA_AMFI` | AMFI / SEBI | SEBI (Mutual Funds) Regulations, 1996 | **ENABLED** | Open public daily NAV dissemination published by AMFI for retail transparency. |
| `ACCOUNT_AGGREGATOR_FETCH` | RBI | RBI Master Direction - NBFC-AA Directions, 2016 | **SANDBOX_ONLY** | Electronic ReBIT consent framework; read-only financial information fetch. |
| `BROKERAGE_SANDBOX_ORDER_PREVIEW` | SEBI | Stockbroker Sandbox Guidelines | **SANDBOX_ONLY** | Itemized statutory fee calculations (STT, Stamp Duty, SEBI fees) without exchange impact. |
| `PERSONALIZED_SECURITIES_ADVICE` | SEBI | SEBI (Investment Advisers) Regulations, 2013, Reg 2(1)(x) | **DISABLED** | Providing specific stock buy/sell calls requires SEBI RIA registration, audited net worth, and documented suitability profiling. |
| `LIVE_BROKERAGE_EXECUTION` | SEBI | SEBI (Stock Brokers) Reg 1992 & EOP Circular 2023 | **DISABLED** | Live order routing to stock exchanges requires registered broker partnership and signed member-client agreements. |

---

## 2. Applicable Indian Regulations & Analysis

### 2.1 SEBI (Investment Advisers) Regulations, 2013
- **Regulation 2(1)(x):** "Investment advice" means advice relating to investing in, purchasing, selling or otherwise dealing in securities or investment products.
- **Platform Policy:** Bloom provides deterministic mathematical tools, inflation indexing, asset allocation education, and general characteristics of asset classes. It does not provide personalized individual security recommendations or stock price forecasts.

### 2.2 SEBI Circular on Execution-Only Platforms (EOP) for Direct Mutual Funds (2023)
- **Category 1 EOP:** Agent of Asset Management Companies (AMCs) registered with AMFI.
- **Category 2 EOP:** Agent of investors registered as a stockbroker with SEBI.
- **Platform Policy:** Direct mutual fund execution remains gated until Category 1 or Category 2 EOP registration or broker API partnership is formally executed.

### 2.3 RBI Account Aggregator (AA) Master Directions (2016)
- **Role:** Financial Information User (FIU).
- **Control:** Read-only access governed by user consent; no transactional or payment capability; immediate consent revocation supported.

### 2.4 Digital Personal Data Protection Act, 2023 (DPDP Act)
- **Data Minimization:** Only data strictly necessary for goal calculations and net worth tracking is ingested.
- **Revocation:** Users may disconnect any connected financial institution at will.

