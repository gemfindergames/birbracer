// GET /api/races/[raceId] — Get single race with participants and cars
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { raceId: string } }
) {
  try {
    const { raceId } = params;

    const race = await prisma.race.findUnique({
      where: { id: raceId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarEmoji: true,
                avatarImage: true,
                isAdmin: true,
              },
            },
          },
        },
        carSelections: {
          where: {
            OR: [
              { lockStatus: "CONFIRMED" },
              {
                lockStatus: "LOCKED",
                lockedUntil: { gt: new Date() },
              },
            ],
          },
        },
        results: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!race) {
      return NextResponse.json(
        { success: false, error: "Race not found" },
        { status: 404 }
      );
    }

    // Clean up expired locks
    await prisma.carSelection.updateMany({
      where: {
        raceId,
        lockStatus: "LOCKED",
        lockedUntil: { lt: new Date() },
      },
      data: { lockStatus: "EXPIRED" },
    });

    const data = {
      id: race.id,
      name: race.name,
      status: race.status,
      trackId: race.trackId,
      maxPlayers: race.maxPlayers,
      raceDuration: race.raceDuration,
      createdAt: race.createdAt.toISOString(),
      startedAt: race.startedAt?.toISOString() || null,
      finishedAt: race.finishedAt?.toISOString() || null,
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
      carSelections: race.carSelections
        .filter(
          (cs) =>
            cs.lockStatus === "CONFIRMED" ||
            (cs.lockStatus === "LOCKED" && cs.lockedUntil > new Date())
        )
        .map((cs) => ({
          id: cs.id,
          raceId: cs.raceId,
          userId: cs.userId,
          carId: cs.carId,
          lockStatus: cs.lockStatus,
          lockedUntil: cs.lockedUntil.toISOString(),
          confirmedAt: cs.confirmedAt?.toISOString() || null,
        })),
      results: race.results.map((r) => ({
        id: r.id,
        raceId: r.raceId,
        userId: r.userId,
        carId: r.carId,
        position: r.position,
        finishTime: r.finishTime,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Race GET Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
