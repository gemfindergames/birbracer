import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });

    const body = await request.json();
    const { userId, action } = body; // action: "ban" | "unban"

    if (!userId || !["ban", "unban"].includes(action)) {
      return NextResponse.json({ success: false, error: "userId and action (ban/unban) required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.isAdmin) return NextResponse.json({ success: false, error: "Cannot ban admin" }, { status: 400 });

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: action === "ban" },
    });

    // If banning, destroy their sessions
    if (action === "ban") {
      await prisma.session.deleteMany({ where: { userId } });
    }

    return NextResponse.json({ success: true, data: { userId, banned: action === "ban" } });
  } catch (error) {
    console.error("[Ban Error]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
