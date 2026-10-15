import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, useWindowDimensions, Animated, Image } from "react-native";
import { animationMs, useReducedMotion } from "../motion";
import { CARD_IMAGES_BASE, cardImageUrl } from "../cardImage";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color, GREEN_TEXT, PLAYER_COLORS } from "../theme";
import { readableOn } from "../contrast";
import { ringPosition } from "../boardLayout";
import { currentId, exitProgress, isMyTurn, me } from "../model";
import { REACTIONS, type Reaction, type RoomView } from "../net/connection";
import { SMALL_BOARD } from "@poyga/rules";
import { Actions } from "./Actions";

const CELL_COLOR: Record<string, string> = { S: color.navy, I: color.green, H: color.red, B: color.gold, D: "#2C6DB5", K: color.text2, Q: color.text2, O: "#7B4FA3" };

function Board({ room, size, turns = 0 }: { room: RoomView; size: number; turns?: number }) {
  const players = room.state.players;
  const anySmall = players.some((p: any) => p.circle === "small"), anyBig = players.some((p: any) => p.circle === "big");
  const circle = anySmall ? "small" : "big";
  const n = circle === "small" ? 48 : 53;
  const cell = Math.max(12, Math.floor(((2 * Math.PI * 0.44 * size) / n) * 0.86)); // qo'shni kataklar ustma-ust tushmaydi
  const mixed = anySmall && anyBig; // aralash: katta aylana o'yinchilari ichki halqada (53 katak)
  const inner = 0.2, dot = Math.max(6, Math.floor((2 * Math.PI * inner * size) / 53 * 0.7));
  const hue = (p: any, k: number) => PLAYER_COLORS[(room.names?.[p.id]?.color ?? k) % 6];
  return (
    <View>
    <View style={{ width: size, height: size }} role="img" aria-label={`Taxta. ${players.map((p: any) => `${room.names?.[p.id]?.name ?? p.id}: ${p.pos}-katak${p.circle === "big" ? " (katta aylana)" : ""}`).join("; ")}`}>
      {Array.from({ length: n }, (_, i) => {
        const { x, y } = ringPosition(i, n, 0.44, turns);
        const t = circle === "small" ? SMALL_BOARD[i] : "";
        return <View key={i} aria-hidden style={{ position: "absolute", left: x * size - cell / 2, top: y * size - cell / 2, width: cell, height: cell, borderRadius: 4,
          backgroundColor: circle === "small" ? CELL_COLOR[t] : color.line, opacity: 0.9 }}>
          <Text style={{ color: readableOn(circle === "small" ? CELL_COLOR[t] : color.line), fontSize: cell * 0.5, textAlign: "center", fontWeight: "700" }}>{t}</Text></View>;
      })}
      {mixed && Array.from({ length: 53 }, (_, i) => {
        const { x, y } = ringPosition(i, 53, inner, turns);
        return <View key={`b${i}`} aria-hidden style={{ position: "absolute", left: x * size - dot / 2, top: y * size - dot / 2, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color.line }} />;
      })}
      {players.map((p: any, k: number) => {
        const big = p.circle === "big" && mixed, nn = p.circle === "small" ? 48 : 53;
        const { x, y } = ringPosition(p.pos, nn, big ? inner : 0.34 + k * 0.025, turns);
        return <View key={p.id} aria-hidden style={{ position: "absolute", left: x * size - 10, top: y * size - 10, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
          backgroundColor: hue(p, k), borderWidth: 2, borderColor: color.navy }}><Text style={{ fontSize: 11, fontWeight: "800", color: readableOn(hue(p, k)) }}>{k + 1}</Text></View>;
      })}
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }} accessibilityLabel="O'yinchilar">
      {players.map((p: any, k: number) => (
        <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: hue(p, k), borderWidth: 2, borderColor: color.navy, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 9, fontWeight: "800", color: readableOn(hue(p, k)) }}>{k + 1}</Text></View>
          <Text style={{ color: color.navy, fontSize: 13 }}>{room.names?.[p.id]?.name ?? p.id}{p.circle === "big" ? " ★" : ""}</Text>
        </View>))}
    </View>
    </View>
  );
}

