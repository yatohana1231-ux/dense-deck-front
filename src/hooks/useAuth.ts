import { useEffect, useState, useCallback } from "react";

export type AuthUser = {
  userId: string;
  isGuest: boolean;
  username: string;
  usernameChanged?: boolean;
  email?: string | null;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE ?? "";

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as AuthUser;
        setUser(data);
        return true;
      }
    } catch (e) {
      console.warn("auth/me failed", e);
    }
    return false;
  }, [apiBase]);

  const ensureGuest = useCallback(async () => {
    const ok = await fetchMe();
    if (ok) {
      setReady(true);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/auth/guest`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as AuthUser;
        setUser(data);
      }
    } catch (e) {
      console.warn("auth/guest failed", e);
    } finally {
      setReady(true);
    }
  }, [apiBase, fetchMe]);

  useEffect(() => {
    ensureGuest();
  }, [ensureGuest]);

  const logout = async () => {
    try {
      await fetch(`${apiBase}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    setUser(null);
    setReady(false);
    await ensureGuest();
  };

  return { user, ready, refresh: fetchMe, logout };
}
