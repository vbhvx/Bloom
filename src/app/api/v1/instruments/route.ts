import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { amfiProvider } from "@/server/providers/amfiProvider";
import { simulatedProvider } from "@/server/providers/simulatedProvider";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const assetClass = searchParams.get("assetClass");
    const liveOnly = searchParams.get("liveOnly") === "true";

    // 1. Fetch DB instruments
    const whereClause: Record<string, unknown> = {};
    if (category) whereClause.category = category;
    if (assetClass) whereClause.assetClass = assetClass;
    if (liveOnly) whereClause.isSimulated = false;

    if (query) {
      whereClause.OR = [
        { symbol: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ];
    }

    const dbInstruments = await prisma.instrument.findMany({
      where: whereClause,
      include: {
        observations: {
          orderBy: { sourceTimestamp: "desc" },
          take: 1,
        },
      },
      take: 50,
    });

    // 2. If query given and live provider is requested or results < 5, also query live AMFI provider
    let liveResults: unknown[] = [];
    if (query && query.length >= 2) {
      try {
        const amfiHits = await amfiProvider.searchInstruments(query);
        liveResults = amfiHits;
      } catch (e) {
        console.warn("AMFI search warning:", e);
      }
    }

    // Format DB results
    const formattedDb = dbInstruments.map((inst) => {
      const latestObs = inst.observations[0];
      return {
        id: inst.id,
        symbol: inst.symbol,
        isin: inst.isin,
        name: inst.name,
        category: inst.category,
        assetClass: inst.assetClass,
        currency: inst.currency,
        riskLevel: inst.riskLevel,
        expenseRatio: inst.expenseRatio ? inst.expenseRatio.toString() : null,
        lockInDays: inst.lockInDays,
        taxNotes: inst.taxNotes,
        minInvestment: inst.minInvestment ? inst.minInvestment.toString() : null,
        isSimulated: inst.isSimulated,
        latestObservation: latestObs
          ? {
              price: latestObs.price.toString(),
              changePercent: latestObs.changePercent ? latestObs.changePercent.toString() : null,
              sourceTimestamp: latestObs.sourceTimestamp.toISOString(),
              dataStatus: latestObs.dataStatus,
              isSimulated: latestObs.isSimulated,
              isDelayed: latestObs.isDelayed,
              validityStatus: latestObs.validityStatus,
            }
          : null,
      };
    });

    return jsonResponse({
      totalCount: formattedDb.length + liveResults.length,
      instruments: formattedDb,
      liveExternalMatches: liveResults,
      provenanceNotice:
        "Instruments marked with 'isSimulated: true' are deterministic fixtures. AMFI records represent verified live daily NAV data.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error querying instruments";
    return errorResponse(msg, 500);
  }
}

