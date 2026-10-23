import { describe, it, expect } from "vitest";
import {
  calculateAnnuityFV,
  calculateLumpSumFV,
  calculateTotalFV,
  calculateRequiredMonthlyContribution,
  calculateInflationAdjustedTarget,
  calculatePlanningScenarios,
  getMonthlyRate,
  calculateRealRate,
} from "@/server/finance/calculations";
import { Decimal, roundCurrency } from "@/lib/decimal";

describe("Financial Calculation Engine (Decimal Arithmetic)", () => {
  it("should calculate exact Lump Sum FV with nominal monthly compounding", () => {
    // PV = 100,000, r = 12% nominal => monthly rate i = 0.01, n = 12 months
    // FV = 100,000 * (1.01)^12 = 112,682.503...
    const monthlyRate = new Decimal("0.01");
    const fv = calculateLumpSumFV("100000", monthlyRate, 12);
    expect(roundCurrency(fv).toFixed(2)).toBe("112682.50");
  });

  it("should calculate exact Ordinary Annuity FV (END_OF_PERIOD)", () => {
    // PMT = 10,000, i = 0.01, n = 12 months
    // FV = 10,000 * ((1.01)^12 - 1) / 0.01 = 126,825.030...
    const monthlyRate = new Decimal("0.01");
    const fv = calculateAnnuityFV("10000", monthlyRate, 12, "END_OF_PERIOD");
    expect(roundCurrency(fv).toFixed(2)).toBe("126825.03");
  });

  it("should calculate exact Annuity Due FV (START_OF_PERIOD)", () => {
    // PMT = 10,000, i = 0.01, n = 12 months
    // FV_due = 126,825.030... * 1.01 = 128,093.280...
    const monthlyRate = new Decimal("0.01");
    const fv = calculateAnnuityFV("10000", monthlyRate, 12, "START_OF_PERIOD");
    expect(roundCurrency(fv).toFixed(2)).toBe("128093.28");
  });

  it("should produce no unexplained gains when assumed return is 0%", () => {
    const monthlyRate = new Decimal("0");
    const lump = calculateLumpSumFV("50000", monthlyRate, 24);
    const annuity = calculateAnnuityFV("5000", monthlyRate, 24, "END_OF_PERIOD");
    const total = calculateTotalFV("50000", "5000", monthlyRate, 24, "END_OF_PERIOD");

    expect(lump.toFixed(2)).toBe("50000.00");
    expect(annuity.toFixed(2)).toBe("120000.00"); // 5000 * 24
    expect(total.toFixed(2)).toBe("170000.00"); // 50000 + 120000
  });

  it("should calculate exact required monthly contribution", () => {
    // Target = 1,000,000, PV = 100,000, i = 0.01, n = 60 months
    // Lump FV = 100,000 * (1.01)^60 = 181,669.6698...
    // FV needed = 818,330.3301...
    // PMT = 818,330.3301 * 0.01 / ((1.01)^60 - 1) = 10,020.00...
    const monthlyRate = new Decimal("0.01");
    const pmt = calculateRequiredMonthlyContribution("1000000", "100000", monthlyRate, 60, "END_OF_PERIOD");
    expect(roundCurrency(pmt).toFixed(2)).toBe("10020.00");
  });

  it("should return 0 required contribution if current savings already exceed target FV", () => {
    const monthlyRate = new Decimal("0.01");
    const pmt = calculateRequiredMonthlyContribution("50000", "100000", monthlyRate, 12, "END_OF_PERIOD");
    expect(pmt.toFixed(2)).toBe("0.00");
  });

  it("should calculate inflation-adjusted target correctly", () => {
    // Target today = 1,000,000, 10 years (120 months) at 6% annual inflation
    // FV_inf = 1,000,000 * (1.06)^10 = 1,790,847.696...
    const adjusted = calculateInflationAdjustedTarget("1000000", "0.06", 120);
    expect(roundCurrency(adjusted).toFixed(2)).toBe("1790847.70");
  });

  it("should compute real return rate using the Fisher relation", () => {
    // Nominal = 12% (0.12), Inflation = 6% (0.06)
    // r_real = (0.12 - 0.06) / (1 + 0.06) = 0.06 / 1.06 = 0.05660377... (approx 5.66%)
    const rReal = calculateRealRate("0.12", "0.06");
    expect(roundCurrency(rReal.times(100), 4).toFixed(4)).toBe("5.6604");
  });

  it("should convert annual effective rate to monthly compounding rate correctly", () => {
    // (1 + i)^12 = 1.10 => i = (1.10)^(1/12) - 1 = 0.0079741404...
    const i = getMonthlyRate("0.10", "EFFECTIVE_ANNUAL");
    const checkAnnual = new Decimal(1).plus(i).pow(12).minus(1);
    expect(roundCurrency(checkAnnual, 6).toFixed(6)).toBe("0.100000");
  });

  it("should generate reproducible comprehensive scenario projections", () => {
    const input = {
      targetAmount: "2500000", // ₹25 Lakhs
      currentSavings: "200000", // ₹2 Lakhs
      monthlyContribution: "25000", // ₹25,000 / month
      timeHorizonMonths: 60, // 5 years
      baselineReturnRateAnnual: "0.10", // 10%
      favorableReturnRateAnnual: "0.13", // 13%
      adverseReturnRateAnnual: "0.06", // 6%
      inflationRateAnnual: "0.06", // 6%
      currency: "INR",
    };

    const res1 = calculatePlanningScenarios(input);
    const res2 = calculatePlanningScenarios(input);

    // Strict reproducibility check
    expect(res1.outputs.baselineFV).toBe(res2.outputs.baselineFV);
    expect(res1.outputs.favorableFV).toBe(res2.outputs.favorableFV);
    expect(res1.outputs.adverseFV).toBe(res2.outputs.adverseFV);
    expect(res1.outputs.totalContributions).toBe("1700000.00"); // 200k + 25k*60 = 1.7M
    expect(new Decimal(res1.outputs.favorableFV).greaterThan(res1.outputs.baselineFV)).toBe(true);
    expect(new Decimal(res1.outputs.baselineFV).greaterThan(res1.outputs.adverseFV)).toBe(true);
    expect(res1.trajectory.length).toBeGreaterThan(0);
    expect(res1.formulaVersion).toBe("v1.0.0");
  });

  it("should reject negative financial inputs with descriptive error", () => {
    expect(() =>
      calculatePlanningScenarios({
        targetAmount: "-5000",
        currentSavings: "1000",
        monthlyContribution: "500",
        timeHorizonMonths: 12,
        baselineReturnRateAnnual: "0.10",
        favorableReturnRateAnnual: "0.12",
        adverseReturnRateAnnual: "0.08",
        inflationRateAnnual: "0.05",
      })
    ).toThrow("Target amount cannot be negative");

    expect(() =>
      calculatePlanningScenarios({
        targetAmount: "50000",
        currentSavings: "1000",
        monthlyContribution: "500",
        timeHorizonMonths: 0,
        baselineReturnRateAnnual: "0.10",
        favorableReturnRateAnnual: "0.12",
        adverseReturnRateAnnual: "0.08",
        inflationRateAnnual: "0.05",
      })
    ).toThrow("Time horizon in months must be greater than zero");
  });
});

