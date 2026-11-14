"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle } from "lucide-react";

export function StartConversationButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/inbox/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      const data = (await response.json()) as { conversationId?: string; error?: string };
      if (!response.ok || !data.conversationId) throw new Error(data.error || "Percakapan gagal dibuka");
      router.push(`/inbox/${data.conversationId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat membuka pesan");
      setBusy(false);
    }
  }

  return (
    <div className="start-conversation-wrap">
      <button type="button" className="message-profile-button" onClick={start} disabled={busy}>
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <MessageCircle size={16} />}
        {busy ? "Membuka..." : "Kirim pesan"}
      </button>
      {error && <small role="alert" className="logout-error">{error}</small>}
    </div>
  );
}
