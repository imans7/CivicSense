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
  const [images, setImages] = useState<UploadedImage[]>([]);
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
      images?: { publicId: string }[];
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
      if (images.length === 0) {
        setError("Unggah minimal satu foto penyelesaian.");
        return;
      }
      body.images = images.map(({ publicId }) => ({ publicId }));
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
      setImages([]);
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
          <b>Bukti foto penyelesaian (wajib)</b>
          <ImageUploader type="RESOLUTION" maxFiles={5} value={images} onChange={setImages} />
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="form-success" role="status"><CheckCircle2 size={15} /> Status berhasil diperbarui.</p>}
      <button
        type="submit"
        className="primary-action"
        disabled={busy || (selected === "RESOLVED" && images.length === 0)}
      >
        <Send size={15} /> {busy ? "Menyimpan..." : "Simpan status"}
      </button>
    </form>
  );
}
