// POST /api/auth/avatar — Update user avatar
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { emoji, image } = body;

    const updateData: { avatarEmoji?: string | null; avatarImage?: string | null } = {};

    if (emoji !== undefined) {
      updateData.avatarEmoji = emoji || null;
      updateData.avatarImage = null; // clear image when setting emoji
    }

    if (image !== undefined) {
      updateData.avatarImage = image || null;
      updateData.avatarEmoji = null; // clear emoji when setting image
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Avatar Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
