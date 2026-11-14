import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { feedInclude,feedViewer,interactionSets } from "@/lib/community";
import { Feed } from "@/components/community/feed";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{q?:string;page?:string;category?:string}>}){
 const s=await searchParams;const page=Math.max(1,Math.min(1000,Number(s.page)||1));const q=(s.q||"").slice(0,100);const category=(s.category||"").slice(0,100);
 const where={status:{not:"REJECTED" as const},...(q?{OR:[{title:{contains:q,mode:"insensitive" as const}},{description:{contains:q,mode:"insensitive" as const}},{reportNumber:{contains:q,mode:"insensitive" as const}}]}:{}),...(category?{categoryId:category}:{})};
 const [viewer,posts,count,categories]=await Promise.all([feedViewer(),prisma.report.findMany({where,include:feedInclude,orderBy:{createdAt:"desc"},take:15,skip:(page-1)*15}),prisma.report.count({where}),prisma.category.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{id:true,name:true}})]);
 const sets=await interactionSets(viewer?.id,posts.map(p=>p.id));const path=(n:number)=>`/reports?${new URLSearchParams({page:String(n),q,category})}`;
 return <main><header className="feed-heading"><div><span className="feed-eyebrow"><SlidersHorizontal size={15}/> TELUSURI KOMUNITAS</span><h1>Jelajahi</h1></div><Link href="/reports/new" className="heading-pencil">+</Link></header><form action="/reports" className="explore-filter"><div className="explore-search"><Search size={18}/><input name="q" defaultValue={q} placeholder="Cari isu, lokasi, atau laporan" aria-label="Pencarian"/></div><select aria-label="Kategori" name="category" defaultValue={category}><option value="">Semua topik</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><button type="submit">Cari</button></form><div className="feed-section-label">{q?`Hasil pencarian “${q}”`:"Semua laporan warga"}<span>{count} laporan</span></div><Feed posts={posts} viewerId={viewer?.id} liked={sets.liked} disliked={sets.disliked} saved={sets.saved}/><div className="pagination">{page>1&&<Link href={path(page-1)}>← Sebelumnya</Link>}{page*15<count&&<Link href={path(page+1)}>Berikutnya →</Link>}</div></main>;
}
