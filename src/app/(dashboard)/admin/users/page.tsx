import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { UserAvatar } from "@/components/community/user-avatar";
import { AdminUserControl } from "@/components/community/admin-user-control";
import { roleCaption } from "@/lib/profile";
export const dynamic = "force-dynamic";
const roles: Role[] = ["PUBLIC", "OFFICER", "ADMIN"];
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const admin = await currentUser(); if (!admin) redirect("/login"); if (admin.role !== "ADMIN") redirect("/");
  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 100);
  const role = roles.includes(params.role as Role) ? params.role as Role : undefined;
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const where: Prisma.UserWhereInput = { ...(role ? { role } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) };
  const [users, count] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, createdAt: true, _count: { select: { reportsCreated: true } } }, take: 20, skip: (page - 1) * 20 }),
    prisma.user.count({ where }),
  ]);
  const urlFor = (p: number) => `/admin/users?${new URLSearchParams({ q, role: role || "", page: String(p) })}`;
  return <main className="staff-main">
    <header className="feed-heading detail-header"><Link href="/admin" aria-label="Kembali"><ArrowLeft size={22}/></Link><div><span className="feed-eyebrow"><UserCog size={14}/> PENGATURAN ADMINISTRATOR</span><h1>Kelola anggota</h1></div></header>
    <div className="staff-content-heading"><div><h2>Direktori komunitas</h2><p>Atur akses akun petugas dan admin. Profil setiap anggota tetap dapat dilihat publik.</p></div><span className="count-badge">{count} akun</span></div>
    <form action="/admin/users" className="users-search"><label><Search size={18}/><input name="q" placeholder="Cari nama atau email..." defaultValue={q}/></label><select name="role" defaultValue={role || ""} aria-label="Filter peran"><option value="">Semua peran</option><option value="PUBLIC">Warga</option><option value="OFFICER">Petugas</option><option value="ADMIN">Administrator</option></select><button type="submit">Cari</button></form>
    <div className="users-directory">{users.map(u => <article key={u.id} className="directory-user"><div className="directory-user-info"><UserAvatar user={u} size="normal"/><div><Link className="directory-name" href={`/users/${u.id}`}>{u.name}</Link><div className="directory-meta">{u.email}</div><div className="directory-meta"><ShieldCheck size={13}/>{roleCaption(u.role)} · {u._count.reportsCreated} laporan</div><span className={u.isActive ? "user-active" : "user-inactive"}>{u.isActive ? "Aktif" : "Nonaktif"}</span></div></div>
      {u.id === admin.id ? <span className="self-account-label"><Users size={16}/> Akun Anda · tidak dapat diubah sendiri</span> : <AdminUserControl id={u.id} initialRole={u.role} initialActive={u.isActive}/>}
    </article>)}{!users.length && <div className="staff-empty"><Users size={30}/><b>Akun tidak ditemukan</b><p>Coba kata kunci atau filter lain.</p></div>}</div>
    <div className="pagination">{page > 1 && <Link href={urlFor(page - 1)}>← Sebelumnya</Link>}{page * 20 < count && <Link href={urlFor(page + 1)}>Berikutnya →</Link>}</div>
    <p className="staff-footnote">Penonaktifan akun mengakhiri sesi login. Petugas dengan tugas aktif harus menyelesaikan atau mengalihkan tugasnya sebelum diubah peran atau dinonaktifkan.</p>
  </main>;
}
