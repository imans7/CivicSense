"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserRoundCheck, Ban, Undo2, LoaderCircle } from "lucide-react";
import { StartConversationButton } from "@/components/community/start-conversation-button";

export function FollowBlockControls({ userId, initiallyFollowing, initiallyBlocked, initialFollowerCount }: {
  userId: string;
  initiallyFollowing: boolean;
  initiallyBlocked: boolean;
  initialFollowerCount: number;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [followers, setFollowers] = useState(initialFollowerCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function follow() {
    if (busy || blocked) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/follow`, { method: following ? "DELETE" : "POST", credentials: "same-origin" });
      const data = await response.json() as { following?: boolean; followers?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "Gagal mengubah status mengikuti");
      setFollowing(Boolean(data.following));
      if (typeof data.followers === "number") setFollowers(data.followers);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tidak dapat mengikuti pengguna"); }
    finally { setBusy(false); }
  }

  async function block() {
    if (busy) return;
    if (!blocked && !window.confirm("Blokir akun ini? Kalian tidak bisa saling mengikuti, melihat aktivitas sosial, atau berkirim pesan pribadi.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/block`, { method: blocked ? "DELETE" : "POST", credentials: "same-origin" });
      const data = await response.json() as { blocked?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Gagal mengubah status blokir");
      setBlocked(Boolean(data.blocked));
      if (data.blocked && following) { setFollowing(false); setFollowers((n) => Math.max(0, n - 1)); }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tidak dapat mengubah blokir"); }
    finally { setBusy(false); }
  }

  return <div className="follow-block-controls">
    {!blocked && <>
      <button type="button" className={`social-action-button follow-action ${following ? "is-following" : ""}`} onClick={follow} disabled={busy} aria-pressed={following}>
        {busy ? <LoaderCircle size={16} className="animate-spin"/> : following ? <UserRoundCheck size={16}/> : <UserPlus size={16}/>}
        {following ? "Mengikuti" : "Ikuti"}
      </button>
      <StartConversationButton userId={userId}/>
    </>}
    <button type="button" className={`social-action-button ${blocked ? "unblock-action" : "block-action"}`} onClick={block} disabled={busy}>
      {blocked ? <Undo2 size={16}/> : <Ban size={16}/>}{blocked ? "Buka blokir" : "Blokir"}
    </button>
    <span className="sr-only" aria-live="polite">{followers} pengikut</span>
    {error && <small role="alert" className="social-error">{error}</small>}
  </div>;
}
