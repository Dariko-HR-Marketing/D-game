// Moliya: hisobot, buyurtmalar (qo'lda amallar, qaytarish), katalog, narxlar, to'lov provayderi, sozlama tarixi.
import React, { useEffect, useState } from "react";
import type { Api } from "./api";
import { Banner, Bars, Empty, Err, Field, FormDialog, PageHead, Pill, Tabs, csv, download, errText, fmtTime, money, num, useLoad } from "./lib";
import { t } from "./uz";

const ST: Record<string, [string, "good" | "bad" | "warn" | "info" | "plain"]> = { paid: ["To'langan", "good"], pending_payment: ["To'lov kutilmoqda", "warn"], pending_parent: ["Ota-ona roziligi", "info"], cancelled: ["Bekor", "plain"], rejected: ["Rad etilgan", "bad"], refunded: ["Qaytarilgan", "bad"] };
export function Finance({ api, perms }: { api: Api; perms: string[] }) {
  const [tab, setTab] = useState("report");
  return (<>
    <PageHead title={t.shop} />
    <Tabs label="Moliya bo'limlari" active={tab} onChange={setTab} items={[["report", "Hisobot"], ["orders", "Buyurtmalar"], ["prices", "Narxlar va chegaralar"], ["catalog", "Katalog"], ["provider", "To'lov provayderi"], ["log", "O'zgarishlar tarixi"]]} />
    {tab === "report" && <Report api={api} />}{tab === "orders" && <Orders api={api} perms={perms} />}{tab === "prices" && <Prices api={api} canEdit={perms.includes("commerce.manage")} />}
    {tab === "catalog" && <Catalog api={api} canEdit={perms.includes("commerce.manage")} />}{tab === "provider" && <Provider api={api} />}{tab === "log" && <Log api={api} />}
  </>);
}

