// Ovozli aloqa (WebRTC): server faqat signalizatsiya va «kim ovozda» holatini yuritadi; audio o'yinchilar o'rtasida to'g'ridan-to'g'ri (P2P) o'tadi va serverda saqlanmaydi.
// ICE (STUN/TURN) sozlamasi muhit o'zgaruvchisida: `ICE_SERVERS` = JSON massiv ([{"urls":"turn:host:3478","username":"…","credential":"…"}]). Bo'sh bo'lsa ommaviy STUN (faqat manzilni aniqlaydi).
export interface IceServer { urls: string | string[]; username?: string; credential?: string }
export const DEFAULT_ICE: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

import { createHmac } from "node:crypto";

/** TURN (coturn `use-auth-secret`): har so'rovda vaqtinchalik hisob (REST/HMAC). `TURN_URLS` (vergul bilan: turn:/turns:), `TURN_SECRET`, `TURN_TTL_S` (standart 3600).
 *  Doimiy parol mijozga berilmaydi: username = «tugash_vaqti:foydalanuvchi», credential = base64(HMAC-SHA1(secret, username)). Sozlama yo'q yoki noto'g'ri bo'lsa — `null` (faqat STUN). */
export function turnServerFor(env: Record<string, string | undefined>, uid: string, nowMs: number = Date.now()): IceServer | null {
  const secret = env.TURN_SECRET ?? "", urls = (env.TURN_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (secret.length < 16 || !urls.length || urls.length > 4 || !urls.every((u) => /^(turn|turns):[^\s]{1,200}$/i.test(u))) return null;
  const ttl = Math.min(86_400, Math.max(300, Number(env.TURN_TTL_S) || 3600)), username = `${Math.floor(nowMs / 1000) + ttl}:${uid.replace(/[^\w.-]/g, "_").slice(0, 64)}`;
  return { urls: urls.length === 1 ? urls[0] : urls, username, credential: createHmac("sha1", secret).update(username).digest("base64") };
}

/** `ICE_SERVERS` ni tekshirib o'qiydi; noto'g'ri bo'lsa standart (server qulamasin). */
export function iceServersFrom(raw: string | undefined): IceServer[] {
  if (!raw?.trim()) return DEFAULT_ICE;
  try {
    const j = JSON.parse(raw); if (!Array.isArray(j) || j.length === 0 || j.length > 8) return DEFAULT_ICE;
    const ok = (u: unknown) => typeof u === "string" && /^(stun|stuns|turn|turns):[^\s]{1,200}$/i.test(u);
    const out: IceServer[] = [];
    for (const s of j) {
      const urls = Array.isArray(s?.urls) ? s.urls : [s?.urls]; if (!urls.length || !urls.every(ok)) return DEFAULT_ICE;
      out.push({ urls: Array.isArray(s.urls) ? s.urls : s.urls, ...(typeof s.username === "string" ? { username: s.username.slice(0, 200) } : {}), ...(typeof s.credential === "string" ? { credential: s.credential.slice(0, 200) } : {}) });
    }
    return out;
  } catch { return DEFAULT_ICE; }
}
