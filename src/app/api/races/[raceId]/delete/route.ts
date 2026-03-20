// POST /api/races/[raceId]/delete — Delete a race (admin only)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

    // Only allow deleting finished or archived races
    if (race.status !== "FINISHED" && race.status !== "ARCHIVED") {
      return NextResponse.json(
        { success: false, error: "Can only delete finished or cancelled races" },
        { status: 400 }
      );
    }

    // Cascade delete handles participants, car selections, results, emojis
    await prisma.race.delete({ where: { id: raceId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Delete Race Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
