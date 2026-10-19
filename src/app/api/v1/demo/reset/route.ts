import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { Decimal } from "@/lib/decimal";
import { calculatePlanningScenarios } from "@/server/finance/calculations";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (!user.isDemoUser) {
      return errorResponse(
        "Safe Reset Protection: The reset mechanism is strictly limited to demo accounts. Real investor accounts cannot be reset via this endpoint.",
        403
      );
    }

    // Safely delete only this demo user's goals, scenarios, and simulated accounts
    await prisma.financialGoal.deleteMany({ where: { userId: user.id } });
    await prisma.financialAccount.deleteMany({ where: { userId: user.id } });
    await prisma.assistantConversation.deleteMany({ where: { userId: user.id } });

    // Re-seed standard demo goals
    const goal1Date = new Date();
    goal1Date.setMonth(goal1Date.getMonth() + 12);

    const goal1 = await prisma.financialGoal.create({
      data: {
        userId: user.id,
        title: "Emergency Cushion (6 Months Expenses)",
        description: "6 months living expenses stored safely in liquid funds.",
        category: "EMERGENCY_FUND",
        targetAmount: new Decimal("330000"),
        currency: "INR",
        targetDate: goal1Date,
        currentAllocatedSavings: new Decimal("150000"),
        monthlyContribution: new Decimal("15000"),
        priority: "HIGH",
      },
    });

    const calc1 = calculatePlanningScenarios({
      targetAmount: "330000",
      currentSavings: "150000",
      monthlyContribution: "15000",
      timeHorizonMonths: 12,
      baselineReturnRateAnnual: "0.065",
      favorableReturnRateAnnual: "0.075",
      adverseReturnRateAnnual: "0.055",
      inflationRateAnnual: "0.055",
      currency: "INR",
    });

    await prisma.planningScenario.create({
      data: {
        goalId: goal1.id,
        userId: user.id,
        name: "Emergency Fund 12-Month Plan",
        currency: "INR",
        targetAmount: new Decimal(calc1.inputs.targetAmount),
        timeHorizonMonths: 12,
        monthlyContribution: new Decimal(calc1.inputs.monthlyContribution),
        currentSavings: new Decimal(calc1.inputs.currentSavings),
        inflationRate: new Decimal(calc1.inputs.inflationRateAnnual),
        baselineReturnRate: new Decimal(calc1.inputs.baselineReturnRateAnnual),
        favorableReturnRate: new Decimal(calc1.inputs.favorableReturnRateAnnual),
        adverseReturnRate: new Decimal(calc1.inputs.adverseReturnRateAnnual),
        baselineFV: new Decimal(calc1.outputs.baselineFV),
        favorableFV: new Decimal(calc1.outputs.favorableFV),
        adverseFV: new Decimal(calc1.outputs.adverseFV),
        totalContributions: new Decimal(calc1.outputs.totalContributions),
        baselineGrowth: new Decimal(calc1.outputs.baselineGrowth),
        requiredMonthlyContribution: new Decimal(calc1.outputs.requiredMonthlyContribution),
        metadata: calc1 as unknown as object,
      },
    });

    // Re-seed demo bank and demat accounts
    await prisma.financialAccount.create({
      data: {
        userId: user.id,
        institutionName: "HDFC Bank Ltd",
        accountType: "SAVINGS",
        accountNumberMask: "XX4419",
        currency: "INR",
        balance: new Decimal("150000"),
        isSimulated: true,
        isConnected: false,
        status: "ACTIVE",
      },
    });

    return jsonResponse({
      message: "Demo fixtures successfully reset to default state. Real investor data was unaffected.",
      status: "SUCCESS",
    });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error resetting demo fixtures";
    return errorResponse(msg, status);
  }
}

