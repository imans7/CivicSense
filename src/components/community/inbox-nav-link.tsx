"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useInboxCount } from "@/components/community/inbox-count-provider";

export function InboxNavLink({ mobile = false }: { mobile?: boolean }) {
  const count = useInboxCount();
  const label = count > 0 ? `Kotak Masuk, ${count} belum dibaca` : "Kotak Masuk";

  return (
    <Link
      href="/inbox"
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
