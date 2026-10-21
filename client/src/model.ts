import { canExitSmallCircle, monthlyExpenses, passiveIncome, playerCashflow, openPartnerships } from "@poyga/rules";

export const me = (room: any, userId: string) => room?.state?.players.find((p: any) => p.id === userId) ?? null;
export const currentId = (room: any): string | null => (room?.state ? room.state.players[room.state.turn % room.state.players.length].id : null);
export const isMyTurn = (room: any, userId: string) => currentId(room) === userId;

/** Kichik aylanadan chiqish shartlari (§5.4) — progress ekranda doim ko'rinadi. */
export function exitProgress(p: any) {
  const passive = passiveIncome(p), exp = monthlyExpenses(p);
  const handDebt = (p.handDebts ?? []).reduce((s: number, d: any) => s + d.amount, 0);
  const debt = allDebt(p) + handDebt;
  const checks = {
    cash: p.cash >= 1_000_000, flow: passive >= 25_000, debt: debt === 0, partner: openPartnerships(p) === 0,
  };
  return { checks, passive, expenses: exp, cashflow: playerCashflow(p), debt, canExit: canExitSmallCircle({ cash: p.cash, salary: p.salary, passiveIncome: passive, expenses: exp, bankDebt: p.bankDebt, otherDebt: debt - p.bankDebt, openPartnerships: openPartnerships(p) }) };
}

import { RULES, mutualLoanLimit, assetMatches, marketPrice, maxBankLoan, allDebt, pledgeable, voluntarySellable, voluntarySalePrice } from "@poyga/rules";

/** Hozir olish mumkin bo'lgan eng katta bank krediti (garov 120 %, 2 000–5 000); 0 — kredit yo'q. */
export const bankRoom = (p: any) => maxBankLoan({ salary: 0, ...p, assets: p.assets ?? [], bankLoans: p.bankLoans ?? [], bankDebt: p.bankDebt ?? 0 });
/** Ixtiyoriy sotish mumkin bo'lgan aktivlar (ko'chmas mulk, kichik va katta biznes): indeks, narx va qo'lga tushadigan summa (kredit ayirilgan). */
/** Joriy taymerning davomiyligi (soniya): kubik/karta/biznes/to'lov bosqichiga qarab server beradi. */
export const phaseSeconds = (room: any): number => room?.timerTotal ?? room?.turnSeconds ?? 30;
export const sellableAssets = (p: any): { idx: number; a: any; price: number; proceeds: number }[] =>
  (p.assets as any[]).map((a, idx) => ({ idx, a, price: voluntarySalePrice(p, a), proceeds: voluntarySalePrice(p, a) - a.credit })).filter((x) => voluntarySellable(x.a));
export const pledgeableAssets = (p: any): { idx: number; a: any }[] => (p.assets as any[]).map((a, idx) => ({ idx, a })).filter((x) => pledgeable(x.a));

/** Menga qaratilgan hamkorlik takliflari (§5.6). */
export function myProposals(room: any, userId: string) {
  const st = room?.state; const p = me(room, userId);
  const all: any[] = st?.proposals ?? [];
  const isBot = (id: string) => st?.bots?.includes(id);
  return {
    suyunchi: all.filter((x) => x.kind === "suyunchi" && x.parent !== userId && !x.given.includes(userId) && p?.circle === "small" && !isBot(userId)),
    loansToAccept: all.filter((x) => x.kind === "loan" && x.giver === userId),
    loansPending: all.filter((x) => x.kind === "loan" && x.receiver === userId),
    partnerToAccept: all.filter((x) => x.kind === "partner" && x.partner === userId),
    partnerPending: all.filter((x) => x.kind === "partner" && x.owner === userId),
  };
}

/** §5.6 Sheriklik: faqat biznes, naqd va bank limiti tugagach. */
export function canOfferPartner(room: any, userId: string): boolean {
  const p = me(room, userId), c = room?.pendingCard;
  if (!p || !c || currentId(room) !== userId) return false;
  const e = c.effect;
  if (e?.kind !== "buy" || !["small_business", "business"].includes(e.asset)) return false;
  return p.cash < e.price && e.price - p.cash > bankRoom(p);
}
export const partnerCandidates = (room: any, userId: string): string[] => {
  const p = me(room, userId), st = room.state;
  return st.players.filter((x: any) => x.id !== userId && x.circle === p.circle && !st.bots.includes(x.id)).map((x: any) => x.id);
};

