import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/components/community/user-avatar";
import { UnblockButton } from "@/components/community/unblock-button";
export const dynamic = "force-dynamic";
export default async function BlockedPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const blocks = await prisma.userBlock.findMany({ where: { blockerId: user.id }, orderBy: { createdAt: "desc" }, select: { blocked: { select: { id: true, name: true, avatarUrl: true } } }, take: 100 });
  return <main className="people-list-page"><header className="feed-heading"><div><span className="feed-eyebrow"><Ban size={16}/> PRIVASI</span><h1>Akun yang diblokir</h1></div></header>
    <p className="search-empty">Akun yang diblokir tidak dapat mengirim pesan pribadi atau mengikuti Anda. Anda dapat membatalkan blokir kapan saja.</p>
    {blocks.map(({ blocked }) => <div className="blocked-person" key={blocked.id}><Link href={`/users/${blocked.id}`} className="search-person"><UserAvatar user={blocked} link={false}/><span><strong>{blocked.name}</strong></span></Link><UnblockButton userId={blocked.id}/></div>)}
    {!blocks.length && <p className="search-empty">Tidak ada akun yang diblokir.</p>}
  </main>;
}
