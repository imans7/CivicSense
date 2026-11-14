import Link from "next/link";
import { Bookmark, ClipboardList, Compass, History, Home, LayoutDashboard, MapPinned, PenLine, Search, ShieldCheck, UserRound, Users, UserCog, MessageSquare } from "lucide-react";
import { currentUser } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { UserAvatar } from "@/components/community/user-avatar";
import { prisma } from "@/lib/prisma";
import { profileHandle, roleCaption } from "@/lib/profile";
import { getUnreadInboxCount } from "@/lib/inbox";
import { InboxNavLink } from "@/components/community/inbox-nav-link";

export async function ForumShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const categories = await prisma.category.findMany({ where: { isActive: true }, take: 5, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const menu = [
    { href: "/", label: "Beranda", icon: Home },
    { href: "/reports", label: "Jelajahi", icon: Compass },
    { href: "/map", label: "Peta laporan", icon: MapPinned },
    ...(user?.role === "ADMIN" ? [
      { href: "/admin", label: "Pusat kendali", icon: LayoutDashboard },
      { href: "/admin/users", label: "Kelola anggota", icon: UserCog },
    ] : user?.role === "OFFICER" ? [
      { href: "/officer", label: "Tugas saya", icon: ClipboardList },
      { href: "/officer/history", label: "Riwayat tugas", icon: History },
    ] : []),
    { href: "/saved", label: "Tersimpan", icon: Bookmark },
    { href: "/my-reports", label: "Laporan saya", icon: ClipboardList },
    ...(user ? [{ href: `/users/${user.id}`, label: "Profil saya", icon: UserRound }] : []),
  ];
  const [staffPending, staffTasks, unreadInboxCount] = await Promise.all([
    user?.role === "ADMIN" ? prisma.report.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    user?.role === "OFFICER" ? prisma.report.count({ where: { assignedToId: user.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }) : Promise.resolve(0),
    user ? getUnreadInboxCount(user.id) : Promise.resolve(0),
  ]);
  const staff = user?.role === "ADMIN" || user?.role === "OFFICER";
  const deskLink = user?.role === "ADMIN" ? "/admin" : "/officer";
  return <div className="community-app">
    <aside className="community-left" aria-label="Navigasi utama">
      <Link className="brand" href="/"><span className="brand-mark"><Users size={22}/></span><span>Civic<span className="brand-highlight">Sense</span><small>RUANG WARGA</small></span></Link>
      {staff && <Link href={deskLink} className="staff-switch"><ShieldCheck size={16}/><span>Mode {user.role === "ADMIN" ? "Administrator" : "Petugas"}</span></Link>}
      <nav className="side-nav">{menu.slice(0, 2).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="nav-item"><Icon size={22} strokeWidth={1.85}/><span>{label}</span></Link>)}{user && <InboxNavLink initialCount={unreadInboxCount}/>}{menu.slice(2).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="nav-item"><Icon size={22} strokeWidth={1.85}/><span>{label}</span></Link>)}</nav>
      <Link href={user ? "/reports/new" : "/login"} className="compose-side"><PenLine size={19}/><span>Buat Laporan</span></Link>
      {user ? <div className="side-account"><UserAvatar user={user} size="small"/><Link href={`/users/${user.id}`} className="account-info"><b>{user.name}</b><small>{profileHandle(user)}</small></Link><LogoutButton/></div>
        : <div className="side-guest"><b>Gabung komunitas</b><p>Suarakan persoalan di sekitarmu.</p><Link href="/register">Daftar sekarang</Link></div>}
    </aside>
    <div className="community-center">{children}</div>
    <aside className="community-right" aria-label="Informasi komunitas">
      <form action="/reports" className="community-search"><Search size={20}/><input name="q" type="search" placeholder="Cari laporan..." aria-label="Cari laporan"/></form>
      {staff && <section className="right-panel staff-right-panel"><div className="right-kicker"><ShieldCheck size={15}/> RUANG KERJA RESMI</div><h2>{roleCaption(user.role)}</h2>
        <p>{user.role === "ADMIN" ? "Kelola laporan dan anggota, serta pantau tindak lanjut isu warga." : "Tanggapi laporan yang ditugaskan dan unggah bukti penanganan."}</p>
        <Link href={deskLink}><span>{user.role === "ADMIN" ? `${staffPending} menunggu verifikasi` : `${staffTasks} tugas masih aktif`}</span><span>→</span></Link>
      </section>}
      <section className="right-panel"><h2>Selamat datang di <span>CivicSense!</span></h2><p>Ruang bersama warga dan petugas untuk berbagi informasi, melaporkan masalah lingkungan, dan memantau penyelesaiannya.</p><Link href={user ? "/reports/new" : "/register"}>Mulai berkontribusi <span>→</span></Link></section>
      <section className="right-panel trend-panel"><h2>Topik komunitas</h2>{categories.map((c, i) => <Link key={c.id} href={`/reports?category=${encodeURIComponent(c.id)}`} className="trend-item"><small>Topik · {String(i + 1).padStart(2, "0")}</small><b>{c.name}</b><span>Lihat diskusi →</span></Link>)}{!categories.length && <p>Topik akan muncul setelah kategori ditambahkan.</p>}</section>
      <section className="right-note"><ShieldCheck size={16}/> Status verifikasi ditentukan oleh petugas berwenang, bukan oleh jumlah like.</section>
      <footer className="right-footer">CivicSense · Komunitas peduli lingkungan<br/>Bersama, kita buat perubahan.</footer>
    </aside>
    <nav className="mobile-community-nav" aria-label="Navigasi seluler">
      <Link href="/" aria-label="Beranda"><Home/></Link>
      <Link href="/reports" aria-label="Jelajahi"><Compass/></Link>
      {staff && <Link href={deskLink} aria-label={user.role === "ADMIN" ? "Pusat kendali" : "Tugas saya"}><LayoutDashboard/></Link>}
      <Link href={user ? "/reports/new" : "/login"} aria-label="Buat laporan"><PenLine/></Link>
      {user ? <InboxNavLink initialCount={unreadInboxCount} mobile /> : <Link href="/login" aria-label="Kotak Masuk"><MessageSquare/></Link>}
      <Link href={user ? `/users/${user.id}` : "/login"} aria-label="Profil"><UserRound/></Link>
    </nav>
  </div>;
}
