import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    const results = await prisma.raceResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { race: { select: { id: true, name: true, createdAt: true } } },
    });

    const totalRaces = results.length;
    const wins = results.filter((r) => r.position === 1).length;
    const podiums = results.filter((r) => r.position <= 3).length;
    const bestTime = results.length > 0 ? Math.min(...results.map((r) => r.finishTime)) : null;
    const winRate = totalRaces > 0 ? Math.round((wins / totalRaces) * 100) : 0;

    // Favorite car (most used)
    const carCounts: Record<string, number> = {};
    for (const r of results) { carCounts[r.carId] = (carCounts[r.carId] || 0) + 1; }
    const favoriteCar = Object.entries(carCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { createdAt: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRaces, wins, podiums, bestTime, winRate, favoriteCar,
        joinedAt: fullUser?.createdAt?.toISOString() || null,
        recentRaces: results.slice(0, 10).map((r) => ({
          raceId: r.raceId, raceName: r.race.name, position: r.position,
          finishTime: r.finishTime, carId: r.carId, date: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("[Stats Error]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
