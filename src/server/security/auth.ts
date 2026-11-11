import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import prisma from "@/lib/db";

const DEV_FALLBACK_SECRET = "bloom-super-secret-jwt-signing-key-32charsmin-2026";

// The fallback only applies outside production (local dev and tests).
function getSigningSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production");
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}
const TOKEN_EXPIRY = "7d";

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
  isDemoUser: boolean;
}

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export function signAuthToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, getSigningSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyAuthToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, getSigningSecret()) as AuthUserPayload;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthUserPayload | null> {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const payload = verifyAuthToken(token);
    if (payload) return payload;
  }

  // 2. Check Cookie: bloom_token
  const cookieToken = req.cookies.get("bloom_token")?.value;
  if (cookieToken) {
    const payload = verifyAuthToken(cookieToken);
    if (payload) return payload;
  }

  return null;
}

export async function requireAuth(req: NextRequest): Promise<AuthUserPayload> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    const err = new Error("Authentication required");
    (err as unknown as { status: number }).status = 401;
    throw err;
  }
  return user;
}

export async function verifyUserOwnership(
  resourceOwnerId: string,
  currentUserId: string,
  userRole?: string
): Promise<boolean> {
  if (userRole === "ADMIN") return true;
  return resourceOwnerId === currentUserId;
}

