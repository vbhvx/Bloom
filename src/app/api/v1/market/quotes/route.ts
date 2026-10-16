import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { amfiProvider } from "@/server/providers/amfiProvider";
import { simulatedProvider } from "@/server/providers/simulatedProvider";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return errorResponse("Missing required query parameter: 'symbol'", 400);
    }

    // 1. Check if it's a simulated fixture symbol
    const simQuote = await simulatedProvider.fetchQuote(symbol);
    if (simQuote) {
      return jsonResponse({
        quote: {
          symbol: simQuote.symbol,
          price: simQuote.price.toString(),
          currency: simQuote.currency,
          changePercent: simQuote.changePercent ? simQuote.changePercent.toString() : null,
          sourceTimestamp: simQuote.sourceTimestamp.toISOString(),
          ingestedAt: simQuote.ingestedAt.toISOString(),
          dataStatus: simQuote.dataStatus,
          isSimulated: true,
          isDelayed: false,
          validityStatus: simQuote.validityStatus,
          providerId: simQuote.providerId,
          provenanceNote: "DEMO FIXTURE: Simulated market observation for product testing.",
        },
      });
    }

    // 2. Try Live AMFI provider
    try {
      const amfiQuote = await amfiProvider.fetchQuote(symbol);
      if (amfiQuote) {
        return jsonResponse({
          quote: {
            symbol: amfiQuote.symbol,
            price: amfiQuote.price.toString(),
            currency: amfiQuote.currency,
            sourceTimestamp: amfiQuote.sourceTimestamp.toISOString(),
            ingestedAt: amfiQuote.ingestedAt.toISOString(),
            dataStatus: amfiQuote.dataStatus,
            isSimulated: false,
            isDelayed: false,
            validityStatus: amfiQuote.validityStatus,
            providerId: amfiQuote.providerId,
            rawMetadata: amfiQuote.rawPayload,
            provenanceNote: "VERIFIED LIVE: Official Daily Net Asset Value from Association of Mutual Funds in India (AMFI).",
          },
        });
      }
    } catch (e) {
      console.warn("Live provider query failed:", e);
    }

    // 3. Fallback to latest observation in DB
    const dbInst = await prisma.instrument.findFirst({
      where: { OR: [{ symbol }, { isin: symbol }] },
      include: {
        observations: {
          orderBy: { sourceTimestamp: "desc" },
          take: 1,
        },
      },
    });

    if (dbInst && dbInst.observations[0]) {
      const obs = dbInst.observations[0];
      return jsonResponse({
        quote: {
          symbol: dbInst.symbol,
          price: obs.price.toString(),
          currency: obs.currency,
          changePercent: obs.changePercent ? obs.changePercent.toString() : null,
          sourceTimestamp: obs.sourceTimestamp.toISOString(),
          ingestedAt: obs.ingestedAt.toISOString(),
          dataStatus: obs.dataStatus,
          isSimulated: obs.isSimulated,
          isDelayed: obs.isDelayed,
          validityStatus: obs.validityStatus,
          providerId: obs.providerId,
          provenanceNote: obs.isSimulated
            ? "DEMO FIXTURE: Stored simulated observation."
            : "STORED OBSERVATION: Last recorded market value.",
        },
      });
    }

    return errorResponse(`No market quote found for symbol '${symbol}'`, 404);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching market quote";
    return errorResponse(msg, 500);
  }
}

