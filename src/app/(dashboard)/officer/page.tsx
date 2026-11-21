import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CheckCircle2, ClipboardList, Clock3, MapPin, ShieldCheck, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { StatusControl } from "@/components/status-control";
import { UserAvatar } from "@/components/community/user-avatar";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser(); if (!user) redirect("/login"); if (user.role !== "OFFICER") redirect("/");
  const [reports, resolved, total] = await Promise.all([
    prisma.report.findMany({ where: { assignedToId: user.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } }, orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }], take: 60, include: { category: true, user: { select: { id: true, name: true, avatarUrl: true } } } }),
    prisma.report.count({ where: { assignedToId: user.id, status: "RESOLVED" } }),
    prisma.report.count({ where: { assignedToId: user.id } }),
  ]);
  const progress = reports.filter(r => r.status === "IN_PROGRESS").length;
  return <main className="staff-main">
    <header className="staff-header officer-header"><span className="feed-eyebrow"><ShieldCheck size={15}/> RUANG KERJA · PETUGAS</span><h1>Halo, {user.name.split(" ")[0]} <span className="hello-wave">✦</span></h1><p>Terima penugasan dari admin, catat progres, lalu unggah foto Before dan After sebelum menyelesaikan tugas.</p><div className="staff-header-actions"><Link href="/officer/history" className="secondary-action"><Clock3 size={16}/> Riwayat penanganan</Link><Link href={`/users/${user.id}`} className="primary-action"><BadgeCheck size={16}/> Profil petugas</Link></div></header>
    <section className="staff-kpi-grid staff-kpi-three" aria-label="Ringkasan petugas">
      <div className="kpi-card"><span className="kpi-icon kpi-amber"><ClipboardList size={21}/></span><small>Tugas aktif</small><strong>{reports.length}</strong><span className="kpi-caption">Perlu ditindaklanjuti</span></div>
      <div className="kpi-card"><span className="kpi-icon kpi-blue"><Clock3 size={21}/></span><small>Dalam penanganan</small><strong>{progress}</strong><span className="kpi-caption">Sedang dikerjakan</span></div>
      <div className="kpi-card"><span className="kpi-icon kpi-green"><CheckCircle2 size={21}/></span><small>Tugas selesai</small><strong>{resolved}</strong><span className="kpi-caption">Dari {total} penugasan</span></div>
    </section>
    <div className="staff-content-heading"><div><span className="feed-eyebrow"><ClipboardList size={14}/> PEKERJAAN SAYA</span><h2>Daftar penanganan</h2><p>Urutan berdasarkan prioritas. Perbarui status pekerjaan di sini.</p></div><span className="count-badge">{reports.length} aktif</span></div>
    {!reports.length && <div className="staff-empty"><BadgeCheck size={32}/><b>Semua tugas aktif sudah tertangani</b><p>Penugasan baru dari admin akan tampil di halaman ini.</p><Link href="/officer/history">Lihat riwayat →</Link></div>}
    <div className="staff-queue">{reports.map(r => <article key={r.id} className="staff-ticket"><div className="staff-ticket-body"><div className="ticket-top"><span className="ticket-number">{r.reportNumber}</span><span className={`status-pill status-${r.status.toLowerCase()}`}><i/>{STATUS_LABELS[r.status]}</span></div><Link className="ticket-title" href={`/reports/${r.id}`}>{r.title}</Link><p className="ticket-desc">{r.description}</p><div className="ticket-author"><UserAvatar user={r.user} size="small"/><div><Link href={`/users/${r.user.id}`}>{r.user.name}</Link><small>Pelapor · {r.category.name}</small></div></div><div className="ticket-details">{r.address && <span><MapPin size={14}/> {r.address}</span>}<span className="ticket-priority"><AlertTriangle size={14}/> Prioritas {PRIORITY_LABELS[r.priorityLevel]}</span></div></div><div className="staff-ticket-action"><StatusControl key={`${r.id}-${r.status}`} reportId={r.id} role={user.role} status={r.status} officers={[]}/></div></article>)}</div>
  </main>;
}
