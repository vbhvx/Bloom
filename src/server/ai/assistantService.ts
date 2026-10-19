import prisma from "@/lib/db";
import { AssistantMode } from "@prisma/client";
import { checkFeatureGate, KNOWN_FEATURE_KEYS } from "../security/gates";
import { calculatePlanningScenarios, ScenarioCalculationInput } from "../finance/calculations";

export interface AssistantRequest {
  userId: string;
  conversationId?: string;
  message: string;
  mode?: AssistantMode;
  goalContextId?: string;
}

export interface AssistantResponse {
  conversationId: string;
  messageId: string;
  mode: AssistantMode;
  reply: string;
  citations: Array<{
    sourceTitle: string;
    quote: string;
    url?: string;
    relevanceScore: number;
  }>;
  calculatedScenario?: object;
  isGatedRefusal: boolean;
  provenance: {
    engine: string;
    sourcesCount: number;
    timestamp: string;
  };
}

// Security guardrails against prompt injection
const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /system prompt/i,
  /act as an? unrestricted/i,
  /jailbreak/i,
  /you are no longer bound by/i,
  /override compliance/i,
];

// Regulated personalized advice triggers
const PERSONALIZED_ADVICE_PATTERNS = [
  /should i buy shares of/i,
  /which specific stock should i buy/i,
  /give me a guaranteed tip/i,
  /tell me exact stock to purchase/i,
  /recommend a specific stock for quick profit/i,
];

