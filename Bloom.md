# Technical Specification: Goal-First Investing & Financial Intelligence Platform

**Project type:** Full-stack fintech engineering project  
**Initial market:** India, with international expansion later  
**Product scope:** Personalized financial planning, investment guidance, and authorized brokerage integration  
**Data modes:** Simulated data, verified live market data, and authorized financial-account connections  
**Delivery approach:** Phased implementation with independently testable milestones

## Objective

Build a responsive web application that helps retail investors understand their finances, plan personal financial goals, evaluate investment options, understand potential risks, and eventually invest through authorized financial partners.

The problem is that investment platforms emphasize financial products, market data, trading interfaces, and technical jargon instead of individual goals. Beginners must educate themselves using scattered online sources, which often leaves them confused, intimidated, and under-confident.

The application should reverse this experience: start with the user's goals, explain relevant financial concepts in plain language, show transparent calculations and trade-offs, and help users make informed decisions.

**Priority order:** financial correctness → transparent assumptions and data provenance → working planning workflows → trustworthy investment information → AI explanations → usable dashboard → authorized integrations → deployment and verification.

The application is a financial planning and intelligence platform, not automatically a licensed financial adviser, broker, or custodian. Regulatory and partner-dependent features must remain disabled until their requirements have been verified and satisfied.

---

## 1. Scope and acceptance criteria

### Required for the initial release

- Responsive web application.
- Secure user authentication and profile management.
- Goal-based financial onboarding.
- Financial goals with amounts, currencies, target dates, and contribution plans.
- Deterministic financial planning and scenario calculations.
- Beginner-friendly investment education and financial glossary.
- Investment discovery and comparison using verified or simulated data.
- Risk explanations and downside scenarios.
- Conversational financial assistant grounded in approved sources.
- Clearly labeled demo accounts, investments, prices, and portfolio values.
- Database persistence and versioned schema migrations.
- Automated tests for financial calculations and critical workflows.
- Reproducible local setup, environment configuration, and deployment documentation.

### Required data capabilities

Support all three data modes through a provider-adapter architecture:

1. **Simulated data:** deterministic demo fixtures for testing and exploration.
2. **Verified live market data:** integration with an actual provider whose capabilities and usage permissions have been confirmed.
3. **Authorized account connections:** user-authorized financial data from verified providers, where eligibility and integration requirements are satisfied.

The application must clearly distinguish the three modes. A simulated price, balance, holding, transaction, or account must never appear to be real financial information.

### Required analytical correctness

- Use precise decimal arithmetic for financial computations.
- Explicitly represent currencies, units, assumptions, and calculation methods.
- Reject invalid or insufficient inputs rather than silently inventing values.
- Distinguish actual data, user-entered data, provider-reported values, calculated results, and estimates.
- Display data timestamps, source information, freshness, and known limitations.
- Make projections reproducible from saved inputs and versioned formulas.
- Test calculations against independently verified expected results.

### Reviewability

Provide:

- Architecture and API documentation.
- Database schema and migrations.
- Unit, integration, and end-to-end tests.
- Visible feature and integration statuses.
- Documented financial assumptions and limitations.
- Structured error handling and logging.
- Security and privacy controls.
- Reproducible startup and deployment instructions.
- An implementation report identifying working, blocked, and unimplemented features.

### Explicitly out of scope until separately approved

- Custody or pooling of user funds.
- Autonomous live investing or trading.
- Order execution initiated solely by an AI conversation.
- Unverified bank, financial-data, or broker integrations.
- Personalized securities recommendations before the applicable regulatory requirements are satisfied.
- Unlicensed redistribution of market data.
- Guaranteed investment returns or predictions presented as certain.
- Fabricated financial products, account balances, market quotes, sources, or provider capabilities.
- International launches without jurisdiction-specific review.

Personal financial planning and educational guidance should be implemented in the initial product. Any personalized securities advice or regulated activity must be separately assessed and feature-gated.

---

## 2. Data-source specification

### A. Simulated financial data

