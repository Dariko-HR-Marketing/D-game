import React, { useState } from "react";
import type { Api } from "./api";
import { Banner, Empty, Err, FormDialog, PageHead, Pill, Tabs, download, csv, errText, fmtTime, useLoad } from "./lib";
import { t } from "./uz";

type Dlg = null | { kind: "ban" | "unban" | "plus" | "revoke" | "clear" | "unlink" | "delete" | "rename" };
export function Users({ api }: { api: Api }) {
  const [q, setQ] = useState(""); const [f, setF] = useState<"all" | "banned" | "plus" | "minor" | "unreliable">("all"); const [sel, setSel] = useState<string | null>(null); const [off, setOff] = useState(0);
  const qs = `?q=${encodeURIComponent(q)}&offset=${off}${f !== "all" ? `&${f}=1` : ""}`;
  const l = useLoad<{ total: number; users: any[] }>(api, "/admin/users" + qs, [q, f, off]);
  if (sel) return <UserCard api={api} id={sel} onBack={() => { setSel(null); l.reload(); }} />;
  const exp = () => download("foydalanuvchilar.csv", csv([["ID", "Ism", "Yosh", "Daraja", "O'yin", "Plus", "Bloklangan", "Oxirgi faollik"], ...(l.data?.users ?? []).map((u) => [u.id, u.name, u.age, u.level, u.games, u.plus ? "ha" : "", u.banned ? "ha" : "", new Date(u.lastSeen).toISOString()])]));
  return (<>
    <PageHead title={t.users}><label style={{ minWidth: 260 }}><span className="sr">{t.search}</span><input type="search" aria-label={t.search} placeholder="Ism yoki ID" value={q} onChange={(e) => { setQ(e.target.value); setOff(0); }} /></label><button onClick={exp} disabled={!l.data?.users.length}>CSV</button></PageHead>
    <Tabs label="Filtr" active={f} onChange={(k) => { setF(k); setOff(0); }} items={[["all", "Hammasi"], ["banned", "Bloklangan"], ["plus", "Plus"], ["minor", "16 yoshgacha"], ["unreliable", "Ishonchsiz"]]} />
    <section className="card"><Err e={l.err} />{!l.data?.users.length ? <Empty loading={l.loading} /> : <><div className="tw" tabIndex={0} role="region" aria-label="Jadval"><table><thead><tr><th>Foydalanuvchi</th><th>Yosh</th><th>Daraja</th><th>O'yin</th><th>Holat</th><th>Oxirgi faollik</th><th><span className="sr">Amal</span></th></tr></thead><tbody>{l.data.users.map((u) => (
      <tr key={u.id}><td><b>{u.name ?? "—"}</b><div className="mono">{u.id}</div></td><td className="num">{u.age ?? "—"}</td><td className="num">{u.level ?? "—"}</td><td className="num">{u.games}</td>
        <td>{u.banned ? <Pill kind="bad">Bloklangan{u.banUntil ? ` · ${fmtTime(u.banUntil)} gacha` : ""}</Pill> : null} {u.plus && <Pill kind="good">Plus</Pill>} {u.minor && <Pill kind="info">16−</Pill>} {u.unreliable > 0 && <Pill kind="warn">Ishonchsiz ×{u.unreliable}</Pill>}</td>
        <td className="muted">{fmtTime(u.lastSeen)}</td><td><button className="sm" onClick={() => setSel(u.id)}>Karta</button></td></tr>))}</tbody></table></div>
      <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}><span className="muted">Jami: {l.data.total}</span><span className="row"><button className="sm" disabled={off === 0} onClick={() => setOff(Math.max(0, off - 50))}>← Oldingi</button><button className="sm" disabled={off + 50 >= l.data.total} onClick={() => setOff(off + 50)}>Keyingi →</button></span></div></>}</section>
  </>);
}

