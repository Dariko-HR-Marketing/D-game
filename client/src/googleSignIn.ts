/** Google bilan kirish (veb): Google Identity Services. Faqat `EXPO_PUBLIC_GOOGLE_CLIENT_ID` berilgan va server `/auth/config` da `google: true` bo'lsa yoqiladi;
 *  aks holda kirish sahifasida «tez orada» ko'rsatiladi. Server `idToken` ni o'zi tekshiradi (docs/AUTH.md). */
export const GOOGLE_CLIENT_ID: string = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SRC = "https://accounts.google.com/gsi/client";
let loading: Promise<any> | null = null;
export function loadGis(doc: Document | undefined = (globalThis as any).document): Promise<any> {
  const g = (globalThis as any).google; if (g?.accounts?.id) return Promise.resolve(g);
  if (!doc) return Promise.reject(new Error("no_document"));
  if (!loading) loading = new Promise((res, rej) => { const s = doc.createElement("script"); s.src = SRC; s.async = true; s.onload = () => res((globalThis as any).google); s.onerror = () => { loading = null; rej(new Error("gis_load")); }; doc.head.appendChild(s); });
  return loading;
}
export const googleEnabled = (serverGoogle: boolean | undefined, clientId: string = GOOGLE_CLIENT_ID) => !!clientId && !!serverGoogle;
