// GET /api/races/[raceId]/results — Get race results
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { raceId: string } }
) {
  try {
    const { raceId } = params;

    const results = await prisma.raceResult.findMany({
      where: { raceId },
      orderBy: { position: "asc" },
    });

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: "No results found" },
        { status: 404 }
      );
    }

    // Enrich with user data
    const userIds = results.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        avatarEmoji: true,
        avatarImage: true,
      },
    });

    const enriched = results.map((r) => {
      const user = users.find((u) => u.id === r.userId);
      return {
        id: r.id,
        raceId: r.raceId,
        userId: r.userId,
        username: user?.username || "Unknown",
        avatarEmoji: user?.avatarEmoji || null,
        avatarImage: user?.avatarImage || null,
        carId: r.carId,
        position: r.position,
        finishTime: r.finishTime,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("[Results Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
