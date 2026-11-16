"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VIDEO_RULES } from "@/lib/constants";
import type { UploadedVideo } from "@/types/video";

type SignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  tags: string;
  uploadUrl: string;
};

type CloudinaryVideoResponse = {
  public_id?: string;
  secure_url?: string;
  format?: string;
  bytes?: number;
  duration?: number;
  error?: { message?: string };
};

type Props = {
  value: UploadedVideo[];
  onChange: (videos: UploadedVideo[]) => void;
  disabled?: boolean;
};

const MAX_VIDEO_BYTES = VIDEO_RULES.maxSizeBytes;

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(objectUrl);
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error("Durasi video tidak dapat dibaca"));
      else resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("File video tidak dapat dibuka. Gunakan MP4, WebM, atau MOV."));
    };
    video.src = objectUrl;
  });
}

function uploadToCloudinary(
  file: File,
  signature: SignatureResponse,
  onProgress: (progress: number) => void,
): Promise<CloudinaryVideoResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signature.uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Koneksi ke Cloudinary terputus"));
    xhr.onabort = () => reject(new Error("Unggahan dibatalkan"));
    xhr.onload = () => {
      let response: CloudinaryVideoResponse;
      try {
        response = JSON.parse(xhr.responseText) as CloudinaryVideoResponse;
      } catch {
        reject(new Error("Respons Cloudinary tidak valid"));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(response.error?.message || "Cloudinary gagal menerima video"));
        return;
      }
      resolve(response);
    };

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signature.apiKey);
    body.append("timestamp", String(signature.timestamp));
    body.append("signature", signature.signature);
    body.append("public_id", signature.publicId);
    body.append("tags", signature.tags);
    xhr.send(body);
  });
}

async function removeUploadedVideo(publicId: string) {
  await fetch("/api/upload/video", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ publicId }),
  }).catch(() => undefined);
}

export function VideoUploader({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removing, setRemoving] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (value.length) {
      toast.error("Maksimal satu video untuk setiap laporan");
      return;
    }
    if (!(VIDEO_RULES.allowedMimeTypes as readonly string[]).includes(file.type)) {
      toast.error("Format video harus MP4, WebM, atau MOV");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Ukuran video maksimal 50MB");
      return;
    }

    setBusy(true);
    setProgress(0);
    let uploadedPublicId: string | null = null;
    try {
      const duration = await readDuration(file);
      if (duration > VIDEO_RULES.maxDurationSeconds) {
        throw new Error("Durasi video maksimal 1 menit (60 detik)");
      }

      const signatureResponse = await fetch("/api/upload/video-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ type: "REPORT" }),
      });
      const signature = (await signatureResponse.json()) as SignatureResponse & { error?: string };
      if (!signatureResponse.ok) throw new Error(signature.error || "Tidak dapat menyiapkan unggahan video");

      const result = await uploadToCloudinary(file, signature, setProgress);
      const publicId = result.public_id;
      uploadedPublicId = publicId ?? null;
      if (!publicId || !result.secure_url) throw new Error("Cloudinary tidak mengembalikan alamat video");

      const actualDuration = Number(result.duration);
      if (!Number.isFinite(actualDuration) || actualDuration <= 0 || actualDuration > VIDEO_RULES.maxDurationSeconds) {
        await removeUploadedVideo(publicId);
        uploadedPublicId = null;
        throw new Error("Video harus berdurasi maksimal 60 detik");
      }

      const video: UploadedVideo = {
        publicId,
        videoUrl: result.secure_url,
        mimeType: file.type,
        sizeBytes: Number(result.bytes ?? file.size),
        durationSeconds: actualDuration,
      };
      onChange([video]);
      toast.success("Video berhasil diunggah");
    } catch (error) {
      if (uploadedPublicId) await removeUploadedVideo(uploadedPublicId);
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah video");
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(video: UploadedVideo) {
    setRemoving(true);
    try {
      const response = await fetch("/api/upload/video", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ publicId: video.publicId }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Video gagal dihapus");
      onChange(value.filter((item) => item.publicId !== video.publicId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus video");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-3">
      {value.map((video) => (
        <div key={video.publicId} className="video-upload-preview">
          <video src={video.videoUrl} controls playsInline preload="metadata" />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{Math.ceil(video.durationSeconds)} detik · {(video.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
            <Button type="button" size="sm" variant="outline" disabled={disabled || removing} onClick={() => handleRemove(video)}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus video
            </Button>
          </div>
        </div>
      ))}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        disabled={disabled || busy || value.length > 0}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {value.length === 0 && (
        <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? `Mengunggah ${progress}%` : "Tambah video"}
        </Button>
      )}
      {busy && <div className="video-upload-progress"><span style={{ width: `${progress}%` }} /></div>}
      <p className="text-xs text-muted-foreground">
        MP4, WebM, atau MOV · maksimal 60 detik dan 50MB. Video dikirim langsung ke Cloudinary agar tidak melewati batas unggahan Vercel.
      </p>
    </div>
  );
}
