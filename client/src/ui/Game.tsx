import React, { useEffect, useMemo, useState } from "react";
import { layoutOf } from "../layout";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Animated, Pressable } from "react-native";
import { animationMs, useReducedMotion } from "../motion";
import { Button } from "./Button";
import { Banner, Card, Pill, SectionTitle } from "./kit";
import { Board, boardGeometry, boardPad } from "./Board";
import { PlayersLane } from "./PlayersLane";
import { PlayerList } from "./PlayerList";
import { FxLayer } from "./FxLayer";
import { CountText } from "./CountText";
import { PortfolioCard, PortfolioDetail } from "./Portfolio";
import { HistoryDetail } from "./History";
import { SheetDetail } from "./Sheet";
import { MomentLayer } from "./MomentLayer";
import { useMoments } from "../useMoments";
import type { Http } from "../net/http";
import { LedgerPad, type CalcFeedback } from "./Ledger";
import { useFx } from "../useFx";
import { BottomNav } from "./BottomNav";
import { tabBadges, badgeLabel, type Seen } from "../badges";
import { Icon } from "./Icon";
import { TimerRing } from "./TimerRing";
import { FinanceCard } from "./FinanceCard";
import { TurnPanel } from "./TurnPanel";
import { DecisionCard } from "./DecisionCard";
import { CardToast, GambleToast } from "./CardToast";
import { replayTour } from "./tourStore";
import { TimePanel } from "./TimeBar";
import { TutorialCoach } from "./TutorialCoach";
import { QuizResult } from "./QuizResult";
import { Actions } from "./Actions";
import { uz, errText } from "../i18n/uz";
import { money } from "../format";
import { color, font, HEADER_H, radius, space, tone } from "../theme";
import { bankRoom, phaseSeconds, currentId, exitProgress, humanize, isMyTurn, marketOffers, me, myProposals, nameOf } from "../model";
import { REACTIONS, type Reaction, type RoomView } from "../net/connection";
import { RULES } from "@poyga/rules";
import { useMovement } from "../useMovement";
import { useGameSounds, useSoundPrefs } from "../useGameSounds";

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
const WIDE_LANE_H = 74, WIDE_LEGEND_H = 52, WIDE_NOTE_H = 36, WIDE_STRIP_H = 100, WIDE_STRIP_SHORT_H = 52; // past ekranda (< 820 px) pastki qator bir qator
export function Game({ http, room, userId, onAct, onReact, onLeave, onResume, reactions, onRules, error, status, calcFb }: { http?: Http; calcFb?: CalcFeedback | null; error?: string | null; status?: string; room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void; onResume?: () => void; onReact: (e: string) => void; onLeave: () => void; reactions: Reaction[]; onRules: () => void }) {
  const [confirmLeave, setConfirmLeave] = useState(false); const [portfolioOpen, setPortfolioOpen] = useState(false); const [historyOpen, setHistoryOpen] = useState(false); const [sheetView, setSheetView] = useState(false);
  const [tab, setTab] = useState<"field" | "blank" | "players">("field");
  const { width, height } = useWindowDimensions();
  const lay = layoutOf(width, height), compact = lay.compact, tablet = lay.tablet;
  const wide = lay.wide; // yotiq planshet/kompyuter/yotiq telefon: chapda moliyaviy panel, markazda taxta; butun ekran bitta ko'rinishga sig'adi (sahifa aylanmaydi)
  const left = useCountdown(room.deadline);
  const mine = me(room, userId), mineTurn = isMyTurn(room, userId), cardRaw = room.pendingCard;
  const mv = useMovement(room), settled = mv.settled; // fishka kataklar ustidan yurib bo'lguncha karta/qaror ko'rsatilmaydi
  const card = settled ? cardRaw : null;
  const state = room.state; const cur = currentId(room); const curP = state.players.find((p: any) => p.id === cur);
  const tri = wide && !compact && width >= 1366; // kompyuter (≥ 1366 px): uch ustun — chapda moliya va reaksiyalar, markazda taxta, o'ngda vaqt, voqealar va o'yinchilar
  const sideW = compact ? Math.max(280, Math.min(380, Math.round(width * 0.4))) : tri ? 340 : 380, rightW = 300, nCells = state.players.some((p: any) => p.circle === "small") ? 48 : 53;
  // Kompyuterda taxta kenglikka ham, balandlikka ham moslanadi: sarlavha, o'yinchilar qatori, izoh va pastki qator uchun joy qoldiriladi
  const pad = boardPad(wide), short = wide && !compact && height < 820, reserveH = compact ? HEADER_H + 2 * pad + 2 * space.md : tri ? HEADER_H + space.md + space.lg + WIDE_LEGEND_H + WIDE_NOTE_H + 3 * space.md + 2 * pad : HEADER_H + space.md + space.lg + WIDE_LANE_H + WIDE_LEGEND_H + WIDE_NOTE_H + (short ? WIDE_STRIP_SHORT_H : WIDE_STRIP_H) + 4 * space.md + 2 * pad;
  const { boardWidth, tight } = useMemo(() => { // faqat oyna/aylana o'zgarganda qayta hisoblanadi (har kadrda emas)
    if (compact) { // yotiq telefon: taxta balandlikka sig'adi (kataklar kichik — ikonka va rang qoladi)
      let w = Math.min(Math.max(width - sideW - 3 * space.lg - 2 * pad, 240), 940);
      while (w > 240 && boardGeometry(w, true, nCells, true, true).H > height - reserveH) w -= 10;
      return { boardWidth: w, tight: true };
    }
    let w = wide ? Math.min(Math.max(Math.min(width, 1440) - sideW - (tri ? rightW + space.lg : 0) - 64 - 2 * pad, 560), 940) : Math.min(width - 32 - 2 * pad, tablet ? 640 : 460), t = false;
    if (wide) {
      while (w > 560 && boardGeometry(w, true, nCells).H > height - reserveH) w -= 20;
      if (boardGeometry(w, true, nCells).H > height - reserveH) { t = true; while (w > 480 && boardGeometry(w, true, nCells, true).H > height - reserveH) w -= 20; }
    }
    return { boardWidth: w, tight: t };
  }, [wide, compact, tablet, tri, width, height, nCells, pad, reserveH, sideW]);
  const sheetOpen = !wide && !!card && mineTurn;
  const pr = myProposals(room, userId);
  const incoming = marketOffers(room, userId).length + pr.suyunchi.length + pr.loansToAccept.length + pr.partnerToAccept.length;
  const notices = (state.notices ?? []).filter((n: any) => (n.to === "all" || n.to === userId) && n.round >= state.round - 1).slice(-3);
  const log: string[] = state.log.slice(-6).reverse().map((l: string) => humanize(room, l));
  const bank = mine ? bankRoom(mine) : 0;
  const manualCalc = room.calc?.mode === "manual"; const due = manualCalc && !!room.calc!.due.includes(userId); // hisob yangilanmaguncha kubik tashlab bo'lmaydi
  const canRoll = mineTurn && !cardRaw && settled && !state.winner && !due;
  // Pastki menyu belgilari (telefon): ko'rilgan narsalar bo'lim ochilganda yangilanadi
  const [seen, setSeen] = useState<Seen>(() => ({ logN: state.logN ?? 0, reactions: reactions.map((r) => r.id), notices: (state.notices ?? []).map((n: any) => n.id) }));
  useEffect(() => {
    if (wide) return;
    if (tab === "players") setSeen((p) => { const ids = reactions.map((r) => r.id); return p.logN === (state.logN ?? 0) && p.reactions.length === ids.length ? p : { ...p, logN: state.logN ?? 0, reactions: ids }; });
    if (tab === "blank") setSeen((p) => { const ids = (state.notices ?? []).map((n: any) => n.id); return p.notices.length === ids.length ? p : { ...p, notices: ids }; });
  }, [wide, tab, state.logN, state.notices, reactions]);
  const badges = useMemo(() => tabBadges({ room, userId, myTurnAction: mineTurn && !state.winner && (canRoll || !!cardRaw || due), seen, reactions }), [room, userId, mineTurn, state.winner, canRoll, cardRaw, due, seen, reactions]);
  const navBadge = (k: "field" | "blank" | "players") => { const b = badges[k]; return b ? { count: b.count, tone: b.tone, temp: b.temp, label: badgeLabel(k, b) } : null; };
  const myDie = (state.lastRoll && state.lastRoll.playerId === userId ? state.lastRoll.die : null) as number | null;
  useEffect(() => { // kompyuterda probel — kubik tashlash (tugma/matn maydoni fokusda bo'lmasa)
    const doc = (globalThis as any).document; if (!doc?.addEventListener || !canRoll) return;
    const h = (e: any) => { const tag = (e.target?.tagName ?? "").toLowerCase(); const interactive = !!e.target?.closest?.('[role="button"],[role="link"],[role="radio"],[role="checkbox"],[role="dialog"],[contenteditable="true"]');
      if (e.code === "Space" && !interactive && !doc.querySelector('[role="dialog"]') && !["input", "textarea", "button", "select", "a"].includes(tag) && !e.repeat) { e.preventDefault(); onAct({ type: "roll" }); } };
    doc.addEventListener("keydown", h); return () => doc.removeEventListener("keydown", h);
  }, [canRoll, onAct]);
  const lcMine = state.lastCard && (state.lastCard as any).playerId === userId ? room.lastCard?.text ?? null : null;
  const fx = useFx(mine, lcMine, settled);
  useGameSounds({ room, userId, settled, mineTurn, left });
  const mom = useMoments(room, userId, settled); const [momH, setMomH] = useState(0); // lahzalar: ovoz + animatsiya + tushuntirish (moments.ts)
  const snd = useSoundPrefs();
  const big = mine?.circle === "big"; const e = mine ? exitProgress(mine, state.mode) : null;
  const ledgerNow = room.calc?.ledger?.[userId] ?? (mine && e ? { cash: mine.cash, passive: e.passive, flow: e.cashflow } : { cash: 0, passive: 0, flow: 0 });
  const gate = due && mineTurn && !cardRaw && settled && !state.winner ? <LedgerPad testID="ledger-gate" title={uz.ledger.gateTitle} hint={uz.ledger.gateHint} current={ledgerNow} feedback={calcFb} submitLabel={uz.ledger.gateSubmit} onSubmit={(c) => onAct({ type: "confirm_calc", calc: c })} /> : null;
  const centre = <TurnPanel room={room} userId={userId} mineTurn={mineTurn} hasCard={!!cardRaw} moving={!settled} left={left} onRoll={() => onAct({ type: "roll" })} wide={wide} compact={compact} gate={wide && gate ? <View style={{ backgroundColor: "#FFF6DD", borderRadius: 12, padding: 12 }}><Text style={{ color: "#6B4300", fontWeight: "800", fontSize: 15, textAlign: "center" }}>{uz.ledger.gateSide}</Text></View> : null} />;
  // Kompyuter (3 ustun): taxta ostidagi bo'sh joy — «Mening kartalarim» va dekani tanlash shu yerda (chap ustun qisiq va aylantirishni talab qilardi)
  const deckPick = tri && !!card && mineTurn && !!mine && (card as any).effect?.kind === "deckChoice";
  const timeInSide = wide && !tri && (compact || boardWidth < 760); // taxta tor bo'lsa vaqt paneli chap ustun tepasida (yonida joy yetmaydi)
  const nextName = nameOf(room, state.players[(state.turn + 1) % state.players.length].id);
  const hint = mineTurn ? uz.hud.mineHint.replace("{s}", String(phaseSeconds(room))).replace("{name}", nextName) : left > 0 ? uz.hud.otherHint.replace("{name}", nameOf(room, cur!)).replace("{s}", String(left)) : uz.hud.otherNoTimer.replace("{name}", nameOf(room, cur!));

  const stats = mine && e && (
    <View style={s.stats} role="group" aria-label={uz.game.finance}>
      <View style={s.stat} role="group" accessible aria-label={`${uz.hud.cashLabel}: ${money(mine.cash)}`}><Text style={s.statL} aria-hidden>{uz.hud.cashLabel}</Text><CountText value={fx.shown?.cash ?? mine.cash} style={s.statV} /></View>
      <View style={s.stat} role="group" accessible aria-label={`${big ? uz.hud.flowMonthly : uz.game.cashflow}: ${money(e.cashflow)}`}><Text style={s.statL} aria-hidden>{big ? uz.hud.flowMonthly : uz.game.cashflow}</Text><CountText value={fx.shown?.flow ?? e.cashflow} signed style={[s.statV, { color: (fx.shown?.flow ?? e.cashflow) < 0 ? tone.bad : tone.good }]} /></View>
      {big ? (
        <View style={s.stat} role="group" accessible aria-label={`${uz.hud.toWin}: ${money(e.cashflow)} / ${money(RULES.winCashflow)}`}><Text style={s.statL} aria-hidden>{uz.hud.toWin}</Text>
          <View style={s.bar} aria-hidden><View style={[s.fill, { width: `${Math.round(Math.max(0, Math.min(1, e.cashflow / RULES.winCashflow)) * 100)}%` }]} /></View><Text style={s.statS} aria-hidden>{money(e.cashflow)} / {money(RULES.winCashflow)}</Text></View>
      ) : (
        <View style={s.stat} role="group" accessible aria-label={`${uz.game.passive}: ${money(e.passive)}`}><Text style={s.statL} aria-hidden>{uz.game.passive}</Text><CountText value={fx.shown?.passive ?? e.passive} style={s.statV} /></View>)}
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
      {timeInSide && <TimePanel room={room} userId={userId} settled={settled} />}
      {notices.length > 0 && (<View style={{ gap: space.xs }} accessibilityLiveRegion="polite">{notices.map((n: any) => (
        <Banner key={n.id} kind="warn">{n.key === "loan_reminder" ? `${nameOf(room, n.from)} ${uz.notice.loan_reminder}${n.amount ? `: ${money(n.amount)}` : ""}` : uz.notice[n.key as "crisis_start" | "crisis_end"]}</Banner>))}</View>)}
      {mine && <View testID="finance"><FinanceCard mode={state.mode} p={mine} shown={fx.shown} profession={room.professions?.[mine.id]} dream={mine.dreamIdx !== null && mine.dreamIdx !== undefined ? room.dreams?.[mine.dreamIdx] : null} /></View>}
      <View testID="actions"><Collapsible title={uz.game.moneyActions} badge={incoming || undefined} defaultOpen={incoming > 0}><Actions room={room} userId={userId} onAct={onAct} /></Collapsible></View>
      {mine && !tri && <PortfolioCard room={room} userId={userId} onOpen={() => setPortfolioOpen(true)} onAct={onAct} />}
      {short && !tri && eventsCard(3)}
      {compact && <PlayersLane room={room} userId={userId} />}
      {compact && eventsCard(3)}
    </View>
  );
  // Telefon: hammasi bitta ustunda
  const side = ( // telefonda voqealar va reaksiyalar «O'yinchilar» bo'limida (pastki menyudagi belgi shu yerdagi yangiliklarni ko'rsatadi)
    <View style={{ gap: space.md, flex: 1 }}>{sideMain}{leaveBlock}</View>
  );
  const reactPanel = (<Card label={uz.react.title}><SectionTitle>{uz.react.title}</SectionTitle>{reactRow}</Card>);
  const rightCol = (
    <ScrollView tabIndex={0} role="region" aria-label={uz.hud.playersTitle} style={{ width: rightW, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[s.sideScroll, { gap: space.md }]}>
      <TimePanel room={room} userId={userId} settled={settled} />
      {eventsCard(6)}
      <PlayerList room={room} userId={userId} />
      {leaveBlock}
    </ScrollView>);
  const autoMe = !!room.members.find((m) => m.userId === userId)?.autopilot;
  const banners = (<>
    <QuizResult room={room} userId={userId} />
    {room.mode === "tutorial" && !state.winner && <TutorialCoach room={room} userId={userId} />}
    {autoMe && <View testID="autopilot-banner" role="alert"><Banner kind="warn"><Text style={{ fontWeight: "800", color: tone.warn }}>{uz.hud.autopilot.title}. </Text>{uz.hud.autopilot.text}</Banner>{onResume && <View style={{ marginTop: space.sm }}><Button label={uz.hud.autopilot.back} onPress={onResume} /></View>}</View>}
    {error && error !== "offline" && error !== "unauthorized" && <Banner kind="bad">{errText(error)}</Banner>}</>);
  const circleName = curP?.circle === "big" ? uz.hud.bigCircle : uz.hud.smallCircle;
  const tiny = width < 360; // 320 px telefon: oltita tugma va sarlavha sig'sin
  const header = (
    <View style={[s.header, (!wide || compact) && { gap: 2, paddingHorizontal: space.md }]}>
      <View style={[s.dotC, { backgroundColor: big ? color.red : color.green }, !wide && { marginRight: 4 }]} aria-hidden />
      <View style={wide ? { flexDirection: "row", alignItems: "center", gap: space.sm } : { flexShrink: 1 }}>{/* telefonda sarlavha va tur ustma-ust: 6 ta tugma ekranga sig'sin */}
        <Text style={[s.hTitle, !wide && { fontSize: font.md }]} aria-level={1} accessibilityRole="header" numberOfLines={1}>{circleName}</Text>
        <Text style={s.hSub} numberOfLines={1}>{state.round}-{uz.hud.turnWord}</Text>
      </View>
      <View style={{ flex: 1 }} />
      {wide && !compact && <View style={s.codePill}><Text style={s.codeT} aria-label={`${uz.home.code} ${room.code.split("").join(" ")}`}>{room.code}</Text></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={uz.portfolio.title} onPress={() => setPortfolioOpen(true)} style={[s.hBtn, (!wide || compact) && s.hBtnP, tiny && { minWidth: 32 }]} testID="portfolio-open"><Icon name="file" size={tiny ? 20 : 22} color={color.navy} />{wide && !compact && <Text style={s.hBtnT}>{uz.portfolio.title}</Text>}</Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={uz.sheet.title} onPress={() => setSheetView(true)} style={[s.hBtn, (!wide || compact) && s.hBtnP, tiny && { minWidth: 32 }]} testID="sheet-open"><Icon name="chart" size={tiny ? 20 : 22} color={color.navy} />{wide && !compact && <Text style={s.hBtnT}>{uz.sheet.open}</Text>}</Pressable>
      {http && <Pressable accessibilityRole="button" accessibilityLabel={uz.history.title} onPress={() => setHistoryOpen(true)} style={[s.hBtn, (!wide || compact) && s.hBtnP, tiny && { minWidth: 32 }]} testID="history-open"><Icon name="clock" size={tiny ? 20 : 22} color={color.navy} />{wide && !compact && <Text style={s.hBtnT}>{uz.history.open}</Text>}</Pressable>}
      <Pressable role="switch" aria-checked={!snd.muted} aria-label={uz.sound.label} onPress={snd.toggle} style={[s.hBtn, (!wide || compact) && s.hBtnP, tiny && { minWidth: 32 }]} testID="sound-toggle"><Icon name={snd.muted ? "mute" : "volume"} size={tiny ? 20 : 22} color={snd.muted ? tone.muted : color.navy} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={uz.onboarding.help} onPress={replayTour} style={[s.hBtn, (!wide || compact) && s.hBtnP, tiny && { minWidth: 32 }]} testID="tour-help"><Icon name="help" size={tiny ? 20 : 22} color={color.navy} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={uz.rules.open} onPress={onRules} style={[s.hBtn, (!wide || compact) && s.hBtnP, tiny && { minWidth: 32 }]}><Icon name="book" size={tiny ? 20 : 22} color={color.navy} />{wide && !compact && <Text style={s.hBtnT}>{uz.hud.tabs.rules}</Text>}</Pressable>
    </View>
  );

  if (wide) return (
    <View style={{ height, overflow: "hidden" as any }}>
      <MomentLayer moments={mom.shown} dismiss={mom.dismiss} onHeight={setMomH} offset={wide ? 0 : Math.min(fx.chips.length, 5) * 54} /><CardToast room={room} userId={userId} hold={!settled} offset={momH} /><GambleToast room={room} userId={userId} hold={!settled} offset={momH} />
      <FxLayer chips={fx.chips} reduced={fx.reduced} style={{ top: HEADER_H + 6, left: Math.max(0, (width - 1440) / 2) + space.lg, width: sideW - space.sm }} />
      {portfolioOpen && <PortfolioDetail room={room} userId={userId} onClose={() => setPortfolioOpen(false)} />}
      {sheetView && <SheetDetail room={room} userId={userId} onClose={() => setSheetView(false)} />}
      {historyOpen && http && <HistoryDetail http={http} code={room.code} onClose={() => setHistoryOpen(false)} />}
      {header}
      <View style={s.shell}>
        {card && mineTurn && mine && !deckPick ? (
          <View style={{ width: sideW, flexGrow: 0, flexShrink: 0, paddingBottom: space.lg, gap: space.sm }}>
            <CardEnter id={card.id} style={{ flex: 1, minHeight: 0 }}>
              <DecisionCard horizontal={compact} card={card} me={mine} bankRoom={bank} turnSeconds={phaseSeconds(room)} calcMode={manualCalc} calcFb={calcFb} onAct={onAct} left={left} die={myDie}
                layout={(body, actions) => (<View style={s.decide}><ScrollView tabIndex={0} role="region" aria-label={uz.deck.other} style={{ flex: 1 }} contentContainerStyle={{ gap: space.md }}>{body}{sideMain}</ScrollView>{actions ? <View style={s.decideActions}>{actions}</View> : null}</View>)} />
            </CardEnter>
          </View>
        ) : <ScrollView tabIndex={0} role="region" aria-label={uz.game.finance} style={{ width: sideW, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[s.sideScroll, { gap: space.md }]}>{gate}{sideMain}{tri && reactPanel}{compact && reactRow}{compact && leaveBlock}</ScrollView>}
        <ScrollView tabIndex={0} role="region" aria-label={uz.hud.tabs.field} style={{ flex: 1, minWidth: 0 }} contentContainerStyle={s.mainScroll}>
          {banners}
          {!tri && !compact && <View style={{ width: boardWidth, flexDirection: "row", gap: space.md, alignItems: "center" }}><View style={{ flexShrink: 0 }}><PlayersLane room={room} userId={userId} wide /></View>{!timeInSide && <View style={{ flex: 1, minWidth: 0 }}><TimePanel room={room} userId={userId} settled={settled} /></View>}</View>}
          <Board room={room} width={boardWidth} wide tight={tight} compact={compact} movement={mv.shown} currentId={cur}>{centre}</Board>
          {!compact && <Text style={s.caption}>{uz.hud.ownCircleNote}</Text>}
          {tri && mine && (
            <View style={{ width: boardWidth, gap: space.md }} testID="dock">
              {deckPick && card ? (
                <CardEnter id={card.id}>
                  <DecisionCard card={card} me={mine} bankRoom={bank} turnSeconds={phaseSeconds(room)} calcMode={manualCalc} calcFb={calcFb} onAct={onAct} left={left} die={myDie} layout={(body) => <Card accent="gold">{body}</Card>} />
                </CardEnter>) : null}
              <PortfolioCard room={room} userId={userId} onOpen={() => setPortfolioOpen(true)} onAct={onAct} cols={3} />
            </View>)}
          {!tri && !compact && <View style={{ width: boardWidth, flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            {!short && <View style={{ flex: 1 }}>{eventsCard(3)}</View>}
            <View style={short ? { flex: 1, flexDirection: "row", gap: space.sm, alignItems: "center", justifyContent: "space-between" } : { width: 270, gap: space.sm }}>{reactRow}<View style={short ? { flex: 1, maxWidth: 260 } : undefined}>{leaveBlock}</View></View>
          </View>}
        </ScrollView>
        {tri && rightCol}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.white }}>
      <MomentLayer moments={mom.shown} dismiss={mom.dismiss} onHeight={setMomH} offset={wide ? 0 : Math.min(fx.chips.length, 5) * 54} /><CardToast room={room} userId={userId} hold={!settled} offset={momH} /><GambleToast room={room} userId={userId} hold={!settled} offset={momH} />
      <FxLayer chips={fx.chips} reduced={fx.reduced} style={{ top: HEADER_H + 10, left: space.lg, right: space.lg }} />
      {portfolioOpen && <PortfolioDetail room={room} userId={userId} onClose={() => setPortfolioOpen(false)} />}
      {sheetView && <SheetDetail room={room} userId={userId} onClose={() => setSheetView(false)} />}
      {historyOpen && http && <HistoryDetail http={http} code={room.code} onClose={() => setHistoryOpen(false)} />}
      {header}
      <ScrollView contentContainerStyle={[s.mwrap, tablet && s.mwrapT, sheetOpen && { paddingBottom: 420 }]}>
        {banners}
        {tab === "field" && (<>
          <TimePanel room={room} userId={userId} settled={settled} />
          {stats}
          <View style={{ alignItems: "center" }}><Board room={room} width={boardWidth} wide={false} movement={mv.shown} currentId={cur}>{centre}</Board></View>
          <PlayersLane room={room} userId={userId} />
          <View style={s.turnRow}>
            {left > 0 && <TimerRing left={left} total={phaseSeconds(room)} size={52} label={`${left} ${uz.game.seconds}`} />}
            <Text style={s.turnHint} accessibilityLiveRegion="polite"><Text style={{ fontWeight: "800", color: mineTurn ? tone.good : color.navy }}>{mineTurn ? uz.hud.yourTurn : ""}</Text>{mineTurn ? " " : ""}{hint}</Text>
          </View>
        </>)}
        {tab === "blank" && (<View style={{ gap: space.md }}>{stats}{side}</View>)}
        {tab === "players" && (<View style={{ gap: space.md }}><PlayerList room={room} userId={userId} />{eventsCard(6)}{reactRow}</View>)}
      </ScrollView>
      {tab === "field" && gate && <ScrollView style={s.gateSheet} contentContainerStyle={{ padding: space.md }}>{gate}</ScrollView>}
      {tab === "field" && canRoll && (<View style={s.cta}><Button label={curP?.circle === "big" ? uz.hud.rollBig : uz.hud.rollSmall} onPress={() => onAct({ type: "roll" })} /></View>)}
      {/* §9: telefonda qaror pastki varaqda (bottom sheet) */}
      {sheetOpen && mine && (
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.grab} aria-hidden />
          <CardEnter id={card!.id} from={48} style={{ flexShrink: 1, minHeight: 0 }}><DecisionCard card={card} me={mine} bankRoom={bank} turnSeconds={phaseSeconds(room)} calcMode={manualCalc} calcFb={calcFb} onAct={onAct} sheet left={left} die={myDie}
            layout={(body, actions) => (<View style={{ flexShrink: 1, minHeight: 0 }}><ScrollView tabIndex={0} role="region" aria-label={uz.deck.other} style={{ flexShrink: 1 }}>{body}</ScrollView>{actions ? <View style={s.decideActions}>{actions}</View> : null}</View>)} /></CardEnter>
        </View>)}
      <BottomNav label={uz.hud.tabs.nav} active={tab} onChange={(k) => (k as string) === "rules" ? onRules() : setTab(k as "field" | "blank" | "players")}
        items={[{ key: "field", label: uz.hud.tabs.field, icon: "board", badge: navBadge("field") }, { key: "blank", label: uz.hud.tabs.blank, icon: "chart", badge: navBadge("blank") }, { key: "players", label: uz.hud.tabs.players, icon: "people", badge: navBadge("players") }, { key: "rules" as any, label: uz.hud.tabs.rules, icon: "book" }]} />
    </View>
  );
}
const s = StyleSheet.create({
  mwrap: { padding: space.lg, gap: space.md }, mwrapT: { width: "100%", maxWidth: 760, alignSelf: "center" }, // tik planshet: ustun markazda, o'qish uchun qulay kenglikda
  shell: { flex: 1, flexDirection: "row", gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.md, minHeight: 0, maxWidth: 1440, width: "100%", alignSelf: "center" },
  decide: { flex: 1, minHeight: 0, borderRadius: radius.lg, borderWidth: 2, borderColor: color.gold, backgroundColor: color.white, padding: space.md, gap: space.md },
  decideActions: { paddingTop: space.sm, borderTopWidth: 1, borderTopColor: "#E6ECEF" },
  sideScroll: { paddingBottom: space.lg }, mainScroll: { alignItems: "center", gap: space.md, paddingBottom: space.lg },
  header: { minHeight: HEADER_H, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: "#E6ECEF", backgroundColor: color.white },
  dotC: { width: 10, height: 10, borderRadius: 5 }, hTitle: { fontSize: font.lg, fontWeight: "800", color: color.navy }, hSub: { fontSize: font.sm, color: tone.muted },
  hBtnP: { minWidth: 36, paddingHorizontal: 1 }, hBtn: { minHeight: 44, minWidth: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6 }, hBtnT: { color: color.navy, fontWeight: "700", fontSize: font.md },
  codePill: { backgroundColor: "#F4F7F8", borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 }, codeT: { fontWeight: "800", letterSpacing: 2, color: color.navy },
  stats: { flexDirection: "row", gap: space.md, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, stat: { flex: 1, gap: 2 },
  statL: { color: tone.muted, fontSize: 12, fontWeight: "700" }, statV: { color: color.navy, fontSize: font.xl, fontWeight: "800", fontVariant: ["tabular-nums"] }, statS: { color: tone.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
  bar: { height: 6, borderRadius: 3, backgroundColor: "#E6ECEF", overflow: "hidden", marginTop: 6 }, fill: { height: 6, backgroundColor: color.green },
  turnRow: { flexDirection: "row", alignItems: "center", gap: space.md }, turnHint: { flex: 1, color: tone.muted, fontSize: font.md, lineHeight: 21 },
  gateSheet: { maxHeight: "62%" as any, backgroundColor: color.white, borderTopWidth: 1, borderTopColor: "#E6ECEF" },
  cta: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, backgroundColor: color.white },
  caption: { color: tone.muted, fontSize: font.sm, textAlign: "center", maxWidth: 640 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 62, maxHeight: "80%" as any, backgroundColor: color.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.lg, paddingTop: space.sm, shadowColor: "#082238", shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  grab: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D5DEE4", marginBottom: space.md },
  collHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }, collTitle: { color: color.navy, fontWeight: "800", fontSize: font.lg },
  muted: { color: tone.muted }, log: { color: tone.muted, fontSize: font.sm, lineHeight: 19 }, cardText: { color: color.navy, fontSize: font.md, lineHeight: 22 },
  reactRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
});
