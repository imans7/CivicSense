"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Galeri foto berukuran besar; mendukung Esc dan panah keyboard. */
export function PhotoLightbox({ photos, index, onChange, onClose }: {
  photos: { imageUrl: string }[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && photos.length > 1) onChange((index - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight" && photos.length > 1) onChange((index + 1) % photos.length);
    }
    window.addEventListener("keydown", keyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keyDown); };
  }, [index, photos.length, onChange, onClose]);
  return <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Perbesar foto laporan" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <button ref={closeRef} type="button" className="photo-lightbox-close" onClick={onClose} aria-label="Tutup foto"><X size={23}/></button>
    {photos.length > 1 && <button type="button" className="photo-lightbox-prev" onClick={() => onChange((index - 1 + photos.length) % photos.length)} aria-label="Foto sebelumnya"><ChevronLeft size={29}/></button>}
    {/* Data URL berasal dari sumber foto yang sudah ditampilkan di feed, bukan input HTML pengguna. */}
    <img src={photos[index].imageUrl} alt={`Foto laporan diperbesar, ${index + 1} dari ${photos.length}`} />
    {photos.length > 1 && <button type="button" className="photo-lightbox-next" onClick={() => onChange((index + 1) % photos.length)} aria-label="Foto berikutnya"><ChevronRight size={29}/></button>}
    <span className="photo-lightbox-count">{index + 1} / {photos.length}</span>
  </div>;
}
