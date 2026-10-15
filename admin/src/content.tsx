// Kontent: versiyalar (farq, tekshiruv, topshirish/rad etish/nashr/qaytarish) va vizual muharrir (ro'yxat + maydonlar formasi).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, FormDialog, PageHead, Pill, Tabs, errText, fmtTime, useLoad } from "./lib";
import { t } from "./uz";

const CARDS_URL: string = (import.meta as any).env?.VITE_CARD_IMAGES_URL ?? "/cards";
const DECKS: [string, string][] = [["kasb", "Kasblar"], ["kichik", "Kichik biznes"], ["katta", "Katta biznes"], ["bozor", "Bozor"], ["xar", "Xarajat"], ["kxar", "Katta xarajat"], ["hod", "Hodisa"], ["new", "Yangi kartalar"]];
const keyOf = (x: any, i: number) => String(x?.file ?? x?.code ?? x?.i ?? x?.n ?? x?.name ?? i);
const labelOf = (x: any, i: number) => String(x?.name ?? x?.text ?? x?.file ?? `#${i + 1}`).slice(0, 60);

export function Content({ api, perms }: { api: Api; perms: string[] }) {
  const [tab, setTab] = useState<"versions" | "editor">("versions"); const vs = useLoad<{ active: number; versions: any[] }>(api, "/admin/content/versions"); const rv = useLoad<{ reviews: any[] }>(api, "/admin/content/reviews");
  const [msg, setMsg] = useState<string | null>(null);
  return (<>
    <PageHead title={t.content} />
    <Tabs label="Kontent bo'limlari" active={tab} onChange={setTab} items={[["versions", "Versiyalar"], ["editor", "Muharrir"]]} />
    {msg && <Banner kind="good">{msg}</Banner>}
    {tab === "versions" ? <Versions api={api} perms={perms} vs={vs} rv={rv} /> : <Editor api={api} canWrite={perms.includes("content.write")} onCreated={(v) => { setMsg(`Yangi versiya v${v} yaratildi (nashr qilinmagan). «Versiyalar» bo'limida tekshirib, topshiring.`); vs.reload(); rv.reload(); setTab("versions"); }} />}
  </>);
}

