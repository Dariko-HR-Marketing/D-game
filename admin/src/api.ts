export const API = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";
export class ApiError extends Error { constructor(public status: number, public body: any) { super(body?.error ?? String(status)); } }

export function makeApi(token: string, base = API, f: typeof fetch = fetch) {
  const call = async (method: string, path: string, body?: unknown) => {
    const r = await f(base + path, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(r.status, j);
    return j;
  };
  const text = async (p: string) => { const r = await f(base + p, { headers: { authorization: `Bearer ${token}` } }); if (!r.ok) throw new ApiError(r.status, await r.json().catch(() => ({}))); return r.text(); };
  return { text, get: (p: string) => call("GET", p), post: (p: string, b?: unknown) => call("POST", p, b ?? {}), delete: (p: string, b?: unknown) => call("DELETE", p, b) };
}
export type Api = ReturnType<typeof makeApi>;

/** Bo'limlar: ruxsat bo'yicha ko'rinadi (server baribir tekshiradi; bu faqat UX). `any` — kamida bittasi yetarli. */
export interface NavItem { key: string; group: string; any: string[] }
export const NAV: NavItem[] = [
  { key: "dashboard", group: "Kuzatuv", any: ["rooms.read", "analytics.read", "commerce.read", "complaints.manage", "edu.manage", "tournaments.manage", "system.read"] },
  { key: "live", group: "Kuzatuv", any: ["rooms.read"] }, { key: "rooms", group: "Kuzatuv", any: ["rooms.read"] }, { key: "analytics", group: "Kuzatuv", any: ["analytics.read"] },
  { key: "users", group: "Odamlar", any: ["users.read"] }, { key: "complaints", group: "Odamlar", any: ["complaints.manage"] }, { key: "testmode", group: "Odamlar", any: ["users.manage"] }, { key: "gate", group: "Odamlar", any: ["users.manage"] }, { key: "consent", group: "Odamlar", any: ["users.read"] },
  { key: "content", group: "O'yin mazmuni", any: ["content.read"] }, { key: "dreams", group: "O'yin mazmuni", any: ["content.read"] }, { key: "cells", group: "O'yin mazmuni", any: ["content.read"] },
  { key: "shop", group: "Tijorat", any: ["commerce.read"] }, { key: "edu", group: "Tijorat", any: ["edu.manage"] }, { key: "tournaments", group: "Tijorat", any: ["tournaments.manage"] }, { key: "announce", group: "Tijorat", any: ["announce.manage"] },
  { key: "system", group: "Tizim", any: ["system.read", "flags.manage"] }, { key: "accounts", group: "Tizim", any: ["accounts.manage"] }, { key: "audit", group: "Tizim", any: ["audit.read"] },
];
export const sectionsFor = (perms: string[]) => NAV.filter((n) => n.any.some((p) => perms.includes(p)));
