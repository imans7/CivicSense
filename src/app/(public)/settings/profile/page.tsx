import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRoundPen } from "lucide-react";
import { currentUser } from "@/lib/session";
import { ProfileEditor } from "@/components/community/profile-editor";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser(); if (!user) redirect("/login");
  return <main><header className="feed-heading detail-header"><Link href={`/users/${user.id}`} aria-label="Kembali ke profil"><ArrowLeft size={22}/></Link><div><span className="feed-eyebrow"><UserRoundPen size={14}/> PENGATURAN AKUN</span><h1>Edit profil</h1></div></header>
    <div className="settings-intro"><h2>Tampilkan dirimu di komunitas</h2><p>Profil kamu bisa dilihat oleh warga, petugas, dan admin. Pilih informasi yang ingin dibagikan.</p></div>
    <ProfileEditor user={user}/></main>;
}
