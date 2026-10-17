import { NextRequest } from "next/server";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { accountAggregatorAdapter } from "@/server/providers/accountAggregatorAdapter";
import { z } from "zod";

const StartConsentSchema = z.object({
  fiTypes: z.array(z.string()).default(["DEPOSIT", "TERM_DEPOSIT", "MUTUAL_FUNDS"]),
  purposeCode: z.string().default("FINANCIAL_PLANNING_WEALTH_OVERVIEW"),
  dataLifeMonths: z.number().int().min(1).max(36).default(12),
  fetchFrequency: z.enum(["ONETIME", "DAILY", "MONTHLY"]).default("MONTHLY"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { providerId } = await params;

    const body = await req.json().catch(() => ({}));
    const parsed = StartConsentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const d = parsed.data;

    // Use Account Aggregator Adapter to initiate consent artifact
    const consent = await accountAggregatorAdapter.createConsentRequest({
      userId: authUser.userId,
      fiTypes: d.fiTypes,
      purposeCode: d.purposeCode,
      dataLifeMonths: d.dataLifeMonths,
      fetchFrequency: d.fetchFrequency,
    });

    // In sandbox demo mode, optionally trigger mock data sync
    const syncData = await accountAggregatorAdapter.fetchFinancialInformation(consent.consentId);

    return jsonResponse({
      consent,
      initialSyncStatus: "SUCCESS",
      accountsImported: syncData.accounts.length,
      message:
        "Account Aggregator consent successfully initiated in sandbox mode. Read-only financial records synchronized.",
    }, 201);
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error initiating connection";
    return errorResponse(msg, status);
  }
}

