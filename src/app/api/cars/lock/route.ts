// POST /api/cars/lock — Lock a car for 10 seconds
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sseManager } from "@/lib/sse";
import { getCarById } from "@/lib/cars";

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
    const { raceId, carId } = body;

    if (!raceId || !carId) {
      return NextResponse.json(
        { success: false, error: "raceId and carId required" },
        { status: 400 }
      );
    }

    // Validate car exists
    const car = getCarById(carId);
    if (!car || !car.available) {
      return NextResponse.json(
        { success: false, error: "Car not available" },
        { status: 400 }
      );
    }

    // Check race exists and is in car select phase
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race || (race.status !== "CAR_SELECT" && race.status !== "LOBBY")) {
      return NextResponse.json(
        { success: false, error: "Race is not accepting car selections" },
        { status: 400 }
      );
    }

    // Check user is a participant
    const participant = await prisma.raceParticipant.findUnique({
      where: { raceId_userId: { raceId, userId: user.id } },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "You must join the race first" },
        { status: 400 }
      );
    }

    // Clean up expired locks first
    await prisma.carSelection.updateMany({
      where: {
        raceId,
        lockStatus: "LOCKED",
        lockedUntil: { lt: new Date() },
      },
      data: { lockStatus: "EXPIRED" },
    });

    // Check if car is already taken or locked by someone else
    const existingCarLock = await prisma.carSelection.findFirst({
      where: {
        raceId,
        carId,
        OR: [
          { lockStatus: "CONFIRMED" },
          { lockStatus: "LOCKED", lockedUntil: { gt: new Date() } },
        ],
      },
    });

    if (existingCarLock && existingCarLock.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Car is not available" },
        { status: 409 }
      );
    }

    // Remove any existing selection by this user for this race
    await prisma.carSelection.deleteMany({
      where: { raceId, userId: user.id },
    });

    // Create lock
    const lockedUntil = new Date(Date.now() + 10000); // 10 seconds
    const selection = await prisma.carSelection.create({
      data: {
        raceId,
        userId: user.id,
        carId,
        lockStatus: "LOCKED",
        lockedUntil,
      },
    });

    // Notify via SSE
    sseManager.publish(raceId, "car:locked", {
      carId,
      userId: user.id,
      username: user.username,
      lockedUntil: lockedUntil.toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        selectionId: selection.id,
        carId,
        lockedUntil: lockedUntil.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Car Lock Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
