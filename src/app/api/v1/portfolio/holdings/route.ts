import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { Decimal, roundCurrency } from "@/lib/decimal";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    const holdings = await prisma.holdingsSnapshot.findMany({
      where: {
        account: {
          userId: authUser.userId,
        },
      },
      include: {
        account: true,
        instrument: true,
      },
      orderBy: { snapshotTimestamp: "desc" },
    });

    const formatted = holdings.map((h) => {
      const units = new Decimal(h.units);
      const avgPrice = new Decimal(h.averageBuyPrice);
      const currentPrice = new Decimal(h.currentPrice);
      const invested = units.times(avgPrice);
      const valuation = new Decimal(h.valuation);
      const gainLoss = valuation.minus(invested);
      const gainLossPct = invested.isZero()
        ? 0
        : Number(gainLoss.dividedBy(invested).times(100).toFixed(2));

      return {
        id: h.id,
        instrumentId: h.instrumentId,
        symbol: h.instrument.symbol,
        name: h.instrument.name,
        category: h.instrument.category,
        assetClass: h.instrument.assetClass,
        units: units.toFixed(4),
        averageBuyPrice: roundCurrency(avgPrice).toFixed(2),
        currentPrice: roundCurrency(currentPrice).toFixed(2),
        totalInvested: roundCurrency(invested).toFixed(2),
        currentValuation: roundCurrency(valuation).toFixed(2),
        unrealizedGainLoss: roundCurrency(gainLoss).toFixed(2),
        unrealizedGainLossPercent: gainLossPct,
        currency: h.currency,
        sourceType: h.sourceType,
        accountName: `${h.account.institutionName} (${h.account.accountNumberMask})`,
        accountType: h.account.accountType,
        isSimulated: h.sourceType === "SIMULATED",
        snapshotTimestamp: h.snapshotTimestamp.toISOString(),
      };
    });

    return jsonResponse({
      count: formatted.length,
      holdings: formatted,
    });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error fetching portfolio holdings";
    return errorResponse(msg, status);
  }
}

