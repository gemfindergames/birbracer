// GET  /api/admin/players?raceId=xxx — Get players in a race (admin)
// POST /api/admin/players — Remove a player from a race (admin)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sseManager } from "@/lib/sse";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get("raceId");

    if (!raceId) {
      return NextResponse.json(
        { success: false, error: "raceId required" },
        { status: 400 }
      );
    }

    const participants = await prisma.raceParticipant.findMany({
      where: { raceId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarEmoji: true,
            avatarImage: true,
            ipAddress: true,
          },
        },
      },
    });

    const carSelections = await prisma.carSelection.findMany({
      where: {
        raceId,
        lockStatus: "CONFIRMED",
      },
    });

    const data = participants.map((p) => ({
      participantId: p.id,
      userId: p.user.id,
      username: p.user.username,
      avatarEmoji: p.user.avatarEmoji,
      avatarImage: p.user.avatarImage,
      ipAddress: p.user.ipAddress,
      lane: p.lane,
      carId: carSelections.find((cs) => cs.userId === p.user.id)?.carId || null,
      joinedAt: p.joinedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Admin Players GET Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { raceId, userId, action } = body;

    if (action === "remove" && raceId && userId) {
      // Remove participant
      await prisma.raceParticipant.deleteMany({
        where: { raceId, userId },
      });

      // Remove their car selection
      await prisma.carSelection.deleteMany({
        where: { raceId, userId },
      });

      sseManager.publish(raceId, "player:left", { userId });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Admin Players POST Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
