import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color, PLAYER_COLORS } from "../theme";
import { ringPosition } from "../boardLayout";
import { currentId, exitProgress, isMyTurn, me } from "../model";
import type { RoomView } from "../net/connection";
import { SMALL_BOARD } from "@poyga/rules";
import { Actions } from "./Actions";

const CELL_COLOR: Record<string, string> = { S: color.navy, I: color.green, H: color.red, B: color.gold, D: "#2C6DB5", K: color.text2, Q: color.text2, O: "#7B4FA3" };

function Board({ room, size }: { room: RoomView; size: number }) {
  const players = room.state.players;
  const circle = players.find((p: any) => p.circle === "small") ? "small" : "big";
  const n = circle === "small" ? 48 : 53;
  const cell = Math.max(12, Math.floor(((2 * Math.PI * 0.44 * size) / n) * 0.86)); // qo'shni kataklar ustma-ust tushmaydi
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Taxta">
      {Array.from({ length: n }, (_, i) => {
        const { x, y } = ringPosition(i, n);
        const t = circle === "small" ? SMALL_BOARD[i] : "";
        return <View key={i} style={{ position: "absolute", left: x * size - cell / 2, top: y * size - cell / 2, width: cell, height: cell, borderRadius: 4,
          backgroundColor: circle === "small" ? CELL_COLOR[t] : color.line, opacity: 0.9 }}>
          <Text style={{ color: color.white, fontSize: cell * 0.5, textAlign: "center", fontWeight: "700" }}>{t}</Text></View>;
      })}
      {players.map((p: any, k: number) => {
        const nn = p.circle === "small" ? 48 : 53, { x, y } = ringPosition(p.pos, nn, 0.34 + k * 0.025);
        return <View key={p.id} accessibilityLabel={p.id} style={{ position: "absolute", left: x * size - 9, top: y * size - 9, width: 18, height: 18, borderRadius: 9,
          backgroundColor: PLAYER_COLORS[k % 6], borderWidth: 2, borderColor: color.white }} />;
      })}
    </View>
  );
}

function Blank({ p }: { p: any }) {
  const e = exitProgress(p);
  const Row = ({ l, v, bad }: { l: string; v: string; bad?: boolean }) => <View style={s.row}><Text style={s.l}>{l}</Text><Text style={[s.v, bad && { color: color.red }]}>{v}</Text></View>;
  return (
    <View style={s.panel}>
      <Row l={uz.game.cash} v={money(p.cash)} />
      <Row l={uz.game.salary} v={money(p.salary)} />
      <Row l={uz.game.passive} v={money(e.passive)} />
      <Row l={uz.game.expenses} v={money(e.expenses)} bad />
      <Row l={uz.game.cashflow} v={money(e.cashflow)} bad={e.cashflow < 0} />
      <Row l={uz.game.debt} v={money(e.debt)} bad={e.debt > 0} />
      {p.circle === "small" && (
        <View style={{ marginTop: 8 }}>
          <Text style={s.h2}>{uz.game.exitTitle}</Text>
          {([["cash", uz.game.exitCash], ["flow", uz.game.exitFlow], ["debt", uz.game.exitDebt], ["partner", uz.game.exitPartner]] as const).map(([k, l]) => (
            <Text key={k} style={{ color: e.checks[k] ? color.green : color.text2 }}>{e.checks[k] ? "✓" : "○"} {l}</Text>))}
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

export function Game({ room, userId, onAct }: { room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900; // planshet/kompyuter: taxta chapda, panel o'ngda
  const left = useCountdown(room.deadline);
  const mine = me(room, userId), mineTurn = isMyTurn(room, userId), card = room.pendingCard;
  const state = room.state;
  const boardSize = wide ? Math.min(width * 0.5, 640) : Math.min(width - 32, 480);
  return (
    <ScrollView contentContainerStyle={[s.wrap, wide && { flexDirection: "row", alignItems: "flex-start" }]}>
      <View><Board room={room} size={boardSize} /></View>
      <View style={[{ gap: 12, flex: 1, minWidth: 280 }, wide && { maxWidth: 420 }]}>
        <Text style={s.turn} accessibilityLiveRegion="polite">
          {state.winner ? `${uz.game.winner}: ${state.winner}` : mineTurn ? uz.game.yourTurn : `${uz.game.waitFor} ${currentId(room)}`}
          {left > 0 && !state.winner ? ` · ${left} ${uz.game.seconds}` : ""}
        </Text>
        {mine && <Blank p={mine} />}
        <Actions room={room} userId={userId} onAct={onAct} />
        {card && mineTurn && (
          <View style={s.card} accessibilityRole="alert">
            <Text style={s.cardTag}>{card.mode === "mandatory" ? uz.game.mandatory : uz.game.optional}</Text>
            <Text style={s.cardText}>{card.text}</Text>
            {card.mode !== "mandatory" && card.effect?.kind === "buyShares" && <SharesInput card={card} onAct={onAct} />}
            {card.mode !== "mandatory" && card.effect?.kind !== "buyShares" && (<>
              <Button label={uz.game.accept} onPress={() => onAct({ type: "decide", accept: true, useBank: true })} />
              <Button label={uz.game.skip} kind="ghost" onPress={() => onAct({ type: "decide", accept: false })} /></>)}
          </View>)}
        {!card && mineTurn && !state.winner && <Button label={uz.game.roll} onPress={() => onAct({ type: "roll" })} />}
        <Text style={s.log}>{state.log.slice(-3).join("\n")}</Text>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  wrap: { padding: 16, gap: 16 }, turn: { fontSize: 18, fontWeight: "700", color: color.navy },
  panel: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: color.line, gap: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" }, l: { color: color.text2 }, v: { color: color.navy, fontWeight: "700" },
  h2: { fontWeight: "700", color: color.navy, marginBottom: 2 },
  card: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: color.gold, gap: 10 },
  cardTag: { color: color.text2, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }, cardText: { color: color.navy, fontSize: 16, lineHeight: 22 },
  log: { color: color.text2, fontSize: 12 },
});
