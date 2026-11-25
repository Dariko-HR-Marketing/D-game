import React, { useState } from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, Field, FormDialog, PageHead, Pill, errText, fmtTime, useLoad } from "./lib";

type U = { userId: string; name: string | null; plan: string; plusUntil: number | null; premiumUntil: number | null; coupons: number; org: { name: string; until: number; seats: number | null; active: boolean; test: boolean } | null; testOrders: number };
const KINDS: [string, string][] = [["full", "Hammasi (Premium + Plus + 5 kupon + Tashkilot)"], ["premium", "Premium"], ["plus", "Plus"], ["coupons", "5 ta bitta o'yin kuponi"], ["org", "Tashkilot (o'qituvchi/sinf litsenziyasi)"]];
const GUIDE: [string, string][] = [
  ["Premium", "Cheksiz o'yin, o'yin tahlili va maslahatlar, Premium ko'rinishlar, klublar. O'yinchi: Profil → Paketlar bo'limida «Premium» belgisi."],
  ["Plus", "Kengaytirilgan chegara (kuniga 3, haftasiga 10, oyiga 30 o'yin), o'yin tarixi va ko'rinishlar."],
  ["Kupon", "Bitta o'yin uchun: chegara tugagan bo'lsa ham o'yin boshlanadi. Har o'yin boshlanganda bittasi sarflanadi."],
  ["Tashkilot", "Hisob o'qituvchi bo'ladi: sinf ochadi, o'quvchilarni taklif kodi bilan qo'shadi, hisobotni ko'radi. «Joylar» — o'quvchi soni."],
  ["Qaytarib olish", "«Sinovni qaytarish» faqat shu yerdan berilgan huquqlarni oladi. Haqiqiy to'lov bilan olingan paketga tegmaydi."],
];
const pretty = (u: U) => <dl className="kv"><dt>Hisob</dt><dd>{u.name ?? "—"} <span className="mono">{u.userId}</span></dd>
  <dt>Paket</dt><dd><Pill kind={u.plan === "start" ? "plain" : "good"}>{u.plan === "premium" ? "Premium" : u.plan === "plus" ? "Plus" : "Start (bepul)"}</Pill></dd>
  <dt>Plus</dt><dd>{u.plusUntil && u.plusUntil > Date.now() ? `${fmtTime(u.plusUntil)} gacha` : "—"}</dd>
  <dt>Premium</dt><dd>{u.premiumUntil && u.premiumUntil > Date.now() ? `${fmtTime(u.premiumUntil)} gacha` : "—"}</dd>
  <dt>Kuponlar</dt><dd>{u.coupons}</dd>
  <dt>Tashkilot</dt><dd>{u.org ? <>{u.org.name} · {u.org.active ? `${fmtTime(u.org.until)} gacha` : "faol emas"} · joylar: {u.org.seats ?? "cheksiz"}{u.org.test && <> <Pill kind="info">sinov</Pill></>}</> : "—"}</dd>
  <dt>Sinov buyurtmalari</dt><dd>{u.testOrders}</dd></dl>;

