// POST /api/admin/rig — Set or clear a predetermined winner (admin only, top secret)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });

    const body = await request.json();
    const { raceId, userId } = body; // userId = null to clear

    if (!raceId) return NextResponse.json({ success: false, error: "raceId required" }, { status: 400 });

    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) return NextResponse.json({ success: false, error: "Race not found" }, { status: 404 });
    if (race.status === "RACING" || race.status === "FINISHED") {
      return NextResponse.json({ success: false, error: "Cannot rig an active or finished race" }, { status: 400 });
    }

    await prisma.race.update({
      where: { id: raceId },
      data: { riggedWinnerId: userId || null },
    });

    return NextResponse.json({ success: true, data: { raceId, riggedWinnerId: userId || null } });
  } catch (error) {
    console.error("[Rig Error]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
