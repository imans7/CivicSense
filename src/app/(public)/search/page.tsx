import Link from "next/link";
import { Search, UsersRound, FileText } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { feedInclude, feedViewer, interactionSets } from "@/lib/community";
import { excludedUserIds } from "@/lib/social";
import { Feed } from "@/components/community/feed";
import { UserAvatar } from "@/components/community/user-avatar";
import { profileHandle, roleCaption } from "@/lib/profile";

export const dynamic = "force-dynamic";
type Filter = "all" | "reports" | "users";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; page?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 80);
  const type: Filter = params.type === "reports" || params.type === "users" ? params.type : "all";
  const page = Math.min(100, Math.max(1, Number(params.page) || 1));
  const viewer = await feedViewer();
  const excluded = await excludedUserIds(viewer?.id);
  const userWhere: Prisma.UserWhereInput = {
    isActive: true,
    ...(excluded.length ? { id: { notIn: excluded } } : {}),
    name: { contains: q, mode: "insensitive" },
  };
  const reportWhere: Prisma.ReportWhereInput = {
    status: { not: "REJECTED" },
    ...(excluded.length ? { userId: { notIn: excluded } } : {}),
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { reportNumber: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ],
  };
  const shouldSearch = q.length >= 2;
  const limit = type === "all" ? 8 : 15;
  const [users, posts] = await Promise.all([
    shouldSearch && type !== "reports" ? prisma.user.findMany({ where: userWhere, select: { id: true, name: true, role: true, avatarUrl: true, bio: true }, take: limit + 1, skip: type === "users" ? (page - 1) * limit : 0, orderBy: { name: "asc" } }) : Promise.resolve([]),
    shouldSearch && type !== "users" ? prisma.report.findMany({ where: reportWhere, include: feedInclude, take: limit + 1, skip: type === "reports" ? (page - 1) * limit : 0, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  const moreUsers = users.length > limit;
  const moreReports = posts.length > limit;
  const visibleUsers = users.slice(0, limit);
  const visiblePosts = posts.slice(0, limit);
  const reactions = await interactionSets(viewer?.id, visiblePosts.map((post) => post.id));
  const link = (filter: Filter, nextPage = 1) => `/search?${new URLSearchParams({ q, type: filter, page: String(nextPage) })}`;
  return <main className="search-page">
    <header className="feed-heading"><div><span className="feed-eyebrow"><Search size={16}/> TELUSURI CIVICSENSE</span><h1>Pencarian</h1></div></header>
    <form action="/search" className="search-global-form"><Search size={20}/><input name="q" type="search" defaultValue={q} minLength={2} maxLength={80} placeholder="Cari kasus, lokasi, atau nama pengguna" aria-label="Kata kunci pencarian" required/><button type="submit">Cari</button></form>
    <nav className="search-category-tabs" aria-label="Jenis hasil pencarian">
      <Link href={link("all")} className={type === "all" ? "selected" : ""}>Semua</Link>
      <Link href={link("reports")} className={type === "reports" ? "selected" : ""}>Laporan</Link>
      <Link href={link("users")} className={type === "users" ? "selected" : ""}>Pengguna</Link>
    </nav>
    {!shouldSearch ? <div className="empty-community"><Search size={28}/><b>Masukkan minimal dua karakter</b><p>Temukan laporan berdasarkan kata kunci atau teman berdasarkan nama mereka.</p></div> : <>
      {type !== "reports" && <section className="search-result-section"><h2><UsersRound size={18}/> Pengguna</h2>
        {visibleUsers.map((person) => <Link href={`/users/${person.id}`} className="search-person" key={person.id}><UserAvatar user={person} size="normal" link={false}/><span><strong>{person.name}</strong><small>{profileHandle(person)} · {roleCaption(person.role)}</small>{person.bio && <small>{person.bio}</small>}</span></Link>)}
        {visibleUsers.length === 0 && <p className="search-empty">Tidak ada pengguna yang cocok.</p>}
        {type === "all" && moreUsers && <Link href={link("users")} className="search-more">Lihat pengguna lainnya →</Link>}
        {type === "users" && <div className="pagination">{page > 1 && <Link href={link(type, page - 1)}>← Sebelumnya</Link>}{moreUsers && <Link href={link(type, page + 1)}>Berikutnya →</Link>}</div>}
      </section>}
      {type !== "users" && <section className="search-result-section"><h2><FileText size={18}/> Laporan</h2>
        {visiblePosts.length === 0 && <p className="search-empty">Tidak ada laporan yang cocok.</p>}
        <Feed posts={visiblePosts} viewerId={viewer?.id} liked={reactions.liked} disliked={reactions.disliked} saved={reactions.saved}/>
        {type === "all" && moreReports && <Link href={link("reports")} className="search-more">Lihat laporan lainnya →</Link>}
        {type === "reports" && <div className="pagination">{page > 1 && <Link href={link(type, page - 1)}>← Sebelumnya</Link>}{moreReports && <Link href={link(type, page + 1)}>Berikutnya →</Link>}</div>}
      </section>}
    </>}
  </main>;
}
