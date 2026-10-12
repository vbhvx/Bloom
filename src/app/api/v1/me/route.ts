import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: {
        profile: true,
        riskAssessments: {
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemoUser: user.isDemoUser,
        profile: user.profile,
        latestRiskAssessment: user.riskAssessments[0] || null,
      },
    });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 401;
    const msg = err instanceof Error ? err.message : "Authentication failed";
    return errorResponse(msg, status);
  }
}

