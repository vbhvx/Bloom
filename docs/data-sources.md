# Data-Source Specification & Verification: Bloom Financial Platform

Bloom implements a provider-adapter architecture supporting three distinct data modes. Under platform integrity rules, a simulated price, balance, or holding is never mixed with real data or disguised as an exchange quote.

---

## Mode 1: Simulated Financial Data (`SIMULATED`)

### Scope & Fixtures
- **Implementation:** `src/server/providers/simulatedProvider.ts`
- **Instruments:** Nifty 50 Index Fund, Parag Parikh Flexi Cap Fund, HDFC Liquid Fund, Sovereign Gold Bonds (SGB), Public Provident Fund (PPF), National Pension System (NPS), Tax Saver FDs.
- **Attributes:** Base price, expected CAGR, expense ratio, statutory lock-in, and taxation tags.
- **Metadata Marker:** Every fixture record carries `source_type = SIMULATED`, `is_simulated = true`, `provider_id = "SIMULATED_FIXTURES"`.

### Safe Reset Mechanism
The platform provides a safe reset mechanism via `POST /api/v1/demo/reset`.
- Guard: Checks `user.isDemoUser === true`.
- Protection: Non-demo user accounts receive `403 Forbidden`, preventing inadvertent deletion of real user records.

---

## Mode 2: Verified Live Market Data (`VERIFIED_LIVE`)

### AMFI Official Mutual Fund NAV Feed
- **Provider Code:** `AMFI` (Association of Mutual Funds in India)
- **Endpoint:** `https://portal.amfiindia.com/spages/NAVAll.txt`
- **Regulatory Authority:** Under SEBI (Mutual Funds) Regulations, 1996, all Indian Asset Management Companies (AMCs) must publish daily NAVs to AMFI by 11:00 PM IST each business day.
- **Data Attributes:** Scheme Code, ISIN Growth, Scheme Name, Plan, Option, Net Asset Value (NAV), Date.
- **Format:** Delimited text file containing over 10,000 live Indian mutual fund schemes.
- **Update Frequency:** Daily (End of Day).
- **Currency:** Indian Rupee (INR).
- **Licensing & Permission:** Public regulatory data feed published for investor information.
- **Freshness & Stale Detection:** If observation date is > 4 business days old (due to extended market holidays or upstream delays), observations are marked `dataStatus = STALE`.
- **Failure Policy:** Never substitutes invented numbers if the feed is unreachable. Returns cached records marked stale, or an explicit `UNAVAILABLE` state.

---

## Mode 3: Authorized Account Connections (`AUTHORIZED_ACCOUNT`)

### RBI Account Aggregator Framework
- **Operating Model:** NBFC-Account Aggregator (NBFC-AA) ecosystem regulated under RBI Master Directions (2016).
- **Gateway Adapter:** `src/server/providers/accountAggregatorAdapter.ts` (Setu AA Sandbox specification).
- **Standard:** ReBIT electronic consent artifact schemas.
- **Permitted Scopes:** Read-only retrieval of deposit balances, term deposits, and mutual fund folios.
- **Strict Prohibition:** Passwords, netbanking credentials, OTPs, or TOTP secrets are never collected via custom forms.
- **Consent Lifecycle:** Explicit user consent with defined expiry (1 to 36 months), fetch frequency, and immediate user revocation via `DELETE /api/v1/connections/{connectionId}`.

