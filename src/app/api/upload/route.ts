import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/session";
import { IMAGE_RULES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import {
  ImageError,
  deletePendingImage,
  uploadImage,
} from "@/services/image.service";


export const runtime = "nodejs";

const typeSchema = z.enum(["REPORT", "VERIFICATION", "RESOLUTION", "AVATAR"]);
const deleteSchema = z.object({ publicId: z.string().min(1).max(255) });


function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return errorResponse("Silakan masuk terlebih dahulu", 401);

  const limit = rateLimit(`upload:${user.id}`, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return errorResponse("Terlalu banyak unggahan. Coba lagi nanti.", 429, {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  // Tolak lebih awal sebelum body dibaca
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > IMAGE_RULES.maxSizeBytes + 512 * 1024) {
    return errorResponse("Ukuran foto maksimal 5MB", 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse("Permintaan tidak valid", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse("File tidak ditemukan", 400);

  const parsedType = typeSchema.safeParse(form.get("type") ?? "REPORT");
  if (!parsedType.success) return errorResponse("Jenis foto tidak valid", 400);
  const type = parsedType.data;

  // Foto verifikasi/penyelesaian hanya boleh dari petugas atau admin
  if (type !== "REPORT" && type !== "AVATAR" && user.role === "PUBLIC") {
    return errorResponse("Anda tidak berhak mengunggah jenis foto ini", 403);
  }

  try {
    const data = await uploadImage({ file, type, userId: user.id });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    if (e instanceof ImageError) return errorResponse(e.message, e.status);
    console.error("[upload] error tak terduga:", e);
    return errorResponse("Terjadi kesalahan pada server", 500);
  }
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return errorResponse("Silakan masuk terlebih dahulu", 401);

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Permintaan tidak valid", 400);

  try {
    await deletePendingImage({ publicId: parsed.data.publicId, userId: user.id });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    if (e instanceof ImageError) return errorResponse(e.message, e.status);
    console.error("[upload] error tak terduga:", e);
    return errorResponse("Terjadi kesalahan pada server", 500);
  }
}
