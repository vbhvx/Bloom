import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { z } from "zod";
import { Decimal } from "@/lib/decimal";

const ProfilePatchSchema = z.object({
  preferredCurrency: z.string().length(3).optional(),
  locale: z.string().optional(),
  country: z.string().optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  monthlyExpenses: z.number().nonnegative().optional(),
  currentSavings: z.number().nonnegative().optional(),
  riskTolerance: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]).optional(),
  planningPreferences: z.record(z.unknown()).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();
    const parsed = ProfilePatchSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const d = parsed.data;
    const updated = await prisma.userProfile.upsert({
      where: { userId: authUser.userId },
      update: {
        preferredCurrency: d.preferredCurrency,
        locale: d.locale,
        country: d.country,
        monthlyIncome: d.monthlyIncome !== undefined ? new Decimal(d.monthlyIncome) : undefined,
        monthlyExpenses: d.monthlyExpenses !== undefined ? new Decimal(d.monthlyExpenses) : undefined,
        currentSavings: d.currentSavings !== undefined ? new Decimal(d.currentSavings) : undefined,
        riskTolerance: d.riskTolerance,
        planningPreferences: d.planningPreferences ? (d.planningPreferences as object) : undefined,
      },
      create: {
        userId: authUser.userId,
        preferredCurrency: d.preferredCurrency || "INR",
        monthlyIncome: d.monthlyIncome !== undefined ? new Decimal(d.monthlyIncome) : undefined,
        monthlyExpenses: d.monthlyExpenses !== undefined ? new Decimal(d.monthlyExpenses) : undefined,
      },
    });

    return jsonResponse({ profile: updated });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error updating profile";
    return errorResponse(msg, status);
  }
}

