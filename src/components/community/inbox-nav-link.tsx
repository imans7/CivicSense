"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export function InboxNavLink({
  initialCount,
  mobile = false,
}: {
  initialCount: number;
  mobile?: boolean;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/inbox/unread-count", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (alive && typeof data.count === "number") setCount(data.count);
      } catch {
        // Badge tetap menampilkan hitungan terakhir jika jaringan terputus.
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const href = "/inbox";
  const label = count > 0 ? `Kotak Masuk, ${count} belum dibaca` : "Kotak Masuk";
  return (
    <Link
      href={href}
      className={mobile ? "mobile-community-nav-item mobile-inbox-link" : "nav-item inbox-nav-item"}
      aria-label={label}
      title={label}
    >
      <span className="inbox-nav-icon">
        <MessageSquare size={mobile ? 25 : 22} strokeWidth={1.9} />
        {count > 0 && <span className="inbox-count-badge">{count > 99 ? "99+" : count}</span>}
      </span>
      {mobile ? <span className="mobile-community-nav-label">Kotak Masuk</span> : <span>Kotak Masuk</span>}
    </Link>
  );
}
