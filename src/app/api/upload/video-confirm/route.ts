import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
import { verifyUploadedVideo, VideoStorageError } from "@/lib/s3-video";

export const runtime = "nodejs";
const requestSchema = z.object({ publicId: z.string().min(1).max(255) });

export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  if (!rateLimit(`s3-video-confirm:${user.id}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Coba beberapa saat lagi" }, { status: 429 });
  }
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ID video tidak valid" }, { status: 400 });

  try {
    const video = await verifyUploadedVideo(parsed.data.publicId, user.id);
    return NextResponse.json({ data: video }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[s3-video-confirm]", error);
    const message = error instanceof VideoStorageError ? error.message : "Video tidak dapat diverifikasi";
    return NextResponse.json({ error: message }, { status: error instanceof VideoStorageError ? error.status : 502 });
  }
}
