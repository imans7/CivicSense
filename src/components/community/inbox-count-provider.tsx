"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const InboxCountContext = createContext<{ count: number } | null>(null);
const REFRESH_EVENT = "civicsense:inbox-refresh";

export function requestInboxCountRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}

export function InboxCountProvider({
  initialCount,
  enabled,
  children,
}: {
  initialCount: number;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  const inFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const refresh = useCallback(async () => {
    if (!enabled || document.visibilityState !== "visible" || inFlight.current) return;

    inFlight.current = true;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/inbox/unread-count", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data = (await response.json()) as { count?: number };
      if (typeof data.count === "number" && Number.isFinite(data.count)) {
        setCount(Math.max(0, data.count));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        // Keep the last known count while the network is unavailable.
      }
    } finally {
      inFlight.current = false;
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onRequestedRefresh = () => void refresh();
    const timer = window.setInterval(() => void refresh(), 45000);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(REFRESH_EVENT, onRequestedRefresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(REFRESH_EVENT, onRequestedRefresh);
      abortRef.current?.abort();
    };
  }, [enabled, refresh]);

  return <InboxCountContext.Provider value={{ count }}>{children}</InboxCountContext.Provider>;
}

export function useInboxCount() {
  const context = useContext(InboxCountContext);
  if (!context) {
    throw new Error("useInboxCount harus digunakan di dalam InboxCountProvider");
  }
  return context.count;
}
