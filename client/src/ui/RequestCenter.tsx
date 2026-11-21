import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color, radius, shadow, space, font } from "../theme";
import { me, myProposals, nameOf } from "../model";
import type { RoomView } from "../net/connection";

/** Boshqalardan kelgan, JAVOB kutayotgan so'rovlar (guvohlik, qarz, sheriklik). Suyunchi va bozor taklifi ixtiyoriy: ular faqat «Moliya amallari»da. */
export interface Req { key: string; kind: "witness" | "loan" | "partner"; x: any }
export function useRequests(room: RoomView, userId: string): Req[] {
  const pr = myProposals(room, userId);
  return [
    ...pr.loansToWitness.map((x: any) => ({ key: `w${x.id}`, kind: "witness" as const, x })),
    ...pr.loansToAccept.map((x: any) => ({ key: `l${x.id}`, kind: "loan" as const, x })),
    ...pr.partnerToAccept.map((x: any) => ({ key: `p${x.id}`, kind: "partner" as const, x })),
  ];
}

/** Yangi so'rov kelganda oyna o'zi ochiladi; «Keyinroq» bosilsa yopiladi va faqat qo'ng'iroqcha raqami qoladi. */
export function useRequestModal(reqs: Req[]) {
  const [open, setOpen] = useState(false); const seen = useRef<Set<string>>(new Set());
  const sig = reqs.map((r) => r.key).join(",");
  useEffect(() => {
    const fresh = reqs.some((r) => !seen.current.has(r.key)); reqs.forEach((r) => seen.current.add(r.key));
    if (fresh) setOpen(true); if (reqs.length === 0) setOpen(false);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  return { open: open && reqs.length > 0, show: () => setOpen(true), hide: () => setOpen(false) };
}

export function RequestModal({ room, userId, reqs, onAct, onClose }: { room: RoomView; userId: string; reqs: Req[]; onAct: (a: Record<string, unknown>) => void; onClose: () => void }) {
  const p = me(room, userId); const [i, setI] = useState(0); const r = reqs[Math.min(i, reqs.length - 1)];
  useEffect(() => { const d = (globalThis as any).document; if (!d?.addEventListener) return; const h = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", h); return () => d.removeEventListener("keydown", h); }, [onClose]);
  if (!r || !p) return null;
  const x = r.x; const rep = (s: string, o: Record<string, string>) => Object.entries(o).reduce((a, [k, v]) => a.replace(`{${k}}`, v), s);
  let q = "", note = "", buttons: React.ReactNode = null;
  if (r.kind === "witness") {
    q = rep(uz.req.witnessQ, { a: nameOf(room, x.receiver), b: nameOf(room, x.giver), s: money(x.amount) }); note = uz.req.witnessNote;
    buttons = <><Button label={uz.req.witnessYes} onPress={() => onAct({ type: "loan_witness", proposalId: x.id })} /><Button kind="ghost" label={uz.req.later} onPress={onClose} /></>;
  } else if (r.kind === "loan") {
    const wait = !!x.witnesses && (x.confirmed ?? []).length < x.witnesses.length; const poor = p.cash < x.amount;
    q = rep(uz.req.loanQ, { a: nameOf(room, x.receiver), s: money(x.amount), m: String(x.months) });
    note = wait ? uz.coop.witnessWait.replace("{n}", String((x.confirmed ?? []).length)).replace("{m}", String(x.witnesses.length)) : poor ? uz.coop.needCashLoan.replace("{n}", money(x.amount)) : "";
    buttons = <><Button label={uz.req.loanYes} disabled={wait || poor} onPress={() => onAct({ type: "loan_accept", proposalId: x.id })} /><Button kind="ghost" label={uz.req.loanNo} onPress={() => onAct({ type: "loan_decline", proposalId: x.id })} /><Button kind="ghost" label={uz.req.later} onPress={onClose} /></>;
  } else {
    const poor = x.half != null && p.cash < x.half;
    q = rep(uz.req.partnerQ, { a: nameOf(room, x.owner) }); note = x.half != null ? `${uz.coop.yourShare}: ${money(x.half)}${poor ? `. ${uz.coop.needCashPartner.replace("{n}", money(x.half))}` : ""}` : "";
    buttons = <><Button label={uz.req.partnerYes} disabled={poor} onPress={() => onAct({ type: "partner_accept", proposalId: x.id })} /><Button kind="ghost" label={uz.req.partnerNo} onPress={() => onAct({ type: "partner_decline", proposalId: x.id })} /><Button kind="ghost" label={uz.req.later} onPress={onClose} /></>;
  }
  return (
    <View style={s.scrim} testID="request-modal">
      <Pressable style={StyleSheet.absoluteFill as any} onPress={onClose} accessibilityLabel={uz.req.later} />
      <View style={s.card} role="dialog" aria-modal aria-label={uz.req.title}>
        <Text style={s.h} aria-level={2} accessibilityRole="header">{uz.req.title}{reqs.length > 1 ? ` · ${uz.req.count.replace("{i}", String(Math.min(i, reqs.length - 1) + 1)).replace("{n}", String(reqs.length))}` : ""}</Text>
        <Text style={s.q}>{q}</Text>
        {!!note && <Text style={s.note} accessibilityRole="alert">{note}</Text>}
        <View style={{ gap: space.sm }}>{buttons}</View>
        {reqs.length > 1 && <Pressable accessibilityRole="button" onPress={() => setI((i + 1) % reqs.length)}><Text style={s.next}>{uz.req.count.replace("{i}", String((i + 1) % reqs.length + 1)).replace("{n}", String(reqs.length))} →</Text></Pressable>}
      </View>
    </View>);
}

/** Sarlavhadagi doimiy profil tugmasi ostidagi menyu: «O'yindan chiqish» shu yerda. */
export function ProfileMenu({ open, onClose, onLeave, onProfile, onHelp, items }: { open: boolean; onClose: () => void; onLeave: () => void; onProfile?: () => void; onHelp?: () => void; items?: { key: string; icon: any; label: string; onPress: () => void; tid?: string; badge?: number }[] }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!open) setSure(false); }, [open]);
  useEffect(() => { const d = (globalThis as any).document; if (!open || !d?.addEventListener) return; const h = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", h); return () => d.removeEventListener("keydown", h); }, [open, onClose]);
  if (!open) return null;
  return (
    <View style={s.menuScrim} testID="profile-menu">
      <Pressable style={StyleSheet.absoluteFill as any} onPress={onClose} accessibilityLabel={uz.leave.cancel} />
      <View style={s.menu} role="menu" aria-label={uz.profMenu.menu}>
        {!sure ? (<>
          {items?.map((it) => <Pressable key={it.key} accessibilityRole="button" role="menuitem" accessibilityLabel={it.label} onPress={() => { onClose(); it.onPress(); }} style={s.item} testID={it.tid}><Icon name={it.icon} size={18} color={color.navy} /><Text style={[s.itemT, { flex: 1 }]}>{it.label}</Text>{!!it.badge && <View style={s.badge} aria-hidden><Text style={s.badgeT}>{it.badge > 9 ? "9+" : it.badge}</Text></View>}</Pressable>)}
          {onProfile && <Pressable accessibilityRole="button" role="menuitem" onPress={() => { onClose(); onProfile(); }} style={s.item}><Icon name="person" size={18} color={color.navy} /><Text style={s.itemT}>{uz.profMenu.me}</Text></Pressable>}
          {onHelp && <Pressable accessibilityRole="button" role="menuitem" onPress={() => { onClose(); onHelp(); }} style={s.item} testID="tour-help"><Icon name="help" size={18} color={color.navy} /><Text style={s.itemT}>{uz.onboarding.help}</Text></Pressable>}
          <Pressable accessibilityRole="button" role="menuitem" accessibilityLabel={uz.leave.button} onPress={() => setSure(true)} style={s.item} testID="leave-open"><Icon name="flag" size={18} color={color.red} /><Text style={[s.itemT, { color: color.red }]}>{uz.leave.button}</Text></Pressable>
        </>) : (<View style={{ gap: space.sm, padding: space.sm }}>
          <Text style={s.h}>{uz.leave.title}</Text><Text style={s.note}>{uz.leave.warn}</Text>
          <Button label={uz.leave.confirm} onPress={onLeave} /><Button kind="ghost" label={uz.leave.cancel} onPress={onClose} />
        </View>)}
      </View>
    </View>);
}

const fixed: any = { position: Platform.OS === "web" ? "fixed" : "absolute", top: 0, left: 0, right: 0, bottom: 0 };
const s = StyleSheet.create({
  scrim: { ...fixed, zIndex: 60, backgroundColor: "rgba(8,34,56,.55)", alignItems: "center", justifyContent: "center", padding: space.lg },
  card: { width: "100%", maxWidth: 420, backgroundColor: color.white, borderRadius: radius.lg, padding: space.lg, gap: space.md, ...shadow },
  h: { fontSize: font.lg, fontWeight: "700", color: color.navy }, q: { fontSize: font.md, color: color.navy, lineHeight: 22 },
  note: { fontSize: font.sm, color: color.text2, lineHeight: 18 }, next: { fontSize: font.sm, color: color.text2, textAlign: "center", paddingVertical: space.xs },
  menuScrim: { ...fixed, zIndex: 55 },
  menu: { position: "absolute", top: 52, right: 8, width: 260, maxWidth: "92%", backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, padding: space.xs, ...shadow } as any,
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: color.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, badgeT: { color: "#fff", fontSize: 11, fontWeight: "800" },
  item: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44, paddingHorizontal: space.sm, borderRadius: radius.sm }, itemT: { fontSize: font.md, color: color.navy, fontWeight: "600" },
});
