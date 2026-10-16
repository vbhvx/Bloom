import { NextRequest } from "next/server";
import { errorResponse, jsonResponse, InvestmentCompareSchema } from "@/server/api/validation";
import prisma from "@/lib/db";
import { SIMULATED_INSTRUMENT_FIXTURES } from "@/server/providers/simulatedProvider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InvestmentCompareSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const { instrumentSymbols, horizonMonths } = parsed.data;

    // Retrieve instruments from fixtures or DB
    const comparisons: Array<{
      symbol: string;
      name: string;
      category: string;
      assetClass: string;
      riskLevel: string;
      expenseRatioPercent: string;
      lockInPeriodText: string;
      liquidityRating: "HIGH" | "MODERATE" | "LOW";
      taxationSummary: string;
      minimumInvestment: string;
      suitableHorizonYears: string;
      sourceProvenance: string;
      downsideRiskScenario: string;
    }> = [];

    for (const sym of instrumentSymbols) {
      const fix = SIMULATED_INSTRUMENT_FIXTURES[sym];
      if (fix) {
        const lockInDays = fix.lockInDays;
        const lockInText =
          lockInDays === 0
            ? "No lock-in (Liquid)"
            : lockInDays >= 365
            ? `${(lockInDays / 365).toFixed(0)} Years`
            : `${lockInDays} Days`;

        const liquidityRating =
          lockInDays === 0 ? "HIGH" : lockInDays <= 1825 ? "MODERATE" : "LOW";

        const horizonYears =
          fix.assetClass === "CASH_EQUIVALENT"
            ? "< 1 Year (Immediate Needs)"
            : fix.assetClass === "DEBT"
            ? "1 - 5 Years"
            : fix.assetClass === "COMMODITY"
            ? "5 - 8 Years"
            : "5+ Years (Long Term Compounding)";

        const downside =
          fix.assetClass === "CASH_EQUIVALENT"
            ? "Negligible market risk; risk of inflation outpacing yield."
            : fix.assetClass === "DEBT"
            ? "Low credit/interest rate risk; returns fixed or sovereign guaranteed."
            : fix.assetClass === "COMMODITY"
            ? "Subject to international gold price fluctuations and currency exchange movements."
            : "High interim volatility; drawdowns of 15-30% can occur during economic downturns.";

        comparisons.push({
          symbol: fix.symbol,
          name: fix.name,
          category: fix.category,
          assetClass: fix.assetClass,
          riskLevel: fix.riskLevel,
          expenseRatioPercent: (Number(fix.expenseRatio) * 100).toFixed(2) + "%",
          lockInPeriodText: lockInText,
          liquidityRating,
          taxationSummary: fix.taxNotes,
          minimumInvestment: `₹${Number(fix.minInvestment).toLocaleString("en-IN")}`,
          suitableHorizonYears: horizonYears,
          sourceProvenance: "Bloom Deterministic Regulatory Fixture v1.0",
          downsideRiskScenario: downside,
        });
      } else {
        // Query DB
        const dbInst = await prisma.instrument.findUnique({
          where: { symbol: sym },
        });

        if (dbInst) {
          comparisons.push({
            symbol: dbInst.symbol,
            name: dbInst.name,
            category: dbInst.category,
            assetClass: dbInst.assetClass,
            riskLevel: dbInst.riskLevel,
            expenseRatioPercent: dbInst.expenseRatio
              ? (Number(dbInst.expenseRatio) * 100).toFixed(2) + "%"
              : "0.00%",
            lockInPeriodText: dbInst.lockInDays === 0 ? "No lock-in" : `${dbInst.lockInDays} Days`,
            liquidityRating: dbInst.lockInDays === 0 ? "HIGH" : "MODERATE",
            taxationSummary: dbInst.taxNotes || "Standard applicable income tax rates.",
            minimumInvestment: dbInst.minInvestment ? `₹${Number(dbInst.minInvestment)}` : "₹500",
            suitableHorizonYears: "3+ Years",
            sourceProvenance: "AMFI / Verified Database Record",
            downsideRiskScenario: "Market fluctuations applicable to the specific asset class.",
          });
        }
      }
    }

    return jsonResponse({
      comparedCount: comparisons.length,
      horizonMonths,
      comparisonMatrix: comparisons,
      disclaimerNotice:
        "This comparison provides objective mathematical and regulatory characteristics (fees, liquidity, tax treatment). It does not constitute a personalized security recommendation.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error comparing investments";
    return errorResponse(msg, 500);
  }
}

