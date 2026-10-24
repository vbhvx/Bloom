# Financial Calculation Engine: Mathematical Specification & Conventions

**Formula Version:** `v1.0.0`  
**Arithmetic Precision:** 30 decimal digits (`decimal.js`)  
**Rounding Convention:** `Decimal.ROUND_HALF_UP` (standard commercial/banking rounding)

---

## 1. Rate Conversion Conventions

Bloom explicitly converts nominal and annual effective rates to avoid rate distortion:

### 1.1 Effective Annual Rate Compounding (Default)
In modern personal finance, return expectations are stated as annual effective rates (CAGR). To convert an annual effective rate $r_{ann}$ to a monthly periodic rate $i$:

$$(1 + i)^{12} = 1 + r_{ann} \implies i = (1 + r_{ann})^{1/12} - 1 = \exp\left(\frac{\ln(1 + r_{ann})}{12}\right) - 1$$

### 1.2 Nominal Compounding
When compounding frequency is nominal (e.g. debt instruments quoted with monthly rests):

$$i = \frac{r_{nominal}}{12}$$

---

## 2. Future Value Formulas

### 2.1 Lump Sum Future Value
For initial current savings $PV$ growing at periodic rate $i$ for $n$ months:

$$FV_{lump} = PV \times (1 + i)^n$$

### 2.2 Periodic Contributions (Annuities)

#### A. Ordinary Annuity (End of Period - Default)
Contributions deposited at month-end:

$$FV_{annuity} = 
\begin{cases} 
PMT \times n & \text{if } i = 0 \\ 
PMT \times \frac{(1 + i)^n - 1}{i} & \text{if } i > 0 
\end{cases}$$

#### B. Annuity Due (Start of Period)
Contributions deposited at the start of each month earn an additional period of compounding:

$$FV_{due} = FV_{annuity} \times (1 + i)$$

### 2.3 Total Projected Future Value
$$FV_{total} = FV_{lump} + FV_{annuity}$$

---

## 3. Required Monthly Contribution Formula

To determine the exact monthly investment ($PMT$) needed to reach a target corpus $FV_{target}$ in $n$ months starting with initial savings $PV$:

1. Compute future value of existing savings: $FV_{from\_lump} = PV \times (1 + i)^n$
2. Determine residual corpus needed: $FV_{needed} = \max(0, FV_{target} - FV_{from\_lump})$
3. If $FV_{needed} = 0$, $PMT = 0$.
4. If $i = 0$: $PMT = \frac{FV_{needed}}{n}$
5. If $i > 0$ (Ordinary Annuity):

$$PMT = \frac{FV_{needed} \times i}{(1 + i)^n - 1}$$

---

## 4. Inflation Indexing & Real Returns

### 4.1 Inflation-Adjusted Target
The future purchasing power equivalent of an amount $Target_{today}$ over $t = n / 12$ years at annual inflation $r_{inf}$:

$$Target_{future} = Target_{today} \times (1 + r_{inf})^t = Target_{today} \times \exp\left(t \cdot \ln(1 + r_{inf})\right)$$

### 4.2 Real Rate of Return (Fisher Relation)
Nominal returns are discounted by inflation to determine real wealth creation:

$$1 + r_{nominal} = (1 + r_{real})(1 + r_{inflation}) \implies r_{real} = \frac{r_{nominal} - r_{inflation}}{1 + r_{inflation}}$$

---

## 5. Verification Test Matrix

All formulas are tested in `tests/unit/calculations.test.ts` against independently verified benchmarks:

| Scenario | Inputs | Expected Output |
|---|---|---|
| Zero Return | PV=₹50k, PMT=₹5k, n=24m, r=0% | FV = ₹1,70,000.00 (No unexplained gains) |
| Nominal Ordinary Annuity | PMT=₹10k, n=12m, nominal r=12% | FV = ₹1,26,825.03 |
| Annuity Due | PMT=₹10k, n=12m, nominal r=12% | FV = ₹1,28,093.28 |
| Inflation 10 Years | Target=₹10L, n=120m, inf=6% | Target = ₹17,90,847.70 |
| Required SIP | Target=₹10L, PV=₹100k, n=60m, r=12% | PMT = ₹10,020.00/month |

