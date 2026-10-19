import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { AssistantMode } from "@prisma/client";
import { z } from "zod";

const CreateConversationSchema = z.object({
  title: z.string().min(1).default("New Planning Conversation"),
  mode: z
    .enum(["EDUCATION", "PLANNING", "MARKET_INFO", "REGULATED_ADVICE", "TRANSACTIONS"])
    .default("EDUCATION"),
});

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    const conversations = await prisma.assistantConversation.findMany({
      where: { userId: authUser.userId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return jsonResponse({ conversations });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error fetching conversations";
    return errorResponse(msg, status);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parsed = CreateConversationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const { title, mode } = parsed.data;

    const conversation = await prisma.assistantConversation.create({
      data: {
        userId: authUser.userId,
        title,
        mode: mode as AssistantMode,
        status: "ACTIVE",
      },
    });

    return jsonResponse({ conversation }, 201);
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error creating conversation";
    return errorResponse(msg, status);
  }
}

