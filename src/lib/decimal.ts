import Decimal from "decimal.js";

// Configure Decimal.js with 30-digit precision and standard round-half-up (banker's/commercial convention)
Decimal.set({
  precision: 30,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21,
});

export { Decimal };

export function toDecimal(val: number | string | Decimal | null | undefined): Decimal {
  if (val === null || val === undefined) return new Decimal(0);
  if (val instanceof Decimal) return val;
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

export function roundCurrency(val: Decimal | number | string, decimals = 2): Decimal {
  const d = toDecimal(val);
  return d.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

export function formatINR(val: Decimal | number | string): string {
  const num = typeof val === "number" ? val : Number(toDecimal(val).toFixed(2));
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

