import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { canBid, nextMinBid, type Auction } from "@poyga/rules";
import { Button } from "./Button";
import { money } from "../format";
import { nameOf } from "../model";
import { color, font, radius, shadow, space, tone } from "../theme";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

const useLeft = (deadline: number | null) => {
  const calc = () => (deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : null); const [left, setLeft] = useState(calc);
  useEffect(() => { setLeft(calc()); const h = setInterval(() => setLeft(calc()), 500); return () => clearInterval(h); }, [deadline]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
};

/**
 * Garov auksioni (halol moliya): to'lanmagan lombard yoki bank kreditining garovi sotiladi. Avval egasi qarzni to'lab mulkini saqlab qolishi mumkin,
 * so'ng hamma taklif qiladi. Boshlang'ich narx = bank qarzi + haq; ortiqcha summa egasiga qaytadi. O'yin shu paytda to'xtab turadi, navbat taymeri qayta boshlanadi.
 */
export function AuctionLayer({ room, userId, onAct }: { room: RoomView; userId: string; onAct: (a: { type: string; [k: string]: unknown }) => void }) {
  const st = room.state as any; const a = (st?.auction ?? null) as Auction | null; const left = useLeft(room.deadline); const { height } = useWindowDimensions();
  const mine = st?.players?.find((p: any) => p.id === userId); const min = a ? nextMinBid(a) : 0; const [val, setVal] = useState(String(min));
  useEffect(() => { setVal(String(min)); }, [min, a?.id, a?.phase]);
  if (!a || !mine) return null;
  const owner = a.owner === userId, leader = a.best?.playerId === userId, passed = a.passed.includes(userId);
  const can = !owner && a.phase === "open" && !leader && canBid(st, a, mine, 0);
  const amount = Number(val.replace(/\s/g, "")); const valid = Number.isInteger(amount) && amount % 100 === 0 && amount >= min && mine.cash >= amount;
  const title = a.format === "bozor" ? uz.auction.titleMarket.replace("{name}", nameOf(room, a.owner)) : a.format === "ixtiyoriy" ? uz.auction.titleVoluntary.replace("{name}", nameOf(room, a.owner)) : (a.kind === "bank" ? uz.auction.titleBank : uz.auction.titleLombard).replace("{name}", nameOf(room, a.owner));
  const kicker = uz.auction.formats[a.format]; const spectator = !owner && (mine.circle !== a.circle || (st.restricted ?? []).includes(userId));
  return (
    <View style={s.layer} role="dialog" aria-modal={true} aria-label={uz.auction.title} testID="auction">
      <View style={s.backdrop} />
      <View style={s.center}>
        <ScrollView style={{ maxHeight: Math.max(320, height - 32), width: "100%", maxWidth: 520 }} contentContainerStyle={s.card}>
          <Text style={s.kicker} aria-level={2} accessibilityRole="header">{kicker}</Text>
          <Text style={s.h}>{title}</Text>
          <View style={s.lot} testID="auction-lot">
            {a.lot.map((x, i) => (<View key={i} style={s.row}><Text style={s.rowL}>{(room as any).assetCards?.[x.cardId ?? x.code]?.text?.split(/[.!?\n]/)[0] || x.code}</Text><Text style={s.rowV} numberOfLines={1}>{money(x.price)}</Text></View>))}
          </View>
          <View style={s.rows}>
            {a.due > 0 && <View style={s.row}><Text style={s.rowL}>{uz.auction.due}</Text><Text style={s.rowV} testID="auction-due">{money(a.due)}</Text></View>}
            {a.credits > 0 && <View style={s.row}><Text style={s.rowL}>{uz.auction.credits}</Text><Text style={s.rowV}>{money(a.credits)}</Text></View>}
            <View style={s.row}><Text style={[s.rowL, { fontWeight: "800", color: color.navy }]}>{uz.auction.start}</Text><Text style={[s.rowV, { fontWeight: "800" }]} testID="auction-start">{money(a.start)}</Text></View>
            {a.phase === "open" && <View style={s.row}><Text style={s.rowL}>{uz.auction.best}</Text><Text style={[s.rowV, { color: tone.good }]} testID="auction-best">{a.best ? `${money(a.best.amount)} · ${nameOf(room, a.best.playerId)}` : uz.auction.noBids}</Text></View>}
          </View>
          <Text style={s.note}>{uz.auction.notes[a.format]}</Text>
          {left !== null ? <Text style={s.timer} role="timer" testID="auction-timer">{uz.auction.timeLeft.replace("{n}", String(left))}</Text> : <Text style={s.timer} testID="auction-timer">{uz.auction.untimed}</Text>}

          {a.phase === "owner" && owner && (
            <View style={s.actions}>
              <Text style={s.hint}>{uz.auction.ownerHint}</Text>
              <Button label={uz.auction.buyback.replace("{v}", money(a.due))} disabled={mine.cash < a.due} onPress={() => onAct({ type: "auction_buyback" })} />
              <Button label={uz.auction.decline} kind="ghost" onPress={() => onAct({ type: "auction_decline" })} />
            </View>)}
          {a.phase === "owner" && !owner && <Text style={s.hint} testID="auction-wait">{uz.auction.waitOwner.replace("{name}", nameOf(room, a.owner))}</Text>}
          {a.phase === "open" && owner && <Text style={s.hint} testID="auction-owner-wait">{a.format === "bozor" ? uz.auction.drawerWait : uz.auction.ownerWait}</Text>}
          {a.phase === "open" && !owner && leader && <Text style={[s.hint, { color: tone.good, fontWeight: "800" }]} testID="auction-leader">{uz.auction.leader}</Text>}
          {a.phase === "open" && !owner && !leader && !can && <Text style={s.hint} testID="auction-cannot">{spectator ? uz.auction.spectator : mine.cash < min ? uz.auction.noCash : uz.auction.notEligible}</Text>}
          {can && (
            <View style={s.actions}>
              <Text style={s.hint}>{uz.auction.bidHint.replace("{v}", money(min))}</Text>
              <TextInput value={val} onChangeText={(t) => setVal(t.replace(/[^\d]/g, ""))} keyboardType="number-pad" inputMode="numeric" style={s.input} accessibilityLabel={uz.auction.bidLabel} testID="auction-input" />
              <Button label={uz.auction.bid.replace("{v}", valid ? money(amount) : money(min))} disabled={!valid} onPress={() => onAct({ type: "auction_bid", amount })} />
              <Button label={passed ? uz.auction.passed : uz.auction.pass} kind="ghost" disabled={passed} onPress={() => onAct({ type: "auction_pass" })} />
            </View>)}
        </ScrollView>
      </View>
    </View>);
}

const s = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 125 }, backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,34,56,0.62)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.md },
  card: { backgroundColor: color.white, borderRadius: radius.lg + 4, borderWidth: 2, borderColor: color.gold, padding: space.lg, gap: space.md, ...shadow, shadowOpacity: 0.3, shadowRadius: 28 },
  kicker: { color: tone.muted, fontSize: font.xs, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }, h: { color: color.navy, fontSize: font.lg, fontWeight: "800", lineHeight: 26 },
  lot: { backgroundColor: "#F3F7FA", borderRadius: radius.md, padding: space.md, gap: 4 }, rows: { gap: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm }, rowL: { color: tone.muted, fontSize: font.md, flexShrink: 1 }, rowV: { flexShrink: 0, color: color.navy, fontSize: font.md, fontWeight: "700", fontVariant: ["tabular-nums"] },
  note: { color: tone.muted, fontSize: font.sm, lineHeight: 19 }, timer: { color: color.navy, fontSize: font.md, fontWeight: "700", fontVariant: ["tabular-nums"] },
  actions: { gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.line }, hint: { color: tone.muted, fontSize: font.md, lineHeight: 21 },
  input: { borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 44, fontSize: font.lg, color: color.navy, fontVariant: ["tabular-nums"] },
});
