import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { VIDEO_RULES } from "@/lib/constants";
import { durationFromMovieBox } from "@/lib/mp4-duration";

export const STORAGE_PREFIX = "idcs3:";
const MIME = "video/mp4";
const SIGNATURE_LIFETIME = 180; // 3 menit untuk mulai mengunggah
const PLAYBACK_LIFETIME = 600; // 10 menit untuk memutar/men-seek video
const FIRST_CHUNK_SIZE = 2 * 1024 * 1024;
const LAST_CHUNK_SIZE = 4 * 1024 * 1024;

let client: S3Client | null = null;

export class VideoStorageError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "VideoStorageError";
  }
}

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new VideoStorageError(`Konfigurasi Object Storage ${key} belum tersedia`, 503);
  return value;
}

function bucket(): string { return requiredEnv("S3_VIDEO_BUCKET"); }
function storage(): S3Client {
  if (!client) {
    const endpoint = requiredEnv("S3_VIDEO_ENDPOINT");
    if (!endpoint.startsWith("https://")) {
      throw new VideoStorageError("S3_VIDEO_ENDPOINT harus berawalan https://", 503);
    }
    client = new S3Client({
      region: process.env.S3_VIDEO_REGION?.trim() || "us-east-1",
      endpoint,
      forcePathStyle: true, // kompatibel dengan S3 compatible endpoint
      credentials: {
        accessKeyId: requiredEnv("S3_VIDEO_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("S3_VIDEO_SECRET_ACCESS_KEY"),
      },
      maxAttempts: 2,
      // Layanan S3-compatible tidak selalu mendukung checksum CRC32 otomatis SDK baru.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export function userVideoKey(userId: string): string {
  return `reports/${userId}/${randomUUID()}.mp4`;
}

export function decodeOwnedVideoKey(value: string, userId: string): string {
  const prefix = `${STORAGE_PREFIX}reports/${userId}/`;
  if (!value.startsWith(prefix)) throw new VideoStorageError("Video tidak dimiliki akun ini", 403);
  const key = value.slice(STORAGE_PREFIX.length);
  if (!/^reports\/[a-zA-Z0-9_-]+\/[a-f0-9-]{36}\.mp4$/.test(key)) {
    throw new VideoStorageError("ID video tidak valid", 400);
  }
  return key;
}

export function decodeVideoKey(value: string): string | null {
  if (!value.startsWith(STORAGE_PREFIX)) return null;
  const key = value.slice(STORAGE_PREFIX.length);
  return /^reports\/[a-zA-Z0-9_-]+\/[a-f0-9-]{36}\.mp4$/.test(key) ? key : null;
}

export async function signVideoUpload(key: string, sizeBytes: number): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(), Key: key, ContentType: MIME, ContentLength: sizeBytes,
  });
  return getSignedUrl(storage(), command, { expiresIn: SIGNATURE_LIFETIME });
}

export async function signVideoPlayback(key: string): Promise<string> {
  return getSignedUrl(storage(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: PLAYBACK_LIFETIME,
  });
}

export async function deleteVideo(key: string): Promise<void> {
  await storage().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

async function getRange(key: string, start: number, end: number): Promise<Buffer> {
  const response = await storage().send(new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    Range: `bytes=${start}-${end}`,
  }));
  if (!response.Body) throw new VideoStorageError("Video kosong atau tidak bisa dibaca", 422);
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export type VerifiedVideo = {
  publicId: string;
  mimeType: "video/mp4";
  sizeBytes: number;
  durationSeconds: number;
};

/** Verifikasi data langsung dari Storage, bukan percaya klaim durasi/ukuran browser. */
export async function verifyUploadedVideo(publicId: string, userId: string): Promise<VerifiedVideo> {
  const key = decodeOwnedVideoKey(publicId, userId);
  let head;
  try {
    head = await storage().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
  } catch {
    throw new VideoStorageError("Video belum ditemukan di Object Storage. Ulangi unggahan.", 422);
  }
  const size = head.ContentLength ?? 0;
  if (size < 32 || size > VIDEO_RULES.maxSizeBytes) {
    throw new VideoStorageError("Ukuran video maksimal 50MB", 422);
  }
  if (head.ContentType?.split(";")[0].trim().toLowerCase() !== MIME) {
    throw new VideoStorageError("Gunakan video MP4 dengan Content-Type video/mp4", 422);
  }

  const first = await getRange(key, 0, Math.min(size, FIRST_CHUNK_SIZE) - 1);
  if (first.length < 12 || first.toString("ascii", 4, 8) !== "ftyp") {
    throw new VideoStorageError("Isi file bukan video MP4 yang valid", 422);
  }
  let duration = durationFromMovieBox(first);
  if (duration === null && size > FIRST_CHUNK_SIZE) {
    const last = await getRange(key, Math.max(0, size - LAST_CHUNK_SIZE), size - 1);
    duration = durationFromMovieBox(last);
  }
  if (duration === null || !Number.isFinite(duration) || duration <= 0) {
    throw new VideoStorageError("Durasi video tidak dapat diverifikasi. Ekspor ulang MP4 dengan metadata (moov) di awal atau akhir.", 422);
  }
  if (duration > VIDEO_RULES.maxDurationSeconds) {
    throw new VideoStorageError("Durasi video maksimal 60 detik", 422);
  }
  return { publicId, mimeType: MIME, sizeBytes: size, durationSeconds: duration };
}
