import Link from "next/link";
import { ImagePlus, MapPin, PenLine, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { feedInclude, feedViewer, interactionSets } from "@/lib/community";
import { UserAvatar } from "@/components/community/user-avatar";
import { Feed } from "@/components/community/feed";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const {tab}=await searchParams;const viewer=await feedViewer();const recent=tab!=="populer";
 const posts=await prisma.report.findMany({where:{status:{not:"REJECTED"}},include:feedInclude,take:20,orderBy:recent?{createdAt:"desc"}:{likes:{_count:"desc"}}});
 const sets=await interactionSets(viewer?.id,posts.map(p=>p.id));
 return <main><header className="feed-heading"><div><span className="feed-eyebrow"><Sparkles size={15}/> KOMUNITAS PEDULI LINGKUNGAN</span><h1>Beranda</h1></div><Link href="/reports/new" className="heading-pencil" title="Buat laporan"><PenLine size={19}/></Link></header>
 <div className="feed-tabs"><Link href="/" className={recent?"selected":""}>Untuk Anda</Link><Link href="/?tab=populer" className={!recent?"selected":""}>Populer</Link></div>
 <div className="composer-preview">{viewer ? <UserAvatar user={viewer}/> : <span className="avatar">W</span>}<div className="composer-body"><Link href={viewer?"/reports/new":"/login"} className="composer-prompt">Ada masalah lingkungan di sekitarmu?</Link><div className="composer-bottom"><span><ImagePlus size={19}/><MapPin size={19}/><small>Bagikan cerita dan bukti foto</small></span><Link href={viewer?"/reports/new":"/login"}>Posting laporan</Link></div></div></div>
 <div className="feed-section-label">{recent?"Laporan terbaru dari warga":"Laporan paling didukung"}<span>{posts.length} postingan</span></div><Feed posts={posts} viewerId={viewer?.id} liked={sets.liked} disliked={sets.disliked} saved={sets.saved}/><div className="feed-more"><Link href="/reports">Jelajahi semua laporan →</Link></div></main>;
}
