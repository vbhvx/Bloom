import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { scenarioId } = await params;

    const scenario = await prisma.planningScenario.findUnique({
      where: { id: scenarioId },
      include: { goal: true },
    });

    if (!scenario) {
      return errorResponse("Scenario not found", 404);
    }

    if (scenario.userId !== authUser.userId && authUser.role !== "ADMIN") {
      return errorResponse("Access denied", 403);
    }

    return jsonResponse({ scenario });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error fetching scenario";
    return errorResponse(msg, status);
  }
}

