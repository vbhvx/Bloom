import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/server/security/auth";
import { errorResponse, jsonResponse, ScenarioInputSchema } from "@/server/api/validation";
import { Decimal } from "@/lib/decimal";
import { calculatePlanningScenarios } from "@/server/finance/calculations";

export async function POST(
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

    const body = await req.json();
    const parsed = ScenarioInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const d = parsed.data;

    // Calculate time horizon in months if not supplied
    let timeHorizon = d.timeHorizonMonths;
    if (!timeHorizon) {
      const targetDate = new Date(goal.targetDate);
      const now = new Date();
      timeHorizon = Math.max(
        1,
        Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
      );
    }

    const savings = d.currentSavings !== undefined ? d.currentSavings : Number(goal.currentAllocatedSavings);
    const contribution =
      d.monthlyContribution !== undefined ? d.monthlyContribution : Number(goal.monthlyContribution);

    // Deterministic Calculation Engine
    const calcResult = calculatePlanningScenarios({
      targetAmount: goal.targetAmount.toString(),
      currentSavings: savings,
      monthlyContribution: contribution,
      timeHorizonMonths: timeHorizon,
      baselineReturnRateAnnual: d.baselineReturnRateAnnual,
      favorableReturnRateAnnual: d.favorableReturnRateAnnual,
      adverseReturnRateAnnual: d.adverseReturnRateAnnual,
      inflationRateAnnual: d.inflationRateAnnual,
      contributionTiming: d.contributionTiming,
      currency: goal.currency,
    });

    // Save reproducible scenario record
    const scenario = await prisma.planningScenario.create({
      data: {
        goalId: goal.id,
        userId: authUser.userId,
        name: d.name,
        formulaVersion: calcResult.formulaVersion,
        currency: goal.currency,
        targetAmount: new Decimal(calcResult.inputs.targetAmount),
        timeHorizonMonths: timeHorizon,
        monthlyContribution: new Decimal(calcResult.inputs.monthlyContribution),
        currentSavings: new Decimal(calcResult.inputs.currentSavings),
        inflationRate: new Decimal(calcResult.inputs.inflationRateAnnual),
        baselineReturnRate: new Decimal(calcResult.inputs.baselineReturnRateAnnual),
        favorableReturnRate: new Decimal(calcResult.inputs.favorableReturnRateAnnual),
        adverseReturnRate: new Decimal(calcResult.inputs.adverseReturnRateAnnual),
        contributionTiming: d.contributionTiming,
        baselineFV: new Decimal(calcResult.outputs.baselineFV),
        favorableFV: new Decimal(calcResult.outputs.favorableFV),
        adverseFV: new Decimal(calcResult.outputs.adverseFV),
        totalContributions: new Decimal(calcResult.outputs.totalContributions),
        baselineGrowth: new Decimal(calcResult.outputs.baselineGrowth),
        requiredMonthlyContribution: new Decimal(calcResult.outputs.requiredMonthlyContribution),
        isReproducible: true,
        metadata: calcResult as unknown as object,
      },
    });

    return jsonResponse(
      {
        scenario,
        calculationDetails: calcResult,
      },
      201
    );
  } catch (err: unknown) {
    const status = (err as unknown as { status?: number }).status || 500;
    const msg = err instanceof Error ? err.message : "Error calculating scenario";
    return errorResponse(msg, status);
  }
}

