"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function UnblockButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function unblock() {
    setBusy(true); setError("");
    try {
      const result = await fetch(`/api/users/${encodeURIComponent(userId)}/block`, { method: "DELETE", credentials: "same-origin" });
      const data = await result.json() as { error?: string };
      if (!result.ok) throw new Error(data.error || "Gagal membatalkan blokir");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Gagal membatalkan blokir"); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={unblock} className="social-action-button unblock-action">{busy ? "Memproses..." : "Buka blokir"}</button>{error && <small role="alert" className="social-error">{error}</small>}</div>;
}
