export function getViewerAnonId(): string {
  if (typeof window === "undefined") return "";
  const key = "dd_viewer_anon_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() ?? `anon-${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(key, id);
  return id;
}
