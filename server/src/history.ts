// O'yin tarixi: jurnalni qadam-baqadam qayta o'ynab, har bir amalda kim qaysi katakdan qaysisiga yurgani, qaysi karta chiqqani, qanday qaror qilingani va pul qanday o'zgargani yoziladi.
// Maqsad — keyingi tahlil (qarorlar to'g'ri/noto'g'ri bo'lganligi, kuchli/zaif tomonlar — SWOT). Faqat jurnaldan hisoblanadi (yangi ma'lumot saqlanmaydi, hisob daftari izohlari bundan mustasno).
import { allDebt, chooseDream, crisisAdjusted, effectOf, newGame, passiveIncome, playerCashflow, reduce, smallCell, type Action, type Ctx, type GameState } from "@poyga/rules";
import type { JournalEntry } from "./store";

export interface HSnap { cash: number; passive: number; flow: number; debt: number; assets: number; pos: number; circle: "small" | "big"; months: number }
export interface HEvent {
  n: number; seq: number; at: number; round: number; by: string; type: string;
  /** Avtomatik bajarilgan bo'lsa sababi: timeout (vaqt tugadi), bot, left, dream_timeout, proposal_timeout */
  auto: string | null;
  move?: { from: number; to: number; die: number | null; dice?: number[]; fromCircle: "small" | "big"; toCircle: "small" | "big"; cell: { t: string; name?: string }; months: number };
  /** drawn — karta tortildi, qaror kutilmoqda; applied — majburiy karta darhol qo'llandi; decided — shu amalda qaror qilindi */
  card?: { id: string; stage: "drawn" | "applied" | "decided"; deck: string; mode: string; kind: string; text: string; file: string };
  decision?: { accept: boolean; qty?: number; useBank?: boolean; deck?: string };
  /** Sotib olish qarorining raqamlari (keyingi tahlil uchun): narx, boshlang'ich to'lov, oylik daromad, yillik daromadlilik %, qoplanish (oy), bank krediti */
  invest?: { price: number; down: number; income: number; yieldPct: number | null; paybackMonths: number | null; bankLoan: number };
  before: HSnap; after: HSnap; delta: { cash: number; passive: number; flow: number; debt: number };
  assetsAdded: string[]; assetsLost: string[];
  /** Dvigatel yozgan hodisalar (xom ko'rinishda: o'yinchi identifikatorlari bilan) */
  log: string[];
  /** Hisob daftari: shu amalgacha o'yinchi hisobini necha xato bilan to'g'rilagani */
  calc?: { kind: "decide" | "confirm"; wrong: number; hint: boolean }[];
  ok: boolean; error?: string;
}
export interface History { events: HEvent[]; players: string[]; truncated: boolean; winner: string | null }

const snap = (p: any): HSnap => ({ cash: Math.round(p.cash), passive: Math.round(passiveIncome(p)), flow: Math.round(playerCashflow(p)), debt: Math.round(allDebt(p) + (p.handDebts ?? []).reduce((s: number, d: any) => s + d.amount, 0)), assets: p.assets.length, pos: p.pos, circle: p.circle, months: p.monthsPlayed ?? 0 });
const cellOf = (ctx: Ctx, circle: "small" | "big", pos: number) => (circle === "big" ? { t: ctx.bigBoard[pos]?.t ?? "?", name: ctx.bigBoard[pos]?.name } : { t: smallCell(pos) as string });

