import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { processAssistantQuery } from "@/server/ai/assistantService";
import { z } from "zod";

const MessageInputSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000),
  goalContextId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { conversationId } = await params;

    const conv = await prisma.assistantConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          include: {
            citations: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conv) {
      return errorResponse("Conversation not found", 404);
    }

    if (conv.userId !== authUser.userId && authUser.role !== "ADMIN") {
      return errorResponse("Access denied", 403);
    }

    return jsonResponse({
      conversation: {
        id: conv.id,
        title: conv.title,
        mode: conv.mode,
        status: conv.status,
        messages: conv.messages,
      },
    });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error fetching messages";
    return errorResponse(msg, status);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { conversationId } = await params;

    const conv = await prisma.assistantConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conv) {
      return errorResponse("Conversation not found", 404);
    }

    if (conv.userId !== authUser.userId && authUser.role !== "ADMIN") {
      return errorResponse("Access denied", 403);
    }

    const body = await req.json();
    const parsed = MessageInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const { message, goalContextId } = parsed.data;

    const response = await processAssistantQuery({
      userId: authUser.userId,
      conversationId: conv.id,
      message,
      mode: conv.mode,
      goalContextId,
    });

    return jsonResponse(response, 201);
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error processing assistant message";
    return errorResponse(msg, status);
  }
}