export function TestMode({ api }: { api: Api }) {
  const [phone, setPhone] = useState(""); const [uid, setUid] = useState(""); const [u, setU] = useState<U | null>(null); const [err, setErr] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null); const [dlg, setDlg] = useState<"grant" | "revoke" | null>(null);
  const list = useLoad<{ users: U[]; error?: string }>(api, "/admin/test/list");
  const find = async (e?: React.FormEvent, id?: string) => { e?.preventDefault(); setErr(null); setMsg(null); try { const r: any = await api.post("/admin/test/lookup", id ? { userId: id } : phone.trim() ? { phone } : { userId: uid }); if (r.error) { setU(null); setErr(errText({ body: { error: r.error } } as any)); } else { setU(r.user); if (!id) setPhone(""); } } catch (x) { setErr(errText(x)); } };
  const done = (r: any, text: string) => { if (r.error) throw new Error(errText({ body: { error: r.error } } as any)); setU(r.user); setMsg(text); setDlg(null); list.reload(); };
  return (<>
    <PageHead title="Test hisoblar" />
    {list.data?.error === "test_off" && <Banner kind="warn">Sinov vositasi serverda o'chirilgan (ADMIN_TEST_TOOLS=0).</Banner>}
    <Banner kind="info">Bu bo'lim faqat sinov uchun: istalgan hisobga paketni vaqtincha ochadi. To'lov olinmaydi, daromad hisobotiga kirmaydi. Hamma amal sabab bilan auditga yoziladi; telefon raqami yozilmaydi.</Banner>
    <section className="card"><h2>1. Hisobni toping</h2>
      <form className="row" onSubmit={find}><Field label="Telefon raqami" hint="+998 bilan, hisob telefon orqali kirgan bo'lishi kerak"><input inputMode="tel" autoComplete="off" placeholder="+998 90 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="yoki hisob ID" hint="Foydalanuvchilar bo'limidan"><input autoComplete="off" value={uid} onChange={(e) => setUid(e.target.value)} className="mono" /></Field>
        <button className="p" disabled={!phone.trim() && !uid.trim()}>Topish</button></form>
      <Err e={err} />
    </section>
    {u && <section className="card"><h2>2. Holat va amallar</h2>{msg && <Banner kind="good">{msg}</Banner>}{pretty(u)}
      <div className="row"><button className="p" onClick={() => setDlg("grant")}>Paket ochish</button><button className="d" disabled={!u.testOrders && !u.org?.test} onClick={() => setDlg("revoke")}>Sinovni qaytarish</button><button onClick={() => find(undefined, u.userId)}>Yangilash</button></div></section>}
    <section className="card"><h2>Faol sinov hisoblari</h2><Err e={list.err} />{!list.data?.users?.length ? <Empty loading={list.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Hisob</th><th>Paket</th><th>Tashkilot</th><th></th></tr></thead><tbody>{list.data.users.map((x) => <tr key={x.userId}><td><b>{x.name ?? "—"}</b><div className="mono">{x.userId}</div></td><td>{x.plan}</td><td>{x.org?.test ? `${x.org.name} (${fmtTime(x.org.until)} gacha)` : "—"}</td><td><button className="sm" onClick={() => find(undefined, x.userId)}>Ochish</button></td></tr>)}</tbody></table></div>}</section>
    <section className="card"><h2>Yo'riqnoma</h2><ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
      <li>Test qiladigan odam ilovaga o'z raqami bilan kirsin (SMS kod) va ismini kiritsin — hisob shunda paydo bo'ladi.</li>
      <li>Shu yerda raqamni yozing → «Topish» → «Paket ochish». Paketni, muddatni (30 yoki 365 kun) va sababni tanlang.</li>
      <li>Ilovada sahifani yangilang (yoki qayta kiring): paket, o'yin chegarasi va imkoniyatlar yangilanadi.</li>
      <li>Boshqa paketni sinash uchun avval «Sinovni qaytarish», so'ng kerakli paketni oching.</li>
    </ol><dl className="kv">{GUIDE.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl></section>
    <FormDialog open={dlg === "grant"} title="Paket ochish" body="To'lovsiz, faqat sinov uchun." onClose={() => setDlg(null)} fields={[{ key: "kind", label: "Paket", type: "select", options: KINDS }, { key: "days", label: "Muddat", type: "select", options: [["30", "30 kun"], ["365", "365 kun"]] }, { key: "seats", label: "Tashkilot joylari (faqat Tashkilot)", type: "number", init: "100" }, { key: "reason", label: "Sabab", required: true, hint: "Auditga yoziladi" }]} onOk={async (v) => done(await api.post("/admin/test/grant", { userId: u!.userId, kind: v.kind, days: Number(v.days), seats: Number(v.seats || 100), reason: v.reason }), "Paket ochildi.")} />
    <FormDialog open={dlg === "revoke"} title="Sinovni qaytarish" danger body="Faqat shu yerdan berilgan huquqlar olinadi." onClose={() => setDlg(null)} fields={[{ key: "reason", label: "Sabab", required: true }]} onOk={async (v) => done(await api.post("/admin/test/revoke", { userId: u!.userId, reason: v.reason }), "Sinov huquqlari qaytarildi.")} />
  </>);
}
