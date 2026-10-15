// Google / Apple orqali kirish: provayder bergan ID token (JWT, RS256) ni tekshiradi. Tashqi kutubxonasiz (node:crypto).
// Client ID (audience) provayder konsolidan olinadi: GOOGLE_CLIENT_IDS (vergul bilan), APPLE_CLIENT_ID.
import { createPublicKey, createVerify, type JsonWebKey } from "node:crypto";

export interface OidcProvider { name: "google" | "apple"; issuers: string[]; jwksUrl: string; audiences: string[] }
export const GOOGLE = (audiences: string[]): OidcProvider => ({ name: "google", issuers: ["https://accounts.google.com", "accounts.google.com"], jwksUrl: "https://www.googleapis.com/oauth2/v3/certs", audiences });
export const APPLE = (audiences: string[]): OidcProvider => ({ name: "apple", issuers: ["https://appleid.apple.com"], jwksUrl: "https://appleid.apple.com/auth/keys", audiences });

type Jwk = JsonWebKey & { kid?: string; alg?: string };
export type FetchJwks = (url: string) => Promise<{ keys: Jwk[] }>;
const defaultFetch: FetchJwks = async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); if (!r.ok) throw new Error(`jwks_${r.status}`); return r.json() as Promise<{ keys: Jwk[] }>; };

const dec = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf-8"));

export class OidcVerifier {
  private cache = new Map<string, { keys: Jwk[]; at: number }>();
  constructor(private p: OidcProvider, private fetchJwks: FetchJwks = defaultFetch, private now: () => number = Date.now, private ttlMs = 3_600_000) {}
  private inflight: Promise<Jwk[]> | null = null; private lastForce = -Infinity;
  /** Kalitlar: 1 soat kesh. Noma'lum `kid` bilan majburiy yangilash — daqiqasiga bir martadan ko'p emas; bir vaqtdagi so'rovlar birlashtiriladi; yuklab bo'lmasa eski kesh ishlatiladi. */
  private async keys(force = false): Promise<Jwk[]> {
    const c = this.cache.get(this.p.jwksUrl); const t = this.now();
    if (c && !force && t - c.at < this.ttlMs) return c.keys;
    if (force && t - this.lastForce < 60_000) return c?.keys ?? [];
    if (force) this.lastForce = t;
    this.inflight ??= this.fetchJwks(this.p.jwksUrl).then((j) => { this.cache.set(this.p.jwksUrl, { keys: j.keys, at: this.now() }); return j.keys; })
      .catch(() => c?.keys ?? []).finally(() => { this.inflight = null; });
    return this.inflight;
  }
  /** Muvaffaqiyatda foydalanuvchining barqaror `sub` qiymati; aks holda null. Imzo, muddat, emitent va auditoriya tekshiriladi. */
  async verify(idToken: unknown): Promise<{ sub: string } | null> {
    if (typeof idToken !== "string" || idToken.length > 4096) return null;
    const parts = idToken.split("."); if (parts.length !== 3) return null;
    let header: any, claims: any;
    try { header = dec(parts[0]); claims = dec(parts[1]); } catch { return null; }
    if (!header || typeof header !== "object" || !claims || typeof claims !== "object") return null;
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null; // "none" va HS* hujumlari rad etiladi
    let jwk = (await this.keys().catch(() => [] as Jwk[])).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await this.keys(true).catch(() => [] as Jwk[])).find((k) => k.kid === header.kid); // kalit aylantirilgan bo'lishi mumkin
    if (!jwk) return null;
    try {
      const ok = createVerify("RSA-SHA256").update(`${parts[0]}.${parts[1]}`).verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"));
      if (!ok) return null;
    } catch { return null; }
    const t = Math.floor(this.now() / 1000);
    if (!this.p.issuers.includes(claims.iss)) return null;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.some((a: string) => this.p.audiences.includes(a))) return null;
    if (typeof claims.exp !== "number" || claims.exp <= t - 30) return null;
    if (typeof claims.iat === "number" && claims.iat > t + 300) return null;
    if (typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255) return null;
    return { sub: claims.sub };
  }
}
