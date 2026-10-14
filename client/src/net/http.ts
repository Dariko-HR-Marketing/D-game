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

export const DELETE_WORD = "O'CHIRISH";
export const validName = (n: string) => n.trim().length >= 2 && n.trim().length <= 24 && !/[<>]/.test(n);
export const validYear = (y: string, now = new Date().getFullYear()) => /^\d{4}$/.test(y) && Number(y) >= 1900 && Number(y) <= now;
export const isUnder16 = (y: string, now = new Date().getFullYear()) => validYear(y, now) && now - Number(y) < 16;
