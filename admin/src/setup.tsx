import React, { useEffect, useState } from "react";
import type { Api } from "./api";

type Item = { k: string; title: string; why: string; ok: boolean | null; go?: string; goLabel?: string };
const ping = async (api: Api, path: string) => { try { return await api.get(path); } catch { return null; } };

/** Ishga tushirish ro'yxati: nima sozlangan, nima qolgan. Faqat o'qiydi, hech narsani o'zgartirmaydi. */
export function SetupList({ api, perms, me, today, go }: { api: Api; perms: string[]; me: any; today: any; go: (k: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null); const [hide, setHide] = useState(() => { try { return localStorage.getItem("setup-hide") === "1"; } catch { return false; } });
  useEffect(() => { let live = true; (async () => {
    const out: Item[] = [{ k: "2fa", title: "Ikki bosqichli tasdiq (2FA) yoqilgan", why: "Parol o'g'irlansa ham panelga kirib bo'lmaydi.", ok: !!me?.account?.totpEnabled, go: "me", goLabel: "Sozlash" }];
    if (perms.includes("commerce.read")) { const p = await ping(api, "/admin/finance/provider"); const c = await ping(api, "/admin/shop/config"); out.push({ k: "pay", title: "To'lov provayderi ulangan", why: "Payme/Click ulanmaguncha xaridlar ishlamaydi.", ok: p ? !!p.paymentsReady : null, go: "shop", goLabel: "Tekshirish" });
      const cfg = c?.config ?? c; out.push({ k: "price", title: "Paket narxlari kiritilgan", why: "Bo'sh narx = sotuv yopiq.", ok: cfg ? cfg.plusMonthly != null && cfg.plusYearly != null : null, go: "shop", goLabel: "Narxlar" }); }
    if (perms.includes("system.read")) { const h = await ping(api, "/admin/system/health"); out.push({ k: "sms", title: "SMS yuborish ishlayapti", why: "Kirish kodlari SMS bilan boradi.", ok: h ? h.sms.last24h.failed === 0 : null, go: "system", goLabel: "Salomatlik" }, { k: "backup", title: "Zaxira nusxa kuzatiladi", why: "Baza yo'qolsa tiklash uchun.", ok: h ? !!h.backup?.configured : null, go: "system", goLabel: "Ko'rish" }); }
    if (perms.includes("analytics.read")) out.push({ k: "game", title: "Birinchi o'yin o'ynalgan", why: "Test hisobi bilan o'zingiz o'ynab ko'ring.", ok: today ? today.games > 0 : null, go: "testmode", goLabel: "Test hisob" });
    if (live) setItems(out); })(); return () => { live = false; }; }, [api, perms, me, today]);
  if (!items || hide) return hide ? <button className="link" onClick={() => { try { localStorage.removeItem("setup-hide"); } catch { /* ixtiyoriy */ } setHide(false); }}>Ishga tushirish ro'yxatini ko'rsatish</button> : null;
  const done = items.filter((i) => i.ok).length; if (done === items.length) return null;
  return (<section className="card" aria-labelledby="su"><h2 id="su">Ishga tushirish ro'yxati <span className="muted" style={{ fontSize: 14, fontWeight: 700 }}>{done}/{items.length}</span></h2><p className="sub">Panelni ishlatishdan oldin shularni tekshiring. Tayyor bo'lgach ro'yxat o'zi yo'qoladi.</p>
    <ol className="steps">{items.map((i, n) => <li key={i.k} className={i.ok ? "done" : ""}><span className="n" aria-hidden>{i.ok ? "✓" : n + 1}</span><span className="t"><b>{i.title}{i.ok ? " — tayyor" : i.ok === null ? " — aniqlanmadi" : ""}</b><span>{i.why}</span></span>{!i.ok && i.go && <button className="sm" onClick={() => go(i.go!)}>{i.goLabel ?? "Ochish"}</button>}</li>)}</ol>
    <p style={{ margin: "12px 0 0" }}><button className="link" onClick={() => { try { localStorage.setItem("setup-hide", "1"); } catch { /* ixtiyoriy */ } setHide(true); }}>Bu ro'yxatni yashirish</button></p></section>);
}
