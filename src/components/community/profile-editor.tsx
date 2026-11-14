"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CircleX, LoaderCircle, Save } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { UserAvatar } from "@/components/community/user-avatar";

export function ProfileEditor({ user }: { user: { id: string; name: string; bio: string | null; location: string | null; avatarUrl: string | null; avatarPublicId: string | null } }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  const [avatar, setAvatar] = useState({ publicId: user.avatarPublicId, url: user.avatarUrl });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function selectImage(file?: File) {
    if (!file) return;
    setError(""); setUploading(true);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Gunakan JPG, PNG, atau WebP");
      const compressed = await compressImage(file);
      const data = new FormData(); data.append("file", compressed); data.append("type", "AVATAR");
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal mengunggah foto");
      // Jika foto baru yang belum disimpan diganti lagi, bersihkan foto sementara lama.
      if (avatar.publicId && avatar.publicId !== user.avatarPublicId) {
        await fetch("/api/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId: avatar.publicId }) }).catch(() => null);
      }
      setAvatar({ publicId: result.data.publicId, url: result.data.imageUrl });
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal mengunggah foto"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, bio, location, avatarPublicId: avatar.publicId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memperbarui profil");
      router.push(result.profileUrl); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan profil"); }
    finally { setBusy(false); }
  }
  return <form className="profile-form" onSubmit={submit}>
    <div className="profile-edit-avatar"><UserAvatar user={{ id: user.id, name, avatarUrl: avatar.url }} size="xl" link={false}/>
      <div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => selectImage(e.target.files?.[0])}/>
        <button type="button" className="secondary-action" onClick={() => fileRef.current?.click()} disabled={uploading || busy}><Camera size={16}/>{uploading ? "Mengunggah..." : "Ganti foto profil"}</button>
        {avatar.url && <button type="button" className="text-action" onClick={() => setAvatar({ publicId: null, url: null })} disabled={busy || uploading}><CircleX size={15}/> Hapus foto</button>}
        <p className="input-hint">Foto tersimpan di Cloudinary. Format JPG, PNG, atau WebP.</p>
      </div>
    </div>
    <label>Nama tampilan<input required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)}/></label>
    <label>Bio <span>({bio.length}/280)</span><textarea maxLength={280} rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Ceritakan sedikit tentang dirimu dan kepedulianmu..."/></label>
    <label>Lokasi (opsional, terlihat publik)<input maxLength={120} value={location} onChange={e => setLocation(e.target.value)} placeholder="Contoh: Semarang, Jawa Tengah"/></label>
    <p className="input-hint">Email dan peran akun tidak ditampilkan di halaman profil publik serta tidak dapat diubah melalui formulir ini.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button type="submit" className="primary-action" disabled={busy || uploading}>{busy ? <LoaderCircle className="animate-spin" size={17}/> : <Save size={17}/>} {busy ? "Menyimpan..." : "Simpan perubahan"}</button>
  </form>;
}
