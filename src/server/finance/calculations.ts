import { Decimal, roundCurrency, toDecimal } from "@/lib/decimal";

export const FORMULA_VERSION = "v1.0.0";

export type ContributionTiming = "START_OF_PERIOD" | "END_OF_PERIOD";
export type CompoundingMethod = "EFFECTIVE_ANNUAL" | "NOMINAL_MONTHLY";

export interface ScenarioCalculationInput {
  targetAmount: number | string | Decimal;
  currentSavings: number | string | Decimal;
  monthlyContribution: number | string | Decimal;
  timeHorizonMonths: number;
  baselineReturnRateAnnual: number | string | Decimal; // e.g., 0.10 for 10%
  favorableReturnRateAnnual: number | string | Decimal; // e.g., 0.125 for 12.5%
  adverseReturnRateAnnual: number | string | Decimal; // e.g., 0.065 for 6.5%
  inflationRateAnnual: number | string | Decimal; // e.g., 0.06 for 6%
  contributionTiming?: ContributionTiming; // default END_OF_PERIOD
  compoundingMethod?: CompoundingMethod; // default EFFECTIVE_ANNUAL
  currency?: string;
}

export interface ScenarioResult {
  formulaVersion: string;
  currency: string;
  inputs: {
    targetAmount: string;
    currentSavings: string;
    monthlyContribution: string;
    timeHorizonMonths: number;
    inflationRateAnnual: string;
    baselineReturnRateAnnual: string;
    favorableReturnRateAnnual: string;
    adverseReturnRateAnnual: string;
    contributionTiming: ContributionTiming;
    compoundingMethod: CompoundingMethod;
  };
  outputs: {
    baselineFV: string;
    favorableFV: string;
    adverseFV: string;
    totalContributions: string;
    baselineGrowth: string;
    favorableGrowth: string;
    adverseGrowth: string;
    requiredMonthlyContribution: string;
    inflationAdjustedTarget: string;
    baselineRealFV: string;
    targetShortfallOrSurplus: string;
    isTargetMetInBaseline: boolean;
  };
  trajectory: Array<{
    month: number;
    year: number;
    totalInvested: string;
    baselineValue: string;
    favorableValue: string;
    adverseValue: string;
    inflationAdjustedTarget: string;
  }>;
}

/**
 * Converts an annual rate into a monthly periodic rate based on compounding method.
 *
 * For EFFECTIVE_ANNUAL:
 *   (1 + i_monthly)^12 = 1 + r_annual => i_monthly = (1 + r_annual)^(1/12) - 1
 *
 * For NOMINAL_MONTHLY:
 *   i_monthly = r_annual / 12
 */
export function getMonthlyRate(
  annualRate: Decimal | number | string,
  method: CompoundingMethod = "EFFECTIVE_ANNUAL"
): Decimal {
  const r = toDecimal(annualRate);
  if (r.isZero()) return new Decimal(0);

  if (method === "NOMINAL_MONTHLY") {
    return r.dividedBy(12);
  } else {
    // Effective annual rate conversion: (1 + r)^(1/12) - 1
    // Decimal.pow requires integer powers or Decimal sqrt/etc.
    // For fractional exponent (1/12), we use standard natural log and exp:
    // (1 + r)^(1/12) = exp( ln(1 + r) / 12 )
    const base = new Decimal(1).plus(r);
    if (base.isNegative() || base.isZero()) {
      throw new Error("Annual return rate cannot be <= -100%");
    }
    const lnBase = base.naturalLogarithm();
    const expVal = lnBase.dividedBy(12).naturalExponential();
    return expVal.minus(1);
  }
}

/**
 * Calculates Future Value of a Lump Sum:
 * FV = PV * (1 + i)^n
 */
export function calculateLumpSumFV(
  presentValue: Decimal | number | string,
  monthlyRate: Decimal,
  months: number
): Decimal {
  const pv = toDecimal(presentValue);
  if (pv.isZero()) return new Decimal(0);
  if (monthlyRate.isZero() || months === 0) return pv;

  const factor = new Decimal(1).plus(monthlyRate).pow(months);
  return pv.times(factor);
}

