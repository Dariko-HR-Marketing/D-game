import { loadGis } from "../googleSignIn";
const GOOGLE_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
/** Google ruxsati (faqat veb): youtube.readonly — obunani tekshirish uchun; token serverga bir martaga yuboriladi, saqlanmaydi. */
export async function googleToken(): Promise<string> {
  if (GOOGLE_CLIENT_ID) await loadGis().catch(() => {});
  return new Promise((res, rej) => {
    const g = (globalThis as any).google; if (!g?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) return rej(new Error("web_only"));
    g.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: "https://www.googleapis.com/auth/youtube.readonly", callback: (r: any) => r?.access_token ? res(r.access_token) : rej(new Error("denied")) }).requestAccessToken();
  });
}
