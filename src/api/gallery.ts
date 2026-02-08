export type GalleryListItem = {
  postId: string;
  handId: string;
  title: string;
  authorTags: { fixed: string[]; free: string[] };
  viewerTags: { public: string[] };
  focusPoint: string | null;
  createdAt: string;
  handReplay?: any;
};

export type GalleryListResponse = { items: GalleryListItem[] };

export type GalleryDetail = {
  postId: string;
  title: string;
  authorTags: { fixed: string[]; free: string[] };
  viewerTags: { public: string[]; mine: string[] };
  focusPoint: string | null;
  handReplay: any;
  createdAt: string;
  isOwner: boolean;
  status?: string;
  privateNote?: string | null;
  metrics?: {
    likeCount: number;
    viewsTotal: number;
    viewsUnique: number;
    dwellMsTotal: number;
    dwellMsAvg: number;
  };
};

export type GalleryTags = {
  authorFixedTags: Array<{ key: string; label: string }>;
  viewerTags: Array<{ key: string; label: string }>;
  focusPoints: Array<{ key: string; label: string }>;
  lang?: string;
};

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {}
    const err = new Error(`HTTP ${res.status}`);
    (err as any).payload = payload ?? text;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

export async function getGalleryTags(apiBase: string) {
  return (await fetchJson(`${apiBase}/api/gallery/tags`)) as GalleryTags;
}

export async function listGalleryPosts(apiBase: string, params: { tag?: string; page?: number; limit?: number }) {
  const qp = new URLSearchParams();
  if (params.tag) qp.set("tag", params.tag);
  if (params.page) qp.set("page", String(params.page));
  if (params.limit) qp.set("limit", String(params.limit));
  const url = `${apiBase}/api/gallery/posts${qp.toString() ? `?${qp}` : ""}`;
  return (await fetchJson(url)) as GalleryListResponse;
}

export async function getGalleryDetail(apiBase: string, postId: string) {
  return (await fetchJson(`${apiBase}/api/gallery/posts/${postId}`)) as GalleryDetail;
}

export async function getGalleryByHand(apiBase: string, handId: string) {
  return (await fetchJson(`${apiBase}/api/gallery/posts/by-hand/${handId}`)) as { postId: string };
}

export async function createGalleryPost(
  apiBase: string,
  payload: {
    handId: string;
    title?: string;
    privateNote?: string;
    fixedTagKeys?: string[];
    freeTags?: string[];
    focusPoint?: string | null;
  }
) {
  return await fetchJson(`${apiBase}/api/gallery/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateGalleryPost(
  apiBase: string,
  postId: string,
  payload: {
    title?: string;
    privateNote?: string;
    fixedTagKeys?: string[];
    freeTags?: string[];
  }
) {
  return await fetchJson(`${apiBase}/api/gallery/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function withdrawGalleryPost(apiBase: string, postId: string) {
  return await fetchJson(`${apiBase}/api/gallery/posts/${postId}/withdraw`, { method: "POST" });
}

export async function likeGalleryPost(apiBase: string, postId: string) {
  return await fetchJson(`${apiBase}/api/gallery/posts/${postId}/like`, { method: "POST" });
}

export async function unlikeGalleryPost(apiBase: string, postId: string) {
  return await fetchJson(`${apiBase}/api/gallery/posts/${postId}/like`, { method: "DELETE" });
}

export async function updateViewerTags(apiBase: string, postId: string, tagKeys: string[]) {
  return await fetchJson(`${apiBase}/api/gallery/posts/${postId}/viewer-tags`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagKeys }),
  });
}

export async function viewStart(apiBase: string, postId: string, viewerAnonId?: string) {
  return (await fetchJson(`${apiBase}/api/gallery/posts/${postId}/view/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewerAnonId ? { viewerAnonId } : {}),
  })) as { viewSessionId: string };
}

export async function viewEnd(apiBase: string, postId: string, viewSessionId: string, dwellMs: number) {
  return await fetchJson(`${apiBase}/api/gallery/posts/${postId}/view/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ viewSessionId, dwellMs }),
  });
}
