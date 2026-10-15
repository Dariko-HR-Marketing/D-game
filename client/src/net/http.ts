/** Server HTTP API: WS manzilidan hosil qilinadi (ws→http). */
export const httpBase = (wsUrl: string) => wsUrl.replace(/^ws(s?):/, "http$1:");
export class HttpError extends Error { constructor(public status: number, public code: string) { super(code); } }

export function makeHttp(base: string, token: string, f: typeof fetch = fetch) {
  const call = async (method: string, path: string, body?: unknown) => {
    const r = await f(base + path, { method, headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new HttpError(r.status, (j as any).error ?? "unknown");
    return j as any;
  };
  return {
    profile: () => call("GET", "/me/profile"), saveProfile: (p: { name: string; color: number; birthYear: number }) => call("PUT", "/me/profile", p),
    history: () => call("GET", "/me/history"), analysis: (code: string) => call("GET", `/me/games/${code}/analysis`), leaderboard: () => call("GET", "/leaderboard"), exportData: () => call("GET", "/me/export"),
    deleteAccount: (confirm: string) => call("DELETE", "/me", { confirm }),
  };
}
export type Http = ReturnType<typeof makeHttp>;

/** Kirish (SMS bir martalik kod): tokensiz chaqiriladi. */
export function makeAuth(base: string, f: typeof fetch = fetch) {
  const post = async (path: string, body: unknown) => {
    const r = await f(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new HttpError(r.status, (j as any).error ?? "unknown");
    return j as any;
  };
  return {
    config: async (): Promise<{ sms: boolean; dev: boolean }> => { const r = await f(base + "/auth/config"); if (!r.ok) throw new HttpError(r.status, "unknown"); return r.json(); },
    request: (phone: string) => post("/auth/sms/request", { phone }),
    verify: (phone: string, code: string): Promise<{ token: string; userId: string }> => post("/auth/sms/verify", { phone, code }),
  };
}
export const validPhone = (v: string) => /^\+?\d{9,15}$/.test(v.replace(/[\s()-]/g, ""));
export const validCode = (v: string) => /^\d{6}$/.test(v.trim());

export const DELETE_WORD = "O'CHIRISH";
/** Apostrof variantlari va registr farqi hisobga olinmaydi (server ham shunday tekshiradi) */
export const sameWord = (a: string, b: string = DELETE_WORD) => { const n = (v: string) => v.normalize("NFKC").replace(/[’ʻʼ‘`´]/g, "'").trim().toUpperCase(); return n(a) === n(b); };
export const validName = (n: string) => n.trim().length >= 2 && n.trim().length <= 24 && !/[<>]/.test(n);
export const validYear = (y: string, now = new Date().getFullYear()) => /^\d{4}$/.test(y) && Number(y) >= 1900 && Number(y) <= now;
export const isUnder16 = (y: string, now = new Date().getFullYear()) => validYear(y, now) && now - Number(y) < 16;
