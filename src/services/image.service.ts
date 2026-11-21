import "server-only";
import type { UploadApiResponse } from "cloudinary";
import type { ImageType } from "@prisma/client";
import { cloudinary } from "@/lib/cloudinary";
import { IMAGE_MAX_DIMENSION, IMAGE_RULES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export class ImageError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "ImageError";
  }
}

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const FOLDER_TYPES = ["report", "verification", "resolution", "avatar"] as const;

// Mengenali tipe file dari isi (magic bytes), BUKAN dari nama atau
// Content-Type kiriman klien yang mudah dipalsukan.
function detectImageType(buf: Buffer): { mime: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg" };
  }
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length >= 8 && buf.subarray(0, 8).equals(pngSig)) {
    return { mime: "image/png" };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp" };
  }
  return null;
}

function folderFor(type: ImageType | "AVATAR", userId: string) {
  return `civicsense/${type.toLowerCase()}/${userId}`;
}

export async function uploadImage(params: {
  file: File;
  type: ImageType | "AVATAR";
  userId: string;
}) {
  const { file, type, userId } = params;

  if (file.size === 0) throw new ImageError("File kosong");
  if (file.size > IMAGE_RULES.maxSizeBytes) {
    throw new ImageError("Ukuran foto maksimal 4MB", 413);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ImageError("Format file harus JPG, PNG, atau WebP");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected) {
    throw new ImageError("Isi file bukan gambar JPG, PNG, atau WebP yang valid");
  }

  let result: UploadApiResponse;
  try {
    result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folderFor(type, userId),
          resource_type: "image",
          allowed_formats: ALLOWED_EXTENSIONS,
          // Transformasi saat unggah: batasi dimensi dan optimalkan kualitas.
          // Hasil transformasi inilah yang disimpan (diharapkan tanpa EXIF).
          transformation: [
            {
              width: IMAGE_MAX_DIMENSION,
              height: IMAGE_MAX_DIMENSION,
              crop: "limit",
              quality: "auto",
            },
          ],
          // Tag "pending" untuk memudahkan pembersihan foto yatim
          // (terunggah tetapi laporan tidak pernah dikirim).
          tags: ["civicsense", "pending"],
        },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error("Upload gagal"));
          resolve(res);
        }
      );
      stream.end(buffer);
    });
  } catch (e) {
    console.error("[cloudinary] upload gagal:", e);
    throw new ImageError("Gagal mengunggah ke penyimpanan foto", 502);
  }

  return {
    publicId: result.public_id,
    imageUrl: result.secure_url,
    mimeType: detected.mime,
    sizeBytes: result.bytes,
  };
}

// Hapus file di Cloudinary (dipakai juga oleh modul laporan di tahap berikutnya).
export async function deleteFromCloudinary(publicIds: string[]) {
  const results = await Promise.allSettled(
    publicIds.map((id) => cloudinary.uploader.destroy(id, { invalidate: true }))
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) console.error(`[cloudinary] ${failed} foto gagal dihapus`);
  return { total: publicIds.length, failed };
}

// Pengguna hanya boleh menghapus foto miliknya yang BELUM melekat pada laporan.
export async function deletePendingImage(params: {
  publicId: string;
  userId: string;
}) {
  const { publicId, userId } = params;

  const ownFolder =
    !publicId.includes("..") &&
    FOLDER_TYPES.some((t) => publicId.startsWith(`civicsense/${t}/${userId}/`));
  if (!ownFolder) throw new ImageError("Foto tidak ditemukan", 404);

  const [attached, completionAttached, isAvatarInUse] = await Promise.all([
    prisma.reportImage.findFirst({ where: { publicId }, select: { id: true } }),
    prisma.reportCompletionEvidence.findFirst({
      where: { OR: [{ beforePublicId: publicId }, { afterPublicId: publicId }] },
      select: { id: true },
    }),
    prisma.user.findFirst({ where: { avatarPublicId: publicId }, select: { id: true } }),
  ]);
  if (attached || completionAttached || isAvatarInUse) {
    throw new ImageError(
      "Foto sedang digunakan dan tidak dapat dihapus",
      409
    );
  }

  const { failed } = await deleteFromCloudinary([publicId]);
  if (failed > 0) throw new ImageError("Gagal menghapus foto", 502);
}
