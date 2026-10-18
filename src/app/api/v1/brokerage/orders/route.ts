import { NextRequest } from "next/server";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse, OrderPlaceSchema } from "@/server/api/validation";
import { brokerageAdapter } from "@/server/providers/brokerageAdapter";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();

    const parsed = OrderPlaceSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const d = parsed.data;

    const result = await brokerageAdapter.placeOrder({
      userId: authUser.userId,
      symbol: d.symbol,
      exchange: d.exchange,
      transactionType: d.transactionType,
      productType: d.productType,
      orderType: d.orderType,
      quantity: d.quantity,
      price: d.price,
      idempotencyKey: d.idempotencyKey,
      userConfirmationToken: d.userConfirmationToken,
      isSandbox: d.isSandbox,
    });

    return jsonResponse({ orderResult: result }, 201);
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error placing order";
    return errorResponse(msg, status);
  }
}

