import { z } from "zod";
import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        message,
        status,
        details,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

// Zod schemas
export const GoalInputSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  category: z.enum([
    "RETIREMENT",
    "EMERGENCY_FUND",
    "HOME_PURCHASE",
    "EDUCATION",
    "WEALTH_CREATION",
    "CUSTOM",
  ]),
  targetAmount: z.number().positive("Target amount must be positive"),
  currency: z.string().length(3).default("INR"),
  targetDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid target date"),
  currentAllocatedSavings: z.number().nonnegative("Current savings cannot be negative").default(0),
  monthlyContribution: z.number().nonnegative("Monthly contribution cannot be negative").default(0),
  contributionFrequency: z.string().default("MONTHLY"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export const ScenarioInputSchema = z.object({
  name: z.string().min(1).default("Custom Scenario"),
  baselineReturnRateAnnual: z.number().min(-0.5).max(1.0).default(0.10),
  favorableReturnRateAnnual: z.number().min(-0.5).max(1.0).default(0.13),
  adverseReturnRateAnnual: z.number().min(-0.5).max(1.0).default(0.06),
  inflationRateAnnual: z.number().min(0).max(0.3).default(0.06),
  monthlyContribution: z.number().nonnegative().optional(),
  currentSavings: z.number().nonnegative().optional(),
  timeHorizonMonths: z.number().int().positive().optional(),
  contributionTiming: z.enum(["START_OF_PERIOD", "END_OF_PERIOD"]).default("END_OF_PERIOD"),
  compoundingFrequency: z.enum(["ANNUAL", "MONTHLY"]).default("ANNUAL"),
});

export const InvestmentCompareSchema = z.object({
  instrumentSymbols: z.array(z.string()).min(2, "Select at least 2 instruments to compare").max(5),
  horizonMonths: z.number().int().positive().default(60),
});

export const OrderPreviewSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(["NSE", "BSE"]).default("NSE"),
  transactionType: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive(),
  estimatedUnitPrice: z.number().positive(),
});

export const OrderPlaceSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.enum(["NSE", "BSE"]).default("NSE"),
  transactionType: z.enum(["BUY", "SELL"]),
  productType: z.enum(["CNC", "MIS"]).default("CNC"),
  orderType: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
  quantity: z.number().int().positive(),
  price: z.number().positive().optional(),
  idempotencyKey: z.string().min(8),
  userConfirmationToken: z.string().min(16),
  isSandbox: z.boolean().default(true),
});

