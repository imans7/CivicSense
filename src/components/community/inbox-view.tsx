"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageCircle, MessageSquare, ShieldCheck } from "lucide-react";
import { UserAvatar } from "@/components/community/user-avatar";

type InboxNotification = {
  id: string;
  createdAt: string;
  readAt: string | null;
  actor: { id: string; name: string; role: "PUBLIC" | "OFFICER" | "ADMIN"; avatarUrl: string | null };
  report: { id: string; title: string; reportNumber: string };
  comment: { content: string };
};

type InboxConversation = {
  id: string;
  updatedAt: string;
  otherUser: { id: string; name: string; role: "PUBLIC" | "OFFICER" | "ADMIN"; avatarUrl: string | null };
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
};

function timeLabel(value: string) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Baru saja";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function InboxView({
  notifications,
  conversations,
  currentUserId,
}: {
  notifications: InboxNotification[];
  conversations: InboxConversation[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"Aktivitas" | "Pesan">("Aktivitas");
  const [items, setItems] = useState(notifications);
  const activityUnread = items.filter((item) => !item.readAt).length;
  const messageUnread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 12000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  useEffect(() => {
    if (tab !== "Aktivitas" || !items.some((item) => !item.readAt)) return;
    fetch("/api/inbox/notifications/read", { method: "POST", credentials: "same-origin" })
      .then((response) => {
        if (response.ok) setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      })
      .catch(() => undefined);
  }, [tab, items]);

  async function openNotification(item: InboxNotification) {
    if (!item.readAt) {
      await fetch(`/api/inbox/notifications/${item.id}/read`, { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    }
    router.push(`/reports/${item.report.id}#diskusi`);
  }

  return (
    <section className="inbox-view">
      <header className="inbox-heading">
        <div>
          <span className="feed-eyebrow"><MessageSquare size={15} /> RUANG KOMUNIKASI</span>
          <h1>Kotak Masuk</h1>
          <p>Notifikasi aktivitas dan percakapan pribadi Anda.</p>
        </div>
      </header>

      <div className="inbox-tabs" role="tablist" aria-label="Jenis kotak masuk">
        <button type="button" role="tab" aria-selected={tab === "Aktivitas"} className={tab === "Aktivitas" ? "selected" : ""} onClick={() => setTab("Aktivitas")}>
          <Bell size={17} /> Aktivitas
          {activityUnread > 0 && <span className="inbox-tab-count">{activityUnread > 99 ? "99+" : activityUnread}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === "Pesan"} className={tab === "Pesan" ? "selected" : ""} onClick={() => setTab("Pesan")}>
          <MessageCircle size={17} /> Pesan
          {messageUnread > 0 && <span className="inbox-tab-count">{messageUnread > 99 ? "99+" : messageUnread}</span>}
        </button>
      </div>

      {tab === "Aktivitas" ? (
        <div className="inbox-list">
          {items.map((item) => (
            <button type="button" key={item.id} className={`notification-row ${!item.readAt ? "is-unread" : ""}`} onClick={() => openNotification(item)}>
              <UserAvatar user={item.actor} size="normal" link={false} />
              <span className="notification-copy">
                <span className="notification-title"><b>{item.actor.name}</b> mengomentari laporan Anda</span>
                <span className="notification-preview">“{item.comment.content}”</span>
                <span className="notification-context" suppressHydrationWarning>{item.report.title} · {timeLabel(item.createdAt)}</span>
              </span>
              {!item.readAt && <span className="notification-unread-dot" aria-label="Belum dibaca" />}
              <MessageCircle size={18} className="notification-type-icon" />
            </button>
          ))}
          {items.length === 0 && <div className="inbox-empty"><Bell size={30} /><b>Belum ada aktivitas</b><p>Jika seseorang mengomentari laporan Anda, notifikasinya akan muncul di sini.</p></div>}
        </div>
      ) : (
        <div className="inbox-list">
          {conversations.map((conversation) => (
            <Link href={`/inbox/${conversation.id}`} key={conversation.id} className={`conversation-row ${conversation.unreadCount > 0 ? "is-unread" : ""}`}>
              <UserAvatar user={conversation.otherUser} size="large" link={false} />
              <span className="conversation-copy">
                <span className="conversation-name">{conversation.otherUser.name}{conversation.otherUser.role !== "PUBLIC" && <ShieldCheck size={14} className="verified-icon" />}</span>
                <span className="conversation-preview">{conversation.lastMessage ? `${conversation.lastMessage.senderId === currentUserId ? "Anda: " : ""}${conversation.lastMessage.content}` : "Mulai percakapan pribadi"}</span>
                <span className="conversation-time" suppressHydrationWarning>{conversation.lastMessage ? timeLabel(conversation.lastMessage.createdAt) : "Percakapan baru"}</span>
              </span>
              {conversation.unreadCount > 0 && <span className="conversation-unread-badge">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>}
            </Link>
          ))}
          {conversations.length === 0 && <div className="inbox-empty"><MessageCircle size={30} /><b>Belum ada pesan</b><p>Kunjungi profil warga, petugas, atau admin untuk memulai percakapan pribadi.</p></div>}
        </div>
      )}
    </section>
  );
}
