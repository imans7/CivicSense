import Link from "next/link";
import { Bookmark } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { feedInclude,feedViewer,interactionSets } from "@/lib/community";
import { Feed } from "@/components/community/feed";
export const dynamic="force-dynamic";
export default async function Saved(){const viewer=await feedViewer();if(!viewer)return <main><header className="feed-heading"><h1>Tersimpan</h1></header><div className="empty-community"><Bookmark/><b>Simpan laporan penting</b><p>Masuk untuk melihat koleksi laporan yang kamu simpan.</p><Link href="/login">Masuk akun</Link></div></main>;
 const saved=await prisma.reportBookmark.findMany({where:{userId:viewer.id,report:{status:{not:"REJECTED"}}},include:{report:{include:feedInclude}},orderBy:{createdAt:"desc"},take:100});const posts=saved.map(s=>s.report);const sets=await interactionSets(viewer.id,posts.map(p=>p.id));return <main><header className="feed-heading"><div><span className="feed-eyebrow"><Bookmark size={15}/> KOLEKSI PRIBADI</span><h1>Tersimpan</h1></div></header><div className="feed-section-label">Laporan yang kamu simpan<span>{posts.length} laporan</span></div><Feed posts={posts} viewerId={viewer.id} liked={sets.liked} disliked={sets.disliked} saved={sets.saved}/></main>;
}
