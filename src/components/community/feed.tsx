import { PostCard } from "@/components/community/post-card";
import type { PriorityLevel, ReportStatus, Role } from "@prisma/client";
type Post = {
  id: string; reportNumber: string; title: string; description: string; address: string | null;
  status: ReportStatus; priorityLevel: PriorityLevel; createdAt: Date;
  user: { id: string; name: string; role: Role; avatarUrl: string | null };
  category: { name: string }; images: { imageUrl: string }[];
  videos: { videoUrl: string; durationSeconds: number; mimeType: string }[];
  _count: { comments: number; likes: number; dislikes: number };
};
export function Feed({ posts, viewerId, liked, disliked, saved }: { posts: Post[]; viewerId?: string; liked: Set<string>; disliked: Set<string>; saved: Set<string> }) {
  return <div>{posts.map(p => <PostCard key={p.id} post={p} loggedIn={Boolean(viewerId)} initiallyLiked={liked.has(p.id)} initiallyDisliked={disliked.has(p.id)} initiallySaved={saved.has(p.id)}/>)}
    {posts.length === 0 && <div className="empty-community"><b>Belum ada laporan di sini</b><p>Belum ada laporan untuk ditampilkan.</p></div>}
  </div>;
}
