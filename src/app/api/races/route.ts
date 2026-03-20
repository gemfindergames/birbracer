// GET  /api/races — List all active races
// POST /api/races — Create a new race (admin only)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, requireAdmin, ensureAdminExists } from "@/lib/auth";
import { sseManager } from "@/lib/sse";

export async function GET(request: Request) {
  try {
    // Ensure admin exists on first request
    await ensureAdminExists();

    const races = await prisma.race.findMany({
      where: {
        status: { not: "ARCHIVED" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarEmoji: true,
                avatarImage: true,
              },
            },
          },
        },
        carSelections: {
          where: {
            lockStatus: { in: ["LOCKED", "CONFIRMED"] },
          },
        },
      },
    });

    // Map to public shape
    const raceList = races.map((race) => ({
      id: race.id,
      name: race.name,
      status: race.status,
      trackId: race.trackId,
      maxPlayers: race.maxPlayers,
      raceDuration: race.raceDuration,
      createdAt: race.createdAt.toISOString(),
      startedAt: race.startedAt?.toISOString() || null,
      finishedAt: race.finishedAt?.toISOString() || null,
      scheduledAt: (race as any).scheduledAt?.toISOString?.() || null,
      participants: race.participants.map((p) => ({
        id: p.id,
        userId: p.user.id,
        username: p.user.username,
        avatarEmoji: p.user.avatarEmoji,
        avatarImage: p.user.avatarImage,
        lane: p.lane,
        carId:
          race.carSelections.find(
            (cs) => cs.userId === p.user.id && cs.lockStatus === "CONFIRMED"
          )?.carId || null,
      })),
      carSelections: race.carSelections.map((cs) => ({
        id: cs.id,
        raceId: cs.raceId,
        userId: cs.userId,
        carId: cs.carId,
        lockStatus: cs.lockStatus,
        lockedUntil: cs.lockedUntil.toISOString(),
        confirmedAt: cs.confirmedAt?.toISOString() || null,
      })),
    }));

    return NextResponse.json({ success: true, data: raceList });
  } catch (error) {
    console.error("[Races GET Error]", error);
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
    const {
      name,
      trackId = "desert",
      maxPlayers = 8,
      raceDuration = 15,
      scheduledAt = null,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Race name is required" },
        { status: 400 }
      );
    }

    const race = await prisma.race.create({
      data: {
        name: name.trim(),
        trackId,
        maxPlayers: Math.min(Math.max(2, maxPlayers), 20),
        raceDuration: Math.min(Math.max(10, raceDuration), 60),
        status: "LOBBY",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: race.id,
          name: race.name,
          status: race.status,
          trackId: race.trackId,
          maxPlayers: race.maxPlayers,
          raceDuration: race.raceDuration,
          createdAt: race.createdAt.toISOString(),
          startedAt: null,
          finishedAt: null,
          participants: [],
          carSelections: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Races POST Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
