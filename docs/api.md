# API Specification & Contract: Bloom Financial Platform

Base URL: `/api/v1`  
Protocol: HTTPS / HTTP/1.1  
Authentication: Bearer Token in `Authorization` header (`Bearer <jwt>`) or HTTP-only cookie (`bloom_token`).

---

## 1. Authentication & Profile

### `POST /auth/login`
Authenticates a user and returns a signed JWT.
- **Request:**
  ```json
  {
    "email": "demo@bloom.invest",
    "password": "BloomDemo@2026"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr-...",
      "email": "demo@bloom.invest",
      "name": "Aarav Sharma",
      "role": "USER",
      "isDemoUser": true
    }
  }
  ```

### `GET /me`
Retrieves current user identity, profile, and preferences.

---

## 2. Financial Goals & Planning

### `GET /goals`
Returns all goals owned by the authenticated user with progress metrics.

### `POST /goals`
Creates a financial goal and automatically generates an initial deterministic baseline scenario.
- **Request:**
  ```json
  {
    "title": "Home Down Payment",
    "category": "HOME_PURCHASE",
    "targetAmount": 2500000,
    "currency": "INR",
    "targetDate": "2031-11-10T00:00:00.000Z",
    "currentAllocatedSavings": 300000,
    "monthlyContribution": 28000,
    "priority": "HIGH"
  }
  ```
- **Response (201 Created):** Goal object and associated `planningScenario` with trajectory.

### `POST /goals/{goalId}/scenarios`
Calculates and persists a new scenario using exact decimal math.
- **Request:**
  ```json
  {
    "name": "12% Growth Plan",
    "baselineReturnRateAnnual": 0.12,
    "favorableReturnRateAnnual": 0.145,
    "adverseReturnRateAnnual": 0.08,
    "inflationRateAnnual": 0.06,
    "monthlyContribution": 30000,
    "currentSavings": 300000,
    "timeHorizonMonths": 60,
    "contributionTiming": "END_OF_PERIOD"
  }
  ```

---

## 3. Market Data & Instruments

### `GET /instruments?q={query}&category={cat}&liveOnly={bool}`
Searches instruments across verified AMFI mutual fund schemes and deterministic simulated fixtures.

### `GET /market/quotes?symbol={symbol}`
Retrieves latest market observation with explicit data provenance.
- **Response (200 OK):**
  ```json
  {
    "quote": {
      "symbol": "120716",
      "price": "184.4250",
      "currency": "INR",
      "dataStatus": "END_OF_DAY",
      "isSimulated": false,
      "validityStatus": "VALID",
      "providerId": "AMFI",
      "provenanceNote": "VERIFIED LIVE: Official Daily Net Asset Value from AMFI."
    }
  }
  ```

### `POST /investments/compare`
Compares 2 to 4 instruments across costs, liquidity, lock-in, volatility, and tax rules.

---

## 4. Portfolio & Account Connections

### `GET /portfolio/summary`
Returns total net worth, liquid cash balance, and invested valuations with statutory disclosures.

### `GET /portfolio/holdings`
Returns holdings tagged with `sourceType: "SIMULATED" | "CONNECTED" | "MANUAL"`.

### `POST /connections/{providerId}/start`
Initiates an Account Aggregator consent request with read-only scopes.

### `DELETE /connections/{connectionId}`
Immediately revokes Account Aggregator consent and terminates synchronization.

---

## 5. AI Assistant & Compliance

### `POST /assistant/conversations/{convId}/messages`
Submits user question and returns evidence-backed reply with official citations.
- Refuses unauthorized personalized stock recommendations with 403 / gated refusal explanation.

### `GET /compliance/gates`
Public transparency endpoint listing all server-side feature gates and governing legal frameworks.

### `POST /brokerage/preview`
Generates itemized order breakdown (brokerage, STT, SEBI turnover fees, stamp duty, GST).

### `POST /brokerage/orders`
Places order with required idempotency key and confirmation token.
- Sandbox orders execute in simulation.
- Live exchange orders are blocked by server-side compliance gate (`403 Forbidden`).

