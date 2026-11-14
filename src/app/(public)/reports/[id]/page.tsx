import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { interactionSets,feedInclude } from "@/lib/community";
import { PostCard } from "@/components/community/post-card";
import { UserAvatar } from "@/components/community/user-avatar";
import { CommentForm } from "@/components/community/comment-form";
import { STATUS_LABELS } from "@/lib/constants";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const user=await currentUser();const {id}=await params;
 const r=await prisma.report.findUnique({where:{id},include:{...feedInclude,histories:{include:{user:{select:{name:true}}},orderBy:{createdAt:"asc"}},comments:{include:{user:{select:{id:true,name:true,role:true,avatarUrl:true}}},orderBy:{createdAt:"asc"},take:100},assignedTo:{select:{name:true}}}});
 if(!r||(r.status==="REJECTED"&&user?.id!==r.userId&&user?.role!=="ADMIN"))notFound();
 const sets=await interactionSets(user?.id,[r.id]);
 return <main><header className="feed-heading detail-header"><Link href="/" aria-label="Kembali"><ArrowLeft size={22}/></Link><div><h1>Detail laporan</h1><small>{r.reportNumber}</small></div></header><PostCard post={r} loggedIn={Boolean(user)} initiallyLiked={sets.liked.has(r.id)} initiallyDisliked={sets.disliked.has(r.id)} initiallySaved={sets.saved.has(r.id)}/><div className="detail-context"><p><MapPin size={17}/> {r.address||"Lokasi tersimpan di sistem"}</p>{r.assignedTo&&<p>Petugas: {r.assignedTo.name}</p>}<p><Clock3 size={17}/> Diterbitkan {r.createdAt.toLocaleString("id-ID")}</p></div>
 <section id="diskusi" className="community-discussion"><h2><MessageCircle size={21}/> Diskusi warga <span>{r._count.comments}</span></h2>{user?<CommentForm reportId={r.id}/>:<p className="login-comment"><Link href="/login">Masuk</Link> untuk bergabung dalam diskusi.</p>}
 {r.comments.map(c=><div className="comment-item" key={c.id}><UserAvatar user={c.user} size="small"/><div><div className="post-meta"><Link href={`/users/${c.user.id}`} className="author-link">{c.user.name}</Link><span className="post-handle">· {c.createdAt.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span></div><p>{c.content}</p></div></div>)}{r.comments.length===0&&<p className="no-comments">Belum ada tanggapan. Mulai diskusi yang membangun!</p>}{r._count.comments>100&&<p className="no-comments">Menampilkan 100 komentar pertama.</p>}</section>
 <section className="community-history"><h2>Perkembangan penanganan</h2>{r.histories.map(h=><div key={h.id} className="history-item"><span className="history-dot"/><div><b>{STATUS_LABELS[h.newStatus]}</b><small>{h.createdAt.toLocaleString("id-ID")}</small><p>{h.note||"Status diperbarui"}</p></div></div>)}</section></main>;
}
