"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, Heart, MapPin, MessageCircle, Share2, BadgeCheck, ThumbsDown } from "lucide-react";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { PriorityLevel, ReportStatus, Role } from "@prisma/client";
import { UserAvatar } from "@/components/community/user-avatar";

type Post = {
  id: string; reportNumber: string; title: string; description: string; address: string | null;
  status: ReportStatus; priorityLevel: PriorityLevel; createdAt: Date | string;
  user: { id: string; name: string; role: Role; avatarUrl: string | null }; category: { name: string };
  images: { imageUrl: string }[]; videos: { videoUrl: string; durationSeconds: number; mimeType: string }[];
  _count: { comments: number; likes: number; dislikes: number };
};
export function PostCard({ post, loggedIn, initiallyLiked = false, initiallyDisliked = false, initiallySaved = false }: {
  post: Post; loggedIn: boolean; initiallyLiked?: boolean; initiallyDisliked?: boolean; initiallySaved?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initiallyLiked);
  const [disliked, setDisliked] = useState(initiallyDisliked);
  const [saved, setSaved] = useState(initiallySaved);
  const [likes, setLikes] = useState(post._count.likes);
  const [dislikes, setDislikes] = useState(post._count.dislikes);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function toggle(kind: "like" | "dislike" | "bookmark") {
    if (!loggedIn) { router.push("/login"); return; }
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/community/${post.id}/${kind}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan interaksi");
      if (kind === "like") { setLiked(data.active); if (data.active) setDisliked(false); setLikes(data.likes); setDislikes(data.dislikes); }
      else if (kind === "dislike") { setDisliked(data.active); if (data.active) setLiked(false); setLikes(data.likes); setDislikes(data.dislikes); }
      else setSaved(data.active);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Terjadi kesalahan"); }
    finally { setBusy(false); }
  }
  async function share() {
    const url = `${window.location.origin}/reports/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title, url });
      else { await navigator.clipboard.writeText(url); setNotice("Tautan berhasil disalin"); }
    } catch { setNotice("Tidak dapat membagikan tautan"); }
  }
  const date = new Date(post.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return <article className="community-post">
    <UserAvatar user={post.user} />
    <div className="post-main">
      <div className="post-meta">
        <Link className="author-link" href={`/users/${post.user.id}`}>{post.user.name}</Link>
        {post.user.role !== "PUBLIC" && <BadgeCheck size={16} className="verified-icon" aria-label="Akun petugas resmi" />}
        <span className="post-handle">· {date}</span>
      </div>
      <div className="post-topic">{post.category.name} <span>·</span> {post.reportNumber}</div>
      <Link className="post-link" href={`/reports/${post.id}`}><h2>{post.title}</h2><p className="post-description">{post.description}</p></Link>
      {post.address && <div className="post-location"><MapPin size={15}/><span>{post.address}</span></div>}
      {post.images.length > 0 && <Link href={`/reports/${post.id}`} className={`post-photos count-${Math.min(post.images.length, 4)}`}>
        {post.images.map((im, i) => <img key={i} src={im.imageUrl} alt={`Foto laporan ${i + 1}`} loading="lazy" />)}
      </Link>}
      {post.videos?.length > 0 && <div className="post-videos">
        {post.videos.map((video) => <div className="post-video-frame" key={video.videoUrl}>
          <video src={video.videoUrl} controls playsInline preload="none" aria-label={`Video bukti laporan ${post.reportNumber}`} />
          <span className="post-video-duration">{Math.ceil(video.durationSeconds)} detik</span>
        </div>)}
      </div>}
      <div className="post-badges"><span className={`status-pill status-${post.status.toLowerCase()}`}><i/>{STATUS_LABELS[post.status]}</span><span className="priority-pill">Prioritas {PRIORITY_LABELS[post.priorityLevel]}</span></div>
      <div className="post-actions">
        <Link href={`/reports/${post.id}#diskusi`} title="Komentar" className="post-action"><MessageCircle size={19}/><span>{post._count.comments}</span></Link>
        <button type="button" className={`post-action ${liked ? "active-like" : ""}`} onClick={() => toggle("like")} disabled={busy} aria-label={liked ? "Batalkan like" : "Like laporan"} aria-pressed={liked}><Heart size={19} fill={liked ? "currentColor" : "none"}/><span>{likes}</span></button>
        <button type="button" className={`post-action ${disliked ? "active-dislike" : ""}`} onClick={() => toggle("dislike")} disabled={busy} aria-label={disliked ? "Batalkan dislike" : "Dislike laporan"} aria-pressed={disliked}><ThumbsDown size={18} fill={disliked ? "currentColor" : "none"}/><span>{dislikes}</span></button>
        <button type="button" className="post-action" onClick={share} aria-label="Bagikan laporan"><Share2 size={19}/><span className="action-word">Bagikan</span></button>
        <button type="button" className={`post-action bookmark-action ${saved ? "active-save" : ""}`} onClick={() => toggle("bookmark")} disabled={busy} aria-label={saved ? "Hapus dari tersimpan" : "Simpan laporan"} aria-pressed={saved}><Bookmark size={19} fill={saved ? "currentColor" : "none"}/></button>
      </div>
      {notice && <p className="post-notice" role="status">{notice}</p>}
    </div>
  </article>;
}
