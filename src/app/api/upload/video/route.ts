import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({ publicId: z.string().min(1).max(255) });

export async function DELETE(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  if (!rateLimit(`video-delete:${user.id}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  const { publicId } = parsed.data;
  if (!publicId.startsWith(`civicsense/report/${user.id}/`) || publicId.includes("..")) {
    return NextResponse.json({ error: "Video tidak ditemukan" }, { status: 404 });
  }

  const attached = await prisma.reportVideo.findUnique({ where: { publicId }, select: { id: true } });
  if (attached) return NextResponse.json({ error: "Video sudah terpasang pada laporan dan tidak dapat dihapus di sini" }, { status: 409 });

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "video", invalidate: true });
    if (result.result !== "ok" && result.result !== "not found") {
      return NextResponse.json({ error: "Video gagal dihapus dari Cloudinary" }, { status: 502 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[cloudinary:video-delete]", error);
    return NextResponse.json({ error: "Video gagal dihapus" }, { status: 502 });
  }
}
