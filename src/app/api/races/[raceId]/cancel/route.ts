// POST /api/races/[raceId]/cancel — Cancel a race (admin only)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sseManager } from "@/lib/sse";

export async function POST(
  request: Request,
  { params }: { params: { raceId: string } }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { raceId } = params;

    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      return NextResponse.json(
        { success: false, error: "Race not found" },
        { status: 404 }
      );
    }

    if (race.status === "ARCHIVED") {
      return NextResponse.json(
        { success: false, error: "Race is already archived" },
        { status: 400 }
      );
    }

    await prisma.race.update({
      where: { id: raceId },
      data: { status: "ARCHIVED" },
    });

    sseManager.publish(raceId, "race:update", { status: "ARCHIVED" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Cancel Race Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
