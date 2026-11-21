import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { excludedUserIds, blockedBetween } from "@/lib/social";
import { UserAvatar } from "@/components/community/user-avatar";
import { profileHandle } from "@/lib/profile";
export const dynamic = "force-dynamic";
export default async function FollowersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const profile = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  if (!profile || await blockedBetween(user?.id, id)) notFound();
  const excluded = await excludedUserIds(user?.id);
  const rows = await prisma.userFollow.findMany({ where: { followingId: id, follower: { isActive: true, ...(excluded.length ? { id: { notIn: excluded } } : {}) } }, select: { follower: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  return <main className="people-list-page"><header className="feed-heading"><div><h1>Pengikut</h1><small>{profile.name} · Daftar pengikut terbaru</small></div></header>
    {rows.map(({ follower }) => <Link className="search-person" href={`/users/${follower.id}`} key={follower.id}><UserAvatar user={follower} link={false}/><span><strong>{follower.name}</strong><small>{profileHandle(follower)}</small></span></Link>)}
    {!rows.length && <p className="search-empty">Belum ada pengikut.</p>}
  </main>;
}