function Blank({ p, profession }: { p: any; profession?: string }) {
  const e = exitProgress(p);
  const Row = ({ l, v, bad }: { l: string; v: string; bad?: boolean }) => <View style={s.row}><Text style={s.l}>{l}</Text><Text style={[s.v, bad && { color: color.red }]}>{v}</Text></View>;
  return (
    <View style={s.panel}>
      <Row l={uz.game.cash} v={money(p.cash)} />
      {profession ? <Row l={uz.game.profession} v={profession} /> : null}
      <Row l={uz.game.salary} v={money(p.salary)} />
      <Row l={uz.game.passive} v={money(e.passive)} />
      <Row l={uz.game.expenses} v={money(e.expenses)} bad />
      <Row l={uz.game.cashflow} v={money(e.cashflow)} bad={e.cashflow < 0} />
      <Row l={uz.game.debt} v={money(e.debt)} bad={e.debt > 0} />
      {p.circle === "small" && (
        <View style={{ marginTop: 8 }}>
          <Text style={s.h2}>{uz.game.exitTitle}</Text>
          {([["cash", uz.game.exitCash], ["flow", uz.game.exitFlow], ["debt", uz.game.exitDebt], ["partner", uz.game.exitPartner]] as const).map(([k, l]) => (
            <Text key={k} style={{ color: e.checks[k] ? GREEN_TEXT : color.text2 }}>{e.checks[k] ? "✓" : "○"} {l}</Text>))}
        </View>)}
    </View>
  );
}

function useCountdown(deadline: number | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!deadline) return setLeft(0);
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 500); return () => clearInterval(id);
  }, [deadline]);
  return left;
}

/** Karta asl rasmi; yuklanmasa (fayl hali yo'q/xato) — jim matnga qaytadi. */
function CardArt({ file, text }: { file?: string; text: string }) {
  const url = cardImageUrl(CARD_IMAGES_BASE, file); const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) return null;
  return <Image source={{ uri: url }} accessibilityLabel={text} resizeMode="contain" style={s.art} onError={() => setFailed(true)} />;
}

function DecisionCard({ card, onAct, sheet }: { card: any; onAct: (a: Record<string, unknown>) => void; sheet?: boolean }) {
  return (
    <View style={sheet ? undefined : s.card} accessibilityRole="alert">
      <Text style={s.cardTag}>{card.mode === "mandatory" ? uz.game.mandatory : uz.game.optional}</Text>
      <CardArt file={card.file} text={card.text} />
      <Text style={s.cardText}>{card.text}</Text>
      {card.mode !== "mandatory" && card.effect?.kind === "buyShares" && <SharesInput card={card} onAct={onAct} />}
      {card.mode !== "mandatory" && card.effect?.kind !== "buyShares" && (<>
        <Button label={card.effect?.kind === "payOrLoseBusiness" ? uz.hod7.pay : uz.game.accept} onPress={() => onAct({ type: "decide", accept: true, useBank: true })} />
        <Button label={card.effect?.kind === "payOrLoseBusiness" ? uz.hod7.lose : uz.game.skip} kind="ghost" onPress={() => onAct({ type: "decide", accept: false })} /></>)}
    </View>
  );
}

/** Karta ochilishi: yengil paydo bo'lish (~240 ms); harakatni kamaytirish yoqilgan bo'lsa — darhol. */
function CardEnter({ children, id, from = 12 }: { children: React.ReactNode; id: string; from?: number }) {
  const reduced = useReducedMotion(); const v = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { v.setValue(0); Animated.timing(v, { toValue: 1, duration: animationMs(reduced), useNativeDriver: true }).start(); }, [id, reduced, v]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }}>{children}</Animated.View>;
}

function SharesInput({ card, onAct }: { card: any; onAct: (a: Record<string, unknown>) => void }) {
  const e = card.effect; const [q, setQ] = useState(String(e.min));
  return (<>
    <TextInput accessibilityLabel={uz.coop.shares} value={q} keyboardType="number-pad" onChangeText={(t) => setQ(t.replace(/\D/g, ""))}
      style={{ minHeight: 44, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 }} />
    <Text style={s.log}>{e.min}–{e.max} × {money(e.pricePerShare)} = {money((Number(q) || 0) * e.pricePerShare)}</Text>
    <Button label={uz.game.accept} disabled={Number(q) < e.min || Number(q) > e.max} onPress={() => onAct({ type: "decide", accept: true, useBank: true, qty: Number(q) })} />
    <Button label={uz.game.skip} kind="ghost" onPress={() => onAct({ type: "decide", accept: false })} />
  </>);
}