function Report({ api }: { api: Api }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const r = useLoad<any>(api, `/admin/finance/summary?from=${from}&to=${to}`, [from, to]); const x = r.data;
  const tile = (k: string, v: React.ReactNode) => <div className="stat" key={k}><b>{v}</b><span>{k}</span></div>;
  return (<>
    <section className="card"><div className="row"><Field label="Boshlanish"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="Tugash"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      <button onClick={() => x && download(`daromad-${x.from}_${x.to}.csv`, csv([["Sana", "Daromad (sh.b.)"], ...x.days.map((d: string, i: number) => [d, x.series[i]])]))} disabled={!x}>CSV</button></div></section>
    <Err e={r.err} />{!x ? <Empty loading={r.loading} /> : (<>
      {!x.pricesSet && <Banner kind="warn">Plus narxlari hali kiritilmagan — xarid yopiq. «Narxlar va chegaralar» bo'limida kiriting.</Banner>}
      <section className="card"><h2>{x.from} — {x.to}</h2><div className="stats">{tile("Daromad", money(x.revenue))}{tile("Qaytarilgan", money(x.refunds.sum))}{tile("Sof daromad", money(x.net))}{tile("Buyurtmalar", x.orders)}{tile("To'lagan foydalanuvchi", x.payers)}{tile("O'rtacha chek", money(x.avgOrder))}{tile("ARPPU", money(x.arppu))}{tile("Konversiya", `${(x.conversion * 100).toFixed(1)} %`)}</div></section>
      <section className="card"><h2>Kunlik daromad</h2><Bars values={x.series} labels={x.days} label="Kunlik daromad" color="#F2B233" fmt={money} height={110} /></section>
      <div className="grid2">
        <section className="card"><h2>POYGA Plus</h2><div className="stats">{tile("Faol", x.plus.active)}{tile("Yillik", x.plus.yearly)}{tile("To'xtatgan (faol)", x.plus.cancelledPending)}{tile("30 kunda tugagan", x.plus.expired30)}{tile("Oylik takroriy daromad (MRR)", money(x.plus.mrr))}{tile("Yo'qotish (30 kun)", `${(x.plus.churn30 * 100).toFixed(1)} %`)}</div></section>
        <section className="card"><h2>Holatlar (davrda)</h2><div className="row">{Object.entries(x.status).map(([k, v]) => <Pill key={k} kind={ST[k]?.[1] ?? "plain"}>{ST[k]?.[0] ?? k}: {String(v)}</Pill>)}</div></section></div>
      <div className="grid2">{[["Mahsulot bo'yicha", x.bySku], ["Kanal bo'yicha", x.byChannel]].map(([title, rows]: any) => <section className="card" key={title}><h2>{title}</h2>{rows.length === 0 ? <p className="muted">Yo'q</p> : <table><thead><tr><th>Nomi</th><th className="num">Soni</th><th className="num">Summa</th></tr></thead><tbody>{rows.map((b: any) => <tr key={b.name}><td>{b.name}</td><td className="num">{b.n}</td><td className="num">{money(b.sum)}</td></tr>)}</tbody></table>}</section>)}</div>
    </>)}
  </>);
}

function Orders({ api, perms }: { api: Api; perms: string[] }) {
  const [status, setStatus] = useState(""); const [channel, setChannel] = useState(""); const [q, setQ] = useState(""); const [off, setOff] = useState(0); const [sel, setSel] = useState<string | null>(null);
  const l = useLoad<{ total: number; orders: any[] }>(api, `/admin/finance/orders?status=${status}&channel=${channel}&q=${encodeURIComponent(q)}&offset=${off}`, [status, channel, q, off]);
  const exp = async () => { const j = await api.get(`/admin/finance/orders?status=${status}&channel=${channel}&q=${encodeURIComponent(q)}&limit=1000`); download("buyurtmalar.csv", csv([["ID", "Vaqt", "Foydalanuvchi", "Mahsulot", "Summa", "Holat", "Kanal", "To'langan", "Izoh"], ...j.orders.map((o: any) => [o.id, new Date(o.createdAt).toISOString(), o.user, o.title, o.amount, o.status, o.channel, o.paidAt ? new Date(o.paidAt).toISOString() : "", o.note])])); };
  if (sel) return <OrderDetail api={api} id={sel} perms={perms} onBack={() => { setSel(null); l.reload(); }} />;
  return (<>
    <section className="card"><div className="row"><Field label="Qidirish"><input type="search" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} placeholder="Buyurtma ID, ism, mahsulot" /></Field>
      <Field label="Holat"><select value={status} onChange={(e) => { setStatus(e.target.value); setOff(0); }}><option value="">Hammasi</option>{Object.entries(ST).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></Field>
      <Field label="Kanal"><select value={channel} onChange={(e) => { setChannel(e.target.value); setOff(0); }}><option value="">Hammasi</option><option value="web">Veb</option><option value="store">Ilova do'koni</option></select></Field><button onClick={exp}>CSV (1000 tagacha)</button></div></section>
    <section className="card"><Err e={l.err} />{!l.data?.orders.length ? <Empty loading={l.loading} /> : <><div className="tw" tabIndex={0} role="region" aria-label="Buyurtmalar jadvali"><table><thead><tr><th>Vaqt</th><th>Foydalanuvchi</th><th>Mahsulot</th><th className="num">Summa</th><th>Holat</th><th>Kanal</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{l.data.orders.map((o) => (
      <tr key={o.id}><td className="muted">{fmtTime(o.createdAt)}</td><td>{o.user}</td><td>{o.title}</td><td className="num">{money(o.amount)}</td><td><Pill kind={ST[o.status]?.[1] ?? "plain"}>{ST[o.status]?.[0] ?? o.status}</Pill></td><td>{o.channel === "web" ? "Veb" : "Do'kon"}</td><td><button className="sm" onClick={() => setSel(o.id)}>Ochish</button></td></tr>))}</tbody></table></div>
      <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}><span className="muted">Jami: {l.data.total}</span><span className="row"><button className="sm" disabled={off === 0} onClick={() => setOff(Math.max(0, off - 50))}>← Oldingi</button><button className="sm" disabled={off + 50 >= l.data.total} onClick={() => setOff(off + 50)}>Keyingi →</button></span></div></>}</section></>);
}
function OrderDetail({ api, id, perms, onBack }: { api: Api; id: string; perms: string[]; onBack: () => void }) {
  const d = useLoad<any>(api, `/admin/finance/orders/${encodeURIComponent(id)}`); const [dlg, setDlg] = useState<"confirm" | "cancel" | "refund" | null>(null); const o = d.data?.order;
  const act = (k: string) => async (f: Record<string, string>) => { const r = await api.post(`/admin/finance/orders/${encodeURIComponent(id)}/${k}`, { reason: f.reason }); if (r.error) throw new Error(r.error); setDlg(null); d.reload(); };
  const R = [{ key: "reason", label: t.reason, required: true, hint: "Auditga yoziladi" }];
  return (<>
    <div className="row" style={{ marginBottom: 12 }}><button onClick={onBack}>← Ro'yxat</button></div><Err e={d.err} />
    {d.data?.error ? <Banner kind="bad">{errText({ body: { error: d.data.error } } as any)}</Banner> : !o ? <Empty loading={d.loading} /> : (<>
      <section className="card"><h2>{o.title}</h2><dl className="kv"><dt>Buyurtma</dt><dd className="mono">{o.id}</dd><dt>Foydalanuvchi</dt><dd>{o.user} <span className="mono">{o.userId}</span></dd><dt>Summa</dt><dd>{money(o.amount)}</dd><dt>Holat</dt><dd><Pill kind={ST[o.status]?.[1] ?? "plain"}>{ST[o.status]?.[0] ?? o.status}</Pill></dd><dt>Kanal</dt><dd>{o.channel}</dd><dt>Yaratilgan</dt><dd>{fmtTime(o.createdAt)}</dd><dt>To'langan</dt><dd>{fmtTime(o.paidAt)}</dd>{o.refundedAt && <><dt>Qaytarilgan</dt><dd>{fmtTime(o.refundedAt)}</dd></>}<dt>Provayder havolasi</dt><dd className="mono">{o.ref ?? "—"}</dd>{o.note && <><dt>Izoh</dt><dd>{o.note}</dd></>}{d.data.consent && <><dt>Ota-ona roziligi</dt><dd>{d.data.consent.status} · {fmtTime(d.data.consent.createdAt)}</dd></>}<dt>Hozir Plus</dt><dd>{d.data.plusNow ? "ha" : "yo'q"}</dd></dl>
        <div className="row" style={{ marginTop: 14 }}>
          {o.status === "pending_payment" && perms.includes("commerce.manage") && <button className="p" onClick={() => setDlg("confirm")}>To'langan deb tasdiqlash</button>}
          {(o.status === "pending_payment" || o.status === "pending_parent") && perms.includes("commerce.manage") && <button onClick={() => setDlg("cancel")}>Bekor qilish</button>}
          {o.status === "paid" && perms.includes("commerce.refund") && <button className="d" onClick={() => setDlg("refund")}>Qaytarish (refund)</button>}</div>
        {o.status === "paid" && !perms.includes("commerce.refund") && <p className="muted">Qaytarish faqat administratorda.</p>}</section>
      <section className="card"><h2>To'lov xabarlari</h2>{d.data.events.length === 0 ? <p className="muted">Yo'q</p> : <table><thead><tr><th>Vaqt</th><th className="num">Summa</th><th>Natija</th></tr></thead><tbody>{d.data.events.map((e: any) => <tr key={e.id}><td>{fmtTime(e.at)}</td><td className="num">{e.amount}</td><td>{e.ok ? <Pill kind="good">qabul qilingan</Pill> : <Pill kind="bad">{e.error}</Pill>}</td></tr>)}</tbody></table>}</section></>)}
    <FormDialog open={dlg === "confirm"} title="To'langan deb tasdiqlash" body="Foydalanuvchiga huquq beriladi. Pul haqiqatan tushganini tekshiring." fields={R} onClose={() => setDlg(null)} onOk={act("confirm")} />
    <FormDialog open={dlg === "cancel"} title="Buyurtmani bekor qilish" fields={R} onClose={() => setDlg(null)} onOk={act("cancel")} />
    <FormDialog open={dlg === "refund"} danger title="Qaytarish (refund)" body="Buyurtma «qaytarilgan» bo'ladi va berilgan huquq (Plus yoki narsa) olinadi. Pulni to'lov provayderi kabinetida alohida qaytaring." fields={R} onClose={() => setDlg(null)} onOk={act("refund")} />
  </>);
}

function Prices({ api, canEdit }: { api: Api; canEdit: boolean }) {
  const c = useLoad<{ config: any }>(api, "/admin/shop/config"); const [f, setF] = useState<Record<string, string>>({}); const [msg, setMsg] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  useEffect(() => { if (c.data) { const g = c.data.config; setF({ plusMonthly: g.plusMonthly ?? "", plusYearly: g.plusYearly ?? "", freeRoomsPerDay: g.freeRoomsPerDay ?? "", freeHistory: g.freeHistory ?? "", ...Object.fromEntries(Object.entries(g.items ?? {}).map(([k, v]) => ["i:" + k, String(v ?? "")])) }); } }, [c.data]);
  const items = Object.keys(f).filter((k) => k.startsWith("i:"));
  const save = async () => { const it: Record<string, number | null> = {}; for (const k of items) it[k.slice(2)] = num(String(f[k])); try { const r = await api.post("/admin/shop/config", { plusMonthly: num(String(f.plusMonthly ?? "")), plusYearly: num(String(f.plusYearly ?? "")), freeRoomsPerDay: num(String(f.freeRoomsPerDay ?? "")), freeHistory: num(String(f.freeHistory ?? "")), items: it }); setMsg(r.error ? { kind: "bad", text: errText({ body: { error: r.error } } as any) } : { kind: "good", text: t.saved }); c.reload(); } catch (e) { setMsg({ kind: "bad", text: errText(e) }); } };
  const fld = (k: string, label: string) => <Field key={k} label={label}><input inputMode="numeric" disabled={!canEdit} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder="belgilanmagan" /></Field>;
  return (<section className="card"><h2>Narxlar va bepul tarif chegaralari</h2><p className="muted">Narx bo'sh qoldirilsa, xarid yopiq turadi (narx o'ylab topilmaydi). Chegara bo'sh = cheklovsiz. Har o'zgarish tarixga yoziladi.</p><Err e={c.err} />
    <div className="stack"><div className="row">{fld("plusMonthly", "Plus, oylik (so'm)")}{fld("plusYearly", "Plus, yillik (so'm)")}{fld("freeRoomsPerDay", "Bepul: kuniga xona")}{fld("freeHistory", "Bepul: tarix yozuvlari")}</div>
      {items.length > 0 && <><h3>Do'kon narsalari</h3><div className="row">{items.map((k) => fld(k, k.slice(2)))}</div></>}
      {canEdit && <div><button className="p" onClick={save}>Saqlash</button></div>}{msg && <Banner kind={msg.kind}>{msg.text}</Banner>}</div></section>);
}
function Catalog({ api, canEdit }: { api: Api; canEdit: boolean }) {
  const c = useLoad<{ items: any[] }>(api, "/admin/shop/catalog"); const [err, setErr] = useState<string | null>(null);
  const SRC: Record<string, string> = { default: "Hamma uchun", shop: "Sotiladi", plus: "Plus", achievement: "Yutuq" };
  return (<section className="card"><h2>Katalog</h2><p className="muted">Yashirilgan narsa do'konda ko'rinmaydi va sotib olinmaydi (sotib olganlarda qoladi).</p><Err e={c.err || err} />{!c.data ? <Empty loading={c.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="Katalog jadvali"><table><thead><tr><th>Nomi</th><th>Turi</th><th>Manba</th><th className="num">Narx</th><th>Holat</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{c.data.items.map((i) => (
    <tr key={i.id}><td><b>{i.name}</b> <span className="mono">{i.id}</span></td><td>{i.kind}</td><td>{SRC[i.source]}</td><td className="num">{i.source === "shop" ? money(i.price) : "—"}</td><td>{!i.available ? <Pill kind="plain">Tez orada</Pill> : i.hidden ? <Pill kind="bad">Yashirin</Pill> : <Pill kind="good">Ko'rinadi</Pill>}</td>
      <td>{canEdit && i.available && <button className="sm" onClick={async () => { setErr(null); try { const r = await api.post(`/admin/shop/catalog/${i.id}`, { hidden: !i.hidden }); if (r.error) throw new Error(r.error); c.reload(); } catch (e) { setErr(errText(e)); } }}>{i.hidden ? "Ko'rsatish" : "Yashirish"}</button>}</td></tr>))}</tbody></table></div>}</section>);
}
function Provider({ api }: { api: Api }) {
  const p = useLoad<any>(api, "/admin/finance/provider"); const x = p.data;
  return (<><Err e={p.err} />{!x ? <Empty loading={p.loading} /> : (<>
    <section className="card"><h2>Holat</h2><div className="row"><Pill kind={x.paymentsReady ? "good" : "warn"}>{x.paymentsReady ? "To'lov provayderi ulangan" : "Provayder ulanmagan — xaridlar yopiq"}</Pill><Pill kind={x.webhookEnabled ? "good" : "plain"}>{x.webhookEnabled ? "Webhook yoqilgan" : "Webhook o'chiq"}</Pill><Pill kind={x.last24h.failed ? "bad" : "info"}>24 soat: {x.last24h.total} xabar, {x.last24h.failed} xato</Pill></div></section>
    <section className="card"><h2>So'nggi to'lov xabarlari</h2>{x.events.length === 0 ? <p className="muted">Hozircha xabar yo'q</p> : <div className="tw" tabIndex={0} role="region" aria-label="To'lov xabarlari jadvali"><table><thead><tr><th>Vaqt</th><th>Buyurtma</th><th className="num">Summa</th><th>Natija</th></tr></thead><tbody>{x.events.map((e: any) => <tr key={e.id}><td className="muted">{fmtTime(e.at)}</td><td className="mono">{e.orderId}</td><td className="num">{e.amount}</td><td>{e.ok ? <Pill kind="good">qabul qilingan</Pill> : <Pill kind="bad">{e.error}</Pill>}</td></tr>)}</tbody></table></div>}</section></>)}</>);
}
const short = (v: unknown) => { const j = JSON.stringify(v); return j && j.length > 120 ? j.slice(0, 117) + "…" : j; };
export function Log({ api }: { api: Api }) {
  const l = useLoad<{ log: any[] }>(api, "/admin/shop/config-log");
  return (<section className="card"><h2>O'zgarishlar tarixi</h2><Err e={l.err} />{!l.data?.log.length ? <Empty loading={l.loading} /> : <div className="tw" tabIndex={0} role="region" aria-label="O'zgarishlar jadvali"><table><thead><tr><th>Vaqt</th><th>Kim</th><th>Nima</th><th>Oldin</th><th>Keyin</th></tr></thead><tbody>{l.data.log.map((x) => <tr key={x.id}><td className="muted">{fmtTime(x.at)}</td><td className="mono">{x.admin}</td><td><b>{x.what}</b></td><td className="mono" style={{ maxWidth: 260, overflowWrap: "anywhere" }}>{short(x.before)}</td><td className="mono" style={{ maxWidth: 260, overflowWrap: "anywhere" }}>{short(x.after)}</td></tr>)}</tbody></table></div>}</section>);
}
