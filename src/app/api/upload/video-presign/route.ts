import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";
import { STORAGE_PREFIX, signVideoUpload, userVideoKey, VideoStorageError } from "@/lib/s3-video";
import { VIDEO_RULES } from "@/lib/constants";

export const runtime = "nodejs";
const requestSchema = z.object({
  contentType: z.literal("video/mp4"),
  sizeBytes: z.number().int().min(32).max(VIDEO_RULES.maxSizeBytes),
});

export async function POST(req: Request) {
  if (!originAllowed(req)) return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });
  if (!rateLimit(`s3-video-upload:${user.id}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Terlalu banyak video. Coba lagi nanti." }, { status: 429 });
  }
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Gunakan MP4 maksimal 50MB" }, { status: 400 });

  try {
    const key = userVideoKey(user.id);
    const uploadUrl = await signVideoUpload(key, parsed.data.sizeBytes);
    return NextResponse.json({ publicId: STORAGE_PREFIX + key, uploadUrl, contentType: "video/mp4" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[s3-video-presign]", error);
    const message = error instanceof VideoStorageError ? error.message : "Tidak dapat menyiapkan unggahan video";
    return NextResponse.json({ error: message }, { status: error instanceof VideoStorageError ? error.status : 502 });
  }
}
