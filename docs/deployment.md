# Deployment & Operational Runbook: Bloom Financial Platform

## 1. Prerequisites

- **Node.js:** v20.x or v22.x LTS (compatible with Node 26)
- **Database:** PostgreSQL 16
- **Docker:** Optional (Docker 24+ & Docker Compose v2)

---

## 2. Local Setup Instructions

### Step 1: Clone & Install Dependencies
```bash
git clone <repo-url>
cd 45_Bloom
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env` and verify database URL:
```bash
cp .env.example .env
```
Default connection string:
```env
DATABASE_URL="postgresql://vaibhavsaini@localhost:5432/bloom_db?schema=public"
JWT_SECRET="bloom-super-secret-jwt-signing-key-32charsmin-2026"
PORT=3000
ENABLE_SIMULATED_DATA="true"
ENABLE_LIVE_MARKET_DATA="true"
ENABLE_ACCOUNT_AGGREGATOR_SANDBOX="true"
ENABLE_BROKERAGE_SANDBOX="true"
ENABLE_PERSONALIZED_SECURITIES_ADVICE="false"
ENABLE_LIVE_BROKERAGE_ORDERS="false"
```

### Step 3: Database Migration & Seeding
Push the Prisma schema to PostgreSQL and run the seed script:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```
The seed script populates:
- Regulatory approvals and feature gates.
- External providers (AMFI, RBI, Setu AA, Zerodha Kite).
- Indian market instrument fixtures (UTI Nifty 50, Parag Parikh Flexi Cap, SGB, PPF, NPS, FDs).
- Official knowledge sources & chunks with tax law amendments.
- Demo user: `demo@bloom.invest` / Password: `BloomDemo@2026`.

### Step 4: Run Automated Tests
```bash
npm run test
```
Runs all 23 unit & integration tests covering decimal arithmetic, compounding reproducibility, AA consent revocation, prompt injection resistance, and regulatory gate enforcement.

### Step 5: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Docker Deployment

To launch the full stack (Next.js web application + PostgreSQL database) with container healthchecks:

```bash
docker compose up --build -d
```

Verify service status:
```bash
docker compose ps
docker compose logs -f web
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 4. Production Checklist

- [x] Precision decimal arithmetic configured via `decimal.js`.
- [x] JWT secret replaced with cryptographically secure 256-bit entropy string.
- [x] Regulated live advice and brokerage execution feature gates closed (`DISABLED`).
- [x] Clear data provenance badges (`SIMULATED`, `VERIFIED_LIVE`, `CONNECTED`) across all UI views.
- [x] Demo reset mechanism restricted strictly to demo accounts (`user.isDemoUser === true`).
- [x] 100% automated test pass rate with zero floating-point calculation errors.

