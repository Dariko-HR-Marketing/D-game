import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Animated, Pressable } from "react-native";
import { animationMs, useReducedMotion } from "../motion";
import { Button } from "./Button";
import { Banner, Card, Pill, SectionTitle } from "./kit";
import { Board } from "./Board";
import { PlayerStrip } from "./PlayerStrip";
import { FinanceCard } from "./FinanceCard";
import { TurnPanel } from "./TurnPanel";
import { DecisionCard } from "./DecisionCard";
import { CardToast } from "./CardToast";
import { Actions } from "./Actions";
import { uz, errText } from "../i18n/uz";
import { money } from "../format";
import { color, font, radius, space, tone } from "../theme";
import { bankRoom, currentId, humanize, isMyTurn, marketOffers, me, myProposals, nameOf } from "../model";
import { REACTIONS, type Reaction, type RoomView } from "../net/connection";

/** Karta ochilishi: yengil paydo bo'lish (~240 ms); harakatni kamaytirish yoqilgan bo'lsa — darhol. */
function CardEnter({ children, id, from = 12 }: { children: React.ReactNode; id: string; from?: number }) {
  const reduced = useReducedMotion(); const v = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { v.setValue(0); Animated.timing(v, { toValue: 1, duration: animationMs(reduced), useNativeDriver: true }).start(); }, [id, reduced, v]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }}>{children}</Animated.View>;
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

/** Yig'iladigan bo'lim; kutayotgan takliflar bo'lsa o'zi ochiladi va belgi (soni) ko'rinadi. */
function Collapsible({ title, badge, defaultOpen, children }: { title: string; badge?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen); const [touched, setTouched] = useState(false);
  useEffect(() => { if (defaultOpen && !touched) setOpen(true); }, [defaultOpen, touched]);
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { setTouched(true); setOpen(!open); }} style={s.collHead}>
        <Text style={s.collTitle}>{open ? "▾" : "▸"} {title}</Text>{badge ? <Pill label={String(badge)} kind="warn" /> : null}
      </Pressable>
      {open && children}
    </Card>
  );
}

