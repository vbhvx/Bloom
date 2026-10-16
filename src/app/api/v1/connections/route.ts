import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    const connections = await prisma.accountConnection.findMany({
      where: { userId: authUser.userId },
      include: {
        provider: true,
        syncRuns: {
          orderBy: { startedAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = connections.map((c) => ({
      id: c.id,
      providerCode: c.provider.code,
      providerName: c.provider.name,
      providerCategory: c.provider.category,
      status: c.status,
      consentId: c.consentId,
      permittedScopes: c.permittedScopes,
      consentGrantedAt: c.consentGrantedAt ? c.consentGrantedAt.toISOString() : null,
      consentExpiresAt: c.consentExpiresAt ? c.consentExpiresAt.toISOString() : null,
      lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
      syncError: c.syncError,
      isSandbox: c.isSandbox,
      recentSyncRuns: c.syncRuns.map((r) => ({
        id: r.id,
        status: r.status,
        recordsFetched: r.recordsFetched,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      })),
    }));

    return jsonResponse({
      connections: formatted,
    });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error fetching connections";
    return errorResponse(msg, status);
  }
}

