import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
import { decodeOwnedVideoKey, deleteVideo, VideoStorageError } from "@/lib/s3-video";

export const runtime = "nodejs";
const bodySchema = z.object({ publicId: z.string().min(1).max(255) });

export async function DELETE(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  if (!rateLimit(`s3-video-delete:${user.id}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  try {
    const key = decodeOwnedVideoKey(parsed.data.publicId, user.id);
    const attached = await prisma.reportVideo.findUnique({
      where: { publicId: parsed.data.publicId }, select: { id: true },
    });
    if (attached) return NextResponse.json({ error: "Video sudah dipakai pada laporan" }, { status: 409 });
    await deleteVideo(key);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[s3-video-delete]", error);
    const message = error instanceof VideoStorageError ? error.message : "Video gagal dihapus";
    return NextResponse.json({ error: message }, { status: error instanceof VideoStorageError ? error.status : 502 });
  }
}
