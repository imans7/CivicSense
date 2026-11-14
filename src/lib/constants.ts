export const APP_NAME = "CivicSense";
export const APP_TAGLINE =
  "Laporkan masalah lingkungan, prioritaskan penanganannya.";

export const ROLE_LABELS = {
  PUBLIC: "Masyarakat",
  OFFICER: "Petugas",
  ADMIN: "Administrator",
} as const;

export const STATUS_LABELS = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
  ASSIGNED: "Ditugaskan",
  IN_PROGRESS: "Sedang Ditangani",
  RESOLVED: "Selesai",
} as const;

export const PRIORITY_LABELS = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
} as const;

export const IMAGE_RULES = {
  maxSizeBytes: 4 * 1024 * 1024, // 4 MiB: aman di bawah batas body Vercel 4.5 MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const ROLE_HOME = {
  PUBLIC: "/my-reports",
  OFFICER: "/officer",
  ADMIN: "/admin",
} as const;

export const MAX_REPORT_IMAGES = 5;
export const IMAGE_MAX_DIMENSION = 1920;
