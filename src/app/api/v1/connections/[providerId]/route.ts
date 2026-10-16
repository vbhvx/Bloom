import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { accountAggregatorAdapter } from "@/server/providers/accountAggregatorAdapter";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { providerId } = await params;

    // Check if providerId refers to an accountConnection id or a provider code
    const conn = await prisma.accountConnection.findFirst({
      where: {
        OR: [{ id: providerId }, { consentId: providerId }, { provider: { code: providerId } }],
        userId: authUser.userId,
      },
    });

    if (!conn) {
      return errorResponse("Connection not found or not owned by user", 404);
    }

    if (conn.consentId) {
      await accountAggregatorAdapter.revokeConsent(conn.consentId);
    } else {
      await prisma.accountConnection.update({
        where: { id: conn.id },
        data: { status: "REVOKED", consentRevokedAt: new Date() },
      });
    }

    return jsonResponse({
      message: "Connection and associated consent revoked successfully. Future data access terminated.",
      connectionId: conn.id,
      status: "REVOKED",
    });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error revoking connection";
    return errorResponse(msg, status);
  }
}