export async function processAssistantQuery(req: AssistantRequest): Promise<AssistantResponse> {
  const { userId, message, goalContextId } = req;
  const mode = req.mode || AssistantMode.EDUCATION;

  // 1. Guard against prompt injection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        conversationId: req.conversationId || "conv-security-refusal",
        messageId: `msg-${Date.now()}`,
        mode,
        reply: "I cannot comply with requests that attempt to alter system safety policies, override compliance rules, or bypass verification controls.",
        citations: [],
        isGatedRefusal: true,
        provenance: {
          engine: "Bloom Guardrail Filter",
          sourcesCount: 0,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // 2. Check for regulated personalized securities advice
  const isAskingPersonalizedAdvice = PERSONALIZED_ADVICE_PATTERNS.some((p) => p.test(message));
  if (isAskingPersonalizedAdvice || mode === AssistantMode.REGULATED_ADVICE) {
    const gate = await checkFeatureGate(KNOWN_FEATURE_KEYS.PERSONALIZED_SECURITIES_ADVICE);
    if (!gate.isPermitted) {
      return {
        conversationId: req.conversationId || "conv-gate-refusal",
        messageId: `msg-${Date.now()}`,
        mode: AssistantMode.REGULATED_ADVICE,
        reply: `**Notice: Personalized Securities Advice is currently disabled.**\n\n` +
          `Under SEBI (Investment Advisers) Regulations, 2013, providing personalized recommendations on individual securities requires registration with SEBI as an Investment Adviser (RIA), suitability assessments, and documented risk profiling.\n\n` +
          `Bloom operates as an educational financial planning and intelligence platform. I can help you evaluate **asset classes** (e.g., Index Mutual Funds vs. Sovereign Gold Bonds vs. Fixed Deposits), calculate **goal-based SIP contributions**, and explain **downside risks**, but I cannot issue specific stock buy/sell calls.`,
        citations: [
          {
            sourceTitle: "SEBI (Investment Advisers) Regulations, 2013",
            quote: "Regulation 2(1)(x): 'Investment advice' means advice relating to investing in, purchasing, selling or otherwise dealing in securities or investment products.",
            url: "https://www.sebi.gov.in",
            relevanceScore: 0.98,
          },
        ],
        isGatedRefusal: true,
        provenance: {
          engine: "Bloom Regulatory Compliance Gate",
          sourcesCount: 1,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // 3. Conversation Management
  let conversation = null;
  if (req.conversationId) {
    conversation = await prisma.assistantConversation.findFirst({
      where: { id: req.conversationId, userId },
    });
  }

  if (!conversation) {
    conversation = await prisma.assistantConversation.create({
      data: {
        userId,
        title: message.substring(0, 40) + "...",
        mode,
        status: "ACTIVE",
      },
    });
  }

  // Save user message
  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
    },
  });

  // 4. Retrieve Grounded Knowledge Sources from DB
  const keywords = message.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const chunks = await prisma.knowledgeChunk.findMany({
    include: { source: true },
    take: 40,
  });

  // Score chunks by keyword overlap
  const scoredChunks = chunks
    .map((chunk) => {
      let score = 0;
      const text = `${chunk.title} ${chunk.content}`.toLowerCase();
      for (const kw of keywords) {
        if (text.includes(kw)) score += 1;
      }
      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 5. Check if planning calculation is requested
  let calculatedScenarioResult = undefined;
  const isPlanningQuery =
    mode === AssistantMode.PLANNING ||
    /how much (should|do) i (need to )?invest/i.test(message) ||
    /sip for/i.test(message) ||
    /reach (₹|rs\.?|inr)?\s*[\d,]+/i.test(message);

  if (isPlanningQuery && goalContextId) {
    const goal = await prisma.financialGoal.findFirst({
      where: { id: goalContextId, userId },
    });

    if (goal) {
      const now = new Date();
      const targetDate = new Date(goal.targetDate);
      const diffMonths = Math.max(
        1,
        Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
      );

      const calcInput: ScenarioCalculationInput = {
        targetAmount: goal.targetAmount.toString(),
        currentSavings: goal.currentAllocatedSavings.toString(),
        monthlyContribution: goal.monthlyContribution.toString(),
        timeHorizonMonths: diffMonths,
        baselineReturnRateAnnual: "0.10",
        favorableReturnRateAnnual: "0.125",
        adverseReturnRateAnnual: "0.065",
        inflationRateAnnual: "0.06",
        currency: goal.currency,
      };

      calculatedScenarioResult = calculatePlanningScenarios(calcInput);
    }
  }

  // 6. Synthesize grounded plain-language answer
  let responseText = "";
  const citations: AssistantResponse["citations"] = [];

  if (scoredChunks.length > 0) {
    for (const item of scoredChunks) {
      citations.push({
        sourceTitle: item.chunk.source.title,
        quote: item.chunk.content.substring(0, 300) + (item.chunk.content.length > 300 ? "..." : ""),
        url: item.chunk.source.url || undefined,
        relevanceScore: Math.min(0.99, 0.6 + item.score * 0.1),
      });
    }
  }

  if (calculatedScenarioResult) {
    const out = calculatedScenarioResult.outputs;
    responseText =
      `Based on deterministic financial calculations for your goal:\n\n` +
      `• **Target Amount:** ₹${Number(calculatedScenarioResult.inputs.targetAmount).toLocaleString("en-IN")}\n` +
      `• **Inflation-Adjusted Target (at 6% p.a.):** ₹${Number(out.inflationAdjustedTarget).toLocaleString("en-IN")}\n` +
      `• **Baseline Projected Value (at 10% p.a.):** ₹${Number(out.baselineFV).toLocaleString("en-IN")}\n` +
      `• **Required Monthly SIP:** ₹${Number(out.requiredMonthlyContribution).toLocaleString("en-IN")}/month\n` +
      `• **Downside Adverse Projection (at 6.5% p.a.):** ₹${Number(out.adverseFV).toLocaleString("en-IN")}\n\n` +
      `*Formula Version:* \`${calculatedScenarioResult.formulaVersion}\` with exact decimal compounding arithmetic.`;
  } else if (scoredChunks.length > 0) {
    const primary = scoredChunks[0].chunk;
    responseText =
      `According to verified financial sources (${primary.source.publisher}):\n\n` +
      `${primary.content}\n\n` +
      `*Source:* **${primary.source.title}** (${primary.source.publisher})`;
  } else {
    responseText =
      `Bloom provides verified, goal-first financial planning and education grounded in official Indian regulatory and tax frameworks. ` +
      `I can help you understand concepts like compounding, inflation, Mutual Fund NAVs, SGBs, PPF, and calculate exact SIP requirements for your financial goals. ` +
      `Please ask any question about goal planning, investment instruments, or financial concepts.`;
  }

  // Save assistant message to DB
  const assistantMsg = await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: responseText,
      modelName: "bloom-deterministic-grounded-engine",
      isGatedRefusal: false,
    },
  });

  // Save citations to DB
  for (const c of citations) {
    await prisma.assistantCitation.create({
      data: {
        messageId: assistantMsg.id,
        sourceTitle: c.sourceTitle,
        quote: c.quote,
        relevanceScore: c.relevanceScore,
      },
    });
  }

  return {
    conversationId: conversation.id,
    messageId: assistantMsg.id,
    mode,
    reply: responseText,
    citations,
    calculatedScenario: calculatedScenarioResult,
    isGatedRefusal: false,
    provenance: {
      engine: "Bloom Grounded Assistant v1.0",
      sourcesCount: citations.length,
      timestamp: new Date().toISOString(),
    },
  };
}
