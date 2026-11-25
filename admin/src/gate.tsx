import React, { useState } from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, FormDialog, PageHead, Pill, Tile, errText, fmtTime, useLoad } from "./lib";

type Plat = { on: boolean; missing: string[]; webhook?: string | null };
type G = { enabled: boolean; platforms: string[]; blocked: { total: number; telegram: number; instagram: number; youtube: number }; since: number;
  linked: { telegram: number; instagram: number }; verified: Record<string, number>; all: number; total: number;
  health: { telegramWebhook?: { ok: boolean; at: number; error?: string }; instagramRefresh?: { ok: boolean; at: number; error?: string } };
  setup: { telegram: Plat; instagram: Plat; youtube: Plat; apiUrlSet: boolean; minAge: number; ttlDays: number; recheckMin: number };
  exemptions: { id: string; by: string; at: number; reason: string }[] };
const NAMES: Record<string, string> = { telegram: "Telegram (kanal + chatbot)", instagram: "Instagram", youtube: "YouTube" };
const HOW: Record<string, string> = {
  telegram: "O'yinchi botda «Start» bosadi va kanalga obuna bo'ladi. Har o'yin boshlashdan oldin server obunani Telegramdan jonli tekshiradi.",
  instagram: "O'yinchi sahifamizga obuna bo'lib, kodni xabar qilib yuboradi. Har o'yin boshlashdan oldin jonli tekshiriladi; token 30 kunda o'zi yangilanadi.",
  youtube: "O'yinchi Google ruxsatini beradi, server obunani tekshiradi (token saqlanmaydi). Shuning uchun faqat muddat tugagach qayta so'raladi. Faqat veb-versiyada.",
};
export function Gate({ api }: { api: Api }) {
  const l = useLoad<G>(api, "/admin/gate"); const [dlg, setDlg] = useState<"add" | "del" | null>(null); const [uid, setUid] = useState(""); const [msg, setMsg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const g = l.data;
  const run = async (path: string, body: unknown, ok: string) => { setErr(null); try { const r: any = await api.post(path, body); if (r.error) throw new Error(errText({ body: { error: r.error } } as any)); setMsg(ok); l.reload(); } catch (e) { setErr((e as Error).message); } };
  return (<>
    <PageHead title="Obuna darvozasi" />
    <Err e={l.err} /><Err e={err} />{msg && <Banner kind="good">{msg}</Banner>}
    {!g ? <Empty loading={l.loading} /> : <>
      <Banner kind={g.enabled ? "good" : "info"}>{g.enabled ? `Darvoza yoqilgan: ${g.platforms.map((p) => NAMES[p]).join(", ")}. Obunasiz kattalar o'yin ocholmaydi va qo'shila olmaydi.` : "Darvoza o'chiq: hech platforma sozlanmagan, hech kim to'silmaydi. Pastdagi ro'yxatdan nima yetishmasligini ko'ring."} 16 yoshgacha darvoza qo'llanmaydi (hozir {g.setup.minAge} dan kichiklar).</Banner>
      <section className="card"><h2>Natijalar</h2><div className="stats">
        <Tile l="To'silgan urinishlar" v={g.blocked.total} hint={`Server ishga tushgandan beri (${fmtTime(g.since)}): obunasiz o'yin ochmoqchi/qo'shilmoqchi bo'lganlar soni.`} />
        <Tile l="Hamma obunani tasdiqlagan" v={g.all} hint="Barcha yoqilgan platformalarda amaldagi tasdig'i bor hisoblar." />
        {g.platforms.map((p) => <Tile key={p} l={NAMES[p].split(" ")[0]} v={g.verified[p] ?? 0} hint={`Tasdig'i amal qilayotgan hisoblar. To'silgan: ${(g.blocked as any)[p]}.`} />)}
      </div></section>
      <section className="card"><h2>Platformalar</h2>
        {(["telegram", "instagram", "youtube"] as const).map((p) => { const s = g.setup[p]; return (<div key={p} style={{ padding: "10px 0", borderTop: "1px solid var(--line, #e4e8ec)" }}>
          <b>{NAMES[p]}</b> <Pill kind={s.on ? "good" : "plain"}>{s.on ? "yoqilgan" : "o'chiq"}</Pill>
          <div className="sub">{HOW[p]}</div>
          {!s.on && <div className="sub">Yetishmaydigan sozlamalar: <span className="mono">{s.missing.join(", ")}</span></div>}
          {s.webhook && s.on && <div className="sub">Webhook manzili: <span className="mono">{s.webhook}</span></div>}
          {p === "telegram" && s.on && g.health.telegramWebhook && <div className="sub">Webhook: {g.health.telegramWebhook.ok ? <Pill kind="good">ulangan</Pill> : <Pill kind="bad">xato: {g.health.telegramWebhook.error}</Pill>} · {fmtTime(g.health.telegramWebhook.at)}</div>}
          {p === "telegram" && s.on && !g.setup.apiUrlSet && <div className="sub">Webhook'ni o'zi ulashi uchun <span className="mono">GATE_PUBLIC_API_URL</span> (server manzili) kerak.</div>}
          {p === "instagram" && s.on && g.health.instagramRefresh && <div className="sub">Token yangilash: {g.health.instagramRefresh.ok ? <Pill kind="good">muvaffaqiyatli</Pill> : <Pill kind="bad">xato: {g.health.instagramRefresh.error}</Pill>} · {fmtTime(g.health.instagramRefresh.at)}</div>}
        </div>); })}
        <div className="row" style={{ marginTop: 12 }}><button onClick={() => run("/admin/gate/maintain", {}, "Webhook va token qayta tekshirildi.")}>Webhook va tokenni qayta tekshirish</button></div>
        <div className="sub">Qoidalar: tasdiq muddati {g.setup.ttlDays} kun (YouTube), Telegram/Instagram har boshlashda qayta tekshiriladi (kesh {g.setup.recheckMin} daqiqa). Sozlamalar serverning muhit o'zgaruvchilarida, bu yerda o'zgarmaydi.</div>
      </section>
      <section className="card"><h2>Ozod qilingan hisoblar</h2>
        <div className="sub">Sinov va QA hisoblari uchun: ular obunasiz ham o'ynay oladi. Har bir ozod qilish auditga yoziladi.</div>
        {!g.exemptions.length ? <Empty loading={false} /> : <div className="tw" tabIndex={0} role="region" aria-label="Ozod qilinganlar"><table><thead><tr><th>Hisob</th><th>Sabab</th><th>Kim</th><th>Qachon</th><th></th></tr></thead><tbody>
          {g.exemptions.map((x) => <tr key={x.id}><td className="mono">{x.id}</td><td>{x.reason || "—"}</td><td className="mono">{x.by}</td><td>{fmtTime(x.at)}</td><td><button className="d" onClick={() => { setUid(x.id); setDlg("del"); }}>Olib tashlash</button></td></tr>)}</tbody></table></div>}
        <div className="row"><button className="p" onClick={() => { setUid(""); setDlg("add"); }}>Hisobni ozod qilish</button></div>
      </section>
      <section className="card"><h2>Yoqish tartibi</h2><ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
        <li>Telegram: bot yarating, kanalga administrator qiling, 4 ta sozlamani serverga kiriting — webhook o'zi ulanadi.</li>
        <li>Instagram va YouTube: Meta/Google tekshiruvlari o'tgach shu tartibda yoqiladi.</li>
        <li>Yoqishdan oldin o'zingizning hisobingizni ozod qilib, boshqa hisob bilan jarayonni sinab ko'ring.</li>
        <li>Muammo bo'lsa: platforma sozlamasini bo'shatish darvozani shu platforma uchun o'chiradi.</li></ol></section>
    </>}
    <FormDialog open={dlg === "add"} title="Hisobni ozod qilish" body="Hisob ID sini Foydalanuvchilar bo'limidan oling." onClose={() => setDlg(null)} fields={[{ key: "userId", label: "Hisob ID", required: true }, { key: "reason", label: "Sabab", required: true }]} onOk={async (v) => { await run("/admin/gate/exempt", { userId: v.userId, reason: v.reason }, "Hisob ozod qilindi."); setDlg(null); }} />
    <FormDialog open={dlg === "del"} title="Ozod qilishni bekor qilish" danger body={`${uid} endi obuna bo'lishi kerak.`} onClose={() => setDlg(null)} fields={[{ key: "reason", label: "Sabab", required: true }]} onOk={async (v) => { await run("/admin/gate/unexempt", { userId: uid, reason: v.reason }, "Ozod qilish bekor qilindi."); setDlg(null); }} />
  </>);
}