export function buildHistory(ctx: Ctx, final: GameState, journal: JournalEntry[], cap = 5000): History {
  let s = newGame(ctx, final.players.map((p) => p.id), final.seed, final.bots, final.restricted ?? [], { dreamPhase: !!final.dreamPhase, events: !!final.events, openingDice: !!final.openingDice, mode: final.mode });
  if (!final.dreamPhase) s.players.forEach((p, i) => (s = chooseDream(s, p.id, i % ctx.dreams.length)));
  const events: HEvent[] = [];
  for (const [k, e] of journal.slice(0, cap).entries()) {
    const auto = "reason" in e.action ? e.action.reason : null; const act = ("reason" in e.action ? e.action.action : e.action) as Action;
    const by = (act as { playerId: string }).playerId; const before = s; const bp = before.players.find((p) => p.id === by);
    const o = reduce({ ...before, log: [] }, ctx, act); // log bo'sh boshlanadi: faqat shu amal yozgan hodisalar qoladi
    if (!o.ok) { events.push({ n: k + 1, seq: e.seq, at: e.at, round: before.round, by, type: act.type, auto, before: bp ? snap(bp) : (undefined as any), after: bp ? snap(bp) : (undefined as any), delta: { cash: 0, passive: 0, flow: 0, debt: 0 }, assetsAdded: [], assetsLost: [], log: [], ok: false, error: String(o.error) }); continue; }
    s = o.state; const ap = s.players.find((p) => p.id === by);
    const ev: HEvent = { n: k + 1, seq: e.seq, at: e.at, round: s.round, by, type: act.type, auto, before: bp ? snap(bp) : (undefined as any), after: ap ? snap(ap) : (undefined as any),
      delta: { cash: 0, passive: 0, flow: 0, debt: 0 }, assetsAdded: [], assetsLost: [], log: s.log.slice(), ok: true };
    if (bp && ap) {
      ev.delta = { cash: ev.after.cash - ev.before.cash, passive: ev.after.passive - ev.before.passive, flow: ev.after.flow - ev.before.flow, debt: ev.after.debt - ev.before.debt };
      const had = new Map<string, number>(); for (const a of bp.assets) had.set(`${a.kind}:${a.code}`, (had.get(`${a.kind}:${a.code}`) ?? 0) + 1);
      const now = new Map<string, number>(); for (const a of ap.assets) now.set(`${a.kind}:${a.code}`, (now.get(`${a.kind}:${a.code}`) ?? 0) + 1);
      for (const [key, n] of now) if (n > (had.get(key) ?? 0)) ev.assetsAdded.push(key.split(":").slice(1).join(":"));
      for (const [key, n] of had) if (n > (now.get(key) ?? 0)) ev.assetsLost.push(key.split(":").slice(1).join(":"));
    }
    if (act.type === "roll" && bp && ap) ev.move = { from: bp.pos, to: ap.pos, die: s.lastRoll?.playerId === by ? s.lastRoll.die : null, ...(s.lastRoll?.playerId === by && (s.lastRoll.dice?.length ?? 0) > 1 ? { dice: s.lastRoll.dice } : {}), fromCircle: bp.circle, toCircle: ap.circle, cell: cellOf(ctx, ap.circle, ap.pos), months: (ap.monthsPlayed ?? 0) - (bp.monthsPlayed ?? 0) };
    const cardInfo = (id: string, stage: "drawn" | "applied" | "decided") => { const ce = effectOf(ctx, id, id === s.pending?.cardId ? s.pending : before.pending); return ce ? { id, stage, deck: ce.deck, mode: ce.mode, kind: (ce.effect as { kind?: string }).kind ?? "", text: ce.text ?? "", file: ce.file } : undefined; };
    if (act.type === "decide" && before.pending) {
      ev.card = cardInfo(before.pending.cardId, "decided"); ev.decision = { accept: act.accept, ...(act.qty ? { qty: act.qty } : {}), ...(act.useBank !== undefined ? { useBank: act.useBank } : {}), ...(act.deck ? { deck: act.deck } : {}) };
      const eff = ev.card && bp ? crisisAdjusted(effectOf(ctx, before.pending.cardId, before.pending).effect, bp as any) as any : null;
      if (act.accept && eff && eff.kind === "buy" && ap && bp) { const price = eff.price, down = eff.down ?? eff.price, income = eff.monthlyIncome ?? 0; ev.invest = { price, down, income, yieldPct: price > 0 && income > 0 ? Math.round((income * 12 * 1000) / price) / 10 : null, paybackMonths: income > 0 ? Math.ceil(price / income) : null, bankLoan: Math.max(0, (ap as any).bankDebt - (bp as any).bankDebt) }; }
    } else if (s.pending && act.type === "roll") ev.card = cardInfo(s.pending.cardId, "drawn");
    else if (act.type === "roll" && s.lastCard && s.lastCard.playerId === by && (before.lastCard?.n ?? 0) < s.lastCard.n) ev.card = cardInfo(s.lastCard.cardId, "applied");
    if ((e as { notes?: HEvent["calc"] }).notes?.length) ev.calc = (e as { notes?: HEvent["calc"] }).notes;
    events.push(ev);
  }
  return { events, players: s.players.map((p) => p.id), truncated: journal.length > cap, winner: s.winner ?? null };
}

