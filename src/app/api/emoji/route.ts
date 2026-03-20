// POST /api/emoji — Send an emoji reaction during a race
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sseManager } from "@/lib/sse";

// Rate limit: max 1 emoji per 2 seconds per user per race
const rateLimitMap = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { raceId, emoji } = body;

    if (!raceId || !emoji) {
      return NextResponse.json(
        { success: false, error: "raceId and emoji required" },
        { status: 400 }
      );
    }

    // Validate emoji (basic check — should be 1-4 chars)
    if (typeof emoji !== "string" || emoji.length > 8) {
      return NextResponse.json(
        { success: false, error: "Invalid emoji" },
        { status: 400 }
      );
    }

    // Rate limiting
    const key = `${user.id}:${raceId}`;
    const lastSent = rateLimitMap.get(key) || 0;
    const now = Date.now();

    if (now - lastSent < 200) {
      return NextResponse.json(
        { success: false, error: "Too fast! Wait a moment" },
        { status: 429 }
      );
    }

    rateLimitMap.set(key, now);

    // Clean up old entries periodically
    if (rateLimitMap.size > 10000) {
      const cutoff = now - 60000;
      for (const [k, v] of rateLimitMap) {
        if (v < cutoff) rateLimitMap.delete(k);
      }
    }

    // Save to database
    const reaction = await prisma.emojiReaction.create({
      data: {
        raceId,
        userId: user.id,
        emoji,
      },
    });

    // Broadcast via SSE
    sseManager.publish(raceId, "emoji:new", {
      id: reaction.id,
      raceId,
      userId: user.id,
      username: user.username,
      emoji,
      createdAt: reaction.createdAt.toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Emoji Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
