import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { http } from "./api";

/** Polls the notification unread count for the navbar badge (refreshed every minute). */
export function useUnreadCount(): number {
  const { authenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!authenticated) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      http
        .get<{ count: number }>("/api/notifications/unread-count")
        .then((data) => {
          if (!cancelled) setCount(data.count || 0);
        })
        .catch(() => {
          /* the badge is non-critical */
        });
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authenticated]);

  return count;
}