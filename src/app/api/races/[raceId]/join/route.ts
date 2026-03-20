// POST /api/races/[raceId]/join — Join a race
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sseManager } from "@/lib/sse";

export async function POST(
  request: Request,
  { params }: { params: { raceId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { raceId } = params;

    const race = await prisma.race.findUnique({
      where: { id: raceId },
      include: { participants: true },
    });

    if (!race) {
      return NextResponse.json(
        { success: false, error: "Race not found" },
        { status: 404 }
      );
    }

    if (race.status !== "LOBBY" && race.status !== "CAR_SELECT") {
      return NextResponse.json(
        { success: false, error: "Race is not accepting players" },
        { status: 400 }
      );
    }

    if (race.participants.length >= race.maxPlayers) {
      return NextResponse.json(
        { success: false, error: "Race is full" },
        { status: 400 }
      );
    }

    // Check if already joined
    const existing = race.participants.find((p) => p.userId === user.id);
    if (existing) {
      return NextResponse.json({ success: true, data: { alreadyJoined: true } });
    }

    await prisma.raceParticipant.create({
      data: {
        raceId,
        userId: user.id,
      },
    });

    // Notify via SSE
    sseManager.publish(raceId, "player:joined", {
      userId: user.id,
      username: user.username,
      avatarEmoji: user.avatarEmoji,
      avatarImage: user.avatarImage,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Join Race Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
