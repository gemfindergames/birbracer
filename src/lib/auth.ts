// ─────────────────────────────────────────────
// BirbRacer — Auth Utilities
// ─────────────────────────────────────────────

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { UserPublic } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me"
);

const SESSION_COOKIE = "birbracer_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─────────────────────────────────────────────
// Password Hashing
// ─────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────────
// JWT Token
// ─────────────────────────────────────────────

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const token = await createToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}

// ─────────────────────────────────────────────
// Get Current User
// ─────────────────────────────────────────────

export async function getCurrentUser(): Promise<UserPublic | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Check session exists and not expired
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        avatarEmoji: true,
        avatarImage: true,
        isAdmin: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Get User from Token (for API routes)
// ─────────────────────────────────────────────

export async function getUserFromRequest(
  request: Request
): Promise<UserPublic | null> {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(
      new RegExp(`${SESSION_COOKIE}=([^;]+)`)
    );
    const token = tokenMatch?.[1];

    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        avatarEmoji: true,
        avatarImage: true,
        isAdmin: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Admin Check
// ─────────────────────────────────────────────

export async function requireAdmin(
  request: Request
): Promise<UserPublic | null> {
  const user = await getUserFromRequest(request);
  if (!user || !user.isAdmin) return null;
  return user;
}

// ─────────────────────────────────────────────
// Seed Admin User
// ─────────────────────────────────────────────

export async function ensureAdminExists(): Promise<void> {
  const adminUsername = process.env.ADMIN_USERNAME || "pancho";
  const adminPassword = process.env.ADMIN_PASSWORD || "asdf1234";

  const existing = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existing) {
    const passwordHash = await hashPassword(adminPassword);
    await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        isAdmin: true,
        avatarEmoji: "👑",
      },
    });
    console.log(`[BirbRacer] Admin user "${adminUsername}" created.`);
  }
}
