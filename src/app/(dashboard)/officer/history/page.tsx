import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, History } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/components/community/user-avatar";
import { CompletionEvidenceGallery } from "@/components/community/completion-evidence-gallery";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser(); if (!user) redirect("/login"); if (user.role !== "OFFICER") redirect("/");
  const [items, count] = await Promise.all([
    prisma.report.findMany({ where: { assignedToId: user.id, status: "RESOLVED" }, include: { user: { select: { id: true, name: true, avatarUrl: true } }, category: true, images: { where: { imageType: "RESOLUTION" }, select: { imageUrl: true }, take: 1 }, completionEvidence: { select: { beforeImageUrl: true, afterImageUrl: true, createdAt: true, uploadedBy: { select: { name: true } } } } }, orderBy: { resolvedAt: "desc" }, take: 50 }),
    prisma.report.count({ where: { assignedToId: user.id, status: "RESOLVED" } }),
  ]);
  return <main className="staff-main"><header className="feed-heading detail-header"><Link href="/officer" aria-label="Kembali"><ArrowLeft size={22}/></Link><div><span className="feed-eyebrow"><History size={14}/> PEKERJAAN TERSELESAIKAN</span><h1>Riwayat penanganan</h1></div></header>
    <div className="staff-content-heading"><div><h2>Hasil pekerjaanmu</h2><p>Rekap laporan yang sudah diselesaikan beserta bukti foto.</p></div><span className="count-badge">{count} selesai</span></div>
    {!items.length && <div className="staff-empty"><CheckCircle2 size={28}/><b>Belum ada pekerjaan selesai</b><p>Riwayat akan terisi saat laporan dinyatakan selesai.</p></div>}
    <div className="history-cards">{items.map(r => <article key={r.id} className="history-card">{r.completionEvidence ? <CompletionEvidenceGallery evidence={r.completionEvidence} compact/> : r.images[0] && <img src={r.images[0].imageUrl} alt={`Bukti penyelesaian lama ${r.reportNumber}`} loading="lazy"/>}<div><span className="ticket-number">{r.reportNumber}</span><Link href={`/reports/${r.id}`} className="ticket-title">{r.title}</Link><p>{r.category.name} · Selesai {r.resolvedAt?.toLocaleDateString("id-ID") || "—"}</p><div className="ticket-author"><UserAvatar user={r.user} size="small"/><Link href={`/users/${r.user.id}`}>{r.user.name}</Link></div></div></article>)}</div>
    {count > items.length && <p className="staff-footnote">Menampilkan 50 penyelesaian terbaru.</p>}
  </main>;
}
