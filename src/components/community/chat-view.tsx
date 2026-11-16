"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Send, ShieldCheck } from "lucide-react";
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
type ReadReceipt = { id: string; readAt: string | null };

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
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef<string | null>(initialMessages.at(-1)?.createdAt ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const markRead = () => fetch(`/api/inbox/conversations/${conversationId}/read`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const suffix = latest.current ? `?after=${encodeURIComponent(latest.current)}` : "";
        const response = await fetch(`/api/inbox/conversations/${conversationId}/messages${suffix}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          messages?: ChatMessage[];
          readReceipts?: ReadReceipt[];
        };
        if (!active) return;

        const incoming = data.messages ?? [];
        const receipts = data.readReceipts ?? [];
        if (incoming.length || receipts.length) {
          setMessages((current) => {
            const byId = new Map<string, ChatMessage>(current.map((message) => [message.id, message] as const));
            let changed = false;

            for (const message of incoming) {
              const previous = byId.get(message.id);
              if (!previous || previous.readAt !== message.readAt) {
                byId.set(message.id, message);
                changed = true;
              }
            }
            for (const receipt of receipts) {
              const previous = byId.get(receipt.id);
              if (previous && previous.readAt !== receipt.readAt) {
                byId.set(receipt.id, { ...previous, readAt: receipt.readAt });
                changed = true;
              }
            }
            return changed
              ? [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              : current;
          });
        }

        const last = incoming[incoming.length - 1];
        if (last) {
          latest.current = last.createdAt;
          await markRead();
        }
      } catch {
        // Polling berikutnya mencoba kembali jika koneksi sementara terputus.
      }
    };

    void markRead();
    const timer = window.setInterval(poll, 6000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
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
                <small className="chat-message-meta">
                  {new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                  {mine && (message.readAt
                    ? <CheckCheck className="chat-read-check" size={15} aria-label="Pesan sudah dibaca" title="Dibaca" />
                    : <Check className="chat-sent-check" size={14} aria-label="Pesan terkirim" title="Terkirim" />)}
                </small>
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
