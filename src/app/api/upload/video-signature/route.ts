import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { cloudinary } from "@/lib/cloudinary";
import { originAllowed } from "@/lib/community-api";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({ type: z.literal("REPORT") });

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  }

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu" }, { status: 401 });

  if (!rateLimit(`video-signature:${user.id}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Terlalu banyak permintaan unggah video. Coba lagi nanti." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Jenis unggahan tidak valid" }, { status: 400 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Konfigurasi Cloudinary belum lengkap" }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `civicsense/report/${user.id}/${randomUUID()}`;
  const tags = "civicsense,pending";
  const signedParams = { public_id: publicId, timestamp, tags };
  const signature = cloudinary.utils.api_sign_request(signedParams, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    publicId,
    tags,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
  }, { headers: { "Cache-Control": "no-store" } });
}
