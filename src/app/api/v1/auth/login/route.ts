import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { comparePassword, signAuthToken } from "@/server/security/auth";
import { errorResponse, jsonResponse } from "@/server/api/validation";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid email or password format", 422, parsed.error.format());
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return errorResponse("Invalid credentials", 401);
    }

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
    });

    // Set cookie for browser sessions
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

