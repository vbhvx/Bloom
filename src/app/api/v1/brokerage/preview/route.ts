import { NextRequest } from "next/server";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse, OrderPreviewSchema } from "@/server/api/validation";
import { brokerageAdapter } from "@/server/providers/brokerageAdapter";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();

    const parsed = OrderPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const preview = await brokerageAdapter.previewOrder({
      userId: authUser.userId,
      symbol: parsed.data.symbol,
      exchange: parsed.data.exchange,
      transactionType: parsed.data.transactionType,
      quantity: parsed.data.quantity,
      estimatedUnitPrice: parsed.data.estimatedUnitPrice,
    });

    return jsonResponse({ preview });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error generating order preview";
    return errorResponse(msg, status);
  }
}

