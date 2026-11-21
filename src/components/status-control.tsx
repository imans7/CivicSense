"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import type { ReportStatus, Role } from "@prisma/client";
import { ImageUploader } from "@/components/reports/image-uploader";
import { STATUS_LABELS } from "@/lib/constants";
import type { UploadedImage } from "@/types/image";

type Officer = { id: string; name: string };
type StatusControlProps = {
  reportId: string;
  status: ReportStatus;
  role: Role;
  officers: Officer[];
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  details?: Record<string, string[]>;
};

const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  PENDING: ["VERIFIED", "REJECTED"],
  VERIFIED: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  REJECTED: [],
  RESOLVED: [],
};

export function StatusControl({ reportId, status, role, officers }: StatusControlProps) {
  const options = role === "ADMIN"
    ? TRANSITIONS[status]
    : role === "OFFICER" && (status === "ASSIGNED" || status === "IN_PROGRESS")
      ? TRANSITIONS[status]
      : [];

  const [selected, setSelected] = useState<ReportStatus | "">(options[0] ?? "");
  const [beforeImages, setBeforeImages] = useState<UploadedImage[]>([]);
  const [afterImages, setAfterImages] = useState<UploadedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  if (options.length === 0) {
    return <div className="ticket-done">Tidak ada tindakan tersedia untuk status ini.</div>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !options.includes(selected) || busy) return;

    const data = new FormData(event.currentTarget);
    const note = String(data.get("note") ?? "").trim();

    // Jangan mengirim `assignedToId: null` ketika field petugas tidak ada.
    // Zod .optional() tidak menerima null; ini penyebab HTTP 400 di Vercel.
    const body: {
      status: ReportStatus;
      note?: string;
      assignedToId?: string;
      completionEvidence?: { beforePublicId: string; afterPublicId: string };
    } = { status: selected };

    if (note) body.note = note;
    if (selected === "ASSIGNED") {
      const officerId = String(data.get("assignedToId") ?? "").trim();
      if (!officerId) {
        setError("Pilih petugas penanggung jawab terlebih dahulu.");
        return;
      }
      body.assignedToId = officerId;
    }
    if (selected === "RESOLVED") {
      if (beforeImages.length !== 1 || afterImages.length !== 1) {
        setError("Unggah tepat dua foto penyelesaian: satu Before dan satu After.");
        return;
      }
      if (beforeImages[0].publicId === afterImages[0].publicId) {
        setError("Foto Before dan After harus berbeda.");
        return;
      }
      body.completionEvidence = {
        beforePublicId: beforeImages[0].publicId,
        afterPublicId: afterImages[0].publicId,
      };
    }

    setBusy(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const result: ApiResult = await response.json().catch(() => ({}));
      if (!response.ok) {
        const firstDetail = Object.values(result.details ?? {}).flat()[0];
        throw new Error(result.error || firstDetail || `Gagal mengubah status (HTTP ${response.status}).`);
      }
      setBeforeImages([]);
      setAfterImages([]);
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan status. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="ticket-form" onSubmit={submit}>
      <span className="ticket-form-caption">TINDAKAN SELANJUTNYA</span>
      <label>
        Perbarui status
        <select
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value as ReportStatus);
            setError("");
            setSaved(false);
          }}
          disabled={busy}
        >
          {options.map((option) => (
            <option key={option} value={option}>{STATUS_LABELS[option]}</option>
          ))}
        </select>
      </label>
      {selected === "ASSIGNED" && (
        <label>
          Petugas penanggung jawab
          <select required name="assignedToId" defaultValue="" disabled={busy}>
            <option value="">Pilih petugas</option>
            {officers.map((officer) => (
              <option key={officer.id} value={officer.id}>{officer.name}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        Catatan penanganan
        <textarea
          name="note"
          required={selected === "REJECTED" || selected === "RESOLVED"}
          maxLength={500}
          placeholder="Tambahkan catatan untuk warga..."
          rows={2}
          disabled={busy}
        />
      </label>
      {selected === "RESOLVED" && (
        <div className="ticket-evidence">
          <b>Bukti foto penyelesaian (wajib 2 foto)</b>
          <p>Ambil foto dari lokasi dan sudut yang jelas. Foto Before menunjukkan kondisi awal, sedangkan foto After menunjukkan hasil pekerjaan.</p>
          <div className="completion-upload-grid">
            <div className="completion-upload-slot">
              <strong>1. Foto Before</strong>
              <span>Kondisi sebelum dikerjakan</span>
              <ImageUploader type="RESOLUTION" maxFiles={1} value={beforeImages} onChange={setBeforeImages} disabled={busy} />
              {beforeImages.length === 1 && <small className="completion-upload-ready">Foto Before siap</small>}
            </div>
            <div className="completion-upload-slot">
              <strong>2. Foto After</strong>
              <span>Kondisi setelah dikerjakan</span>
              <ImageUploader type="RESOLUTION" maxFiles={1} value={afterImages} onChange={setAfterImages} disabled={busy} />
              {afterImages.length === 1 && <small className="completion-upload-ready">Foto After siap</small>}
            </div>
          </div>
          <p className="completion-upload-count">Kelengkapan bukti: {beforeImages.length + afterImages.length}/2 foto.</p>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="form-success" role="status"><CheckCircle2 size={15} /> Status berhasil diperbarui.</p>}
      <button
        type="submit"
        className="primary-action"
        disabled={busy || (selected === "RESOLVED" && (beforeImages.length !== 1 || afterImages.length !== 1))}
      >
        <Send size={15} /> {busy ? "Menyimpan..." : "Simpan status"}
      </button>
    </form>
  );
}
