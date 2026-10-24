// Ovozli aloqa (WebRTC): server faqat signalizatsiya va «kim ovozda» holatini yuritadi; audio o'yinchilar o'rtasida to'g'ridan-to'g'ri (P2P) o'tadi va serverda saqlanmaydi.
// ICE (STUN/TURN) sozlamasi muhit o'zgaruvchisida: `ICE_SERVERS` = JSON massiv ([{"urls":"turn:host:3478","username":"…","credential":"…"}]). Bo'sh bo'lsa ommaviy STUN (faqat manzilni aniqlaydi).
export interface IceServer { urls: string | string[]; username?: string; credential?: string }
export const DEFAULT_ICE: IceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

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
