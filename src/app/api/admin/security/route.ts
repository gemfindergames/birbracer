// GET /api/admin/security — Security dashboard data (admin only)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatarEmoji: true,
        avatarImage: true,
        isAdmin: true,
        isBanned: true,
        ipAddress: true,
        country: true,
        countryCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Detect duplicates by IP
    const ipGroups = new Map<string, string[]>();
    for (const user of users) {
      if (user.ipAddress && user.ipAddress !== "unknown") {
        const existing = ipGroups.get(user.ipAddress) || [];
        existing.push(user.id);
        ipGroups.set(user.ipAddress, existing);
      }
    }

    // Mark suspicious users (same IP, multiple accounts)
    const suspiciousIds = new Set<string>();
    for (const [, userIds] of ipGroups) {
      if (userIds.length > 1) {
        for (const id of userIds) {
          suspiciousIds.add(id);
        }
      }
    }

    const result = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      isSuspicious: suspiciousIds.has(u.id),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[Admin Security Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
