"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { ImageUploader } from "@/components/reports/image-uploader";
import type { UploadedImage } from "@/types/image";
import type { ReportStatus, Role } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/constants";
export function StatusControl({ reportId, status, role, officers }: { reportId: string; status: ReportStatus; role: Role; officers: { id: string; name: string }[] }) {
  const choices: Record<ReportStatus, ReportStatus[]> = { PENDING: ["VERIFIED", "REJECTED"], VERIFIED: ["ASSIGNED", "REJECTED"], ASSIGNED: ["IN_PROGRESS"], IN_PROGRESS: ["RESOLVED"], REJECTED: [], RESOLVED: [] };
  const options: ReportStatus[] = role === "ADMIN" ? choices[status] : role === "OFFICER" && ["ASSIGNED", "IN_PROGRESS"].includes(status) ? choices[status] : [];
  const [selected, setSelected] = useState<ReportStatus | "">(options[0] || "");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  if (!options.length) return <div className="ticket-done">Tidak ada tindakan tersedia untuk status ini.</div>;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const data = new FormData(e.currentTarget);
    const body = { status: selected, note: data.get("note"), assignedToId: data.get("assignedToId"), images: images.map(i => ({ publicId: i.publicId })) };
    try {
      const res = await fetch(`/api/reports/${reportId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error || "Gagal mengubah status");
      setImages([]); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="ticket-form">
    <span className="ticket-form-caption">TINDAKAN SELANJUTNYA</span>
    <label>Perbarui status<select value={selected} onChange={e => setSelected(e.target.value as ReportStatus)}>{options.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label>
    {selected === "ASSIGNED" && <label>Petugas penanggung jawab<select required name="assignedToId" defaultValue=""><option value="">Pilih petugas</option>{officers.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label>}
    <label>Catatan penanganan<textarea name="note" required={selected === "REJECTED" || selected === "RESOLVED"} placeholder="Tambahkan catatan untuk warga..." rows={2}/></label>
    {selected === "RESOLVED" && <div className="ticket-evidence"><b>Bukti foto penyelesaian (wajib)</b><ImageUploader type="RESOLUTION" maxFiles={5} value={images} onChange={setImages}/></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button disabled={busy || (selected === "RESOLVED" && images.length === 0)} className="primary-action" type="submit"><Send size={15}/>{busy ? "Menyimpan..." : "Simpan status"}</button>
  </form>;
}