/**
 * Calculates Future Value of Periodic Contributions (Annuity):
 * If i = 0: FV = PMT * n
 * If i > 0, Ordinary Annuity (END_OF_PERIOD):
 *   FV = PMT * [ (1 + i)^n - 1 ] / i
 * If Annuity Due (START_OF_PERIOD):
 *   FV = PMT * [ (1 + i)^n - 1 ] / i * (1 + i)
 */
export function calculateAnnuityFV(
  monthlyContribution: Decimal | number | string,
  monthlyRate: Decimal,
  months: number,
  timing: ContributionTiming = "END_OF_PERIOD"
): Decimal {
  const pmt = toDecimal(monthlyContribution);
  if (pmt.isZero() || months === 0) return new Decimal(0);

  if (monthlyRate.isZero()) {
    return pmt.times(months);
  }

  const factor = new Decimal(1).plus(monthlyRate).pow(months);
  const numerator = factor.minus(1);
  let fv = pmt.times(numerator).dividedBy(monthlyRate);

  if (timing === "START_OF_PERIOD") {
    fv = fv.times(new Decimal(1).plus(monthlyRate));
  }

  return fv;
}

/**
 * Computes Total Future Value = Lump Sum FV + Periodic Contributions FV
 */
export function calculateTotalFV(
  currentSavings: Decimal | number | string,
  monthlyContribution: Decimal | number | string,
  monthlyRate: Decimal,
  months: number,
  timing: ContributionTiming = "END_OF_PERIOD"
): Decimal {
  const lumpFV = calculateLumpSumFV(currentSavings, monthlyRate, months);
  const annuityFV = calculateAnnuityFV(monthlyContribution, monthlyRate, months, timing);
  return lumpFV.plus(annuityFV);
}

/**
 * Calculates Required Monthly Contribution (PMT) to reach a Target Amount:
 * FV_target = FV_lump + FV_annuity
 * => FV_needed = max(0, FV_target - FV_lump)
 * If i = 0: PMT = FV_needed / n
 * If i > 0:
 *   END_OF_PERIOD:   PMT = FV_needed * i / [ (1 + i)^n - 1 ]
 *   START_OF_PERIOD: PMT = FV_needed * i / ( [ (1 + i)^n - 1 ] * (1 + i) )
 */
export function calculateRequiredMonthlyContribution(
  targetAmount: Decimal | number | string,
  currentSavings: Decimal | number | string,
  monthlyRate: Decimal,
  months: number,
  timing: ContributionTiming = "END_OF_PERIOD"
): Decimal {
  const target = toDecimal(targetAmount);
  const savings = toDecimal(currentSavings);

  if (months <= 0) {
    const diff = target.minus(savings);
    return diff.isPositive() ? diff : new Decimal(0);
  }

  const lumpFV = calculateLumpSumFV(savings, monthlyRate, months);
  const fvNeeded = target.minus(lumpFV);

  if (fvNeeded.isNegative() || fvNeeded.isZero()) {
    return new Decimal(0); // Current savings will already exceed target without new contributions
  }

  if (monthlyRate.isZero()) {
    return fvNeeded.dividedBy(months);
  }

  const factor = new Decimal(1).plus(monthlyRate).pow(months);
  const denominator = factor.minus(1);

  let pmt = fvNeeded.times(monthlyRate).dividedBy(denominator);

  if (timing === "START_OF_PERIOD") {
    pmt = pmt.dividedBy(new Decimal(1).plus(monthlyRate));
  }

  return pmt;
}

/**
 * Inflation-Adjusted Target:
 * Target_future = Target_today * (1 + r_inflation)^(months / 12)
 */
export function calculateInflationAdjustedTarget(
  targetToday: Decimal | number | string,
  inflationRateAnnual: Decimal | number | string,
  months: number
): Decimal {
  const target = toDecimal(targetToday);
  const inf = toDecimal(inflationRateAnnual);
  if (inf.isZero() || months === 0) return target;

  const years = new Decimal(months).dividedBy(12);
  const base = new Decimal(1).plus(inf);
  const lnBase = base.naturalLogarithm();
  const factor = lnBase.times(years).naturalExponential();

  return target.times(factor);
}

