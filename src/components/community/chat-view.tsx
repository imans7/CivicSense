"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { UserAvatar } from "@/components/community/user-avatar";

type ChatUser = { id: string; name: string; role: "PUBLIC" | "OFFICER" | "ADMIN"; avatarUrl: string | null };
type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  senderId: string;
  sender: { id: string; name: string; avatarUrl: string | null };
};

export function ChatView({
  conversationId,
  currentUserId,
  otherUser,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  otherUser: ChatUser;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef<string | null>(initialMessages.at(-1)?.createdAt ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const markRead = () => fetch(`/api/inbox/conversations/${conversationId}/read`, { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    const poll = async () => {
      try {
        const suffix = latest.current ? `?after=${encodeURIComponent(latest.current)}` : "";
        const response = await fetch(`/api/inbox/conversations/${conversationId}/messages${suffix}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { messages: ChatMessage[] };
        if (!active || !data.messages?.length) return;
        setMessages((current) => {
          const byId = new Map<string, ChatMessage>(current.map((message) => [message.id, message] as const));
          for (const message of data.messages) byId.set(message.id, message);
          return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        const last = data.messages[data.messages.length - 1];
        if (last) latest.current = last.createdAt;
        await markRead();
      } catch {
        // Polling berikutnya akan mencoba kembali jika koneksi sementara terputus.
      }
    };
    void markRead();
    const timer = window.setInterval(poll, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content: text }),
      });
      const data = (await response.json()) as { message?: ChatMessage; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || "Pesan gagal dikirim");
      const sentMessage = data.message;
      setMessages((current) => current.some((item) => item.id === sentMessage.id) ? current : [...current, sentMessage]);
      latest.current = sentMessage.createdAt;
      setContent("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Terjadi kesalahan saat mengirim pesan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat-page">
      <header className="chat-header">
        <Link href="/inbox" aria-label="Kembali ke kotak masuk"><ArrowLeft size={21} /></Link>
        <UserAvatar user={otherUser} size="normal" />
        <div className="chat-person">
          <Link href={`/users/${otherUser.id}`}>{otherUser.name}</Link>
          <small>{otherUser.role === "ADMIN" ? "Administrator" : otherUser.role === "OFFICER" ? "Petugas terverifikasi" : "Warga komunitas"}</small>
        </div>
        {otherUser.role !== "PUBLIC" && <ShieldCheck size={17} className="verified-icon" />}
      </header>

      <div className="chat-privacy-note"><ShieldCheck size={15} /> Percakapan ini bersifat pribadi dan hanya dapat dilihat oleh kedua peserta.</div>

      <div className="chat-messages">
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return (
            <div key={message.id} className={`chat-message-row ${mine ? "mine" : "theirs"}`}>
              {!mine && <UserAvatar user={message.sender} size="small" />}
              <div className={`chat-bubble ${mine ? "chat-bubble-mine" : "chat-bubble-theirs"}`}>
                <p>{message.content}</p>
                <small>{new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}{mine && message.readAt ? " · Dibaca" : ""}</small>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <div className="chat-first-message"><b>Mulai percakapan dengan {otherUser.name}</b><p>Sampaikan pesan dengan sopan dan tetap jaga privasi.</p></div>}
        <div ref={bottomRef} />
      </div>

      <form className="chat-composer" onSubmit={sendMessage}>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={1} placeholder="Tulis pesan pribadi..." aria-label="Tulis pesan" />
        <button type="submit" disabled={busy || !content.trim()} aria-label="Kirim pesan">{busy ? <span className="chat-send-loading">…</span> : <Send size={19} />}</button>
        {error && <p className="chat-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
