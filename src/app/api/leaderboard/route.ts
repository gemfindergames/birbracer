import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRankByWins } from "@/lib/ranks";

export async function GET() {
  try {
    // Get all race results grouped by user
    const results = await prisma.raceResult.findMany({
      include: { race: { select: { name: true } } },
    });

    // Aggregate per user
    const userMap = new Map<string, { wins: number; podiums: number; races: number; bestTime: number }>();
    for (const r of results) {
      const s = userMap.get(r.userId) || { wins: 0, podiums: 0, races: 0, bestTime: 999 };
      s.races++;
      if (r.position === 1) s.wins++;
      if (r.position <= 3) s.podiums++;
      if (r.finishTime < s.bestTime) s.bestTime = r.finishTime;
      userMap.set(r.userId, s);
    }

    // Get user details
    const userIds = [...userMap.keys()];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarEmoji: true, avatarImage: true, isBanned: true },
    });

    const leaderboard = users
      .filter((u) => !u.isBanned)
      .map((u) => {
        const stats = userMap.get(u.id) || { wins: 0, podiums: 0, races: 0, bestTime: 999 };
        const rank = getRankByWins(stats.wins);
        return {
          userId: u.id,
          username: u.username,
          avatarEmoji: u.avatarEmoji,
          avatarImage: u.avatarImage,
          wins: stats.wins,
          podiums: stats.podiums,
          totalRaces: stats.races,
          bestTime: stats.bestTime < 999 ? stats.bestTime : null,
          rankId: rank.id,
          rankName: rank.name,
          rankEmoji: rank.emoji,
          rankColor: rank.color,
        };
      })
      .sort((a, b) => b.wins - a.wins || b.podiums - a.podiums)
      .slice(0, 50);

    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error("[Leaderboard Error]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