/**
 * Real Rate of Return (Fisher Equation):
 * (1 + r_nominal) = (1 + r_real) * (1 + r_inflation)
 * => r_real = (r_nominal - r_inflation) / (1 + r_inflation)
 */
export function calculateRealRate(
  nominalRate: Decimal | number | string,
  inflationRate: Decimal | number | string
): Decimal {
  const nom = toDecimal(nominalRate);
  const inf = toDecimal(inflationRate);
  const denominator = new Decimal(1).plus(inf);

  if (denominator.isZero()) return nom;
  return nom.minus(inf).dividedBy(denominator);
}

/**
 * Comprehensive Scenario Calculator:
 * Computes Baseline, Favorable, Adverse scenarios, required contribution,
 * inflation adjustment, and step-by-step month-by-month trajectory.
 */
export function calculatePlanningScenarios(input: ScenarioCalculationInput): ScenarioResult {
  const timing = input.contributionTiming ?? "END_OF_PERIOD";
  const method = input.compoundingMethod ?? "EFFECTIVE_ANNUAL";
  const currency = input.currency ?? "INR";

  const targetAmount = toDecimal(input.targetAmount);
  const currentSavings = toDecimal(input.currentSavings);
  const monthlyContribution = toDecimal(input.monthlyContribution);
  const months = input.timeHorizonMonths;

  if (months <= 0) {
    throw new Error("Time horizon in months must be greater than zero");
  }
  if (targetAmount.isNegative()) {
    throw new Error("Target amount cannot be negative");
  }
  if (currentSavings.isNegative()) {
    throw new Error("Current savings cannot be negative");
  }
  if (monthlyContribution.isNegative()) {
    throw new Error("Monthly contribution cannot be negative");
  }

  const baselineRateAnnual = toDecimal(input.baselineReturnRateAnnual);
  const favorableRateAnnual = toDecimal(input.favorableReturnRateAnnual);
  const adverseRateAnnual = toDecimal(input.adverseReturnRateAnnual);
  const inflationRateAnnual = toDecimal(input.inflationRateAnnual);

  const baselineMonthlyRate = getMonthlyRate(baselineRateAnnual, method);
  const favorableMonthlyRate = getMonthlyRate(favorableRateAnnual, method);
  const adverseMonthlyRate = getMonthlyRate(adverseRateAnnual, method);

  // Total FV under all 3 scenarios
  const baselineFV = calculateTotalFV(currentSavings, monthlyContribution, baselineMonthlyRate, months, timing);
  const favorableFV = calculateTotalFV(currentSavings, monthlyContribution, favorableMonthlyRate, months, timing);
  const adverseFV = calculateTotalFV(currentSavings, monthlyContribution, adverseMonthlyRate, months, timing);

  // Total contributions = initial savings + monthly * months
  const totalContributions = currentSavings.plus(monthlyContribution.times(months));

  // Investment growth = FV - total contributions
  const baselineGrowth = Decimal.max(0, baselineFV.minus(totalContributions));
  const favorableGrowth = Decimal.max(0, favorableFV.minus(totalContributions));
  const adverseGrowth = Decimal.max(0, adverseFV.minus(totalContributions));

  // Inflation adjusted target
  const inflationAdjustedTarget = calculateInflationAdjustedTarget(targetAmount, inflationRateAnnual, months);

  // Required monthly contribution to hit original target under baseline returns
  const requiredMonthlyContribution = calculateRequiredMonthlyContribution(
    targetAmount,
    currentSavings,
    baselineMonthlyRate,
    months,
    timing
  );

  // Real FV under baseline (discounted by inflation)
  const realRateAnnual = calculateRealRate(baselineRateAnnual, inflationRateAnnual);
  const realMonthlyRate = getMonthlyRate(realRateAnnual, method);
  const baselineRealFV = calculateTotalFV(currentSavings, monthlyContribution, realMonthlyRate, months, timing);

  // Target shortfall or surplus
  const targetDiff = baselineFV.minus(targetAmount);

  // Trajectory generation (sampled at reasonable intervals: every month if <= 24 months, or every 6-12 months for long horizons)
  const trajectory: ScenarioResult["trajectory"] = [];
  const sampleStep = months <= 24 ? 1 : months <= 120 ? 6 : 12;

  for (let m = 0; m <= months; m += sampleStep) {
    const invested = currentSavings.plus(monthlyContribution.times(m));
    const bVal = calculateTotalFV(currentSavings, monthlyContribution, baselineMonthlyRate, m, timing);
    const fVal = calculateTotalFV(currentSavings, monthlyContribution, favorableMonthlyRate, m, timing);
    const aVal = calculateTotalFV(currentSavings, monthlyContribution, adverseMonthlyRate, m, timing);
    const infTarget = calculateInflationAdjustedTarget(targetAmount, inflationRateAnnual, m);

    trajectory.push({
      month: m,
      year: Math.floor(m / 12),
      totalInvested: roundCurrency(invested).toFixed(2),
      baselineValue: roundCurrency(bVal).toFixed(2),
      favorableValue: roundCurrency(fVal).toFixed(2),
      adverseValue: roundCurrency(aVal).toFixed(2),
      inflationAdjustedTarget: roundCurrency(infTarget).toFixed(2),
    });
  }

  // Ensure last month is in trajectory
  if (trajectory[trajectory.length - 1].month !== months) {
    const invested = currentSavings.plus(monthlyContribution.times(months));
    const bVal = baselineFV;
    const fVal = favorableFV;
    const aVal = adverseFV;
    const infTarget = inflationAdjustedTarget;

    trajectory.push({
      month: months,
      year: Math.floor(months / 12),
      totalInvested: roundCurrency(invested).toFixed(2),
      baselineValue: roundCurrency(bVal).toFixed(2),
      favorableValue: roundCurrency(fVal).toFixed(2),
      adverseValue: roundCurrency(aVal).toFixed(2),
      inflationAdjustedTarget: roundCurrency(infTarget).toFixed(2),
    });
  }

  return {
    formulaVersion: FORMULA_VERSION,
    currency,
    inputs: {
      targetAmount: roundCurrency(targetAmount).toFixed(2),
      currentSavings: roundCurrency(currentSavings).toFixed(2),
      monthlyContribution: roundCurrency(monthlyContribution).toFixed(2),
      timeHorizonMonths: months,
      inflationRateAnnual: inflationRateAnnual.toFixed(4),
      baselineReturnRateAnnual: baselineRateAnnual.toFixed(4),
      favorableReturnRateAnnual: favorableRateAnnual.toFixed(4),
      adverseReturnRateAnnual: adverseRateAnnual.toFixed(4),
      contributionTiming: timing,
      compoundingMethod: method,
    },
    outputs: {
      baselineFV: roundCurrency(baselineFV).toFixed(2),
      favorableFV: roundCurrency(favorableFV).toFixed(2),
      adverseFV: roundCurrency(adverseFV).toFixed(2),
      totalContributions: roundCurrency(totalContributions).toFixed(2),
      baselineGrowth: roundCurrency(baselineGrowth).toFixed(2),
      favorableGrowth: roundCurrency(favorableGrowth).toFixed(2),
      adverseGrowth: roundCurrency(adverseGrowth).toFixed(2),
      requiredMonthlyContribution: roundCurrency(requiredMonthlyContribution).toFixed(2),
      inflationAdjustedTarget: roundCurrency(inflationAdjustedTarget).toFixed(2),
      baselineRealFV: roundCurrency(baselineRealFV).toFixed(2),
      targetShortfallOrSurplus: roundCurrency(targetDiff).toFixed(2),
      isTargetMetInBaseline: targetDiff.isPositive() || targetDiff.isZero(),
    },
    trajectory,
  };
}