function Versions({ api, perms, vs, rv }: { api: Api; perms: string[]; vs: ReturnType<typeof useLoad<{ active: number; versions: any[] }>>; rv: ReturnType<typeof useLoad<{ reviews: any[] }>> }) {
  const [panel, setPanel] = useState<{ kind: "diff" | "check"; v: number } | null>(null); const [dlg, setDlg] = useState<{ k: "publish" | "reject" | "submit"; v: number } | null>(null);
  const rmap = useMemo(() => new Map((rv.data?.reviews ?? []).map((r) => [r.version, r])), [rv.data]); const active = vs.data?.active; const canPub = perms.includes("content.publish"), canWrite = perms.includes("content.write");
  const run = async (p: Promise<any>) => { const r = await p; if (r.error) throw new Error(r.error); setDlg(null); vs.reload(); rv.reload(); };
  return (<>
    <Err e={vs.err} />
    <section className="card" aria-labelledby="vh"><h2 id="vh">Versiyalar</h2>
      <div className="tw" tabIndex={0} role="region" aria-label="Versiyalar jadvali"><table><thead><tr><th>Versiya</th><th>Qism</th><th>Izoh</th><th>Muallif</th><th>Sana</th><th>Holat</th><th><span className="sr">Amal</span></th></tr></thead><tbody>
        {vs.data?.versions.slice().reverse().map((v) => { const on = active === v.version; const r = rmap.get(v.version); return (
          <tr key={v.version}><td><b>v{v.version}</b></td><td>{t.parts[v.part]?.[0] ?? v.part}</td><td>{v.note || "—"}</td><td className="mono">{v.author}</td><td className="muted">{fmtTime(v.at)}</td>
            <td>{on ? <Pill kind="good">{t.active}</Pill> : v.published ? <Pill kind="info">Avval nashr qilingan</Pill> : r?.status === "submitted" ? <Pill kind="warn">Ko'rib chiqishda</Pill> : r?.status === "rejected" ? <Pill kind="bad">Rad etilgan</Pill> : <Pill kind="plain">Qoralama</Pill>}{r?.comment && <div className="muted" style={{ fontSize: 12 }}>{r.comment}</div>}</td>
            <td><div className="row">
              {v.version !== 1 && <button className="sm" onClick={() => setPanel({ kind: "diff", v: v.version })}>Farq</button>}<button className="sm" onClick={() => setPanel({ kind: "check", v: v.version })}>Tekshiruv</button>
              {!v.published && canWrite && r?.status !== "submitted" && <button className="sm" onClick={() => setDlg({ k: "submit", v: v.version })}>Topshirish</button>}
              {!v.published && canPub && r?.status === "submitted" && <button className="sm" onClick={() => setDlg({ k: "reject", v: v.version })}>Rad etish</button>}
              {!on && canPub && <button className="sm p" onClick={() => setDlg({ k: "publish", v: v.version })}>{v.published ? "Shu versiyaga qaytarish" : t.publish}</button>}
            </div></td></tr>); })}
      </tbody></table></div>{!vs.data && <Empty loading={vs.loading} />}
      {!canPub && <p className="muted">Nashr qilish faqat administratorda. Tayyorlangan versiyani «Topshirish» orqali ko'rib chiqishga yuboring.</p>}</section>
    {panel?.kind === "diff" && <DiffPanel api={api} v={panel.v} against={active ?? 1} onClose={() => setPanel(null)} />}
    {panel?.kind === "check" && <CheckPanel api={api} v={panel.v} onClose={() => setPanel(null)} />}
    <FormDialog open={dlg?.k === "publish"} title={`v${dlg?.v} ni nashr qilish`} body={t.publishWarn} fields={[]} onClose={() => setDlg(null)} onOk={() => run(api.post(`/admin/content/versions/${dlg!.v}/publish`))} />
    <FormDialog open={dlg?.k === "reject"} danger title={`v${dlg?.v} ni rad etish`} fields={[{ key: "reason", label: "Sabab", required: true }]} onClose={() => setDlg(null)} onOk={(f) => run(api.post(`/admin/content/versions/${dlg!.v}/reject`, { reason: f.reason }))} />
    <FormDialog open={dlg?.k === "submit"} title={`v${dlg?.v} ni ko'rib chiqishga topshirish`} fields={[{ key: "comment", label: "Administratorga izoh", type: "textarea" }]} onClose={() => setDlg(null)} onOk={(f) => run(api.post(`/admin/content/versions/${dlg!.v}/submit`, { comment: f.comment }))} />
  </>);
}

function DiffPanel({ api, v, against, onClose }: { api: Api; v: number; against: number; onClose: () => void }) {
  const d = useLoad<any>(api, `/admin/content/versions/${v}/diff?against=${against}`);
  return (<section className="card" aria-labelledby="dh"><div className="page-h" style={{ marginBottom: 8 }}><h2 id="dh">v{v} va faol v{against} farqi</h2><button onClick={onClose}>{t.close}</button></div><Err e={d.err} />
    {!d.data ? <Empty loading={d.loading} /> : d.data.error ? <Banner kind="bad">{errText({ body: { error: d.data.error } } as any)}</Banner> : (<>
      <p><Pill kind="good">+{d.data.added} qo'shilgan</Pill> <Pill kind="bad">−{d.data.removed} o'chirilgan</Pill> <Pill kind="warn">{d.data.changed} o'zgargan</Pill></p>
      {d.data.items.length === 0 ? <p className="muted">Farq yo'q.</p> : <div className="tw" tabIndex={0} role="region" aria-label="Farq jadvali"><table><thead><tr><th>Element</th><th>Turi</th><th>O'zgarish</th></tr></thead><tbody>{d.data.items.map((i: any, k: number) => (
        <tr key={k}><td className="mono">{i.key}</td><td><Pill kind={i.kind === "added" ? "good" : i.kind === "removed" ? "bad" : "warn"}>{i.kind === "added" ? "qo'shildi" : i.kind === "removed" ? "o'chdi" : "o'zgardi"}</Pill></td>
          <td>{i.fields?.map((f: any, j: number) => <div key={j} style={{ fontSize: 13 }}><b>{f.path}</b>: <span style={{ color: "var(--red)" }}>{f.before}</span> → <span style={{ color: "var(--green-t)" }}>{f.after}</span></div>)}</td></tr>))}</tbody></table></div>}
      {d.data.items.length >= 300 && <p className="muted">Birinchi 300 ta o'zgarish ko'rsatildi.</p>}</>)}</section>);
}
function CheckPanel({ api, v, onClose }: { api: Api; v: number; onClose: () => void }) {
  const c = useLoad<any>(api, `/admin/content/versions/${v}/check`);
  return (<section className="card" aria-labelledby="ch"><div className="page-h" style={{ marginBottom: 8 }}><h2 id="ch">v{v} tekshiruvi</h2><button onClick={onClose}>{t.close}</button></div><Err e={c.err} />
    {!c.data ? <Empty loading={c.loading} /> : (<>{c.data.warnings.length === 0 ? <Banner kind="good">Ogohlantirish yo'q</Banner> : <Banner kind="warn"><b>Ogohlantirishlar ({c.data.warnings.length}):</b><ul>{c.data.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></Banner>}
      <dl className="kv" style={{ marginTop: 12 }}>{Object.entries(c.data.stats).map(([k, val]) => <React.Fragment key={k}><dt>{k}</dt><dd className="mono">{typeof val === "object" ? JSON.stringify(val) : String(val)}</dd></React.Fragment>)}</dl></>)}</section>);
}

/* ---------------- Vizual muharrir ---------------- */
function Editor({ api, canWrite, onCreated }: { api: Api; canWrite: boolean; onCreated: (v: number) => void }) {
  const [part, setPart] = useState("dreams"); const [deck, setDeck] = useState("kasb"); const [data, setData] = useState<any>(null); const [orig, setOrig] = useState(""); const [err, setErr] = useState<string | null>(null); const [problems, setProblems] = useState<string[]>([]);
  const [sel, setSel] = useState(0); const [q, setQ] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const seq = useRef(0);
  const load = useCallback(async (p: string) => { const my = ++seq.current; setErr(null); setData(null); try { const r = await api.get(`/admin/content/${p}`); if (my !== seq.current) return; setData(r.data); setOrig(JSON.stringify(r.data)); setSel(0); setProblems([]); } catch (e) { if (my === seq.current) setErr(errText(e)); } }, [api]);
  useEffect(() => { void load(part); }, [part, load]);
  const items: any[] | null = data && (part === "cards" ? data[deck] : Array.isArray(data) ? data : null);
  const setItems = (n: any[]) => setData(part === "cards" ? { ...data, [deck]: n } : n);
  const changed = data !== null && JSON.stringify(data) !== orig;
  const visible = (items ?? []).map((x, i) => ({ x, i })).filter(({ x, i }) => !q || labelOf(x, i).toLowerCase().includes(q.toLowerCase()) || keyOf(x, i).toLowerCase().includes(q.toLowerCase()));
  const cur = items?.[sel];
  const create = async () => { setBusy(true); setErr(null); setProblems([]); try { const r = await api.post(`/admin/content/${part}/versions`, { data, note }); if (r.ok) onCreated(r.version); else setProblems(r.problems ?? [r.error]); } catch (e) { setErr(errText(e)); } finally { setBusy(false); } };
  return (<section className="card" aria-labelledby="eh"><h2 id="eh">Tahrirlash</h2><Err e={err} />
    <div className="row" style={{ marginBottom: 12 }}>
      <label className="grow">Qism<select value={part} onChange={(e) => (changed && !confirm("Saqlanmagan o'zgarishlar yo'qoladi. Davom etasizmi?") ? null : setPart(e.target.value))}>{Object.entries(t.parts).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label>
      {part === "cards" && <label className="grow">To'plam<select value={deck} onChange={(e) => { setDeck(e.target.value); setSel(0); setQ(""); }}>{DECKS.map(([k, l]) => <option key={k} value={k}>{l} ({data?.[k]?.length ?? "…"})</option>)}</select></label>}
      <label className="grow">Qidirish<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, matni yoki fayl" /></label></div>
    <p className="muted" style={{ marginTop: 0 }}>{t.parts[part]?.[1]}</p>
    {data === null ? <Empty loading={!err} /> : !items ? <RawEditor data={data} setData={setData} /> : (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,300px) 1fr", gap: 16, alignItems: "start" }} className="editor">
        <div style={{ maxHeight: 520, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10 }} role="listbox" aria-label="Elementlar" tabIndex={0}>
          {visible.slice(0, 300).map(({ x, i }) => <button key={i} role="option" aria-selected={i === sel} onClick={() => setSel(i)} style={{ display: "block", width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid var(--line)", borderRadius: 0, background: i === sel ? "var(--s-info)" : "#fff", minHeight: 40, padding: "6px 12px", fontWeight: i === sel ? 800 : 600 }}>{labelOf(x, i)}</button>)}
          {visible.length === 0 && <p className="muted" style={{ padding: 12 }}>Topilmadi</p>}</div>
        <div>{cur ? <>
          {cur.file && <img src={`${CARDS_URL}/${cur.file}`} alt="" style={{ maxWidth: 180, maxHeight: 240, borderRadius: 8, border: "1px solid var(--line)", marginBottom: 10 }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
          <ObjectForm key={`${part}${deck}${sel}`} value={cur} onChange={(n) => setItems(items.map((x, i) => (i === sel ? n : x)))} readOnly={!canWrite} />
          {canWrite && <div className="row" style={{ marginTop: 12 }}><button onClick={() => { const c = JSON.parse(JSON.stringify(cur)); setItems([...items, c]); setSel(items.length); }}>Nusxa qo'shish</button><button className="d" onClick={() => { setItems(items.filter((_, i) => i !== sel)); setSel(Math.max(0, sel - 1)); }}>O'chirish</button></div>}</> : <p className="muted">Element tanlang</p>}</div></div>)}
    {canWrite && data !== null && <div className="stack" style={{ marginTop: 16 }}>
      <div role="status">{changed ? <Pill kind="warn">O'zgartirilgan</Pill> : <Pill kind="info">O'zgarishsiz</Pill>}</div>
      <label>{t.note}<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
      <div className="row"><button className="p" disabled={!changed || busy} onClick={create}>{t.create}</button><button disabled={!changed} onClick={() => load(part)}>Asl holatga qaytarish</button></div>
      {problems.length > 0 && <Banner kind="bad"><b>{t.problems}:</b><ul>{problems.map((m, i) => <li key={i}>{m}</li>)}</ul></Banner>}</div>}
  </section>);
}

function RawEditor({ data, setData }: { data: any; setData: (d: any) => void }) {
  const [text, setText] = useState(JSON.stringify(data, null, 1)); const [e, setE] = useState<string | null>(null);
  return (<><label>JSON<textarea spellCheck={false} value={text} onChange={(ev) => { setText(ev.target.value); try { setData(JSON.parse(ev.target.value)); setE(null); } catch (x) { setE((x as Error).message); } }} /></label>{e && <Banner kind="bad">JSON xato: {e}</Banner>}</>);
}

/** Obyektning maydonlari: son, matn, mantiqiy qiymat — oddiy input; massiv/ichki obyekt — JSON (to'g'ri bo'lsa qo'llanadi). */
function ObjectForm({ value, onChange, readOnly }: { value: any; onChange: (v: any) => void; readOnly?: boolean }) {
  const [raw, setRaw] = useState<Record<string, string>>({}); const [bad, setBad] = useState<Record<string, boolean>>({});
  return (<div className="stack">{Object.keys(value).map((k) => { const v = value[k];
    if (typeof v === "number") return <label key={k}>{k}<input type="number" step="any" disabled={readOnly} value={Number.isFinite(v) ? v : ""} onChange={(e) => onChange({ ...value, [k]: e.target.value === "" ? 0 : Number(e.target.value) })} /></label>;
    if (typeof v === "boolean") return <label key={k} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" style={{ width: 20, minHeight: 20 }} disabled={readOnly} checked={v} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} />{k}</label>;
    if (typeof v === "string") return <label key={k}>{k}{v.length > 70 ? <textarea style={{ minHeight: 90, fontFamily: "inherit" }} disabled={readOnly} value={v} onChange={(e) => onChange({ ...value, [k]: e.target.value })} /> : <input disabled={readOnly} value={v} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />}</label>;
    const txt = raw[k] ?? JSON.stringify(v);
    return <label key={k}>{k} <span className="muted" style={{ fontWeight: 400 }}>(JSON)</span><input className="mono" disabled={readOnly} value={txt} aria-invalid={bad[k] || undefined} onChange={(e) => { setRaw({ ...raw, [k]: e.target.value }); try { onChange({ ...value, [k]: JSON.parse(e.target.value) }); setBad({ ...bad, [k]: false }); } catch { setBad({ ...bad, [k]: true }); } }} />{bad[k] && <span style={{ color: "var(--red)", fontSize: 12 }}>JSON xato</span>}</label>; })}</div>);
}
