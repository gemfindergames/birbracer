// POST /api/upload/avatar — Upload avatar image, store as base64 in DB
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid file type. Use JPG, PNG, GIF, or WebP" }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large. Max 2MB" }, { status: 400 });
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update user avatar in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarImage: dataUrl,
        avatarEmoji: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { imagePath: dataUrl },
    });
  } catch (error) {
    console.error("[Upload Error]", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
