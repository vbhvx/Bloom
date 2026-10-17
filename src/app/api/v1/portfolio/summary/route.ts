import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { Decimal, roundCurrency } from "@/lib/decimal";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    // Retrieve all accounts belonging to the user
    const accounts = await prisma.financialAccount.findMany({
      where: { userId: authUser.userId },
      include: {
        holdings: {
          include: {
            instrument: true,
          },
        },
      },
    });

    let totalValuation = new Decimal(0);
    let liquidCashBalance = new Decimal(0);
    let investedValuation = new Decimal(0);

    const assetClassMap: Record<string, Decimal> = {
      EQUITY: new Decimal(0),
      DEBT: new Decimal(0),
      COMMODITY: new Decimal(0),
      HYBRID: new Decimal(0),
      CASH_EQUIVALENT: new Decimal(0),
    };

    const sourceBreakdown: Record<string, Decimal> = {
      MANUAL: new Decimal(0),
      CONNECTED: new Decimal(0),
      SIMULATED: new Decimal(0),
    };

    for (const acc of accounts) {
      if (acc.accountType === "SAVINGS") {
        liquidCashBalance = liquidCashBalance.plus(new Decimal(acc.balance));
      }

      for (const h of acc.holdings) {
        const val = new Decimal(h.valuation);
        investedValuation = investedValuation.plus(val);

        const assetClass = h.instrument.assetClass || "EQUITY";
        assetClassMap[assetClass] = (assetClassMap[assetClass] || new Decimal(0)).plus(val);

        const src = h.sourceType;
        sourceBreakdown[src] = (sourceBreakdown[src] || new Decimal(0)).plus(val);
      }
    }

    totalValuation = liquidCashBalance.plus(investedValuation);

    // Compute percentages
    const allocationPercentages = Object.entries(assetClassMap).map(([assetClass, val]) => {
      const pct = investedValuation.isZero()
        ? 0
        : Number(val.dividedBy(investedValuation).times(100).toFixed(1));
      return {
        assetClass,
        value: roundCurrency(val).toFixed(2),
        percentage: pct,
      };
    });

    return jsonResponse({
      summary: {
        totalNetWorth: roundCurrency(totalValuation).toFixed(2),
        liquidCashBalance: roundCurrency(liquidCashBalance).toFixed(2),
        investedValuation: roundCurrency(investedValuation).toFixed(2),
        currency: "INR",
        timestamp: new Date().toISOString(),
        disclosures: {
          withdrawableCashNotice:
            "Only liquid savings account balances represent withdrawable cash. Investment valuations are subject to market conditions, exit loads, and applicable taxes upon liquidation.",
          incompleteHistoryNotice:
            "Valuations reflect current snapshot observations. Historical annualized returns require 12+ months of verified transaction records.",
        },
      },
      assetAllocation: allocationPercentages,
      provenanceBreakdown: {
        simulated: roundCurrency(sourceBreakdown.SIMULATED || 0).toFixed(2),
        connected: roundCurrency(sourceBreakdown.CONNECTED || 0).toFixed(2),
        manual: roundCurrency(sourceBreakdown.MANUAL || 0).toFixed(2),
      },
      accountsCount: accounts.length,
    });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error fetching portfolio summary";
    return errorResponse(msg, status);
  }
}

