import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { hashPassword, signAuthToken } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { z } from "zod";
import { Decimal } from "@/lib/decimal";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2),
  preferredCurrency: z.string().length(3).default("INR"),
  monthlyIncome: z.number().nonnegative().optional(),
  monthlyExpenses: z.number().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation error", 422, parsed.error.format());
    }

    const { email, password, name, preferredCurrency, monthlyIncome, monthlyExpenses } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return errorResponse("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        passwordHash,
        isDemoUser: false,
        profile: {
          create: {
            preferredCurrency,
            monthlyIncome: monthlyIncome ? new Decimal(monthlyIncome) : undefined,
            monthlyExpenses: monthlyExpenses ? new Decimal(monthlyExpenses) : undefined,
          },
        },
      },
      include: { profile: true },
    });

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      isDemoUser: user.isDemoUser,
    });

    const response = jsonResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemoUser: user.isDemoUser,
        profile: user.profile,
      },
    }, 201);

    response.cookies.set("bloom_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