function UserCard({ api, id, onBack }: { api: Api; id: string; onBack: () => void }) {
  const c = useLoad<any>(api, `/admin/users/${id}`); const [dlg, setDlg] = useState<Dlg>(null); const [msg, setMsg] = useState<string | null>(null); const x = c.data;
  const act = (path: string, extra: (v: Record<string, string>) => object = () => ({}), method: "post" | "delete" = "post") => async (v: Record<string, string>) => { const r = method === "post" ? await api.post(path, { reason: v.reason, ...extra(v) }) : await api.delete(path, { reason: v.reason }); if (r.error) throw new Error(r.error); setDlg(null); setMsg(t.saved); c.reload(); };
  const R = { key: "reason", label: t.reason, required: true, hint: "Auditga yoziladi" } as const;
  const exportData = async () => { const j = await api.get(`/admin/users/${id}/export`); download(`foydalanuvchi-${id}.json`, JSON.stringify(j, null, 2), "application/json"); };
  return (<>
    <PageHead title={x?.profile?.name ?? id}><button onClick={onBack}>← Ro'yxat</button></PageHead>
    <Err e={c.err} />{msg && <Banner kind="good">{msg}</Banner>}{x?.error && <Banner kind="bad">{errText({ body: { error: x.error } } as any)}</Banner>}
    {!x || x.error ? <Empty loading={c.loading} /> : (<>
      <div className="grid2">
        <section className="card"><h2>Profil</h2><dl className="kv"><dt>ID</dt><dd className="mono">{x.id}</dd><dt>Ism</dt><dd>{x.profile?.name ?? "—"}</dd><dt>Yosh</dt><dd>{x.profile?.age ?? "—"}</dd><dt>Birinchi kirish</dt><dd>{fmtTime(x.firstSeen)}</dd><dt>Oxirgi faollik</dt><dd>{fmtTime(x.lastSeen)}</dd><dt>Telefon</dt><dd>{x.phoneVerified ? <Pill kind="good">Tasdiqlangan</Pill> : <Pill kind="plain">Tasdiqlanmagan</Pill>}</dd>
          <dt>Holat</dt><dd>{x.banned ? <Pill kind="bad">Bloklangan</Pill> : <Pill kind="good">Faol</Pill>} {x.ban && <span className="muted">{x.ban.reason}{x.ban.until ? ` · ${fmtTime(x.ban.until)} gacha` : " · muddatsiz"}</span>}</dd>
          <dt>Plus</dt><dd>{x.plus.active ? <Pill kind="good">{fmtTime(x.plus.until)} gacha</Pill> : "—"}</dd>{x.parentControls && <><dt>Ota-ona nazorati</dt><dd>qarz: {x.parentControls.loans ? "ruxsat" : "yopiq"} · chat: {x.parentControls.chat ? "ruxsat" : "yopiq"} · faqat do'stlar: {x.parentControls.friendsOnly ? "ha" : "yo'q"}</dd></>}</dl></section>
        {x.stats && <section className="card"><h2>O'yin statistikasi</h2><div className="stats">{[["Daraja", x.stats.level], ["Ball", x.stats.points], ["O'yin", x.stats.games], ["G'alaba", x.stats.wins], ["Katta aylana", x.stats.reachedBig], ["Ishonchsiz", x.stats.unreliable], ["Yutuq", x.stats.achievements]].map(([k, v]) => <div className="stat" key={String(k)}><b>{v}</b><span>{k}</span></div>)}</div></section>}
      </div>
      <section className="card"><h2>Amallar</h2><div className="row">
        {x.banned ? <button onClick={() => setDlg({ kind: "unban" })}>Blokdan chiqarish</button> : <button className="d" onClick={() => setDlg({ kind: "ban" })}>Bloklash</button>}
        <button onClick={() => setDlg({ kind: "rename" })}>Ismni almashtirish</button>
        {x.canManage && <><button onClick={() => setDlg({ kind: "plus" })}>Plus berish</button><button onClick={() => setDlg({ kind: "revoke" })} disabled={!x.plus.active}>Plusni qaytarib olish</button><button onClick={() => setDlg({ kind: "clear" })} disabled={!x.stats?.unreliable}>«Ishonchsiz» belgisini olib tashlash</button><button onClick={() => setDlg({ kind: "unlink" })}>Telefonni bo'shatish</button><button onClick={exportData}>Ma'lumotni yuklab olish</button><button className="d" onClick={() => setDlg({ kind: "delete" })}>Hisobni o'chirish</button></>}
      </div></section>
      <div className="grid2">
        <section className="card"><h2>Shikoyatlar</h2>{x.complaints.length === 0 ? <p className="muted">Yo'q</p> : x.complaints.map((k: any) => <div className="attn" key={k.id}><span><Pill kind={k.role === "against" ? "bad" : "info"}>{k.role === "against" ? "unga qarshi" : "o'zi yozgan"}</Pill> {k.text}</span><span className="muted">{fmtTime(k.at)}</span></div>)}</section>
        <section className="card"><h2>Buyurtmalar</h2>{x.orders.length === 0 ? <p className="muted">Yo'q</p> : x.orders.map((o: any) => <div className="attn" key={o.id}><span>{o.title} · {o.amount} <Pill kind={o.status === "paid" ? "good" : o.status === "refunded" ? "warn" : "plain"}>{o.status}</Pill></span><span className="muted">{fmtTime(o.createdAt)}</span></div>)}</section>
        <section className="card"><h2>Sinf va turnirlar</h2>{[...x.classes.map((k: any) => <div className="attn" key={k.id}><span>Sinf: {k.name}</span><Pill kind="info">{k.role === "teacher" ? "o'qituvchi" : "o'quvchi"}</Pill></div>), ...x.tournaments.map((k: any) => <div className="attn" key={k.id}><span>Turnir: {k.title}</span><Pill kind={k.approved ? "good" : "warn"}>{k.approved ? "tasdiqlangan" : "rozilik kutilmoqda"}</Pill></div>)]}{!x.classes.length && !x.tournaments.length && <p className="muted">Yo'q</p>}</section>
        <section className="card"><h2>Oxirgi o'yinlar</h2>{x.history.length === 0 ? <p className="muted">Yo'q</p> : x.history.map((h: any, i: number) => <div className="attn" key={i}><span className="mono">{h.room}</span><span className="muted">{fmtTime(h.finishedAt)}</span></div>)}</section>
      </div>
      <FormDialog open={dlg?.kind === "ban"} danger title="Bloklash" body="Foydalanuvchi o'yindan chiqariladi (o'rniga bot o'ynaydi)." fields={[R, { key: "days", label: "Muddat (kun)", type: "number", hint: "Bo'sh = muddatsiz" }]} onClose={() => setDlg(null)} onOk={act(`/admin/users/${id}/ban`, (v) => ({ days: v.days ? Number(v.days) : null }))} />
      <FormDialog open={dlg?.kind === "unban"} title="Blokdan chiqarish" fields={[R]} onClose={() => setDlg(null)} onOk={act(`/admin/users/${id}/unban`)} />
      <FormDialog open={dlg?.kind === "rename"} title="Ismni almashtirish" body="Ism standart «O'yinchi …» ga o'zgaradi." fields={[R]} onClose={() => setDlg(null)} onOk={act(`/admin/users/${id}/rename`)} />
      <FormDialog open={dlg?.kind === "plus"} title="Plus berish" fields={[{ key: "plan", label: "Reja", type: "select", options: [["monthly", "30 kun"], ["yearly", "365 kun"]] }, R]} onClose={() => setDlg(null)} onOk={act(`/admin/users/${id}/plus`, (v) => ({ plan: v.plan }))} />
      <FormDialog open={dlg?.kind === "revoke"} danger title="Plusni qaytarib olish" fields={[R]} onClose={() => setDlg(null)} onOk={act(`/admin/users/${id}/plus`, () => ({ action: "revoke" }))} />
      <FormDialog open={dlg?.kind === "clear"} title="«Ishonchsiz» belgisini olib tashlash" body="Ball jazosi ham olib tashlanadi." fields={[R]} onClose={() => setDlg(null)} onOk={act(`/admin/users/${id}/clear-unreliable`)} />
      <FormDialog open={dlg?.kind === "unlink"} title="Telefonni bo'shatish" body="Raqam boshqa hisobga bog'lanishi mumkin bo'ladi." fields={[R]} onClose={() => setDlg(null)} onOk={act(`/admin/users/${id}/unlink-phone`)} />
      <FormDialog open={dlg?.kind === "delete"} danger title="Hisobni o'chirish" body="Qaytarib bo'lmaydi: profil, xaridlar, a'zoliklar o'chadi, o'yin natijalaridagi ID anonimlashadi." fields={[R]} onClose={() => setDlg(null)} onOk={async (v) => { const r = await api.delete(`/admin/users/${id}`, { reason: v.reason }); if (r.error) throw new Error(r.error); setDlg(null); onBack(); }} />
    </>)}
  </>);
}
