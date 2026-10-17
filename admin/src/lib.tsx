import React, { useCallback, useEffect, useRef, useState } from "react";
import { Api, ApiError } from "./api";
import { ERRORS, t } from "./uz";

export const css = `
:root{--navy:#082238;--green:#11835A;--green-t:#0E6B4A;--red:#9E2A30;--gold:#F2B233;--bg:#F4F7F8;--line:#DCE3E8;--t2:#4A5B6C;--warn:#8A5A00;--s-good:#E7F4EE;--s-bad:#F8E8E9;--s-warn:#FFF6DD;--s-info:#E8F0F8}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:Manrope,system-ui,sans-serif;background:var(--bg);color:var(--navy);line-height:1.45}
h1,h2,h3{margin:0}h2{font-size:20px}h3{font-size:16px}
.shell{display:grid;grid-template-columns:230px 1fr;min-height:100vh}
aside{background:var(--navy);color:#fff;padding:20px 14px;display:flex;flex-direction:column;gap:18px;position:sticky;top:0;height:100vh;overflow-y:auto}
aside .brand{font-weight:800;letter-spacing:1px;font-size:17px;padding:0 8px}aside .who{font-size:12px;color:#C9D6E2;padding:0 8px}
nav{display:flex;flex-direction:column;gap:4px}
nav button{justify-content:flex-start;text-align:left;background:transparent;color:#fff;border:0;min-height:40px;padding:0 12px;border-radius:10px;font-weight:700}
nav button:hover{background:rgba(255,255,255,.1)}nav button[aria-current=page]{background:#fff;color:var(--navy)}
aside .out{margin-top:auto;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}
main{padding:28px;max-width:1180px;width:100%;min-width:0}main.login{max-width:none;padding:20px}
.page-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap}
button{font:inherit;min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:#fff;font-weight:700;cursor:pointer;color:var(--navy)}
button:hover:not(:disabled){border-color:var(--navy)}button:disabled{opacity:.5;cursor:not-allowed}
button.p{background:var(--green);color:#fff;border-color:var(--green)}button.d{background:var(--red);color:#fff;border-color:var(--red)}button.sm{min-height:36px;padding:0 12px;font-size:14px}
:is(button,input,textarea,select,a,summary):focus-visible{outline:3px solid #1B3A6B;outline-offset:2px}
input,select,textarea{font:inherit;min-height:44px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:#fff;color:var(--navy);width:100%}
textarea{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;min-height:320px;line-height:1.5;resize:vertical}
label{display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:14px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:18px;box-shadow:0 2px 8px rgba(8,34,56,.05)}.card>h2{margin-bottom:12px}
.row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}.grow{flex:1;min-width:200px}.stack{display:flex;flex-direction:column;gap:12px}
.tw{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--t2);font-size:12px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
tr:last-child td{border-bottom:0}td.num{text-align:right;font-variant-numeric:tabular-nums}.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--t2)}.muted{color:var(--t2)}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:800}.pill.good{background:var(--s-good);color:var(--green-t)}.pill.bad{background:var(--s-bad);color:var(--red)}.pill.warn{background:var(--s-warn);color:var(--warn)}.pill.info{background:var(--s-info);color:var(--navy)}
.banner{border-radius:10px;padding:10px 14px;font-weight:700;font-size:14px}.banner.good{background:var(--s-good);color:var(--green-t)}.banner.bad{background:var(--s-bad);color:var(--red)}.banner.warn{background:var(--s-warn);color:var(--warn)}.banner.info{background:var(--s-info);color:var(--navy)}.pill.plain{background:#EEF2F5;color:var(--t2)}.banner ul{margin:6px 0 0;padding-left:20px;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.stat{background:var(--bg);border-radius:12px;padding:14px}.stat b{display:block;font-size:clamp(20px,2.1vw,26px);white-space:nowrap}.stat span{font-size:12px;color:var(--t2);font-weight:700}
.bar{height:10px;border-radius:999px;background:var(--line);overflow:hidden;min-width:80px}.bar i{display:block;height:100%;background:var(--green)}
dialog{border:0;border-radius:16px;padding:24px;max-width:480px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(8,34,56,.35);color:var(--navy)}dialog::backdrop{background:rgba(8,34,56,.5)}
dialog form{display:flex;flex-direction:column;gap:14px}dialog menu{display:flex;gap:10px;justify-content:flex-end;margin:0;padding:0}
.login{min-height:100vh;display:grid;place-items:center;padding:20px}.login .card{max-width:420px;width:100%}
.sr{position:absolute;left:-9999px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}.tabs button{border-radius:999px;min-height:40px}.tabs button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.kv{display:grid;grid-template-columns:minmax(120px,200px) 1fr;gap:6px 14px;margin:0}.kv dt{color:var(--t2);font-weight:700;font-size:13px}.kv dd{margin:0}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;align-items:start}.attn{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)}.attn:last-child{border:0}
nav .grp{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9FB2C6;padding:10px 12px 2px}
button.link{border:0;background:none;min-height:0;padding:0;color:#1B3A6B;text-decoration:underline;font-weight:700}
@media(max-width:820px){.shell{grid-template-columns:1fr}aside{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;padding:10px 12px;gap:8px}aside .who{display:none}nav{flex-direction:row;overflow-x:auto;flex:1 1 100%;order:3}nav button{white-space:nowrap}aside .out{margin:0;padding:8px 12px;font-size:13px}aside .brand{flex:1 1 auto}main{padding:16px}}
`;

