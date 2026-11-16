"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/reports/image-uploader";
import { VideoUploader } from "@/components/reports/video-uploader";
import type { UploadedImage } from "@/types/image";
import type { UploadedVideo } from "@/types/video";
import { Button } from "@/components/ui/button";

export function ReportForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function gps() {
    if (!navigator.geolocation) {
      setError("Peramban tidak mendukung GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = document.querySelector<HTMLInputElement>("#latitude");
        const lng = document.querySelector<HTMLInputElement>("#longitude");
        if (lat) lat.value = String(position.coords.latitude);
        if (lng) lng.value = String(position.coords.longitude);
      },
      () => setError("Lokasi tidak tersedia. Isi koordinat manual."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!images.length && !videos.length) {
      setError("Unggah minimal satu foto atau satu video sebagai bukti laporan.");
      return;
    }

    setBusy(true);
    const data = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      images: images.map((image) => ({ publicId: image.publicId })),
      videos: videos.map((video) => ({ publicId: video.publicId })),
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal menyimpan laporan");
      router.push(`/reports/${json.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal mengirim laporan");
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { name: "severity", label: "Tingkat keparahan" },
    { name: "safetyRisk", label: "Risiko keselamatan" },
    { name: "affectedPeople", label: "Skala warga terdampak" },
  ];

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
      <label className="block text-sm font-semibold">
        Judul laporan
        <input required name="title" minLength={8} maxLength={150} className="mt-2 w-full rounded-lg border p-3" placeholder="Contoh: Drainase tersumbat di Jalan Melati" />
      </label>

      <label className="block text-sm font-semibold">
        Kategori
        <select name="categoryId" required className="mt-2 w-full rounded-lg border p-3">
          <option value="">Pilih kategori</option>
          {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
        </select>
      </label>

      <label className="block text-sm font-semibold">
        Uraian masalah
        <textarea required name="description" minLength={20} rows={5} className="mt-2 w-full rounded-lg border p-3" placeholder="Ceritakan kejadian dan dampaknya" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Lintang
          <input id="latitude" name="latitude" type="number" step="any" min={-90} max={90} required className="mt-2 w-full rounded-lg border p-3" />
        </label>
        <label className="block text-sm font-semibold">
          Bujur
          <input id="longitude" name="longitude" type="number" step="any" min={-180} max={180} required className="mt-2 w-full rounded-lg border p-3" />
        </label>
      </div>

      <Button type="button" variant="outline" onClick={gps}>Gunakan lokasi GPS saya</Button>

      <label className="block text-sm font-semibold">
        Alamat atau penanda lokasi
        <input name="address" maxLength={255} className="mt-2 w-full rounded-lg border p-3" />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map((field) => (
          <label key={field.name} className="block text-sm font-semibold">
            {field.label}
            <select name={field.name} defaultValue="3" className="mt-2 w-full rounded-lg border p-3">
              {[1, 2, 3, 4, 5].map((number) => <option key={number} value={number}>{number} / 5</option>)}
            </select>
          </label>
        ))}
      </div>

      <label className="block text-sm font-semibold">
        Sudah berapa hari?
        <input name="durationDays" type="number" min="0" max="3650" defaultValue="1" required className="mt-2 w-full rounded-lg border p-3" />
      </label>

      <section className="space-y-2">
        <div>
          <h2 className="font-semibold">Bukti foto (opsional jika ada video)</h2>
          <p className="text-xs text-muted-foreground">Tambahkan hingga 5 foto pendukung.</p>
        </div>
        <ImageUploader value={images} onChange={setImages} />
      </section>

      <section className="space-y-2">
        <div>
          <h2 className="font-semibold">Bukti video (opsional)</h2>
          <p className="text-xs text-muted-foreground">Video membantu petugas melihat kondisi di lokasi secara lebih jelas.</p>
        </div>
        <VideoUploader value={videos} onChange={setVideos} />
      </section>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button disabled={busy} className="w-full">
        {busy ? "Menyimpan laporan..." : "Kirim laporan"}
      </Button>
    </form>
  );
}
