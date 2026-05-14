"use client";

// ============================================================
// useUnreadChat — total-unread DM count for the dashboard
// nav badge.
//
// Fetches /api/chat/unread on mount and re-fetches every time
// any direct_messages row is inserted or updated (read_at flip).
// The realtime subscription is global (not row-filtered) but
// the API is a single indexed COUNT so refetch is cheap.
//
// Returns 0 until the first fetch resolves so the nav doesn't
// flash a placeholder badge.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function useUnreadChat(): number {
  const [total, setTotal] = useState(0);

  const fetchTotal = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/unread");
      if (!res.ok) return;
      const json = (await res.json()) as { total?: number };
      setTotal(typeof json.total === "number" ? json.total : 0);
    } catch {
      // Best-effort — ignore network blips. Realtime will retry.
    }
  }, []);

  useEffect(() => {
    fetchTotal();

    const channel = supabase
      .channel("dashboard-chat-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => fetchTotal()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_messages" },
        () => fetchTotal()
      )
      .subscribe();

    // Also refresh when the tab becomes visible — covers the case
    // where realtime missed an event while the tab was backgrounded.
    function onVisible() {
      if (document.visibilityState === "visible") fetchTotal();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      void supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchTotal]);

  return total;
}