Create deterministic fixtures for development, testing, and product demonstrations.

Simulated data should cover:

- User profiles and financial goals.
- Income, expenses, and savings where needed for planning.
- Investment instruments and holdings.
- Historical and current-looking example prices.
- Portfolio valuations and transaction histories.
- Example scenarios and financial calculations.
- Provider connection states.
- Sample assistant questions and explanations.

All fixtures must contain an explicit marker such as `source_type = SIMULATED`.

Display an unmistakable Demo Mode indicator whenever the user is viewing simulated financial information.

Rules:

- Do not silently mix simulated values with real account data.
- Do not label simulated market observations as live quotes.
- Do not imply that an example brokerage order was sent to an actual exchange.
- Make demo data reproducible using a fixed seed or versioned fixture files.
- Provide a safe reset mechanism for the demo environment.
- Ensure the reset cannot delete real user data.

### B. Verified live market data

Use a provider adapter to retrieve supported market information.

Potential data includes instrument metadata, prices, historical observations, trading status, and other attributes needed by implemented features.

Before using any provider, verify:

- Official documentation and supported endpoints.
- Availability of Indian instruments and exchanges.
- Historical-data coverage and timestamp semantics.
- Real-time, delayed, or end-of-day data classification.
- Authentication and API rate limits.
- Commercial-use and redistribution permissions.
- Fees and applicable contractual restrictions.
- Supported currency and instrument precision.
- Sandbox availability and failure behavior.
- Provider-specific terms for caching and retention.

Store the following metadata wherever applicable:

`provider_id`, `instrument_id`, `source_timestamp`, `ingested_at`, `currency`, `data_status`, `is_simulated`, `is_delayed`, and `validity_status`.

A stale observation must not be rendered as a fresh real-time quote. If the provider is unavailable, display the last observation as stale when policy permits; otherwise, display an explicit unavailable state.

Never substitute invented prices when an API request fails.

### C. Authorized financial-account connections

Build the architecture for authorized connections to relevant Indian financial-data providers, financial institutions, or eligible Account Aggregator ecosystem participants.

For each integration, establish the actual provider and operating role before implementation. Verify the applicable eligibility, authorization, consent, security, partner, retention, and data-use requirements.

The implementation must support:

- Explicit user authorization.
- Clearly explained consent.
- Permitted data scopes.
- Connection status.
- Account synchronization.
- Data-source attribution.
- Data freshness.
- Error recovery.
- Consent revocation and disconnection.
- Reconciliation of imported records.

Prefer read-only financial-data access in the initial implementation.

Never collect bank or broker passwords, OTPs, or TOTP secrets through a custom form as a substitute for an authorized provider flow.

Do not treat a financial-data connection as permission to execute payments, investment orders, or bank transfers.

### D. Brokerage integration

Use a separate adapter for each authorized broker.

Before activating real trading, verify the official API's capabilities, the intended third-party use, provider authorization, applicable regulatory requirements, user authorization, and operational safeguards.

Where permitted by the chosen provider, support order previews, explicit user confirmation, submission, status retrieval, cancellation, fills, and reconciliation.

Until these requirements are met, expose a clearly labeled sandbox or a disabled state. No sandbox action may reach a real broker.

### First task: verify the data providers before building integration-dependent UI

Begin by investigating the selected providers and documenting:

1. Official documentation and production access requirements.
2. Actual response schemas and required fields.
3. Authentication and authorization flows.
4. Instrument identifiers, currencies, units, and precision.
5. Data freshness and timestamp semantics.
6. Pagination, rate limits, and request failures.
7. Historical-data availability and licensing restrictions.
8. Sandbox behavior and test credentials.
9. Privacy, consent, retention, and disconnection requirements.
10. Whether the intended financial product requires additional registrations, approvals, or authorized partners.

**Stop condition:** Do not claim a live integration works until a representative response has been verified, the data contract is documented, the integration is authorized for the intended use, and automated tests cover its behavior.

An official API that exists is not proof that the application has permission or credentials to use it.