const q = (v: unknown) => { const t = String(v ?? ""); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
/** Tahlil uchun CSV (Excel/SWOT): har qator — bitta amal. Ismlar o'rniga `name` berilsa shu ishlatiladi. */
export function historyCsv(h: History, name: (id: string) => string): string {
  const head = ["n", "tur", "oy", "o'yinchi", "amal", "avto", "katakdan", "katakka", "kubik", "katak_turi", "karta", "karta_turi", "qaror", "naqd_oldin", "naqd_keyin", "passiv_oldin", "passiv_keyin", "oqim_oldin", "oqim_keyin", "qarz_oldin", "qarz_keyin", "aktiv_qoshildi", "aktiv_yoqoldi", "yillik_daromad_foiz", "qoplanish_oy", "hisob_xato"];
  const rows = h.events.map((e) => [e.n, e.round, e.after?.months ?? "", name(e.by), e.type, e.auto ?? "", e.move?.from ?? "", e.move?.to ?? "", e.move?.die ?? "", e.move ? e.move.cell.t : "", e.card?.id ?? "", e.card?.kind ?? "", e.decision ? (e.decision.accept ? "qabul" : "o'tkazish") : "",
    e.before?.cash ?? "", e.after?.cash ?? "", e.before?.passive ?? "", e.after?.passive ?? "", e.before?.flow ?? "", e.after?.flow ?? "", e.before?.debt ?? "", e.after?.debt ?? "", e.assetsAdded.join("|"), e.assetsLost.join("|"), e.invest?.yieldPct ?? "", e.invest?.paybackMonths ?? "", e.calc ? e.calc.reduce((n, c) => n + c.wrong, 0) : ""]);
  return "﻿" + [head, ...rows].map((r) => r.map(q).join(";")).join("\n");
}

/** Mijozga beriladigan ko'rinish: identifikatorlar o'rniga ism ("Siz", "Bot N"); dvigatel yozuvlaridagi identifikatorlar ham almashtiriladi. */
export function presentHistory(h: History, final: GameState, nameOf: (id: string) => string | undefined, me: string) {
  const label = new Map<string, string>(); let n = 0, nb = 0;
  const bots = new Set(final.bots ?? []);
  for (const id of h.players) label.set(id, id === me ? "Siz" : bots.has(id) ? `Bot ${++nb}` : nameOf(id) ?? `O'yinchi ${++n}`);
  const nm = (id: string) => label.get(id) ?? id;
  const swap = (t: string) => { let o = t; for (const [id, l] of label) o = o.split(`${id}:`).join(`${l}:`); return o; };
  // Hisob aniqligi: hisob daftari izohlaridan (faqat «o'zim hisoblayman» rejimida bo'ladi)
  const acc = (id: string) => { let first = 0, retried = 0; for (const e of h.events) if (e.by === id) for (const c of e.calc ?? []) c.wrong === 0 ? first++ : retried++; return first + retried ? { firstTry: first, retried } : null; };
  return { ...h, winner: h.winner ? nm(h.winner) : null, players: h.players.map((id) => ({ id: nm(id), isMe: id === me, bot: bots.has(id), calc: acc(id) })), events: h.events.map((e) => ({ ...e, by: nm(e.by), mine: e.by === me, log: e.log.map(swap) })) };
}