export function Game({ room, userId, onAct, onReact, onLeave, reactions, onRules, error, status }: { error?: string | null; status?: string; room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void; onReact: (e: string) => void; onLeave: () => void; reactions: Reaction[]; onRules: () => void }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900; // planshet/kompyuter: taxta chapda, panel o'ngda
  const left = useCountdown(room.deadline);
  const mine = me(room, userId), mineTurn = isMyTurn(room, userId), card = room.pendingCard;
  const state = room.state; const cur = currentId(room);
  const boardSize = wide ? Math.min(Math.max(width - 520, 380), 640) : Math.min(width - 32, 460);
  const sheetOpen = !wide && !!card && mineTurn;
  const pr = myProposals(room, userId);
  const incoming = marketOffers(room, userId).length + pr.suyunchi.length + pr.loansToAccept.length + pr.partnerToAccept.length;
  const notices = (state.notices ?? []).filter((n: any) => (n.to === "all" || n.to === userId) && n.round >= state.round - 1).slice(-3);
  const log: string[] = state.log.slice(-6).reverse().map((l: string) => humanize(room, l));
  const bank = mine ? bankRoom(mine) : 0;
  const centre = <TurnPanel room={room} userId={userId} mineTurn={mineTurn} hasCard={!!card} left={left} onRoll={() => onAct({ type: "roll" })} compact={!wide && boardSize < 400} />;

  const side = (
    <View style={[{ gap: space.md, flex: 1, minWidth: 280 }, wide && { maxWidth: 460 }]}>
      {notices.length > 0 && (<View style={{ gap: space.xs }} accessibilityLiveRegion="polite">{notices.map((n: any) => (
        <Banner key={n.id} kind="warn">{n.key === "loan_reminder" ? `${nameOf(room, n.from)} ${uz.notice.loan_reminder}${n.amount ? `: ${money(n.amount)}` : ""}` : uz.notice[n.key as "crisis_start" | "crisis_end"]}</Banner>))}</View>)}
      {card && mineTurn && wide && mine && <CardEnter id={card.id}><DecisionCard card={card} me={mine} bankRoom={bank} onAct={onAct} left={left} /></CardEnter>}
      {mine && <FinanceCard p={mine} profession={room.professions?.[mine.id]} />}
      <Collapsible title={uz.game.moneyActions} badge={incoming || undefined} defaultOpen={incoming > 0}><Actions room={room} userId={userId} onAct={onAct} /></Collapsible>
      <Card>
        <SectionTitle>{uz.game.events}</SectionTitle>
        {log.length === 0 ? <Text style={s.muted}>{uz.game.noEvents}</Text> : log.map((l, i) => <Text key={i} style={[s.log, i === 0 && { color: color.navy, fontWeight: "700" }]}>{l}</Text>)}
        <View accessibilityLiveRegion="polite">{reactions.map((r) => <Text key={r.id} style={s.log}>{r.from === userId ? uz.result.you : nameOf(room, r.from)}: {r.emoji}</Text>)}</View>
      </Card>
      <View style={s.reactRow} role="group" aria-label={uz.react.label}>{REACTIONS.map((e) => <View key={e} style={{ minWidth: 56 }}><Button label={e} kind="ghost" onPress={() => onReact(e)} /></View>)}</View>
      <Button label={uz.rules.open} kind="ghost" onPress={onRules} />
      {!state.winner && (!confirmLeave ? <Button label={uz.leave.button} kind="ghost" onPress={() => setConfirmLeave(true)} /> : (
        <Card accent="red" raised={false} label={uz.leave.title}>
          <Pill label={uz.leave.title} kind="bad" /><Text style={s.cardText}>{uz.leave.warn}</Text>
          <Button label={uz.leave.confirm} onPress={onLeave} /><Button label={uz.leave.cancel} kind="ghost" onPress={() => setConfirmLeave(false)} />
        </Card>))}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <CardToast room={room} userId={userId} />
      <ScrollView contentContainerStyle={[s.wrap, sheetOpen && { paddingBottom: 420 }]}>
        {status === "offline" && <Banner kind="warn">{uz.game.offlineBanner}</Banner>}
        {error && error !== "offline" && error !== "unauthorized" && <Banner kind="bad">{errText(error)}</Banner>}
        <View style={s.top}><Text style={s.title} aria-level={1} accessibilityRole="header">{uz.app.name} · {room.code}</Text></View>
        <PlayerStrip room={room} userId={userId} />
        <View style={[{ gap: space.lg }, wide && { flexDirection: "row", alignItems: "flex-start" }]}>
          <View><Board room={room} size={boardSize} turns={wide ? 0 : 3} currentId={cur}>{centre}</Board></View>
          {side}
        </View>
      </ScrollView>
      {/* §9: telefonda qaror pastki varaqda (bottom sheet) */}
      {sheetOpen && mine && (
        <View style={s.sheet} accessibilityViewIsModal>
          <ScrollView><CardEnter id={card!.id} from={48}><DecisionCard card={card} me={mine} bankRoom={bank} onAct={onAct} sheet left={left} /></CardEnter></ScrollView>
        </View>)}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, maxWidth: 1200, width: "100%", alignSelf: "center" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, title: { fontSize: font.sm, fontWeight: "800", color: tone.muted, letterSpacing: 1.5 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "72%" as any, backgroundColor: color.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 3, borderColor: color.gold, padding: space.lg, paddingBottom: space.xl, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 14 },
  collHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }, collTitle: { color: color.navy, fontWeight: "800", fontSize: font.lg },
  muted: { color: tone.muted }, log: { color: tone.muted, fontSize: font.sm, lineHeight: 19 }, cardText: { color: color.navy, fontSize: font.md, lineHeight: 22 },
  reactRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
});