export function Game({ room, userId, onAct, onReact, onLeave, reactions, onRules }: { room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void; onReact: (e: string) => void; onLeave: () => void; reactions: Reaction[]; onRules: () => void }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900; // planshet/kompyuter: taxta chapda, panel o'ngda
  const left = useCountdown(room.deadline);
  const mine = me(room, userId), mineTurn = isMyTurn(room, userId), card = room.pendingCard;
  const state = room.state;
  const boardSize = wide ? Math.min(width * 0.5, 640) : Math.min(width - 32, 480);
  const sheetOpen = !wide && !!card && mineTurn;
  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={[s.wrap, wide && { flexDirection: "row", alignItems: "flex-start" }, sheetOpen && { paddingBottom: 360 }]}>
      <View><Board room={room} size={boardSize} turns={wide ? 0 : 3} /></View>
      <View style={[{ gap: 12, flex: 1, minWidth: 280 }, wide && { maxWidth: 420 }]}>
        <Text style={s.title} aria-level={1} accessibilityRole="header">{uz.app.name} · {room.code}</Text>
        <Text style={s.turn}>
          <Text accessibilityLiveRegion="polite">{state.winner ? `${uz.game.winner}: ${room.names?.[state.winner]?.name ?? state.winner}` : mineTurn ? uz.game.yourTurn : `${uz.game.waitFor} ${room.names?.[currentId(room)!]?.name ?? currentId(room)}`}</Text>
          {left > 0 && !state.winner ? ` · ${left} ${uz.game.seconds}` : ""}
        </Text>
        {mine && <Blank p={mine} profession={room.professions?.[mine.id]} />}
        <Actions room={room} userId={userId} onAct={onAct} />
        {card && mineTurn && wide && <CardEnter id={card.id}><DecisionCard card={card} onAct={onAct} /></CardEnter>}
        {!card && mineTurn && !state.winner && <Button label={uz.game.roll} onPress={() => onAct({ type: "roll" })} />}
        <Text style={s.log}>{state.log.slice(-3).join("\n")}</Text>
        <Button label={uz.rules.open} kind="ghost" onPress={onRules} />
        <View style={s.reactRow} accessibilityLabel={uz.react.label}>
          {REACTIONS.map((e) => <Button key={e} label={e} kind="ghost" onPress={() => onReact(e)} />)}
        </View>
        <View accessibilityLiveRegion="polite" accessibilityRole="alert">
          {(state.notices ?? []).filter((n: any) => (n.to === "all" || n.to === userId) && n.round >= state.round - 1).slice(-3).map((n: any) => (
            <Text key={n.id} style={s.notice}>{n.key === "loan_reminder" ? `${room.names?.[n.from]?.name ?? n.from} ${uz.notice.loan_reminder}${n.amount ? `: ${money(n.amount)}` : ""}` : uz.notice[n.key as "crisis_start" | "crisis_end"]}</Text>))}
        </View>
        <View accessibilityLiveRegion="polite">
          {reactions.map((r) => <Text key={r.id} style={s.log}>{room.names?.[r.from]?.name ?? (r.from === userId ? uz.result.you : r.from)}: {r.emoji}</Text>)}
        </View>
        {!state.winner && (!confirmLeave ? <Button label={uz.leave.button} kind="ghost" onPress={() => setConfirmLeave(true)} /> : (
          <View style={s.leaveBox} accessibilityRole="alert">
            <Text style={s.cardTag}>{uz.leave.title}</Text><Text style={s.cardText}>{uz.leave.warn}</Text>
            <Button label={uz.leave.confirm} onPress={onLeave} /><Button label={uz.leave.cancel} kind="ghost" onPress={() => setConfirmLeave(false)} />
          </View>))}
      </View>
    </ScrollView>
    {/* §9: telefonda qaror pastki varaqda (bottom sheet) */}
    {sheetOpen && (
      <View style={s.sheet} accessibilityViewIsModal>
        <CardEnter id={card!.id} from={48}><DecisionCard card={card} onAct={onAct} sheet /></CardEnter>
      </View>)}
    </View>
  );
}
const s = StyleSheet.create({
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "65%" as any, backgroundColor: color.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 3, borderColor: color.gold, padding: 16, paddingBottom: 24, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  art: { width: "100%", height: 200, borderRadius: 8, backgroundColor: color.bg },
  wrap: { padding: 16, gap: 16 }, title: { fontSize: 14, fontWeight: "800", color: color.text2, letterSpacing: 1 }, turn: { fontSize: 18, fontWeight: "700", color: color.navy },
  panel: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: color.line, gap: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" }, l: { color: color.text2 }, v: { color: color.navy, fontWeight: "700" },
  h2: { fontWeight: "700", color: color.navy, marginBottom: 2 },
  card: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: color.gold, gap: 10 },
  cardTag: { color: color.text2, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }, cardText: { color: color.navy, fontSize: 16, lineHeight: 22 },
  log: { color: color.text2, fontSize: 12 }, notice: { color: color.navy, fontSize: 13, backgroundColor: "#FFF6DD", borderRadius: 8, padding: 8, marginBottom: 4 }, reactRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  leaveBox: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: color.red, gap: 10 },
});
