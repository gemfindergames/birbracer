// POST /api/cars/confirm — Confirm a locked car selection
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { sseManager } from "@/lib/sse";

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

    // Find the locked selection
    const selection = await prisma.carSelection.findFirst({
      where: {
        raceId,
        userId: user.id,
        carId,
        lockStatus: "LOCKED",
      },
    });

    if (!selection) {
      return NextResponse.json(
        { success: false, error: "No active lock found for this car" },
        { status: 404 }
      );
    }

    // Check if lock expired
    if (selection.lockedUntil < new Date()) {
      await prisma.carSelection.update({
        where: { id: selection.id },
        data: { lockStatus: "EXPIRED" },
      });

      sseManager.publish(raceId, "car:released", {
        carId,
        userId: user.id,
      });

      return NextResponse.json(
        { success: false, error: "Lock expired. Please try again." },
        { status: 410 }
      );
    }

    // Confirm the selection
    await prisma.carSelection.update({
      where: { id: selection.id },
      data: {
        lockStatus: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });

    // Notify via SSE
    sseManager.publish(raceId, "car:confirmed", {
      carId,
      userId: user.id,
      username: user.username,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Car Confirm Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
