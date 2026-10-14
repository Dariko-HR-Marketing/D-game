export const API = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";
export class ApiError extends Error { constructor(public status: number, public body: any) { super(body?.error ?? String(status)); } }

export function makeApi(token: string, base = API, f: typeof fetch = fetch) {
  const call = async (method: string, path: string, body?: unknown) => {
    const r = await f(base + path, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(r.status, j);
    return j;
  };
  return { get: (p: string) => call("GET", p), post: (p: string, b?: unknown) => call("POST", p, b ?? {}) };
}
export type Api = ReturnType<typeof makeApi>;

/** Rol bo'yicha ko'rinadigan bo'limlar (server baribir tekshiradi; bu faqat UX). */
export const SECTIONS: Record<string, string[]> = {
  administrator: ["content", "rooms", "users", "complaints", "analytics", "audit"],
  content_editor: ["content"], support: ["rooms", "users", "complaints"], analyst: ["analytics", "rooms"],
};
