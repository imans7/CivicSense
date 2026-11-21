import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { excludedUserIds, blockedBetween } from "@/lib/social";
import { UserAvatar } from "@/components/community/user-avatar";
import { profileHandle } from "@/lib/profile";
export const dynamic = "force-dynamic";
export default async function FollowingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const profile = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  if (!profile || await blockedBetween(user?.id, id)) notFound();
  const excluded = await excludedUserIds(user?.id);
  const rows = await prisma.userFollow.findMany({ where: { followerId: id, following: { isActive: true, ...(excluded.length ? { id: { notIn: excluded } } : {}) } }, select: { following: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  return <main className="people-list-page"><header className="feed-heading"><div><h1>Mengikuti</h1><small>{profile.name} · Daftar akun terbaru</small></div></header>
    {rows.map(({ following }) => <Link className="search-person" href={`/users/${following.id}`} key={following.id}><UserAvatar user={following} link={false}/><span><strong>{following.name}</strong><small>{profileHandle(following)}</small></span></Link>)}
    {!rows.length && <p className="search-empty">Belum mengikuti siapa pun.</p>}
  </main>;
}
