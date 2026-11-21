"use client";

import { useState } from "react";
import { BadgeCheck, Images } from "lucide-react";
import { PhotoLightbox } from "@/components/community/photo-lightbox";

type CompletionEvidence = {
  beforeImageUrl: string;
  afterImageUrl: string;
  createdAt?: Date | string;
  uploadedBy?: { name: string } | null;
};

export function CompletionEvidenceGallery({
  evidence,
  compact = false,
}: {
  evidence: CompletionEvidence;
  compact?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const photos = [
    { imageUrl: evidence.beforeImageUrl, label: "Before", description: "Kondisi sebelum ditangani" },
    { imageUrl: evidence.afterImageUrl, label: "After", description: "Kondisi setelah ditangani" },
  ];

  return (
    <section className={`completion-evidence${compact ? " completion-evidence-compact" : ""}`} aria-label="Bukti penyelesaian pekerjaan">
      <div className="completion-evidence-heading">
        <span><BadgeCheck size={16} /> Bukti penyelesaian</span>
        <small><Images size={13} /> 2 foto wajib</small>
      </div>
      <div className="completion-evidence-grid">
        {photos.map((photo, index) => (
          <button
            key={photo.label}
            type="button"
            className="completion-evidence-photo"
            onClick={() => setOpenIndex(index)}
            aria-label={`Perbesar foto ${photo.label}`}
          >
            <img src={photo.imageUrl} alt={`Foto ${photo.label}: ${photo.description}`} loading="lazy" decoding="async" />
            <span className={`completion-evidence-tag ${index === 0 ? "before" : "after"}`}>{photo.label}</span>
            <span className="completion-evidence-description">{photo.description}</span>
          </button>
        ))}
      </div>
      <div className="completion-evidence-meta">
        {evidence.uploadedBy?.name && <span>Diunggah oleh {evidence.uploadedBy.name}</span>}
        {evidence.createdAt && <span>{new Date(evidence.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
      </div>
      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
