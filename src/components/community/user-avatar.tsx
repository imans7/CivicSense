import Link from "next/link";

type BasicUser = { id: string; name: string; avatarUrl?: string | null };
export function UserAvatar({ user, size = "normal", link = true }: { user: BasicUser; size?: "normal" | "small" | "large" | "xl"; link?: boolean }) {
  const className = `avatar user-avatar avatar-${size}`;
  const content = user.avatarUrl
    ? <img src={user.avatarUrl} alt={`Foto profil ${user.name}`} className="user-avatar-image" loading="lazy" />
    : <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>;
  if (!link) return <span className={className}>{content}</span>;
  return <Link href={`/users/${user.id}`} className={className} aria-label={`Lihat profil ${user.name}`}>{content}</Link>;
}
