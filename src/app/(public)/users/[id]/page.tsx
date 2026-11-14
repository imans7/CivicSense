import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarDays, MapPin, Settings2, ShieldCheck, ThumbsDown, Heart, FileText, CircleHelp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { feedInclude, interactionSets } from "@/lib/community";
import { Feed } from "@/components/community/feed";
import { LogoutButton } from "@/components/logout-button";
import { UserAvatar } from "@/components/community/user-avatar";
import { getProfileStats, profileHandle, roleCaption } from "@/lib/profile";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, viewer] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, bio: true, location: true, avatarUrl: true, createdAt: true, isActive: true } }),
    currentUser(),
  ]);
  if (!profile) notFound();
  const self = viewer?.id === id;
  const where = { userId: id, ...((self || viewer?.role === "ADMIN") ? {} : { status: { not: "REJECTED" as const } }) };
  const [stats, posts] = await Promise.all([
    getProfileStats(id),
    prisma.report.findMany({ where, include: feedInclude, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const reactions = await interactionSets(viewer?.id, posts.map(p => p.id));
  return <main className="profile-page">
    <header className="feed-heading detail-header"><Link href="/" aria-label="Kembali"><ArrowLeft size={22}/></Link><div><h1>{profile.name}</h1><small>{stats.totalReports} laporan dikirim</small></div></header>
    <div className={`profile-banner banner-${profile.role.toLowerCase()}`}><span className="banner-pattern"/></div>
    <div className="profile-top"><UserAvatar user={profile} size="xl" link={false}/>
      {self ? <div className="profile-own-actions"><Link className="secondary-action profile-edit-link" href="/settings/profile"><Settings2 size={16}/> Edit profil</Link><LogoutButton/></div> : <span className="profile-visitor-badge"><ShieldCheck size={16}/> Profil komunitas</span>}
    </div>
    <div className="profile-info"><h2>{profile.name} {profile.role !== "PUBLIC" && <BadgeCheck size={21} className="verified-icon"/>}</h2>
      <p className="profile-handle">{profileHandle(profile)}</p>
      <div className="role-chip"><ShieldCheck size={14}/>{roleCaption(profile.role)}</div>
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      <div className="profile-details">{profile.location && <span><MapPin size={16}/>{profile.location}</span>}<span><CalendarDays size={16}/>Bergabung {profile.createdAt.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span></div>
      {!profile.isActive && <p className="deactivated-label">Akun tidak aktif</p>}
    </div>
    <section className="profile-stats" aria-label="Statistik profil">
      <div><Heart size={19} className="stat-like"/><strong>{stats.likesReceived.toLocaleString("id-ID")}</strong><span>Like diterima</span></div>
      <div><ThumbsDown size={19} className="stat-dislike"/><strong>{stats.dislikesReceived.toLocaleString("id-ID")}</strong><span>Dislike diterima</span></div>
      <div><FileText size={19} className="stat-reports"/><strong>{stats.totalReports.toLocaleString("id-ID")}</strong><span>Laporan diunggah</span></div>
      <div><ShieldCheck size={19} className="stat-accuracy"/><strong>{stats.accuracy === null ? "—" : `${stats.accuracy}%`}</strong><span>Akurasi verifikasi</span></div>
    </section>
    <div className="accuracy-explainer"><CircleHelp size={18}/><p><b>Bagaimana angka akurasi dihitung?</b> {stats.reviewed > 0 ? `${stats.validated} dari ${stats.reviewed} laporan yang diperiksa lolos verifikasi.` : "Belum ada laporan yang selesai ditinjau."} Perhitungan tidak memasukkan laporan menunggu. Penolakan dapat disebabkan bukti yang belum cukup atau hal di luar kewenangan; angka ini indikator administrasi, bukan kepastian kebenaran laporan.</p></div>
    {profile.role === "OFFICER" && <div className="staff-metric"><ShieldCheck size={17}/> {stats.resolvedAssignments} tugas telah diselesaikan sebagai petugas.</div>}
    <div className="profile-tab-heading"><span>Postingan laporan</span><small>Menampilkan {posts.length} terbaru</small></div>
    <Feed posts={posts} viewerId={viewer?.id} liked={reactions.liked} disliked={reactions.disliked} saved={reactions.saved}/>
  </main>;
}
