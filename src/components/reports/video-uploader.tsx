"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VIDEO_RULES } from "@/lib/constants";
import type { UploadedVideo } from "@/types/video";

type Props = {
  value: UploadedVideo[];
  onChange: (videos: UploadedVideo[]) => void;
  disabled?: boolean;
};

type PresignedResponse = { publicId: string; uploadUrl: string; contentType: string; error?: string };
type ConfirmResponse = { data?: { sizeBytes: number; durationSeconds: number }; error?: string };

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const tempUrl = URL.createObjectURL(file);
    const node = document.createElement("video");
    node.preload = "metadata";
    node.onloadedmetadata = () => {
      URL.revokeObjectURL(tempUrl);
      if (Number.isFinite(node.duration) && node.duration > 0) resolve(node.duration);
      else reject(new Error("Durasi video tidak dapat dibaca. Pilih file MP4 yang valid."));
    };
    node.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error("File tidak dapat dibuka. Gunakan MP4 (H.264/AAC)."));
    };
    node.src = tempUrl;
  });
}

function putDirect(file: File, uploadUrl: string, onProgress: (n: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", "video/mp4");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(100 * event.loaded / event.total));
    };
    xhr.onerror = () => reject(new Error("Gagal menghubungi Object Storage. Periksa CORS bucket, endpoint S3, dan koneksi internet."));
    xhr.onabort = () => reject(new Error("Pengunggahan dibatalkan"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Object Storage menolak video (HTTP ${xhr.status}). Periksa access key, bucket, CORS, dan region.`));
    };
    xhr.send(file);
  });
}

async function removePendingVideo(publicId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/upload/video", {
      method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
    return response.ok;
  } catch { return false; }
}

export function VideoUploader({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removing, setRemoving] = useState(false);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (value.length > 0 || busy) { toast.error("Maksimal satu video per laporan"); return; }
    // Ada browser yang tidak memberi MIME akurat, jadi format divalidasi lagi di server.
    if (!file.name.toLowerCase().endsWith(".mp4")) {
      toast.error("Untuk sementara gunakan video MP4 (disarankan H.264/AAC)");
      return;
    }
    if (file.size > VIDEO_RULES.maxSizeBytes) { toast.error("Ukuran video maksimal 50 MB"); return; }
    if (file.size < 32) { toast.error("Video tidak valid atau kosong"); return; }

    setBusy(true); setProgress(0);
    let pendingId: string | null = null;
    try {
      const duration = await readDuration(file);
      if (duration > VIDEO_RULES.maxDurationSeconds) throw new Error("Durasi video maksimal 60 detik");

      const request = await fetch("/api/upload/video-presign", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "video/mp4", sizeBytes: file.size }),
      });
      const signed = await request.json() as PresignedResponse;
      if (!request.ok || !signed.uploadUrl) throw new Error(signed.error || "Tidak dapat membuat izin unggah video");
      pendingId = signed.publicId;

      // File tidak pernah dikirim ke Vercel. Hanya metadata/izin yang melewati backend.
      await putDirect(file, signed.uploadUrl, setProgress);

      const confirmation = await fetch("/api/upload/video-confirm", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: pendingId }),
      });
      const confirmed = await confirmation.json() as ConfirmResponse;
      if (!confirmation.ok || !confirmed.data) throw new Error(confirmed.error || "Video gagal diverifikasi");

      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const previewUrl = URL.createObjectURL(file);
      previewRef.current = previewUrl;
      onChange([{
        publicId: pendingId, videoUrl: previewUrl, mimeType: "video/mp4",
        sizeBytes: confirmed.data.sizeBytes,
        durationSeconds: confirmed.data.durationSeconds,
      }]);
      pendingId = null;
      toast.success("Video tersimpan di IDCloudHost dan siap dilampirkan");
    } catch (error) {
      // Upayakan pembersihan file yang belum terikat ke laporan.
      if (pendingId) await removePendingVideo(pendingId);
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah video");
    } finally {
      setBusy(false); setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(video: UploadedVideo) {
    setRemoving(true);
    try {
      if (!await removePendingVideo(video.publicId)) throw new Error("Gagal menghapus video dari Object Storage");
      if (previewRef.current) { URL.revokeObjectURL(previewRef.current); previewRef.current = null; }
      onChange([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus video");
    } finally { setRemoving(false); }
  }

  return <div className="space-y-3">
    {value.map((video) => <div key={video.publicId} className="video-upload-preview">
      <video src={video.videoUrl} controls playsInline preload="metadata" />
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{Math.ceil(video.durationSeconds)} detik · {(video.sizeBytes / 1048576).toFixed(1)} MB</span>
        <Button type="button" size="sm" variant="outline" disabled={disabled || removing} onClick={() => handleRemove(video)}>
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus video
        </Button>
      </div>
    </div>)}
    <input ref={inputRef} type="file" accept=".mp4,video/mp4" hidden disabled={disabled || busy || value.length > 0} onChange={(event) => void handleFile(event.target.files?.[0])} />
    {value.length === 0 && <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {busy ? `Mengunggah: ${progress}%` : "Tambah video MP4"}
    </Button>}
    {busy && <div className="video-upload-progress"><span style={{ width: `${progress}%` }} /></div>}
    <p className="text-xs text-muted-foreground">MP4 saja, maksimal 60 detik dan 50 MB. Unggah langsung ke IDCloudHost Object Storage tanpa melewati Vercel.</p>
  </div>;
}
