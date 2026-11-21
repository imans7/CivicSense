import Link from "next/link";
import { ImagePlus, MapPin, PenLine, Sparkles, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { feedInclude, feedViewer, interactionSets } from "@/lib/community";
import { excludedUserIds } from "@/lib/social";
import { UserAvatar } from "@/components/community/user-avatar";
import { Feed } from "@/components/community/feed";

export const dynamic = "force-dynamic";
const tabs = [
  { key: "untuk-anda", label: "Untuk Anda" },
  { key: "populer", label: "Populer" },
  { key: "ditangani", label: "Sedang Ditangani" },
  { key: "selesai", label: "Sudah Selesai Ditangani" },
] as const;

type Tab = (typeof tabs)[number]["key"];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: inputTab } = await searchParams;
  const tab: Tab = inputTab === "populer" || inputTab === "ditangani" || inputTab === "selesai" ? inputTab : "untuk-anda";
  const viewer = await feedViewer();
  const excluded = await excludedUserIds(viewer?.id);
  const commonWhere: Prisma.ReportWhereInput = {
    status: { not: "REJECTED" },
    ...(excluded.length ? { userId: { notIn: excluded } } : {}),
  };

  let posts;
  if (tab === "populer") {
    posts = await prisma.report.findMany({ where: commonWhere, include: feedInclude, take: 20, orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }] });
  } else if (tab === "ditangani") {
    posts = await prisma.report.findMany({ where: { ...commonWhere, status: { in: ["ASSIGNED", "IN_PROGRESS"] } }, include: feedInclude, take: 20, orderBy: { updatedAt: "desc" } });
  } else if (tab === "selesai") {
    posts = await prisma.report.findMany({ where: { ...commonWhere, status: "RESOLVED" }, include: feedInclude, take: 20, orderBy: { resolvedAt: "desc" } });
  } else {
    const following = viewer ? await prisma.userFollow.findMany({ where: { followerId: viewer.id }, select: { followingId: true }, take: 100 }) : [];
    const followedIds = following.map((item) => item.followingId).filter((id) => !excluded.includes(id));
    if (followedIds.length) {
      const [followed, latest] = await Promise.all([
        prisma.report.findMany({ where: { ...commonWhere, userId: { in: followedIds } }, include: feedInclude, orderBy: { createdAt: "desc" }, take: 10 }),
        prisma.report.findMany({ where: commonWhere, include: feedInclude, orderBy: { createdAt: "desc" }, take: 20 }),
      ]);
      const unique = new Map([...followed, ...latest].map((post) => [post.id, post] as const));
      posts = [...unique.values()].slice(0, 20);
    } else {
      posts = await prisma.report.findMany({ where: commonWhere, include: feedInclude, take: 20, orderBy: { createdAt: "desc" } });
    }
  }
  const sets = await interactionSets(viewer?.id, posts.map((post) => post.id));
  const captions: Record<Tab, string> = {
    "untuk-anda": "Laporan dari akun yang diikuti dan informasi terbaru",
    populer: "Laporan yang paling banyak mendapat Up",
    ditangani: "Laporan yang ditugaskan atau sedang dikerjakan",
    selesai: "Laporan yang telah dinyatakan selesai",
  };
  return <main>
    <header className="feed-heading"><div><span className="feed-eyebrow"><Sparkles size={15}/> KOMUNITAS PEDULI LINGKUNGAN</span><h1>Beranda</h1></div><Link href={viewer ? "/reports/new" : "/login"} className="heading-pencil" aria-label="Buat laporan"><PenLine size={19}/></Link></header>
    <form action="/search" className="home-search"><Search size={19}/><input type="search" name="q" minLength={2} maxLength={80} placeholder="Cari laporan, kasus, atau nama teman..." aria-label="Cari laporan dan teman"/><button type="submit">Cari</button></form>
    <nav className="feed-tabs" aria-label="Filter Beranda">
      {tabs.map((item) => <Link key={item.key} href={item.key === "untuk-anda" ? "/" : `/?tab=${item.key}`} className={tab === item.key ? "selected" : ""} aria-current={tab === item.key ? "page" : undefined}>{item.label}</Link>)}
    </nav>
    <div className="composer-preview">{viewer ? <UserAvatar user={viewer}/> : <span className="avatar">W</span>}<div className="composer-body"><Link href={viewer ? "/reports/new" : "/login"} className="composer-prompt">Ada masalah lingkungan di sekitarmu?</Link><div className="composer-bottom"><span><ImagePlus size={19}/><MapPin size={19}/><small>Bagikan cerita dan bukti foto atau video</small></span><Link href={viewer ? "/reports/new" : "/login"}>Posting laporan</Link></div></div></div>
    <div className="feed-section-label">{captions[tab]}<span>{posts.length} laporan</span></div>
    <Feed posts={posts} viewerId={viewer?.id} liked={sets.liked} disliked={sets.disliked} saved={sets.saved}/>
    <div className="feed-more"><Link href="/reports">Jelajahi semua laporan →</Link></div>
  </main>;
}