/** Suyunchi miqdorlari: 10 dan 500 gacha, qadam 10, naqddan oshmaydi. */
export const suyunchiAmounts = (cash: number): number[] =>
  Array.from({ length: RULES.suyunchiMax / RULES.suyunchiStep }, (_, i) => (i + 1) * RULES.suyunchiStep).filter((a) => a <= cash);

/** O'zaro qarz: oluvchi limiti va beruvchi chegarasi (§5.6). */
export function loanBounds(room: any, userId: string, giverId: string) {
  const me_ = me(room, userId), g = me(room, giverId);
  const passive = me_.assets.reduce((s: number, a: any) => s + a.monthlyIncome, 0);
  const used = (me_.handDebts ?? []).reduce((s: number, d: any) => s + d.amount, 0);
  const humans = room.state.players.filter((x: any) => !room.state.bots.includes(x.id)).length;
  return { max: Math.max(0, Math.min(Math.floor(g.cash * RULES.mutualGiverCashShare), mutualLoanLimit(me_.salary, passive) - used)), humans, enough: humans >= RULES.mutualMinPlayers };
}
export const loanGivers = (room: any, userId: string): string[] =>
  room.state.players.filter((x: any) => x.id !== userId && x.circle === "small" && !room.state.bots.includes(x.id)).map((x: any) => x.id);

/** Mening ochiq sheriklik aktivlarim (sotib olish uchun). */
export const myPartneredAssets = (p: any): any[] => p.assets.filter((a: any) => a.partnerId);

/** Bozor taklifi: menda sotiladigan mos aktiv bormi va qanday narxda (hamma o'yinchiga ochiq, navbatdan mustaqil). */
export function marketOffers(room: any, userId: string): { proposalId: number; text: string; assetCode: string; price: number; net: number }[] {
  const p = me(room, userId), st = room?.state; if (!p || !st) return [];
  const out: any[] = [];
  for (const pr of st.proposals) {
    if (pr.kind !== "market" || pr.sold.includes(userId)) continue;
    const card = room.marketCards?.[pr.id]; const e = card?.effect; if (e?.kind !== "marketSale") continue;
    for (const a of p.assets) {
      if (a.partnerId || a.stakeOf || !assetMatches(e.targets, a)) continue;
      const price = marketPrice(e.amount, a); if (price === null) continue;
      out.push({ proposalId: pr.id, text: card.text, assetCode: a.code, price, net: price - a.credit }); break;
    }
  }
  return out;
}

/** Ko'rsatiladigan ism: profil nomi; botlar — «Bot 1», «Bot 2» (xom identifikator hech qachon ko'rsatilmaydi). */
export function nameOf(room: any, id: string | null | undefined): string {
  if (!id) return "";
  const n = room?.names?.[id]?.name; if (n) return n;
  // Botlar tartib raqami bilan: «Bot 1», «Bot 2». Odamlar uchun ism majburiy (profilsiz xonaga kirib bo'lmaydi), shuning uchun «O'yinchi N» ko'rsatilmaydi.
  const bots: string[] = (room?.members ?? []).filter((m: any) => m.bot).map((m: any) => m.userId); const bi = bots.length ? bots.indexOf(id) : (room?.state?.bots ?? []).indexOf(id);
  if (bi >= 0) return `Bot ${bi + 1}`;
  return "Ismsiz";
}
/** Jurnal satridagi xom identifikatorlarni ismlarga almashtiradi (uzunroqlari avval). */
export function humanize(room: any, line: string): string {
  const ids: string[] = (room?.state?.players ?? []).map((p: any) => p.id).sort((a: string, b: string) => b.length - a.length);
  let out = line; for (const id of ids) out = out.split(id).join(nameOf(room, id)); return out;
}
