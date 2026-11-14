import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, PenLine } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { feedInclude, interactionSets } from "@/lib/community";
import { Feed } from "@/components/community/feed";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser(); if (!user) redirect("/login");
  const posts = await prisma.report.findMany({ where: { userId: user.id }, include: feedInclude, orderBy: { createdAt: "desc" }, take: 50 });
  const sets = await interactionSets(user.id, posts.map(p => p.id));
  return <main><header className="feed-heading"><div><span className="feed-eyebrow"><ClipboardList size={15}/> ARSIP KONTRIBUSI</span><h1>Laporan saya</h1></div><Link href="/reports/new" className="heading-pencil" aria-label="Buat laporan"><PenLine size={18}/></Link></header>
    <div className="feed-section-label">Laporan yang kamu kirim<span>{posts.length} terbaru</span></div>
    <Feed posts={posts} viewerId={user.id} liked={sets.liked} disliked={sets.disliked} saved={sets.saved}/>
  </main>;
}
