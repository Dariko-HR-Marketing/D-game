import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Animated, Pressable } from "react-native";
import { animationMs, useReducedMotion } from "../motion";
import { Button } from "./Button";
import { Banner, Card, Pill, SectionTitle } from "./kit";
import { Board, boardGeometry } from "./Board";
import { PlayersLane } from "./PlayersLane";
import { PlayerList } from "./PlayerList";
import { BottomNav } from "./BottomNav";
import { Icon } from "./Icon";
import { TimerRing } from "./TimerRing";
import { FinanceCard } from "./FinanceCard";
import { TurnPanel } from "./TurnPanel";
import { DecisionCard } from "./DecisionCard";
import { CardToast, GambleToast } from "./CardToast";
import { Onboarding } from "./Onboarding";
import { Actions } from "./Actions";
import { uz, errText } from "../i18n/uz";
import { money } from "../format";
import { color, font, HEADER_H, radius, space, tone } from "../theme";
import { bankRoom, currentId, exitProgress, humanize, isMyTurn, marketOffers, me, myProposals, nameOf } from "../model";
import { REACTIONS, type Reaction, type RoomView } from "../net/connection";
import { RULES } from "@poyga/rules";

/** Karta ochilishi: yengil paydo bo'lish (~240 ms); harakatni kamaytirish yoqilgan bo'lsa — darhol. */
function CardEnter({ children, id, from = 12, style }: { children: React.ReactNode; id: string; from?: number; style?: any }) {
  const reduced = useReducedMotion(); const v = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { v.setValue(0); Animated.timing(v, { toValue: 1, duration: animationMs(reduced), useNativeDriver: true }).start(); }, [id, reduced, v]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>{children}</Animated.View>;
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

/** Kompyuter ko'rinishida taxta atrofidagi qatorlar balandligi (taxta shunga qarab kichrayadi). */
const WIDE_LANE_H = 74, WIDE_LEGEND_H = 52, WIDE_NOTE_H = 36, WIDE_STRIP_H = 100;
export function Game({ room, userId, onAct, onReact, onLeave, reactions, onRules, error, status }: { error?: string | null; status?: string; room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void; onReact: (e: string) => void; onLeave: () => void; reactions: Reaction[]; onRules: () => void }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [tab, setTab] = useState<"field" | "blank" | "players">("field");
  const { width, height } = useWindowDimensions();
  const wide = width >= 900; // planshet/kompyuter: chapda moliyaviy panel, markazda taxta; butun ekran bitta ko'rinishga sig'adi (sahifa aylanmaydi)
  const left = useCountdown(room.deadline);
  const mine = me(room, userId), mineTurn = isMyTurn(room, userId), card = room.pendingCard;
  const state = room.state; const cur = currentId(room); const curP = state.players.find((p: any) => p.id === cur);
  const sideW = 380, nCells = state.players.some((p: any) => p.circle === "small") ? 48 : 53;
  // Kompyuterda taxta kenglikka ham, balandlikka ham moslanadi: sarlavha, o'yinchilar qatori, izoh va pastki qator uchun joy qoldiriladi
  const reserveH = HEADER_H + space.md + space.lg + WIDE_LANE_H + WIDE_LEGEND_H + WIDE_NOTE_H + WIDE_STRIP_H + 4 * space.md;
  let boardWidth = wide ? Math.min(Math.max(width - sideW - 64, 560), 940) : Math.min(width - 32, 460), tight = false;
  if (wide) {
    while (boardWidth > 560 && boardGeometry(boardWidth, true, nCells).H > height - reserveH) boardWidth -= 20;
    if (boardGeometry(boardWidth, true, nCells).H > height - reserveH) { tight = true; while (boardWidth > 480 && boardGeometry(boardWidth, true, nCells, true).H > height - reserveH) boardWidth -= 20; }
  }
  const sheetOpen = !wide && !!card && mineTurn;
  const pr = myProposals(room, userId);
  const incoming = marketOffers(room, userId).length + pr.suyunchi.length + pr.loansToAccept.length + pr.partnerToAccept.length;
  const notices = (state.notices ?? []).filter((n: any) => (n.to === "all" || n.to === userId) && n.round >= state.round - 1).slice(-3);
  const log: string[] = state.log.slice(-6).reverse().map((l: string) => humanize(room, l));
  const bank = mine ? bankRoom(mine) : 0;
  const canRoll = mineTurn && !card && !state.winner;
  const myDie = (state.lastRoll && state.lastRoll.playerId === userId ? state.lastRoll.die : null) as number | null;
  useEffect(() => { // kompyuterda probel — kubik tashlash (tugma/matn maydoni fokusda bo'lmasa)
    const doc = (globalThis as any).document; if (!doc?.addEventListener || !canRoll) return;
    const h = (e: any) => { const tag = (e.target?.tagName ?? "").toLowerCase(); const interactive = !!e.target?.closest?.('[role="button"],[role="link"],[role="radio"],[role="checkbox"],[role="dialog"],[contenteditable="true"]');
      if (e.code === "Space" && !interactive && !doc.querySelector('[role="dialog"]') && !["input", "textarea", "button", "select", "a"].includes(tag) && !e.repeat) { e.preventDefault(); onAct({ type: "roll" }); } };
    doc.addEventListener("keydown", h); return () => doc.removeEventListener("keydown", h);
  }, [canRoll, onAct]);
  const big = mine?.circle === "big"; const e = mine ? exitProgress(mine) : null;
  const centre = <TurnPanel room={room} userId={userId} mineTurn={mineTurn} hasCard={!!card} left={left} onRoll={() => onAct({ type: "roll" })} wide={wide} />;
  const nextName = nameOf(room, state.players[(state.turn + 1) % state.players.length].id);
  const hint = mineTurn ? uz.hud.mineHint.replace("{s}", "30").replace("{name}", nextName) : left > 0 ? uz.hud.otherHint.replace("{name}", nameOf(room, cur!)).replace("{s}", String(left)) : uz.hud.otherNoTimer.replace("{name}", nameOf(room, cur!));

  const stats = mine && e && (
    <View style={s.stats} role="group" aria-label={uz.game.finance}>
      <View style={s.stat} role="group" accessible aria-label={`${uz.hud.cashLabel}: ${money(mine.cash)}`}><Text style={s.statL} aria-hidden>{uz.hud.cashLabel}</Text><Text style={s.statV} aria-hidden>{money(mine.cash)}</Text></View>
      <View style={s.stat} role="group" accessible aria-label={`${big ? uz.hud.flowMonthly : uz.game.cashflow}: ${money(e.cashflow)}`}><Text style={s.statL} aria-hidden>{big ? uz.hud.flowMonthly : uz.game.cashflow}</Text><Text style={[s.statV, { color: e.cashflow < 0 ? tone.bad : tone.good }]} aria-hidden>{e.cashflow > 0 ? "+" : ""}{money(e.cashflow)}</Text></View>
      {big ? (
        <View style={s.stat} role="group" accessible aria-label={`${uz.hud.toWin}: ${money(e.cashflow)} / ${money(RULES.winCashflow)}`}><Text style={s.statL} aria-hidden>{uz.hud.toWin}</Text>
          <View style={s.bar} aria-hidden><View style={[s.fill, { width: `${Math.round(Math.max(0, Math.min(1, e.cashflow / RULES.winCashflow)) * 100)}%` }]} /></View><Text style={s.statS} aria-hidden>{money(e.cashflow)} / {money(RULES.winCashflow)}</Text></View>
      ) : (
        <View style={s.stat} role="group" accessible aria-label={`${uz.game.passive}: ${money(e.passive)}`}><Text style={s.statL} aria-hidden>{uz.game.passive}</Text><Text style={s.statV} aria-hidden>{money(e.passive)}</Text></View>)}
    </View>
  );

  const eventsCard = (nLines: number) => (
    <Card>
      <SectionTitle>{uz.game.events}</SectionTitle>
      {log.length === 0 ? <Text style={s.muted}>{uz.game.noEvents}</Text> : log.slice(0, nLines).map((l, i) => <Text key={i} style={[s.log, i === 0 && { color: color.navy, fontWeight: "700" }]} numberOfLines={wide ? 2 : undefined}>{l}</Text>)}
      <View accessibilityLiveRegion="polite">{reactions.map((r) => <Text key={r.id} style={s.log}>{r.from === userId ? uz.result.you : nameOf(room, r.from)}: {r.emoji}</Text>)}</View>
    </Card>);
  const reactRow = (<View style={s.reactRow} role="group" aria-label={uz.react.label}>{REACTIONS.map((e2) => <View key={e2} style={{ minWidth: 56 }}><Button label={e2} kind="ghost" onPress={() => onReact(e2)} /></View>)}</View>);
  const leaveBlock = !state.winner && (!confirmLeave ? <Button label={uz.leave.button} kind="ghost" onPress={() => setConfirmLeave(true)} /> : (
    <Card accent="red" raised={false} label={uz.leave.title}>
      <Pill label={uz.leave.title} kind="bad" /><Text style={s.cardText}>{uz.leave.warn}</Text>
      <Button label={uz.leave.confirm} onPress={onLeave} /><Button label={uz.leave.cancel} kind="ghost" onPress={() => setConfirmLeave(false)} />
    </Card>));
  // Chap ustun: bildirishnoma, qaror, moliyaviy holat, moliya amallari
  const sideMain = (
    <View style={{ gap: space.md }}>
      {notices.length > 0 && (<View style={{ gap: space.xs }} accessibilityLiveRegion="polite">{notices.map((n: any) => (
        <Banner key={n.id} kind="warn">{n.key === "loan_reminder" ? `${nameOf(room, n.from)} ${uz.notice.loan_reminder}${n.amount ? `: ${money(n.amount)}` : ""}` : uz.notice[n.key as "crisis_start" | "crisis_end"]}</Banner>))}</View>)}
      {mine && <FinanceCard p={mine} profession={room.professions?.[mine.id]} dream={mine.dreamIdx !== null && mine.dreamIdx !== undefined ? room.dreams?.[mine.dreamIdx] : null} />}
      <Collapsible title={uz.game.moneyActions} badge={incoming || undefined} defaultOpen={incoming > 0}><Actions room={room} userId={userId} onAct={onAct} /></Collapsible>
    </View>
  );
  // Telefon: hammasi bitta ustunda
  const side = (
    <View style={{ gap: space.md, flex: 1 }}>{sideMain}{eventsCard(6)}{reactRow}{leaveBlock}</View>
  );
  const banners = (<>{status === "offline" && <Banner kind="warn">{uz.game.offlineBanner}</Banner>}{error && error !== "offline" && error !== "unauthorized" && <Banner kind="bad">{errText(error)}</Banner>}</>);
  const circleName = curP?.circle === "big" ? uz.hud.bigCircle : uz.hud.smallCircle;
  const header = (
    <View style={s.header}>
      <View style={[s.dotC, { backgroundColor: big ? "#E5484D" : "#22A559" }]} aria-hidden />
      <Text style={s.hTitle} aria-level={1} accessibilityRole="header">{circleName}</Text>
      <Text style={s.hSub}>{state.round}-{uz.hud.turnWord}</Text>
      <View style={{ flex: 1 }} />
      {wide && <View style={s.codePill}><Text style={s.codeT} aria-label={`${uz.home.code} ${room.code.split("").join(" ")}`}>{room.code}</Text></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={uz.rules.open} onPress={onRules} style={s.hBtn}><Icon name="book" size={22} color={color.navy} />{wide && <Text style={s.hBtnT}>{uz.hud.tabs.rules}</Text>}</Pressable>
    </View>
  );

  if (wide) return (
    <View style={{ height, overflow: "hidden" as any }}>
      <CardToast room={room} userId={userId} /><GambleToast room={room} userId={userId} /><Onboarding onRules={onRules} />
      {header}
      <View style={s.shell}>
        {card && mineTurn && mine ? (
          <View style={{ width: sideW, flexGrow: 0, flexShrink: 0, paddingBottom: space.lg, gap: space.sm }}>
            <CardEnter id={card.id} style={{ flex: 1, minHeight: 0 }}>
              <DecisionCard card={card} me={mine} bankRoom={bank} onAct={onAct} left={left} die={myDie}
                layout={(body, actions) => (<View style={s.decide}><ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: space.md }}>{body}{sideMain}</ScrollView><View style={s.decideActions}>{actions}</View></View>)} />
            </CardEnter>
          </View>
        ) : <ScrollView style={{ width: sideW, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={s.sideScroll}>{sideMain}</ScrollView>}
        <ScrollView style={{ flex: 1, minWidth: 0 }} contentContainerStyle={s.mainScroll}>
          {banners}
          <View style={{ width: boardWidth }}><PlayersLane room={room} userId={userId} wide /></View>
          <Board room={room} width={boardWidth} wide tight={tight} currentId={cur}>{centre}</Board>
          <Text style={s.caption}>{uz.hud.ownCircleNote}</Text>
          <View style={{ width: boardWidth, flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>{eventsCard(3)}</View>
            <View style={{ width: 270, gap: space.sm }}>{reactRow}{leaveBlock}</View>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.white }}>
      <CardToast room={room} userId={userId} /><GambleToast room={room} userId={userId} /><Onboarding onRules={onRules} />
      {header}
      <ScrollView contentContainerStyle={[s.mwrap, sheetOpen && { paddingBottom: 420 }]}>
        {banners}
        {tab === "field" && (<>
          {stats}
          <View style={{ alignItems: "center" }}><Board room={room} width={boardWidth} wide={false} currentId={cur}>{centre}</Board></View>
          <PlayersLane room={room} userId={userId} />
          <View style={s.turnRow}>
            {left > 0 && <TimerRing left={left} size={52} label={`${left} ${uz.game.seconds}`} />}
            <Text style={s.turnHint} accessibilityLiveRegion="polite"><Text style={{ fontWeight: "800", color: mineTurn ? tone.good : color.navy }}>{mineTurn ? uz.hud.yourTurn : ""}</Text>{mineTurn ? " " : ""}{hint}</Text>
          </View>
        </>)}
        {tab === "blank" && (<View style={{ gap: space.md }}>{stats}{side}</View>)}
        {tab === "players" && <PlayerList room={room} userId={userId} />}
      </ScrollView>
      {tab === "field" && canRoll && (<View style={s.cta}><Button label={curP?.circle === "big" ? uz.hud.rollBig : uz.hud.rollSmall} onPress={() => onAct({ type: "roll" })} /></View>)}
      {/* §9: telefonda qaror pastki varaqda (bottom sheet) */}
      {sheetOpen && mine && (
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.grab} aria-hidden />
          <CardEnter id={card!.id} from={48} style={{ flexShrink: 1, minHeight: 0 }}><DecisionCard card={card} me={mine} bankRoom={bank} onAct={onAct} sheet left={left} die={myDie}
            layout={(body, actions) => (<View style={{ flexShrink: 1, minHeight: 0 }}><ScrollView style={{ flexShrink: 1 }}>{body}</ScrollView><View style={s.decideActions}>{actions}</View></View>)} /></CardEnter>
        </View>)}
      <BottomNav label={uz.hud.tabs.nav} active={tab} onChange={(k) => (k as string) === "rules" ? onRules() : setTab(k as "field" | "blank" | "players")}
        items={[{ key: "field", label: uz.hud.tabs.field, icon: "board" }, { key: "blank", label: uz.hud.tabs.blank, icon: "chart" }, { key: "players", label: uz.hud.tabs.players, icon: "people" }, { key: "rules" as any, label: uz.hud.tabs.rules, icon: "book" }]} />
    </View>
  );
}
const s = StyleSheet.create({
  mwrap: { padding: space.lg, gap: space.md },
  shell: { flex: 1, flexDirection: "row", gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.md, minHeight: 0, maxWidth: 1440, width: "100%", alignSelf: "center" },
  decide: { flex: 1, minHeight: 0, borderRadius: radius.lg, borderWidth: 2, borderColor: color.gold, backgroundColor: color.white, padding: space.md, gap: space.md },
  decideActions: { paddingTop: space.sm, borderTopWidth: 1, borderTopColor: "#E6ECEF" },
  sideScroll: { paddingBottom: space.lg }, mainScroll: { alignItems: "center", gap: space.md, paddingBottom: space.lg },
  header: { minHeight: HEADER_H, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: "#E6ECEF", backgroundColor: color.white },
  dotC: { width: 10, height: 10, borderRadius: 5 }, hTitle: { fontSize: font.lg, fontWeight: "800", color: color.navy }, hSub: { fontSize: font.sm, color: tone.muted },
  hBtn: { minHeight: 44, minWidth: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6 }, hBtnT: { color: color.navy, fontWeight: "700", fontSize: font.md },
  codePill: { backgroundColor: "#F4F7F8", borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 }, codeT: { fontWeight: "800", letterSpacing: 2, color: color.navy },
  stats: { flexDirection: "row", gap: space.md, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, stat: { flex: 1, gap: 2 },
  statL: { color: tone.muted, fontSize: 12, fontWeight: "700" }, statV: { color: color.navy, fontSize: font.xl, fontWeight: "800", fontVariant: ["tabular-nums"] }, statS: { color: tone.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
  bar: { height: 6, borderRadius: 3, backgroundColor: "#E6ECEF", overflow: "hidden", marginTop: 6 }, fill: { height: 6, backgroundColor: color.green },
  turnRow: { flexDirection: "row", alignItems: "center", gap: space.md }, turnHint: { flex: 1, color: tone.muted, fontSize: font.md, lineHeight: 21 },
  cta: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, backgroundColor: color.white },
  caption: { color: tone.muted, fontSize: font.sm, textAlign: "center", maxWidth: 640 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 62, maxHeight: "80%" as any, backgroundColor: color.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.lg, paddingTop: space.sm, shadowColor: "#082238", shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  grab: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D5DEE4", marginBottom: space.md },
  collHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }, collTitle: { color: color.navy, fontWeight: "800", fontSize: font.lg },
  muted: { color: tone.muted }, log: { color: tone.muted, fontSize: font.sm, lineHeight: 19 }, cardText: { color: color.navy, fontSize: font.md, lineHeight: 22 },
  reactRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
});
