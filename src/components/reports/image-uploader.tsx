"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IMAGE_RULES, MAX_REPORT_IMAGES } from "@/lib/constants";
import { compressImage } from "@/lib/image-compress";
import type { ImageKind, UploadedImage } from "@/types/image";

type Props = {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  type?: ImageKind;
  maxFiles?: number;
  disabled?: boolean;
};

export function ImageUploader({
  value,
  onChange,
  type = "REPORT",
  maxFiles = MAX_REPORT_IMAGES,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    const room = maxFiles - value.length;
    if (room <= 0) {
      toast.error(`Maksimal ${maxFiles} foto`);
      return;
    }
    if (files.length > room) {
      toast.warning(`Hanya ${room} foto lagi yang bisa ditambahkan`);
    }

    setBusy(true);
    let next = [...value];

    for (const original of Array.from(files).slice(0, room)) {
      try {
        if (!(IMAGE_RULES.allowedMimeTypes as readonly string[]).includes(original.type)) {
          throw new Error("Format harus JPG, PNG, atau WebP");
        }
        const file = await compressImage(original);
        if (file.size > IMAGE_RULES.maxSizeBytes) {
          throw new Error("Ukuran foto melebihi 5MB");
        }

        const body = new FormData();
        body.append("file", file);
        body.append("type", type);

        const res = await fetch("/api/upload", { method: "POST", body });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Gagal mengunggah foto");

        next = [...next, json.data as UploadedImage];
        onChange(next);
      } catch (e) {
        toast.error(`${original.name}: ${e instanceof Error ? e.message : "Gagal"}`);
      }
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove(image: UploadedImage) {
    setRemoving(image.publicId);
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: image.publicId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Gagal menghapus foto");
      onChange(value.filter((v) => v.publicId !== image.publicId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus foto");
    } finally {
      setRemoving(null);
    }
  }

  const canAdd = !disabled && !busy && value.length < maxFiles;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {value.map((img) => (
          <div
            key={img.publicId}
            className="relative aspect-square overflow-hidden rounded-md border bg-muted"
          >
            <Image
              src={img.imageUrl}
              alt="Foto laporan"
              fill
              sizes="(max-width: 640px) 50vw, 20vw"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(img)}
              disabled={disabled || removing === img.publicId}
              aria-label="Hapus foto"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black disabled:opacity-50"
            >
              {removing === img.publicId ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ))}

        {busy && (
          <div className="flex aspect-square items-center justify-center rounded-md border border-dashed bg-muted/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button type="button" variant="outline" disabled={!canAdd} onClick={() => inputRef.current?.click()}>
        <ImagePlus className="h-4 w-4" aria-hidden />
        Tambah foto
      </Button>
      <p className="text-xs text-muted-foreground">
        JPG, PNG, atau WebP, maksimal 5MB per foto ({value.length}/{maxFiles}). Foto dikecilkan otomatis dan data lokasi kamera dibuang.
      </p>
    </div>
  );
}
