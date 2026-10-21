// «Lahzalar»: o'yinda bo'layotgan muhim voqealar (farzand, ishdan bo'shash, kutilmagan hodisa, xarid, bozor, imkoniyat, daraja ochilishi...) —
// holat o'zgarishidan aniqlanadi (server holati manba; yangi hisob yo'q) va o'yinchiga ovoz + qisqa animatsiya + bir qator tushuntirish bilan bildiriladi.
// React'siz — testlanadi. Ko'rsatish: ui/MomentLayer.tsx, ovoz: sound.ts.
import { exitProgress, marketOffers, nameOf } from "./model";
import { portfolioOf } from "./portfolio";
import { uz } from "./i18n/uz";
import { money } from "./format";
import type { Sfx } from "./sound";

export type MomentKind = "child" | "payday" | "jobLoss" | "quitJob" | "unexpected" | "market" | "offer" | "opportunity" | "expense" | "buy" | "sell" | "unlock" | "lock" | "condition" | "ready" | "exit" | "newJob";
export interface Moment {
  id: string; kind: MomentKind; mine: boolean; who: string;
  title: string; text?: string;
  /** Tushuntirish qatori (qoida/oqibat): «nima bu va endi nima bo'ladi» — o'yinchi bexabar qolmasligi uchun */
  note?: string;
  tone: "good" | "bad" | "info" | "special";
  /** Chalinadigan ovoz (bo'lmasa — jim; pul ovozlari alohida) */
  sfx?: Sfx;
  /** Kuchli lahza: ekran chetida qisqa rangli yaltirash + uzoqroq turadi */
  strong?: boolean;
  /** Animatsiya turi: sakrash / silkinish / urish (pulse) */
  anim: "bounce" | "shake" | "pulse";
  /** Ko'rinish vaqti (ms) */
  ttl: number;
}

const UNLOCK_CASH = 25_000;
/** Bir lahzaning standart ko'rinish vaqti; tushuntirishli lahzalar uzoqroq turadi. */
const TTL = { short: 3400, normal: 4600, long: 7500 };

export interface PSnap { children: number; noSalary: number; quitJob: boolean; restarts: number; circle: string; assets: number; cash: number; months: number; crisis: number; business: number }
export interface RoomSnap { players: Record<string, PSnap>; cardN: number; offers: Set<number>; unlocked: boolean | null; conds: { cash: boolean; flow: boolean; debt: boolean; partner: boolean } | null }

const bizCount = (p: any) => (p.assets ?? []).filter((a: any) => a.kind === "small_business" || a.kind === "business").length;
export function snapRoom(room: any, userId: string): RoomSnap | null {
  const st = room?.state; if (!st) return null;
  const players: Record<string, PSnap> = {};
  for (const p of st.players) players[p.id] = { children: p.children ?? 0, noSalary: p.noSalary ?? 0, quitJob: !!p.quitJob, restarts: p.restarts ?? 0, circle: p.circle, assets: (p.assets ?? []).length, cash: p.cash, months: p.monthsPlayed ?? 0, crisis: p.crisisMonths ?? 0, business: bizCount(p) };
  const mine = st.players.find((p: any) => p.id === userId);
  const ep = mine && mine.circle === "small" ? exitProgress(mine, st.mode) : null;
  return { players, cardN: st.lastCard?.n ?? 0, offers: new Set(marketOffers(room, userId).map((o) => o.proposalId)),
    unlocked: mine && mine.circle === "small" ? mine.cash > UNLOCK_CASH : null, conds: ep ? { cash: ep.checks.cash, flow: ep.checks.flow, debt: ep.checks.debt, partner: ep.checks.partner } : null };
}

