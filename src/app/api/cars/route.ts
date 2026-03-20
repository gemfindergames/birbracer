// GET /api/cars?raceId=xxx — Get all cars with availability for a race
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableCars } from "@/lib/cars";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raceId = searchParams.get("raceId");

    const allCars = getAvailableCars();

    if (!raceId) {
      return NextResponse.json({
        success: true,
        data: allCars.map((c) => ({ ...c, status: "available", lockedBy: null })),
      });
    }

    // Get current selections for this race
    const selections = await prisma.carSelection.findMany({
      where: {
        raceId,
        OR: [
          { lockStatus: "CONFIRMED" },
          {
            lockStatus: "LOCKED",
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    // Clean up expired locks
    await prisma.carSelection.updateMany({
      where: {
        raceId,
        lockStatus: "LOCKED",
        lockedUntil: { lt: new Date() },
      },
      data: { lockStatus: "EXPIRED" },
    });

    const carsWithStatus = allCars.map((car) => {
      const selection = selections.find((s) => s.carId === car.id);

      if (!selection) {
        return { ...car, status: "available" as const, lockedBy: null, lockedUntil: null };
      }

      if (selection.lockStatus === "CONFIRMED") {
        return {
          ...car,
          status: "taken" as const,
          lockedBy: selection.user.username,
          lockedUntil: null,
        };
      }

      // LOCKED (and not expired, checked above)
      return {
        ...car,
        status: "locked" as const,
        lockedBy: selection.user.username,
        lockedByUserId: selection.userId,
        lockedUntil: selection.lockedUntil.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: carsWithStatus });
  } catch (error) {
    console.error("[Cars GET Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