export const fmtTime = (ms?: number) => (ms ? new Date(ms).toLocaleString("uz", { dateStyle: "short", timeStyle: "short" }) : "—");
export const fmtDur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} s ${Math.round((s % 3600) / 60)} daq` : `${Math.round(s / 60)} daq`);
export const errCode = (c: string) => ERRORS[c] ?? c;
export const errText = (e: unknown) => (e instanceof ApiError ? (e.body?.error && e.body.error !== "forbidden" ? errCode(e.body.error) : e.status === 403 ? t.forbidden : e.message) : String(e));

export function useLoad<T>(api: Api, path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [err, setErr] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const seq = useRef(0); // eski javob yangisini bosib ketmasin (qidiruvda har belgi so'rov)
  const reload = useCallback(() => { const my = ++seq.current; setLoading(true); api.get(path).then((d) => { if (my === seq.current) { setData(d); setErr(null); setLoading(false); } }).catch((e) => { if (my === seq.current) { setErr(errText(e)); setLoading(false); } }); }, [api, path]);
  useEffect(() => { const h = setTimeout(reload, 200); return () => { clearTimeout(h); seq.current++; }; }, [reload, ...deps]); // 200 ms kechiktirish + unmount himoyasi
  return { data, err, loading, reload };
}
export const Banner = ({ kind, children }: { kind: "good" | "bad" | "warn" | "info"; children: React.ReactNode }) => <div className={`banner ${kind}`} role={kind === "bad" ? "alert" : "status"}>{children}</div>;
export const Pill = ({ kind, children }: { kind: "good" | "bad" | "warn" | "info" | "plain"; children: React.ReactNode }) => <span className={`pill ${kind}`}>{children}</span>;
export const Err = ({ e }: { e: string | null }) => (e ? <Banner kind="bad">{e}</Banner> : null);
export const PageHead = ({ title, children }: { title: string; children?: React.ReactNode }) => <div className="page-h"><h1 style={{ fontSize: 26 }}>{title}</h1><div className="row">{children}</div></div>;
export const Empty = ({ loading }: { loading: boolean }) => <p className="muted" role="status">{loading ? t.loading : t.empty}</p>;

/** Tasdiqlash oynasi (<dialog>: fokus tuzog'i va Esc brauzer tomonidan). `reason` — majburiy sabab maydoni. */
export function Confirm({ open, title, body, danger, reason, onClose, onOk }: { open: boolean; title: string; body?: string; danger?: boolean; reason?: string; onClose: () => void; onOk: (reason: string) => void | Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null); const [r, setR] = useState(""); const [busy, setBusy] = useState(false); const [fail, setFail] = useState<string | null>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) { setR(""); setFail(null); d.showModal(); } if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} aria-labelledby="dlg-t" onClose={onClose}>
      <form method="dialog" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setFail(null); try { await onOk(r.trim()); } catch (err) { setFail(errText(err)); } finally { setBusy(false); } }}>
        <h2 id="dlg-t">{title}</h2>{body && <p className="muted" style={{ margin: 0 }}>{body}</p>}
        {reason && <label>{reason}<input value={r} onChange={(e) => setR(e.target.value)} autoFocus required minLength={3} maxLength={300} /></label>}
        {fail && <Banner kind="bad">{fail}</Banner>}
        <menu><button type="button" onClick={onClose}>{t.cancel}</button><button type="submit" className={danger ? "d" : "p"} disabled={busy || (!!reason && r.trim().length < 3)}>{t.confirm}</button></menu>
      </form>
    </dialog>
  );
}

export const money = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${Math.round(n).toLocaleString("uz").replace(/,/g, " ")} sh.b.`);
export const num = (v: string) => (v.trim() === "" ? null : Number(v));
export function download(name: string, text: string, type = "text/csv;charset=utf-8") { const u = URL.createObjectURL(new Blob(["\ufeff" + text], { type })); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); }
/** CSV katagi: formula (`=+-@`) bilan boshlansa `'` qo'shiladi. */
export const csv = (rows: unknown[][]) => rows.map((r) => r.map((v) => { let s = v === null || v === undefined ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\r\n");

/** Oddiy ustunli diagramma (SVG): ko'rish uchun; qiymatlar jadval ko'rinishida `<title>` va aria-label'da ham bor. */
export function Bars({ values, labels, label, color = "#11835A", height = 90, fmt = (n: number) => String(n) }: { values: number[]; labels: string[]; label: string; color?: string; height?: number; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...values), w = 100 / Math.max(1, values.length);
  // Ko'rinadigan o'qlar: birinchi/oxirgi yorliq va eng katta qiymat (avval faqat sichqoncha ustida `<title>` da edi)
  const cap = (<div aria-hidden className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginTop: 4 }}><span>{labels[0]}</span><span>{`max: ${fmt(Math.max(0, ...values))}`}</span><span>{labels[labels.length - 1]}</span></div>);
  return (<div><svg role="img" aria-label={`${label}: ${values.map((v, i) => `${labels[i]} — ${fmt(v)}`).join(", ")}`} viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
    {values.map((v, i) => { const h = (v / max) * (height / 3 - 2); return <rect key={i} x={i * w + w * 0.12} y={height / 3 - h} width={w * 0.76} height={Math.max(h, v ? 0.6 : 0.15)} rx="0.6" fill={color}><title>{`${labels[i]}: ${fmt(v)}`}</title></rect>; })}
  </svg>{values.length > 0 && cap}</div>);
}
export const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => <label className="grow">{label}{children}{hint && <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{hint}</span>}</label>;
export function Tabs<T extends string>({ items, active, onChange, label }: { items: [T, string][]; active: T; onChange: (k: T) => void; label: string }) {
  return <div role="tablist" aria-label={label} className="tabs">{items.map(([k, l]) => <button key={k} role="tab" aria-selected={k === active} className={k === active ? "on" : ""} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export type FormField = { key: string; label: string; type?: "text" | "number" | "select" | "textarea" | "password"; options?: [string, string][]; required?: boolean; hint?: string; init?: string };
/** Ko'p maydonli dialog (sabab, muddat, rol va h.k.). `onOk` xato tashlasa dialog ochiq qoladi va xato ko'rinadi. */
export function FormDialog({ open, title, body, fields, danger, submit = t.confirm, onClose, onOk }: { open: boolean; title: string; body?: string; fields: FormField[]; danger?: boolean; submit?: string; onClose: () => void; onOk: (v: Record<string, string>) => Promise<void> | void }) {
  const ref = useRef<HTMLDialogElement>(null); const [v, setV] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [fail, setFail] = useState<string | null>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) { setV(Object.fromEntries(fields.map((f) => [f.key, f.init ?? (f.type === "select" ? f.options?.[0]?.[0] ?? "" : "")]))); setFail(null); d.showModal(); } if (!open && d.open) d.close(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const ok = fields.every((f) => !f.required || (v[f.key] ?? "").trim().length >= (f.key === "reason" ? 3 : 1));
  return (
    <dialog ref={ref} aria-labelledby="fd-t" onClose={onClose}>
      <form method="dialog" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setFail(null); try { await onOk(v); } catch (err) { setFail(errText(err)); } finally { setBusy(false); } }}>
        <h2 id="fd-t">{title}</h2>{body && <p className="muted" style={{ margin: 0 }}>{body}</p>}
        {fields.map((f, i) => <Field key={f.key} label={f.label} hint={f.hint}>
          {f.type === "select" ? <select value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            : f.type === "textarea" ? <textarea style={{ minHeight: 90, fontFamily: "inherit" }} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            : <input type={f.type ?? "text"} value={v[f.key] ?? ""} autoFocus={i === 0} autoComplete="off" onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}</Field>)}
        {fail && <Banner kind="bad">{fail}</Banner>}
        <menu><button type="button" onClick={onClose}>{t.cancel}</button><button type="submit" className={danger ? "d" : "p"} disabled={busy || !ok}>{submit}</button></menu>
      </form>
    </dialog>
  );
}

/** Chiziqli diagramma (SVG): bir nechta qator, `cursor` — tanlangan indeks. */
export function Lines({ series, label, cursor, height = 140 }: { series: { name: string; values: number[]; color: string }[]; label: string; cursor?: number; height?: number }) {
  const n = Math.max(2, ...series.map((s) => s.values.length)); const all = series.flatMap((s) => s.values); const lo = Math.min(0, ...all), hi = Math.max(1, ...all);
  const X = (i: number) => (i / (n - 1)) * 100, Y = (v: number) => height - 4 - ((v - lo) / (hi - lo || 1)) * (height - 8);
  return (<svg role="img" aria-label={`${label}: ${series.map((s) => `${s.name} ${s.values[s.values.length - 1] ?? 0}`).join(", ")}`} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
    <line x1="0" x2="100" y1={Y(0)} y2={Y(0)} stroke="#DCE3E8" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
    {series.map((s) => <polyline key={s.name} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} />)}
    {cursor !== undefined && <line x1={X(cursor)} x2={X(cursor)} y1="0" y2={height} stroke="#082238" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />}
  </svg>);
}
