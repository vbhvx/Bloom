import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { Decimal } from "@/lib/decimal";
import { z } from "zod";

const GoalPatchSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  targetAmount: z.number().positive().optional(),
  currentAllocatedSavings: z.number().nonnegative().optional(),
  monthlyContribution: z.number().nonnegative().optional(),
  targetDate: z.string().refine((d) => !isNaN(Date.parse(d))).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["ACTIVE", "ACHIEVED", "ARCHIVED"]).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { goalId } = await params;

    const goal = await prisma.financialGoal.findUnique({
      where: { id: goalId },
      include: {
        scenarios: {
          orderBy: { calculatedAt: "desc" },
        },
      },
    });

    if (!goal) {
      return errorResponse("Goal not found", 404);
    }

    if (goal.userId !== authUser.userId && authUser.role !== "ADMIN") {
      return errorResponse("Access denied: You do not own this goal", 403);
    }

    return jsonResponse({ goal });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error fetching goal";
    return errorResponse(msg, status);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { goalId } = await params;

    const goal = await prisma.financialGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return errorResponse("Goal not found", 404);
    }

    if (goal.userId !== authUser.userId && authUser.role !== "ADMIN") {
      return errorResponse("Access denied: You do not own this goal", 403);
    }

    const body = await req.json();
    const parsed = GoalPatchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const d = parsed.data;

    const updated = await prisma.financialGoal.update({
      where: { id: goalId },
      data: {
        title: d.title,
        description: d.description,
        targetAmount: d.targetAmount ? new Decimal(d.targetAmount) : undefined,
        currentAllocatedSavings:
          d.currentAllocatedSavings !== undefined ? new Decimal(d.currentAllocatedSavings) : undefined,
        monthlyContribution:
          d.monthlyContribution !== undefined ? new Decimal(d.monthlyContribution) : undefined,
        targetDate: d.targetDate ? new Date(d.targetDate) : undefined,
        priority: d.priority,
        status: d.status,
      },
    });

    return jsonResponse({ goal: updated });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error updating goal";
    return errorResponse(msg, status);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const authUser = await requireAuth(req);
    const { goalId } = await params;

    const goal = await prisma.financialGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return errorResponse("Goal not found", 404);
    }

    if (goal.userId !== authUser.userId && authUser.role !== "ADMIN") {
      return errorResponse("Access denied", 403);
    }

    await prisma.financialGoal.delete({
      where: { id: goalId },
    });

    return jsonResponse({ message: "Goal deleted successfully" });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error deleting goal";
    return errorResponse(msg, status);
  }
}

