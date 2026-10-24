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
    /** Shikoyat (chat xabari va h.k.): `against` — o'yinchi ID si, `room` — xona kodi, `text` — nima bo'lgani. */
    complain: (against: string | null, room: string | null, text: string) => call("POST", "/complaints", { against, room, text }),
    /** Ovozli aloqa: STUN/TURN ro'yxati (server sozlamasidan). */
    voiceConfig: () => call("GET", "/voice/config") as Promise<{ iceServers: RTCIceServer[] }>,
    profile: () => call("GET", "/me/profile"), saveProfile: (p: { name: string; color: number; birthYear: number; gender?: "m" | "f" | null }) => call("PUT", "/me/profile", p),
    uploadAvatar: (image: string) => call("PUT", "/me/avatar", { image }) as Promise<{ photo: string }>, removeAvatar: () => call("DELETE", "/me/avatar"),
    devSeats: (code: string) => call("GET", `/dev/seats/${encodeURIComponent(code)}`) as Promise<{ seats: { userId: string; name: string | null; online: boolean }[] }>,
    active: () => call("GET", "/me/active") as Promise<{ active: { code: string; started: boolean; round: number; players: number } | null }>, history: () => call("GET", "/me/history"), analysis: (code: string) => call("GET", `/me/games/${code}/analysis`), gameLog: (code: string) => call("GET", `/me/games/${code}/log`),
    report: (code: string) => call("GET", `/me/games/${code}/report`), reportCsv: async (code: string) => { const r = await f(base + `/me/games/${code}/report?format=csv`, { headers: { authorization: `Bearer ${token}` } }); if (!r.ok) throw new HttpError(r.status, "unknown"); return r.text(); },
    gameLogCsv: async (code: string) => { const r = await f(base + `/me/games/${code}/log?format=csv`, { headers: { authorization: `Bearer ${token}` } }); if (!r.ok) throw new HttpError(r.status, "unknown"); return r.text(); }, leaderboard: () => call("GET", "/leaderboard"), exportData: () => call("GET", "/me/export"),
    announcements: () => call("GET", "/me/announcements"), status: () => call("GET", "/status"),
    account: () => call("GET", "/me/account"), phoneRequest: (phone: string) => call("POST", "/me/phone/request", { phone }), phoneVerify: (phone: string, code: string) => call("POST", "/me/phone/verify", { phone, code }),
    shop: () => call("GET", "/shop"), order: (sku: string, parentPhone?: string) => call("POST", "/shop/order", { sku, channel: "web", ...(parentPhone ? { parentPhone } : {}) }), orderGet: (id: string) => call("GET", `/shop/orders/${id}`),
    orderCancel: (id: string) => call("POST", `/shop/orders/${id}/cancel`, {}), orderResend: (id: string) => call("POST", `/shop/orders/${id}/resend`, {}), devPay: (id: string) => call("POST", `/dev/pay/${id}`, {}),
    equip: (kind: string, itemId: string | null) => call("POST", "/shop/equip", { kind, itemId }), claimMonthly: (itemId: string) => call("POST", "/shop/plus/claim", { itemId }), cancelPlus: () => call("POST", "/shop/plus/cancel", {}), restore: () => call("POST", "/shop/restore", {}),
    eduMe: () => call("GET", "/edu/me"), eduRedeem: (code: string) => call("POST", "/edu/redeem", { code }), eduJoin: (code: string) => call("POST", "/edu/join", { code }), eduLeave: (id: string) => call("POST", `/edu/classes/${id}/leave`, {}),
    classes: () => call("GET", "/edu/classes"), classCreate: (name: string) => call("POST", "/edu/classes", { name }), classGet: (id: string) => call("GET", `/edu/classes/${id}`), classCode: (id: string) => call("POST", `/edu/classes/${id}/code`, {}),
    classRoom: (id: string) => call("POST", `/edu/classes/${id}/room`, {}), classConsent: (id: string, uid: string, consent: boolean) => call("POST", `/edu/classes/${id}/students/${uid}/consent`, { consent }),
    classKick: (id: string, uid: string) => call("DELETE", `/edu/classes/${id}/students/${uid}`), assignAdd: (id: string, a: { title: string; kind: string; target: number }) => call("POST", `/edu/classes/${id}/assignments`, a), assignDel: (id: string, aid: string) => call("DELETE", `/edu/classes/${id}/assignments/${aid}`),
    classCsv: async (id: string) => { const r = await f(base + `/edu/classes/${id}/report.csv`, { headers: { authorization: `Bearer ${token}` } }); if (!r.ok) throw new HttpError(r.status, "unknown"); return r.text(); },
    tournaments: () => call("GET", "/tournaments"), tournament: (id: string) => call("GET", `/tournaments/${id}`), tRegister: (id: string, parentPhone?: string) => call("POST", `/tournaments/${id}/register`, parentPhone ? { parentPhone } : {}), tUnregister: (id: string) => call("POST", `/tournaments/${id}/unregister`, {}), tRoom: (id: string) => call("POST", `/tournaments/${id}/room`, {}),
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
