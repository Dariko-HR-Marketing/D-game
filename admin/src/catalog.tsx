// Kartalar katalogi (7 to'plam, ro'yxat → ochiladigan tafsilot) va kasblar (xarajat taqsimoti). Faqat o'qish: tahrirlash «Muharrir» bo'limida.
import React, { useMemo, useState } from "react";
import type { Api } from "./api";
import { CARDS_URL, Empty, Err, Pill, errText, useLoad } from "./lib";

const fm = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const EXP_NAMES = ["Kvartira to'lovi", "Ovqatlanish", "Kvartira krediti", "Avtomobil krediti", "Telefon", "Trening", "Kiyim-kechak", "Yo'l / yoqilg'i", "Soliq"];
const DECK_KEYS = ["", "kasb", "kichik", "katta", "bozor", "xar", "kxar", "hod"];
const DECKS: Record<number, string> = { 1: "Kasb", 2: "Kichik sarmoya", 3: "Katta sarmoya", 4: "Bozor", 5: "Xarajat", 6: "Katta aylana xarajati", 7: "Kutilmagan hodisa" };

function useCards(api: Api) { return useLoad<{ data: any }>(api, "/admin/content/cards"); }

export function Catalog({ api }: { api: Api }) {
  const l = useCards(api); const [deck, setDeck] = useState(0); const [q, setQ] = useState(""); const [open, setOpen] = useState<string | null>(null); const [grid, setGrid] = useState(false);
  const cat: any[] = l.data?.data?.catalog ?? [];
  const counts = useMemo(() => { const m = new Map<number, number>(); cat.forEach((c) => m.set(c.deck, (m.get(c.deck) ?? 0) + 1)); return m; }, [cat]);
  const rows = useMemo(() => cat.filter((c) => (!deck || c.deck === deck) && (!q || `${c.title} ${c.text} ${c.id}`.toLowerCase().includes(q.toLowerCase()))), [cat, deck, q]);
  const lead = (c: any) => `${c.id} · ${c.cardType ?? ""}`;
  return (<>
    <Err e={l.err} />
    <section className="card" aria-labelledby="ckh"><h2 id="ckh">Hamma kartalar ({cat.length})</h2>
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }} role="group" aria-label="To'plam">
        <button className={deck === 0 ? "p" : ""} aria-pressed={deck === 0} onClick={() => setDeck(0)}>Hammasi ({cat.length})</button>
        {Object.entries(DECKS).map(([k, n]) => <button key={k} className={deck === Number(k) ? "p" : ""} aria-pressed={deck === Number(k)} onClick={() => setDeck(Number(k))}>{n} ({counts.get(Number(k)) ?? 0})</button>)}
      </div>
      <div className="row" style={{ alignItems: "flex-end" }}><label className="grow">Qidirish<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomi, matni yoki raqami (Y201, BZ001…)" /></label>
        <div className="row" role="group" aria-label="Ko'rinish"><button className={!grid ? "p" : ""} aria-pressed={!grid} onClick={() => setGrid(false)}>Ro'yxat</button><button className={grid ? "p" : ""} aria-pressed={grid} onClick={() => setGrid(true)}>Rasmli</button></div></div>
      {grid && l.data && (() => { const c = l.data.data; const arr: any[] = deck ? (c[DECK_KEYS[deck]] ?? []) : DECK_KEYS.slice(1).flatMap((k) => c[k] ?? []); const list = arr.filter((x) => !q || `${x.text ?? x.name ?? ""} ${x.file ?? ""}`.toLowerCase().includes(q.toLowerCase()));
        return <><p className="muted" style={{ fontSize: 13 }}>O'yinda chiqadigan kartalar asl rasmi bilan ({list.length} ta). Katalog yozuvlari («Ro'yxat») alohida meta-ma'lumot.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginTop: 8 }}>{list.slice(0, 80).map((x, i) => <figure key={`${x.file}${i}`} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {x.file ? <img src={`${CARDS_URL}/${x.file}`} alt={x.text ?? x.name ?? x.file} loading="lazy" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} onError={(e) => ((e.target as HTMLImageElement).style.opacity = ".25")} /> : <span className="muted" style={{ fontSize: 12 }}>rasm yo'q</span>}
          <figcaption className="muted" style={{ fontSize: 12 }}>{x.file}</figcaption></figure>)}</div>{list.length > 80 && <p className="muted">Birinchi 80 ta ko'rsatildi: qidiruvni toraytiring.</p>}</>; })()}
      {!l.data ? <Empty loading={l.loading} /> : grid ? null : (<div className="stack" style={{ marginTop: 12 }}>
        {rows.slice(0, 100).map((c) => { const on = open === c.id; return (
          <div key={c.id} style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", borderColor: on ? "var(--green)" : undefined }}>
            <button aria-expanded={on} onClick={() => setOpen(on ? null : c.id)} style={{ display: "flex", width: "100%", gap: 12, alignItems: "center", textAlign: "left", border: 0, background: "#fff", minHeight: 52, padding: "8px 14px" }}>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block" }}>{c.title}</b><span className="muted" style={{ fontSize: 12 }}>{lead(c)} · {c.display ?? ""}</span></span>
              {c.publish ? <Pill kind="good">Jonli</Pill> : <Pill kind="plain">Qoralama</Pill>}<span aria-hidden>{on ? "▾" : "▸"}</span>
            </button>
            {on && <div style={{ padding: "8px 16px 16px", borderTop: "1px solid var(--line)", display: "grid", gap: 8 }}>
              <p style={{ margin: 0 }}>{c.text}</p>
              <dl className="kv">
                <dt>To'plam</dt><dd>{c.deckName}</dd><dt>Yo'nalish</dt><dd>{c.direction ?? "—"}</dd><dt>Muddat</dt><dd>{c.duration ?? "—"}</dd><dt>Maqsad</dt><dd>{c.goal ?? "—"}</dd><dt>Yosh</dt><dd>{c.age ?? "—"}</dd><dt>Tekshiruv</dt><dd>{c.review ?? "—"}</dd><dt>Rasm</dt><dd>{c.image ?? "—"}</dd>
                {c.sector && <><dt>Soha</dt><dd>{c.sector}</dd></>}
              </dl>
              {Array.isArray(c.effects) && c.effects.length > 0 && <div><b>Ta'sirlar</b><ul style={{ margin: "4px 0 0" }}>{c.effects.map((e: any, i: number) => <li key={i} className="mono">{e.type}: {String(e.value)} ({e.target}, {e.duration})</li>)}</ul></div>}
              {(() => { const first = c.effects?.[0]?.type; const same = cat.filter((o) => o.id !== c.id && o.deck === c.deck && first && o.effects?.some((e: any) => e.type === first)); const dream = (c.effects ?? []).find((e: any) => e.type === "ORZU_SHARTI");
                return <div><b>Bog'liqliklar</b><ul style={{ margin: "4px 0 0" }}>
                  <li>To'plam: {c.deckName} ({counts.get(c.deck) ?? 0} ta karta)</li>
                  {dream && <li>Orzu sharti: <span className="mono">{String(dream.value)}</span> — orzu g'alaba shartiga ta'sir qiladi</li>}
                  {first && <li>Shu ta'sir turi (<span className="mono">{first}</span>) bor boshqa kartalar: {same.length}{same.length > 0 && <> — {same.slice(0, 3).map((o) => <button key={o.id} className="link" onClick={() => setOpen(o.id)} style={{ marginLeft: 6 }}>{o.id}</button>)}</>}</li>}
                  {c.needsMapping && <li>Qoidalar dvigatelida ta'sir xaritasi kerak (needsMapping)</li>}
                </ul></div>; })()}
            </div>}
          </div>); })}
        {rows.length === 0 && <p className="muted">Topilmadi</p>}
        {rows.length > 100 && <p className="muted">Birinchi 100 ta ko'rsatildi ({rows.length} ta mos): qidiruvni toraytiring.</p>}
      </div>)}
    </section></>);
}

export function Professions({ api }: { api: Api }) {
  const l = useCards(api); const [q, setQ] = useState(""); const [open, setOpen] = useState<number | null>(null);
  const list: any[] = (l.data?.data?.kasb ?? []).filter((p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const all: any[] = l.data?.data?.kasb ?? [];
  const stat = (f: (p: any) => number) => { const v = all.map(f).filter((x) => Number.isFinite(x)); return v.length ? `${fm(Math.min(...v))} · ${fm(v.reduce((a, b) => a + b, 0) / v.length)} · ${fm(Math.max(...v))}` : "—"; };
  return (<>
    <Err e={l.err} />
    <section className="card"><h2>Kasblar ({all.length})</h2>
      <div className="stats"><div className="stat"><b>{stat((p) => p.salary)}</b><span>Ish haqi: eng past · o'rtacha · eng yuqori</span></div><div className="stat"><b>{stat((p) => p.cf)}</b><span>Pul oqimi: eng past · o'rtacha · eng yuqori</span></div><div className="stat"><b>{all.filter((p) => Array.isArray(p.exp)).length} / {all.length}</b><span>Xarajat satrlari bor kartalar</span></div></div>
      <label style={{ marginTop: 12 }}>Qidirish<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kasb nomi" /></label>
      {!l.data ? <Empty loading={l.loading} /> : <div className="stack" style={{ marginTop: 12 }}>
        {list.map((p) => { const on = open === p.n; const max = Math.max(1, ...(p.exp ?? [1])); const ok = p.salary - p.total === p.cf; return (
          <div key={p.n} style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", borderColor: on ? "var(--green)" : undefined }}>
            <button aria-expanded={on} onClick={() => setOpen(on ? null : p.n)} style={{ display: "flex", width: "100%", gap: 12, alignItems: "center", textAlign: "left", border: 0, background: "#fff", minHeight: 56, padding: "8px 14px" }}>
              <span className="pill" style={{ background: "#08263E", color: "#fff", minWidth: 30, textAlign: "center", borderRadius: 8, padding: "4px 6px" }}>{p.n}</span>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block" }}>{p.name}</b><span className="muted" style={{ fontSize: 12 }}>Ish haqi {fm(p.salary)} · xarajat {fm(p.total)} · pul oqimi {fm(p.cf)}</span></span>
              {!ok && <Pill kind="bad">Hisob mos emas</Pill>}<span aria-hidden>{on ? "▾" : "▸"}</span>
            </button>
            {on && <div style={{ padding: "8px 16px 16px", borderTop: "1px solid var(--line)", display: "grid", gap: 12 }}>
              {p.file && <img src={`${CARDS_URL}/${p.file}`} alt="" style={{ maxWidth: 160, borderRadius: 8, border: "1px solid var(--line)" }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
              <div><b>Xarajat satrlari</b>{Array.isArray(p.exp) ? p.exp.map((v: number, i: number) => <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 1fr 70px", gap: 10, alignItems: "center", fontSize: 13, padding: "3px 0" }}><span>{EXP_NAMES[i]}</span><span style={{ height: 8, borderRadius: 4, background: "#E6ECF0" }}><i style={{ display: "block", height: 8, borderRadius: 4, background: "#E0A21B", width: `${Math.round((v * 100) / max)}%` }} /></span><b style={{ textAlign: "right" }}>{fm(v)}</b></div>) : <p className="muted">Bu kartada satrlar bo'yicha taqsimot yo'q: faqat jami xarajat saqlangan.</p>}</div>
              <dl className="kv"><dt>Jamg'arma</dt><dd>{fm(p.save)}</dd><dt>Kvartira (qiymati)</dt><dd>{p.kv ? fm(p.kv) : "—"}</dd><dt>Avtomobil (qiymati)</dt><dd>{p.car ? fm(p.car) : "—"}</dd><dt>Bola uchun xarajat</dt><dd>{p.child ? fm(p.child) : "—"}</dd></dl>
              <p className="muted" style={{ margin: 0 }}>Tekshiruv: ish haqi − xarajat = pul oqimi ({fm(p.salary)} − {fm(p.total)} = {fm(p.salary - p.total)}) {ok ? "✓" : `— kartada ${fm(p.cf)}`}</p>
            </div>}
          </div>); })}
        {list.length === 0 && <p className="muted">Topilmadi</p>}
      </div>}
    </section></>);
}
void errText;