---

## 3. Architecture and technology choices

Keep the architecture simple enough to build, test, review, and deploy reliably. Prefer a modular monolith for the initial release.

| Component | Recommended technology | Reason |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Responsive application and reusable components |
| Styling | Tailwind CSS | Consistent design system |
| Backend | TypeScript server-side application | Shared types and clear service boundaries |
| API validation | Zod or equivalent | Runtime request and response validation |
| Database | PostgreSQL | Relational financial and user data |
| ORM | Prisma or another justified typed database layer | Schema management and migrations |
| Financial arithmetic | `decimal.js` or equivalent | Avoid binary floating-point errors |
| Charts | Recharts or equivalent | Scenario and portfolio visualization |
| HTTP client | `fetch` or a maintained HTTP client | External provider access |
| Background jobs | Queue and worker where required | Synchronization and long-running tasks |
| AI integration | Provider abstraction with structured outputs | Replaceable model provider and controlled tools |
| Retrieval | Approved-source search, with optional vector retrieval | Evidence-backed explanations |
| Testing | Vitest/Jest and Playwright or equivalents | Unit and end-to-end coverage |
| Containerization | Docker and Docker Compose | Reproducible local environment |
| CI | Automated lint, type, test, and build checks | Repeatable verification |
| Hosting | Selected frontend/backend hosting with managed PostgreSQL | Depends on verified deployment requirements |

Use one primary backend architecture. Do not duplicate business logic across frontend components, route handlers, and separate services.

For the MVP, keep financial calculations in a dedicated domain module independent of HTTP handlers and AI services.

### Core modules

- Identity and user profiles.
- Financial goals and planning.
- Financial calculation engine.
- Investment instruments and market data.
- Investment education and content.
- Portfolio and holdings.
- Financial-account connections.
- Brokerage and order lifecycle.
- AI assistant and source retrieval.
- Consent, privacy, and auditing.
- Notifications and operational health.
- Provider administration and feature gates.

Use a background worker only when integration synchronization, scheduled processing, or other asynchronous tasks justify it. Do not add infrastructure without a clear requirement.

---

## 4. Core business logic

This is the most important part of the application. The platform must explain financial decisions without manufacturing numerical certainty.

### 4.1 Goal-based financial planning

For each goal, collect or infer from explicitly supplied values:

- Target amount.
- Currency.
- Target date and time horizon.
- Current savings allocated to the goal.
- Recurring contribution amount and frequency.
- Inflation assumption, if applicable.
- Assumed investment return, if applicable.
- Applicable fees and tax assumptions, where supported.

Implement goal creation, editing, archiving, progress tracking, and reproducible scenario generation.

Clearly distinguish user-provided values from assumptions and calculated outputs.

If an essential input is missing, ask the user to supply it or show a clearly labeled illustrative assumption.

### 4.2 Financial calculation engine

Implement and test the formulas required for:

- Future value.
- Present value.
- Periodic contributions.
- Required contributions to reach a target.
- Inflation-adjusted targets.
- Nominal versus real projections.
- Scenario comparisons.
- Currency conversion where supported.
- Portfolio valuations and performance measures when sufficient data exists.

Document the convention for contribution timing, compounding, rate conversion, date handling, precision, and rounding.

Do not treat an annual effective rate as equivalent to a nominal rate without conversion.

Use exact decimal arithmetic for monetary calculations, and round only at documented boundaries.

Every saved scenario should retain:

- Original inputs.
- Currency.
- Assumptions.
- Formula or calculation version.
- Creation timestamp.
- Calculated outputs.

### 4.3 Scenario analysis

Allow users to compare a baseline, favorable, and adverse scenario by changing contribution amounts, investment assumptions, time horizons, inflation, and other supported variables.

Show how much of the projected balance comes from contributions versus assumed growth.

Display potential downside outcomes and uncertainty. Do not label illustrative scenarios as statistically probable outcomes unless a separately validated model supports that claim.

Avoid charts that visually exaggerate small differences.

