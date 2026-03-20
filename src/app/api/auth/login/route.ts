// POST /api/auth/login — Authenticate user
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password required" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Update IP on login
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    await prisma.user.update({
      where: { id: user.id },
      data: { ipAddress: ip },
    });

    // Create session
    await createSession(user.id);

    const userData = {
      id: user.id,
      username: user.username,
      avatarEmoji: user.avatarEmoji,
      avatarImage: user.avatarImage,
      isAdmin: user.isAdmin,
    };

    return NextResponse.json({ success: true, data: userData });
  } catch (error) {
    console.error("[Login Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