let seq = 0;
const mk = (m: Omit<Moment, "id" | "ttl" | "anim"> & { ttl?: number; anim?: Moment["anim"] }): Moment => ({ id: `m${++seq}`, ttl: m.ttl ?? (m.strong ? TTL.normal : TTL.short), anim: m.anim ?? "pulse", ...m });
const firstSentence = (t: string, n = 90) => { const s = (t.split(/(?<=[.!?])\s/)[0] ?? t).trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const deckOfCard = (id: string) => id.split("-")[0];

/** Oldingi va hozirgi holat farqidan lahzalar ro'yxati (eng muhimi birinchi). `prev` yo'q bo'lsa (sahifa ochildi) — hech narsa. */
export function detectMoments(prev: RoomSnap | null, room: any, userId: string): Moment[] {
  const st = room?.state; if (!prev || !st) return [];
  const out: Moment[] = []; const M = uz.moments;
  const pf = portfolioOf(room, userId);
  for (const p of st.players) {
    const o = prev.players[p.id]; if (!o) continue;
    const mine = p.id === userId, who = mine ? uz.result.you : nameOf(room, p.id);
    const wasBig = o.circle === "big", isBig = p.circle === "big";
    if (p.restarts > o.restarts && !isBig) { // yangi kasb bilan boshidan (qarz limiti)
      out.push(mk({ kind: "newJob", mine, who, tone: "bad", strong: mine, anim: "shake", sfx: mine ? "lose" : undefined, title: mine ? M.newJob : `${who}: ${M.newJobOther}`, text: mine ? M.newJobText : undefined, note: mine ? M.newJobNote : undefined, ttl: TTL.long }));
      continue;
    }
    if (!wasBig && isBig) { // kichik aylanadan chiqdi: bizneslar bankka topshiriladi (o'yinchi bexabar qolmasin)
      const handed = o.business - bizCount(p);
      out.push(mk({ kind: "exit", mine, who, tone: "special", strong: true, anim: "bounce", sfx: mine ? "levelup" : undefined, title: mine ? M.exit : `${who}: ${M.exitOther}`, text: mine ? M.exitText : undefined,
        note: mine ? `${handed > 0 ? M.exitHanded.replace("{n}", String(handed)) + " " : ""}${M.exitNote.replace("{flow}", money(p.lockedFlow ?? 0))}` : undefined, ttl: TTL.long }));
      continue;
    }
    if (wasBig && !isBig) { // katta aylanadan qaytdi (qarz yopilmadi / bankrot): yangi kasb
      out.push(mk({ kind: "newJob", mine, who, tone: "bad", strong: mine, anim: "shake", sfx: mine ? "lose" : undefined, title: mine ? M.backSmall : `${who}: ${M.backSmallOther}`, text: mine ? M.newJobText : undefined, note: mine ? M.backSmallNote : undefined, ttl: TTL.long }));
      continue;
    }
    if (p.children > o.children) out.push(mk({ kind: "child", mine, who, tone: "good", strong: mine, anim: "bounce", sfx: mine ? "child" : undefined, title: mine ? M.child : `${who}: ${M.childOther}`, text: mine ? M.childText.replace("{n}", String(p.children)) : undefined, note: mine ? M.childNote : undefined }));
    if ((p.noSalary ?? 0) > 0 && o.noSalary === 0) out.push(mk({ kind: "jobLoss", mine, who, tone: "bad", strong: mine, anim: "shake", sfx: mine ? "jobloss" : undefined, title: mine ? M.jobLoss : `${who}: ${M.jobLossOther}`, text: mine ? M.jobLossText.replace("{n}", String(p.noSalary)) : undefined, note: mine ? M.jobLossNote : undefined, ttl: TTL.normal }));
    if (p.quitJob && !o.quitJob) out.push(mk({ kind: "quitJob", mine, who, tone: "special", strong: mine, anim: "bounce", sfx: mine ? "freedom" : undefined, title: mine ? M.quitJob : `${who}: ${M.quitJobOther}`, text: mine ? M.quitJobText : undefined, note: mine ? M.quitJobNote : undefined, ttl: TTL.long }));
    if ((p.monthsPlayed ?? 0) > o.months && mine) { const f = exitProgress(p).cashflow; out.push(mk({ kind: "payday", mine, who, tone: f >= 0 ? "good" : "bad", anim: "pulse", title: M.payday, text: `${M.paydayFlow}: ${f > 0 ? "+" : ""}${money(f)}` })); }
    if (mine && pf) {
      const nA = (p.assets ?? []).length;
      if (nA > o.assets) { const a = pf.assets[pf.assets.length - 1]; if (a) out.push(mk({ kind: "buy", mine, who, tone: "good", strong: true, anim: "bounce", sfx: "buy", title: M.buy, text: a.title, note: [`${M.price}: ${money(a.price)}`, a.income ? `${M.incomePerMonth}: +${money(a.income)}` : null, a.yearly !== null ? `${M.yearly}: ${a.yearly} %` : null].filter(Boolean).join(" · ") })); }
      else if (nA < o.assets && p.restarts === o.restarts && p.circle === o.circle && p.cash > o.cash) out.push(mk({ kind: "sell", mine, who, tone: "good", anim: "bounce", sfx: "sell", title: M.sell, text: `${M.cashIn}: +${money(p.cash - o.cash)}` }));
    }
  }
  // Karta tortildi: turi bo'yicha his-tuyg'uli ishora (o'z kartasi — kuchli; boshqaniki — faqat kutilmagan hodisa)
  const lc = st.lastCard as { playerId: string; cardId: string; n: number } | null | undefined, card = room.lastCard;
  if (lc && lc.n > prev.cardN) {
    const mine = lc.playerId === userId, who = mine ? uz.result.you : nameOf(room, lc.playerId), deck = deckOfCard(lc.cardId), text = card?.text ? firstSentence(card.text) : undefined;
    if (deck === "hod") out.unshift(mk({ kind: "unexpected", mine, who, tone: "bad", strong: true, anim: "shake", sfx: mine ? "unexpected" : undefined, title: mine ? uz.moments.unexpected : `${who}: ${uz.moments.unexpected}`, text, ttl: TTL.normal }));
    else if (mine && (deck === "xar" || deck === "kxar") && (card?.effect as any)?.kind === "pay") out.push(mk({ kind: "expense", mine, who, tone: "bad", anim: "shake", title: M.expense, text }));
    else if (mine && (deck === "kichik" || deck === "katta" || deck === "choose") && room.pendingCard) out.push(mk({ kind: "opportunity", mine, who, tone: "special", anim: "pulse", sfx: "opportunity", title: deck === "choose" ? M.opportunityPick : deck === "katta" ? M.opportunityBig : M.opportunity, text }));
    else if (deck === "bozor") out.push(mk({ kind: "market", mine, who, tone: "info", anim: "pulse", sfx: "market", title: mine ? M.market : `${who}: ${M.market}`, text }));
  }
  // Menga sotish taklifi paydo bo'ldi (bozor kartasi): jim yuklanib ketmasin
  for (const o of marketOffers(room, userId)) if (!prev.offers.has(o.proposalId)) out.push(mk({ kind: "offer", mine: true, who: uz.result.you, tone: "good", strong: true, anim: "bounce", sfx: "offer", title: M.offer, text: firstSentence(o.text), note: `${M.offerNote.replace("{price}", money(o.price))}`, ttl: TTL.long }));
  // Daraja ochilishi / chiqish shartlari (faqat o'zim va faqat o'tish paytida)
  const mp = st.players.find((p: any) => p.id === userId);
  if (mp && mp.circle === "small") {
    const now = snapRoom(room, userId)!;
    if (prev.unlocked !== null && now.unlocked !== null && now.unlocked !== prev.unlocked) out.push(mk(now.unlocked
      ? { kind: "unlock", mine: true, who: uz.result.you, tone: "special", strong: true, anim: "bounce", sfx: "unlock", title: M.unlock, text: M.unlockText, note: M.unlockNote, ttl: TTL.long }
      : { kind: "lock", mine: true, who: uz.result.you, tone: "info", anim: "pulse", sfx: "market", title: M.lock, text: M.lockText, note: M.lockNote, ttl: TTL.normal }));
    if (prev.conds && now.conds) {
      const done = (c: typeof now.conds) => (c!.cash ? 1 : 0) + (c!.flow ? 1 : 0) + (c!.debt ? 1 : 0) + (c!.partner ? 1 : 0);
      const labels: [keyof NonNullable<RoomSnap["conds"]>, string][] = [["cash", M.condCash], ["flow", M.condFlow], ["debt", M.condDebt], ["partner", M.condPartner]];
      for (const [k, label] of labels) if (now.conds[k] && !prev.conds[k]) out.push(mk(done(now.conds) === 4
        ? { kind: "ready", mine: true, who: uz.result.you, tone: "special", strong: true, anim: "bounce", sfx: "levelup", title: M.ready, text: M.readyText, note: M.readyNote, ttl: TTL.long }
        : { kind: "condition", mine: true, who: uz.result.you, tone: "good", anim: "pulse", sfx: "milestone", title: M.condition.replace("{k}", String(done(now.conds))).replace("{n}", "4"), text: label, ttl: TTL.normal }));
    }
  }
  return out.slice(0, 4);
}
