"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Save } from "lucide-react";
export function AdminUserControl({ id, initialRole, initialActive }: { id: string; initialRole: Role; initialActive: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = role !== initialRole || active !== initialActive;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, isActive: active }) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error || "Gagal mengubah akun");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan"); }
    finally { setBusy(false); }
  }
  return <form className="user-control" onSubmit={submit}><label>Peran
    <select value={role} onChange={e => setRole(e.target.value as Role)}><option value="PUBLIC">Warga</option><option value="OFFICER">Petugas</option><option value="ADMIN">Administrator</option></select>
    </label><label>Status akun<select value={active ? "active" : "inactive"} onChange={e => setActive(e.target.value === "active")}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
    <button className="secondary-action" type="submit" disabled={busy || !changed}><Save size={15}/>{busy ? "Menyimpan..." : "Simpan"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
