import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse, GoalInputSchema } from "@/server/api/validation";
import { Decimal, roundCurrency } from "@/lib/decimal";
import { calculatePlanningScenarios } from "@/server/finance/calculations";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);

    const goals = await prisma.financialGoal.findMany({
      where: { userId: authUser.userId },
      include: {
        scenarios: {
          orderBy: { calculatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const formattedGoals = goals.map((g) => {
      const target = new Decimal(g.targetAmount);
      const saved = new Decimal(g.currentAllocatedSavings);
      const progressPercent = target.isZero()
        ? 0
        : Math.min(100, Number(saved.dividedBy(target).times(100).toFixed(1)));

      const targetDate = new Date(g.targetDate);
      const diffMonths = Math.max(
        1,
        Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
      );

      return {
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        targetAmount: roundCurrency(target).toFixed(2),
        currency: g.currency,
        targetDate: g.targetDate.toISOString(),
        currentAllocatedSavings: roundCurrency(saved).toFixed(2),
        monthlyContribution: roundCurrency(new Decimal(g.monthlyContribution)).toFixed(2),
        contributionFrequency: g.contributionFrequency,
        priority: g.priority,
        status: g.status,
        progressPercent,
        remainingMonths: diffMonths,
        latestScenario: g.scenarios[0] || null,
        createdAt: g.createdAt.toISOString(),
      };
    });

    return jsonResponse({ goals: formattedGoals });
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 401;
    const msg = err instanceof Error ? err.message : "Authentication error";
    return errorResponse(msg, status);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();

    const parsed = GoalInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const d = parsed.data;
    const targetDate = new Date(d.targetDate);
    const now = new Date();

    if (targetDate <= now) {
      return errorResponse("Target date must be in the future", 422);
    }

    const diffMonths = Math.max(
      1,
      Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
    );

    // Create Goal in Database
    const goal = await prisma.financialGoal.create({
      data: {
        userId: authUser.userId,
        title: d.title,
        description: d.description,
        category: d.category,
        targetAmount: new Decimal(d.targetAmount),
        currency: d.currency,
        targetDate,
        currentAllocatedSavings: new Decimal(d.currentAllocatedSavings),
        monthlyContribution: new Decimal(d.monthlyContribution),
        contributionFrequency: d.contributionFrequency,
        priority: d.priority,
      },
    });

    // Compute and save initial deterministic scenario
    const calcResult = calculatePlanningScenarios({
      targetAmount: d.targetAmount,
      currentSavings: d.currentAllocatedSavings,
      monthlyContribution: d.monthlyContribution,
      timeHorizonMonths: diffMonths,
      baselineReturnRateAnnual: "0.10", // 10% standard baseline
      favorableReturnRateAnnual: "0.125",
      adverseReturnRateAnnual: "0.065",
      inflationRateAnnual: "0.06",
      currency: d.currency,
    });

    const scenario = await prisma.planningScenario.create({
      data: {
        goalId: goal.id,
        userId: authUser.userId,
        name: `${goal.title} Initial Plan`,
        formulaVersion: calcResult.formulaVersion,
        currency: d.currency,
        targetAmount: new Decimal(calcResult.inputs.targetAmount),
        timeHorizonMonths: diffMonths,
        monthlyContribution: new Decimal(calcResult.inputs.monthlyContribution),
        currentSavings: new Decimal(calcResult.inputs.currentSavings),
        inflationRate: new Decimal(calcResult.inputs.inflationRateAnnual),
        baselineReturnRate: new Decimal(calcResult.inputs.baselineReturnRateAnnual),
        favorableReturnRate: new Decimal(calcResult.inputs.favorableReturnRateAnnual),
        adverseReturnRate: new Decimal(calcResult.inputs.adverseReturnRateAnnual),
        baselineFV: new Decimal(calcResult.outputs.baselineFV),
        favorableFV: new Decimal(calcResult.outputs.favorableFV),
        adverseFV: new Decimal(calcResult.outputs.adverseFV),
        totalContributions: new Decimal(calcResult.outputs.totalContributions),
        baselineGrowth: new Decimal(calcResult.outputs.baselineGrowth),
        requiredMonthlyContribution: new Decimal(calcResult.outputs.requiredMonthlyContribution),
        metadata: calcResult as unknown as object,
      },
    });

    return jsonResponse(
      {
        goal,
        scenario,
        calculationDetails: calcResult,
      },
      201
    );
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error creating financial goal";
    return errorResponse(msg, status);
  }
}

