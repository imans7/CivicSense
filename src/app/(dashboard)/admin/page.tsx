import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CheckCircle2, Clock3, Download, FileText, ShieldCheck, UserCog, Users, AlertTriangle, SlidersHorizontal } from "lucide-react";
import type { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { StatusControl } from "@/components/status-control";
import { UserAvatar } from "@/components/community/user-avatar";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
export const dynamic = "force-dynamic";
const allowedStatuses: ReportStatus[] = ["PENDING", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await currentUser(); if (!user) redirect("/login"); if (user.role !== "ADMIN") redirect("/");
  const s = await searchParams; const filter = allowedStatuses.includes(s.status as ReportStatus) ? s.status as ReportStatus : undefined;
  const [reports, officers, total, pending, resolved, activeUsers, inProgress] = await Promise.all([
    prisma.report.findMany({ where: filter ? { status: filter } : undefined, orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }], take: 60, include: { category: true, assignedTo: { select: { id: true, name: true } }, user: { select: { id: true, name: true, avatarUrl: true } } } }),
    prisma.user.findMany({ where: { role: "OFFICER", isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.report.count(), prisma.report.count({ where: { status: "PENDING" } }), prisma.report.count({ where: { status: "RESOLVED" } }),
    prisma.user.count({ where: { isActive: true } }), prisma.report.count({ where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
  ]);
  return <main className="staff-main">
    <header className="staff-header"><span className="feed-eyebrow"><ShieldCheck size={15}/> PUSAT KENDALI · ADMINISTRATOR</span><h1>Selamat datang, {user.name.split(" ")[0]} <span className="hello-wave">✦</span></h1><p>Pantau aktivitas komunitas, verifikasi laporan, dan koordinasikan penanganannya.</p><div className="staff-header-actions"><Link href="/admin/users" className="secondary-action"><UserCog size={16}/> Kelola anggota</Link><a className="primary-action" href="/api/admin/export"><Download size={16}/> Ekspor CSV</a></div></header>
    <section className="staff-kpi-grid" aria-label="Ringkasan admin">
      <div className="kpi-card"><span className="kpi-icon kpi-blue"><FileText size={21}/></span><small>Total laporan</small><strong>{total}</strong><span className="kpi-caption">Semua status</span></div>
      <div className="kpi-card"><span className="kpi-icon kpi-amber"><Clock3 size={21}/></span><small>Perlu verifikasi</small><strong>{pending}</strong><span className="kpi-caption">Menunggu keputusan</span></div>
      <div className="kpi-card"><span className="kpi-icon kpi-purple"><Users size={21}/></span><small>Anggota aktif</small><strong>{activeUsers}</strong><span className="kpi-caption">Warga dan staf</span></div>
      <div className="kpi-card"><span className="kpi-icon kpi-green"><CheckCircle2 size={21}/></span><small>Sudah selesai</small><strong>{resolved}</strong><span className="kpi-caption">{inProgress} masih ditangani</span></div>
    </section>
    <div className="staff-content-heading"><div><span className="feed-eyebrow"><SlidersHorizontal size={14}/> KELOLA PELAPORAN</span><h2>Antrean laporan</h2><p>Diurutkan berdasarkan prioritas, lalu waktu terbaru.</p></div><span className="count-badge">{reports.length} ditampilkan</span></div>
    <nav className="status-filter" aria-label="Filter status laporan"><Link href="/admin" className={!filter ? "selected" : ""}>Semua</Link>{allowedStatuses.map(s => <Link href={`/admin?status=${s}`} key={s} className={filter === s ? "selected" : ""}>{STATUS_LABELS[s]}</Link>)}</nav>
    {!reports.length && <div className="staff-empty"><BadgeCheck size={30}/><b>Tidak ada laporan untuk filter ini</b><p>Coba pilih status lainnya.</p></div>}
    <div className="staff-queue">{reports.map(r => <article key={r.id} className="staff-ticket"><div className="staff-ticket-body"><div className="ticket-top"><span className="ticket-number">{r.reportNumber}</span><span className={`status-pill status-${r.status.toLowerCase()}`}><i/>{STATUS_LABELS[r.status]}</span></div><Link className="ticket-title" href={`/reports/${r.id}`}>{r.title}</Link><p className="ticket-desc">{r.description}</p><div className="ticket-author"><UserAvatar user={r.user} size="small"/><div><Link href={`/users/${r.user.id}`}>{r.user.name}</Link><small>{r.category.name} · {r.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</small></div></div><div className="ticket-details"><span className="ticket-priority"><AlertTriangle size={15}/> {PRIORITY_LABELS[r.priorityLevel]} · skor {Number(r.priorityScore).toFixed(2)}</span><span>Petugas: <b>{r.assignedTo?.name || "Belum ditugaskan"}</b></span></div></div><div className="staff-ticket-action"><StatusControl key={`${r.id}-${r.status}`} reportId={r.id} role={user.role} status={r.status} officers={officers}/></div></article>)}</div>
    {reports.length === 60 && <p className="staff-footnote">Menampilkan hingga 60 laporan. Gunakan filter status untuk mempersempit daftar.</p>}
  </main>;
}
