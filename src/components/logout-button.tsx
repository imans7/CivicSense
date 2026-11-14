"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Gagal logout. Silakan coba lagi.");
      // Ganti history agar tombol Kembali tidak masuk lagi ke dashboard lama.
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal keluar dari akun.");
      setBusy(false);
    }
  }

  return (
    <span className="logout-wrapper">
      <button
        type="button"
        className="logout-button"
        onClick={logout}
        disabled={busy}
        aria-label="Logout dari akun CivicSense"
      >
        {busy ? <LoaderCircle className="animate-spin" size={16} /> : <LogOut size={16} />}
        <span>{busy ? "Keluar..." : "Logout"}</span>
      </button>
      {error && <small role="alert" className="logout-error">{error}</small>}
    </span>
  );
}
