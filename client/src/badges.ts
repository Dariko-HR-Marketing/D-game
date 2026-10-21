// Pastki menyu belgilari (telefon): har bir bo'limda hozir nima kutayotgani. Hammasi server holatidan olinadi (yangi hisob yo'q).
// Qizil — javob/harakat kutilmoqda (navbat, taklif, eslatma); yashil — yangilik yoki imkoniyat (bozor taklifi, yangi voqea, suyunchi).
// `temp` — vaqt bilan cheklangan (taymer, taklif muddati): belgi pulsatsiya qiladi; doimiylari tinch turadi.
import { marketOffers, myProposals } from "./model";
import { uz } from "./i18n/uz";

export type BadgeTab = "field" | "blank" | "players";
export interface Badge { count: number; tone: "urgent" | "info"; temp: boolean; urgent: number; info: number }
export type Badges = Record<BadgeTab, Badge | null>;
/** Foydalanuvchi allaqachon ko'rgan narsalar (bo'lim ochilganda yangilanadi). */
export interface Seen { logN: number; reactions: number[]; notices: number[] }

/** Yangi voqealar soni: jami hisoblagich farqi (jurnal kesilgani uchun log.length emas). */
export const newEvents = (state: any, seen: Seen): number => Math.max(0, (state?.logN ?? 0) - seen.logN);
const noticesFor = (state: any, userId: string): any[] => (state?.notices ?? []).filter((n: any) => (n.to === "all" || n.to === userId) && n.round >= state.round - 1);

export function tabBadges(o: { room: any; userId: string; myTurnAction: boolean; seen: Seen; reactions: { id: number; from: string }[] }): Badges {
  const { room, userId, myTurnAction, seen } = o; const st = room.state;
  const mk = (urgent: number, info: number, temp: boolean): Badge | null => urgent + info === 0 ? null : { count: urgent + info, tone: urgent > 0 ? "urgent" : "info", temp, urgent, info };
  // Maydon: navbat menda (kubik yoki karta qarori) — vaqt cheklangan
  const field = myTurnAction ? mk(1, 0, true) : null;
  // Blank: menga yo'llangan takliflar va eslatmalar (qizil); bozor taklifi, suyunchi, yangi tizim xabari (yashil)
  const pr = myProposals(room, userId); const notes = noticesFor(st, userId).filter((n) => !seen.notices.includes(n.id));
  const reminders = notes.filter((n) => n.key === "loan_reminder").length, others = notes.length - reminders;
  const urgent = pr.loansToAccept.length + pr.partnerToAccept.length + reminders;
  const info = marketOffers(room, userId).length + pr.suyunchi.length + others;
  const blank = mk(urgent, info, pr.loansToAccept.length + pr.partnerToAccept.length + marketOffers(room, userId).length + pr.suyunchi.length > 0);
  // O'yinchilar: yangi voqealar va boshqalardan kelgan reaksiyalar
  const reacts = o.reactions.filter((r) => r.from !== userId && !seen.reactions.includes(r.id)).length;
  const players = mk(0, newEvents(st, seen) + reacts, false);
  return { field, blank, players };
}

/** Ekran o'qish dasturi uchun matn: belgi nima kutayotganini aytadi (rang va raqam yetarli emas). */
export function badgeLabel(tab: BadgeTab, b: Badge): string {
  const H = uz.hud.badge;
  if (tab === "field") return H.myTurn;
  if (b.urgent > 0 && b.info > 0) return H.both.replace("{u}", String(b.urgent)).replace("{i}", String(b.info));
  return (b.urgent > 0 ? H.urgent : H.info).replace("{n}", String(b.count));
}
