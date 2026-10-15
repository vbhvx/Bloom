import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { errorResponse, jsonResponse } from "@/server/api/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ instrumentId: string }> }
) {
  try {
    const { instrumentId } = await params;

    const instrument = await prisma.instrument.findFirst({
      where: {
        OR: [{ id: instrumentId }, { symbol: instrumentId }],
      },
      include: {
        provider: true,
        observations: {
          orderBy: { sourceTimestamp: "desc" },
          take: 30,
        },
      },
    });

    if (!instrument) {
      return errorResponse("Instrument not found", 404);
    }

    return jsonResponse({
      instrument: {
        id: instrument.id,
        symbol: instrument.symbol,
        isin: instrument.isin,
        name: instrument.name,
        category: instrument.category,
        assetClass: instrument.assetClass,
        currency: instrument.currency,
        riskLevel: instrument.riskLevel,
        expenseRatio: instrument.expenseRatio ? instrument.expenseRatio.toString() : null,
        lockInDays: instrument.lockInDays,
        taxNotes: instrument.taxNotes,
        minInvestment: instrument.minInvestment ? instrument.minInvestment.toString() : null,
        isSimulated: instrument.isSimulated,
        provider: instrument.provider
          ? {
              name: instrument.provider.name,
              code: instrument.provider.code,
              category: instrument.provider.category,
              status: instrument.provider.status,
            }
          : null,
        observations: instrument.observations.map((obs) => ({
          price: obs.price.toString(),
          changeAmount: obs.changeAmount ? obs.changeAmount.toString() : null,
          changePercent: obs.changePercent ? obs.changePercent.toString() : null,
          sourceTimestamp: obs.sourceTimestamp.toISOString(),
          dataStatus: obs.dataStatus,
          isSimulated: obs.isSimulated,
          validityStatus: obs.validityStatus,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error retrieving instrument";
    return errorResponse(msg, 500);
  }
}

