import React, { useEffect, useMemo, useRef, useState } from "react";
import { layoutOf } from "../layout";
import { chatText } from "../chatText";
import { lazyNamed, LaterOverlay } from "../lazy";
const ChatSheet = lazyNamed(() => import("./ChatSheet"), "ChatSheet"), HistoryDetail = lazyNamed(() => import("./History"), "HistoryDetail"), LiveAnalytics = lazyNamed(() => import("./LiveAnalytics"), "LiveAnalytics"), SheetDetail = lazyNamed(() => import("./Sheet"), "SheetDetail"), AuctionLayer = lazyNamed(() => import("./AuctionLayer"), "AuctionLayer"), RecapLayer = lazyNamed(() => import("./RecapLayer"), "RecapLayer");
import { getMuted } from "../chatMute";
import { VoicePanel, useVoice } from "./VoicePanel";
import type { VoiceEngine } from "../voice/engine";
import { DiceModal } from "./DiceModal";
import { getRollModalPref, setRollModalPref } from "../turnPref";
import { isTourOpen, subscribeTourOpen } from "./tourStore";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Animated, Pressable, Platform } from "react-native";
import { animationMs, useReducedMotion } from "../motion";
import { Button } from "./Button";
import { Banner, Card, Pill, SectionTitle } from "./kit";
import { Board, boardGeometry, boardPad } from "./Board";
import { PlayersLane } from "./PlayersLane";
import { PlayerList } from "./PlayerList";
import { FxLayer } from "./FxLayer";
import { BirthLayer } from "./BirthLayer";
import { LogLine } from "./LogLine";
import { CountText } from "./CountText";
import { PortfolioCard, PortfolioDetail } from "./Portfolio";
import { MomentLayer } from "./MomentLayer";
import { useMoments } from "../useMoments";
import type { Http } from "../net/http";
import { LedgerPad, type CalcFeedback } from "./Ledger";
import { useFx } from "../useFx";
import { BottomNav } from "./BottomNav";
import { Acc } from "./Accordion";
import { tabBadges, badgeLabel, type Seen } from "../badges";
import { Icon } from "./Icon";
import { TimerRing } from "./TimerRing";
import { FinanceCard } from "./FinanceCard";
import { TurnPanel } from "./TurnPanel";
import { DecisionCard } from "./DecisionCard";
import { CardToast, GambleToast } from "./CardToast";
import { replayTour } from "./tourStore";
import { TimePanel } from "./TimeBar";
import { openedExclusive, useExclusiveClose } from "../exclusive";
import { Countdown, DeadlineRing } from "../useCountdown";
import { TutorialCoach } from "./TutorialCoach";
import { OnboardingPlan } from "./OnboardingPlan";
import { QuizResult } from "./QuizResult";
import { Actions } from "./Actions";
import { Avatar } from "./Avatar";
import { MarketOfferLayer } from "./MarketOfferLayer";
import { ProfileMenu, RequestModal, useRequestModal, useRequests } from "./RequestCenter";
import { uz, errText } from "../i18n/uz";
import { money } from "../format";
import { GREEN_TEXT, color, font, HEADER_H, radius, space, tone } from "../theme";
import { bankRoom, phaseSeconds, untimed, currentId, exitProgress, humanize, isMyTurn, marketOffers, me, myProposals, nameOf } from "../model";
import type { ChatMsg, RoomView } from "../net/connection";
import { RULES } from "@tajriba24/rules";
import { useMovement } from "../useMovement";
import { useGameSounds, useSoundPrefs } from "../useGameSounds";

/** Karta ochilishi: yengil paydo bo'lish (~240 ms); harakatni kamaytirish yoqilgan bo'lsa — darhol. */
function CardEnter({ children, id, from = 12, style }: { children: React.ReactNode; id: string; from?: number; style?: any }) {
  const reduced = useReducedMotion(); const v = React.useRef(new Animated.Value(0)).current;
  useEffect(() => { v.setValue(0); Animated.timing(v, { toValue: 1, duration: animationMs(reduced), useNativeDriver: true }).start(); }, [id, reduced, v]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>{children}</Animated.View>;
}

/** Yig'iladigan bo'lim; kutayotgan takliflar bo'lsa o'zi ochiladi va belgi (soni) ko'rinadi. */
function Collapsible({ title, badge, defaultOpen, children, group, id }: { title: string; badge?: number; defaultOpen?: boolean; children: React.ReactNode; group?: string; id?: string }) {
  const [open, setOpen] = useState(!!defaultOpen); const [touched, setTouched] = useState(false);
  const close = React.useCallback(() => setOpen(false), []); useExclusiveClose(group ?? "-", id ?? title, close);
  useEffect(() => { if (defaultOpen && !touched) setOpen(true); }, [defaultOpen, touched]);
  return (
    <Card>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { setTouched(true); if (!open && group) openedExclusive(group, id ?? title); setOpen(!open); }} style={s.collHead}>
        <Text style={s.collTitle}>{open ? "▾" : "▸"} {title}</Text>{badge ? <Pill label={String(badge)} kind="warn" /> : null}
      </Pressable>
      {open && children}
    </Card>
  );
}

/** Kompyuter ko'rinishida taxta atrofidagi qatorlar balandligi (taxta shunga qarab kichrayadi). */
const TABLET_RESERVE = 670; // tik planshet: taxtadan tashqari qatorlar balandligi (sarlavha, vaqt, statistika, o'yinchilar, navbat, tugma, menyu)
const PHONE_RESERVE = 418; // telefon, «Maydon» yorlig'i: sarlavha 56 + statistika 94 + pastki menyu 62 + katak turlari 52 + o'yinchilar qatori 74 + navbat 60 + oraliqlar; qolgan balandlik taxtaga
const WIDE_LANE_H = 74, WIDE_LEGEND_H = 52, WIDE_NOTE_H = 36, WIDE_STRIP_H = 100, WIDE_STRIP_SHORT_H = 52; // past ekranda (< 820 px) pastki qator bir qator
/** Sarlavha tugmalari: keng ekranda guruhlarga (hujjatlar · aloqa · yordam) yig'ilgan, telefonda tekis qator. */
type HUi = { flat: boolean; labels: boolean; ib: number; tiny: boolean };
function HBtn({ ui, icon, label, text, onPress, tid, active, children, role, checked }: { ui: HUi; icon: any; label: string; text?: string; onPress: () => void; tid?: string; active?: string; children?: React.ReactNode; role?: "switch"; checked?: boolean }) {
  return (
    <Pressable accessibilityRole={role ? undefined : "button"} role={role} aria-checked={role ? checked : undefined} accessibilityLabel={label} aria-label={label} {...({ title: label } as any)} onPress={onPress} testID={tid}
      style={[s.hBtn, ui.flat && s.hBtnP, ui.tiny && { minWidth: 32 }, !ui.flat && s.hBtnSeg, active ? { backgroundColor: active } : null]}>
      <Icon name={icon} size={ui.ib} color={color.navy} />{ui.labels && text ? <Text style={s.hBtnT}>{text}</Text> : null}{children}
    </Pressable>);
}
function Seg({ ui, children, label }: { ui: HUi; children: React.ReactNode; label: string }) {
  return ui.flat ? <>{children}</> : <View style={s.seg} role="group" aria-label={label}>{children}</View>;
}

export function Game({ http, room, userId, onAct, onLeave, onResume, onBreak, chat, onChat, voice, onRules, error, status, calcFb }: { onBreak?: () => void; chat?: ChatMsg[]; onChat?: (m: { text: string } | { phrase: number }) => void; voice?: VoiceEngine; http?: Http; calcFb?: CalcFeedback | null; error?: string | null; status?: string; room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void; onResume?: () => void; onLeave: () => void; onRules: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false); const [seenLog, setSeenLog] = useState(0); // kompyuter: o'ng panel (vaqt, voqealar, o'yinchilar, reaksiyalar) yon oyna bo'lib ochiladi
  const [menuOpen, setMenuOpen] = useState(false); const [portfolioOpen, setPortfolioOpen] = useState(false); const [historyOpen, setHistoryOpen] = useState(false); const [liveOpen, setLiveOpen] = useState(false); const [sheetView, setSheetView] = useState(false);
  const [tab, setTab] = useState<"field" | "blank" | "players">("field");
  const chatList = chat ?? []; const [chatOpen, setChatOpen] = useState(false); const lastChat = chatList[chatList.length - 1]?.id ?? 0; const [seenChat, setSeenChat] = useState(lastChat);
  useEffect(() => { if (chatOpen) setSeenChat(lastChat); }, [chatOpen, lastChat]);
  const chatNew = chatList.filter((m) => m.id > seenChat && m.from !== userId && !getMuted().has(m.from)); const chatUnread = chatOpen ? 0 : chatNew.length;
  const vs = useVoice(voice);
  const chatErr = error && ["bad_chat", "chat_restricted", "duplicate", "rate_limited"].includes(error) ? error : null;
  const { width, height } = useWindowDimensions(); const [hdrW, setHdrW] = useState(0);
  const lay = layoutOf(width, height), compact = lay.compact, tablet = lay.tablet;
  const wide = lay.wide; // yotiq planshet/kompyuter/yotiq telefon: chapda moliyaviy panel, markazda taxta; butun ekran bitta ko'rinishga sig'adi (sahifa aylanmaydi)
  const mine = me(room, userId), mineTurn = isMyTurn(room, userId), cardRaw = room.pendingCard;
  const mv = useMovement(room), settled = mv.settled; // fishka kataklar ustidan yurib bo'lguncha karta/qaror ko'rsatilmaydi
  const card = settled ? cardRaw : null;
  const state = room.state; const cur = currentId(room); const curP = state.players.find((p: any) => p.id === cur);
  const viewCircle: "small" | "big" | undefined = mine?.circle ?? curP?.circle; // taxta va sarlavha — ko'ruvchining O'Z aylanasi (kuzatuvchida — navbat egasiniki)
  const tri = wide && !compact && width >= 1366; // kompyuter (≥ 1366 px): uch ustun — chapda moliya va reaksiyalar, markazda taxta, o'ngda vaqt, voqealar va o'yinchilar
  const sideW = compact ? Math.max(280, Math.min(380, Math.round(width * 0.4))) : tri ? 340 : 380, rightW = 300, nCells = viewCircle === "big" ? 53 : viewCircle === "small" ? 48 : state.players.some((p: any) => p.circle === "small") ? 48 : 53;
  // Kompyuterda taxta kenglikka ham, balandlikka ham moslanadi: sarlavha, o'yinchilar qatori, izoh va pastki qator uchun joy qoldiriladi
  const pad = boardPad(wide), short = wide && !compact && height < 820, reserveH = compact ? HEADER_H + 2 * pad + 2 * space.md : tri ? HEADER_H + space.md + space.lg + WIDE_LEGEND_H + WIDE_NOTE_H + 3 * space.md + 2 * pad : HEADER_H + space.md + space.lg + WIDE_LANE_H + WIDE_LEGEND_H + WIDE_NOTE_H + (short ? WIDE_STRIP_SHORT_H : WIDE_STRIP_H) + 4 * space.md + 2 * pad;
  const { boardWidth, tight } = useMemo(() => { // faqat oyna/aylana o'zgarganda qayta hisoblanadi (har kadrda emas)
    if (compact) { // yotiq telefon: taxta balandlikka sig'adi (kataklar kichik — ikonka va rang qoladi)
      let w = Math.min(Math.max(width - sideW - 3 * space.lg - 2 * pad, 240), 940);
      while (w > 240 && boardGeometry(w, true, nCells, true, true).H > height - reserveH) w -= 10;
      return { boardWidth: w, tight: true };
    }
    let w = wide ? Math.min(Math.max(Math.min(width, tri ? 1920 : 1440) - sideW - 64 - 2 * pad, 560), tri ? 1120 : 940) : Math.min(width - 32 - 2 * pad, tablet ? 700 : 460), t = false;
    if (tablet) while (w > 440 && boardGeometry(w, false, nCells, false, false, true).H > height - TABLET_RESERVE) w -= 10; // tik planshet: taxta balandlikka ham sig'sin (sarlavha, statistika, o'yinchilar, tugma va menyu uchun joy qoladi)
    if (wide) {
      while (w > 560 && boardGeometry(w, true, nCells).H > height - reserveH) w -= 20;
      if (boardGeometry(w, true, nCells).H > height - reserveH) { t = true; while (w > 480 && boardGeometry(w, true, nCells, true).H > height - reserveH) w -= 20; }
    }
    return { boardWidth: w, tight: t };
  }, [wide, compact, tablet, tri, width, height, nCells, pad, reserveH, sideW]);
  const sheetOpen = !wide && !!card && mineTurn;
  const [sheetMin, setSheetMin] = useState(false); useEffect(() => { setSheetMin(false); }, [card?.id]); // telefonda qaror varag'ini yig'ib, blankni va maydonni ko'rish mumkin (qaror vaqti ketaveradi)
  const sheetShown = sheetOpen && !sheetMin;
  const miniBar = (inline: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${uz.deck.expand}. ${first(card?.text ?? "")}`} onPress={() => setSheetMin(false)} style={[s.miniBar, inline && s.miniInline]} testID="decision-mini">
      <View style={{ flex: 1 }} aria-hidden><Text style={s.miniK}>{uz.deck.pendingKicker}</Text><Text style={s.miniT} numberOfLines={1}>{first(card?.text ?? "")}</Text></View>
      <Text style={s.miniA} aria-hidden>{uz.deck.expand} ▲</Text>
    </Pressable>);
  const pr = myProposals(room, userId);
  const incoming = marketOffers(room, userId).length + pr.suyunchi.length + pr.loansToAccept.length + pr.loansToWitness.length + pr.partnerToAccept.length;
  const reqs = useRequests(room, userId); const reqModal = useRequestModal(reqs);
  const notices = (state.notices ?? []).filter((n: any) => (n.to === "all" || n.to === userId) && n.round >= state.round - 1).slice(-3);
  const log: string[] = state.log.slice(-40).reverse(); // yangisi tepada; LogLine ismlarni qalin qilib chiqaradi
  const bank = mine ? bankRoom(mine) : 0;
  const manualCalc = room.calc?.mode === "manual"; const due = manualCalc && !!room.calc!.due.includes(userId); // hisob yangilanmaguncha kubik tashlab bo'lmaydi
  const recapOpen = (state.recaps?.length ?? 0) > 0; // bankrot tahlili ochiq: o'yin to'xtagan
  const auctionOpen = !!state.auction; // garov auksioni ochiq: o'yin to'xtab turadi
  const canRoll = mineTurn && !cardRaw && settled && !state.winner && !due && !recapOpen && !auctionOpen;
  // Kubik oynasi: o'z navbatingizda «Kubikni tashlash» oynaning eng oldida (modal); «keyinroq» bosilsa shu tashlash imkoniyati uchun yopiladi, sahifadagi tugma qoladi
  const [rollModalOn, setRollModalOn] = useState(getRollModalPref); const [waitRoll, setWaitRoll] = useState(false); const [laterAt, setLaterAt] = useState<number | null>(null); const oppN = state.lastRoll?.n ?? 0;
  useEffect(() => { setWaitRoll(false); }, [oppN]);
  useEffect(() => { if (!waitRoll) return; const t = setTimeout(() => setWaitRoll(false), 4000); return () => clearTimeout(t); }, [waitRoll]);
  const [tourOpen, setTourOpenNow] = useState(isTourOpen); useEffect(() => subscribeTourOpen(setTourOpenNow), []);
  const promptOpen = rollModalOn && !tourOpen && (canRoll || waitRoll) && laterAt !== oppN && !state.winner; // yo'riqnoma ochiq bo'lsa kubik oynasi uning ustiga chiqmaydi
  const rollPrompt = promptOpen ? { circle: curP?.circle ?? "small", twoDice: curP?.twoDice, deadline: room.deadline, total: phaseSeconds(room), waiting: waitRoll,
    onRoll: () => { setWaitRoll(true); onAct({ type: "roll" }); }, onLater: () => setLaterAt(oppN), onDisable: () => { setRollModalPref(false); setRollModalOn(false); } } : null;
  // Pastki menyu belgilari (telefon): ko'rilgan narsalar bo'lim ochilganda yangilanadi
  const [seen, setSeen] = useState<Seen>(() => ({ logN: state.logN ?? 0, notices: (state.notices ?? []).map((n: any) => n.id) }));
  useEffect(() => {
    if (wide) return;
    if (tab === "players") setSeen((p) => (p.logN === (state.logN ?? 0) ? p : { ...p, logN: state.logN ?? 0 }));
    if (tab === "blank") setSeen((p) => { const ids = (state.notices ?? []).map((n: any) => n.id); return p.notices.length === ids.length ? p : { ...p, notices: ids }; });
  }, [wide, tab, state.logN, state.notices]);
  const badges = useMemo(() => tabBadges({ room, userId, myTurnAction: mineTurn && !state.winner && (canRoll || !!cardRaw || due), seen }), [room, userId, mineTurn, state.winner, canRoll, cardRaw, due, seen]);
  const navBadge = (k: "field" | "blank" | "players") => { const b = badges[k]; return b ? { count: b.count, tone: b.tone, temp: b.temp, label: badgeLabel(k, b) } : null; };
  const myDie = (state.lastRoll && state.lastRoll.playerId === userId ? state.lastRoll.die : null) as number | null;
  useEffect(() => { // kompyuterda probel — kubik tashlash (tugma/matn maydoni fokusda bo'lmasa)
    const doc = (globalThis as any).document; if (!doc?.addEventListener || !canRoll) return;
    const h = (e: any) => { const tag = (e.target?.tagName ?? "").toLowerCase(); const interactive = !!e.target?.closest?.('[role="button"],[role="link"],[role="radio"],[role="checkbox"],[role="dialog"],[contenteditable="true"]');
      if (e.code === "Space" && !interactive && !doc.querySelector('[role="dialog"]') && !["input", "textarea", "button", "select", "a"].includes(tag) && !e.repeat) { e.preventDefault(); onAct({ type: "roll" }); } };
    doc.addEventListener("keydown", h); return () => doc.removeEventListener("keydown", h);
  }, [canRoll, onAct]);
  const lastIn = chatNew[chatNew.length - 1];
  const chatNode = onChat ? (<>
    <View role="status" accessibilityLiveRegion="polite" style={s.srOnly}><Text>{lastIn && !chatOpen ? `${nameOf(room, lastIn.from)}: ${chatText(lastIn)}` : ""}</Text></View>
    {chatOpen && <LaterOverlay><ChatSheet room={room} userId={userId} chat={chatList} error={chatErr} onSend={onChat} voice={voice ? <VoicePanel engine={voice} room={room} userId={userId} /> : undefined} onClose={() => setChatOpen(false)} onReport={http ? async (m) => { try { await http.complain(m.from, room.code, `Chat: «${chatText(m)}»`); return true; } catch { return false; } } : undefined} /></LaterOverlay>}
  </>) : null;
  const lcMine = state.lastCard && (state.lastCard as any).playerId === userId ? room.lastCard?.text ?? null : null;
  const fx = useFx(mine, lcMine, settled);
  useGameSounds({ room, userId, settled, mineTurn, deadline: room.deadline });
  const mom = useMoments(room, userId, settled); const [momH, setMomH] = useState(0); // lahzalar: ovoz + animatsiya + tushuntirish (moments.ts)
  const snd = useSoundPrefs();
  const big = mine?.circle === "big"; const e = mine ? exitProgress(mine, state.mode) : null;
  const ledgerNow = room.calc?.ledger?.[userId] ?? (mine && e ? { cash: mine.cash, passive: e.passive, flow: e.cashflow } : { cash: 0, passive: 0, flow: 0 });
  const gate = due && mineTurn && !cardRaw && settled && !state.winner ? <LedgerPad testID="ledger-gate" title={uz.ledger.gateTitle} hint={uz.ledger.gateHint} current={ledgerNow} feedback={calcFb} submitLabel={uz.ledger.gateSubmit} onSubmit={(c) => onAct({ type: "confirm_calc", calc: c })} /> : null;
  const centre = <TurnPanel room={room} userId={userId} mineTurn={mineTurn} hasCard={!!cardRaw} moving={!settled || promptOpen} onRoll={() => onAct({ type: "roll" })} wide={wide} compact={compact} dense={wide && !compact && height < 820} gate={wide && gate ? <View style={{ backgroundColor: "#FFF6DD", borderRadius: 12, padding: 12 }}><Text style={{ color: "#6B4300", fontWeight: "800", fontSize: 15, textAlign: "center" }}>{uz.ledger.gateSide}</Text></View> : null} />;
  // Kompyuter (3 ustun): taxta ostidagi bo'sh joy — «Mening kartalarim» va dekani tanlash shu yerda (chap ustun qisiq va aylantirishni talab qilardi)
  const newLog = drawerOpen ? 0 : Math.max(0, (state.logN ?? 0) - seenLog); // yon oyna yopiq paytda yangi voqealar soni
  useEffect(() => { if (drawerOpen) setSeenLog(state.logN ?? 0); }, [drawerOpen, state.logN]);
  useEffect(() => { if (!drawerOpen) return; const d = (globalThis as any).document; if (!d?.addEventListener) return; const k = (e: any) => { if (e.key === "Escape") setDrawerOpen(false); }; d.addEventListener("keydown", k); return () => d.removeEventListener("keydown", k); }, [drawerOpen]);
  useEffect(() => { if (!tri && drawerOpen) setDrawerOpen(false); }, [tri, drawerOpen]);
  const deckPick = tri && !!card && mineTurn && !!mine && (card as any).effect?.kind === "deckChoice";
  const timeInSide = wide && !tri && (compact || boardWidth < 760); // taxta tor bo'lsa vaqt paneli chap ustun tepasida (yonida joy yetmaydi)
  const nextName = nameOf(room, state.players[(state.turn + 1) % state.players.length].id);
  const hintOf = (left: number) => mineTurn ? (untimed(room) ? uz.hud.mineHintFree : uz.hud.mineHint).replace("{s}", String(phaseSeconds(room))).replace("{name}", nextName) : left > 0 ? uz.hud.otherHint.replace("{name}", nameOf(room, cur!)).replace("{s}", String(left)) : uz.hud.otherNoTimer.replace("{name}", nameOf(room, cur!));

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
      {log.length === 0 ? <Text style={s.muted}>{uz.game.noEvents}</Text> : <ScrollView style={{ maxHeight: Math.max(150, nLines * 40) }} nestedScrollEnabled tabIndex={0} role="log" aria-label={uz.game.events} testID="events-scroll" contentContainerStyle={{ gap: 6 }}>{log.map((l, i) => <LogLine key={i} room={room} line={l} latest={i === 0} />)}</ScrollView>}
    </Card>);
  // Chap ustun: bildirishnoma, qaror, moliyaviy holat, moliya amallari
  const sideMain = (
    <View style={{ gap: space.md }}>
      {timeInSide && <TimePanel room={room} userId={userId} settled={settled} />}
      {notices.length > 0 && (<View style={{ gap: space.xs }} accessibilityLiveRegion="polite">{notices.map((n: any) => (
        <Banner key={n.id} kind="warn">{n.key === "loan_reminder" || n.key === "loan_declined" || n.key === "loan_expired" ? `${nameOf(room, n.from)} ${uz.notice[n.key as "loan_reminder" | "loan_declined" | "loan_expired"]}${n.amount ? `: ${money(n.amount)}` : ""}` : n.key === "partner_declined" ? `${nameOf(room, n.from)} ${uz.notice.partner_declined}` : uz.notice[n.key as "crisis_start" | "crisis_end"]}</Banner>))}</View>)}
      {mine && <View testID="finance"><FinanceCard mode={state.mode} p={mine} shown={fx.shown} profession={room.professions?.[mine.id]} dream={mine.dreamIdx !== null && mine.dreamIdx !== undefined ? room.dreams?.[mine.dreamIdx] : null} /></View>}
      <View testID="actions"><Collapsible title={uz.game.moneyActions} badge={incoming || undefined} defaultOpen={incoming > 0} group="side" id="acts"><Actions room={room} userId={userId} onAct={onAct} /></Collapsible></View>
      {mine && !tri && <PortfolioCard room={room} userId={userId} onOpen={() => setPortfolioOpen(true)} onAct={onAct} />}
      {short && !tri && eventsCard(3)}
      {compact && <PlayersLane room={room} userId={userId} />}
      {compact && eventsCard(3)}
    </View>
  );
  // Telefon: hammasi bitta ustunda
  const side = ( // telefonda voqealar va reaksiyalar «O'yinchilar» bo'limida (pastki menyudagi belgi shu yerdagi yangiliklarni ko'rsatadi)
    <View style={{ gap: space.md, flex: 1 }}>{sideMain}</View>
  );
  const rightCol = (
    <ScrollView tabIndex={0} role="region" aria-label={uz.hud.playersTitle} style={{ width: rightW, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[s.sideScroll, { gap: space.md }]}>
      <TimePanel room={room} userId={userId} settled={settled} />
      <PlayerList room={room} userId={userId} />
      {eventsCard(6)}
    </ScrollView>);
  const autoMe = !!room.members.find((m) => m.userId === userId)?.autopilot;
  const banners = (<>
    <QuizResult room={room} userId={userId} />
    {room.mode === "tutorial" && !state.winner && <TutorialCoach room={room} userId={userId} tab={tab} />}
    {autoMe && <View testID="autopilot-banner" role="alert"><Banner kind="warn"><Text style={{ fontWeight: "800", color: tone.warn }}>{uz.hud.autopilot.title}. </Text>{uz.hud.autopilot.text}</Banner>{onResume && <View style={{ marginTop: space.sm }}><Button label={uz.hud.autopilot.back} onPress={onResume} /></View>}</View>}
    {error && error !== "offline" && error !== "unauthorized" && <Banner kind="bad">{errText(error)}</Banner>}</>);
  const circleName = viewCircle === "big" ? uz.hud.bigCircle : uz.hud.smallCircle;
  const tiny = width < 360; // 320 px telefon: oltita tugma va sarlavha sig'sin
  const roomy = wide && !compact; // keng ekran: tugmalar guruhlarga yig'iladi; juda keng bo'lsa yozuvlar ham chiqadi, aks holda faqat belgi (sarlavha hech qachon qirqilmasin)
  const labels = roomy && hdrW >= 1180, ib = tiny ? 20 : 22, flat = !roomy;
  const ui: HUi = { flat, labels, ib, tiny };
  const reqLayers = (<>
    {reqModal.open && <RequestModal room={room} userId={userId} reqs={reqs} onAct={onAct} onClose={reqModal.hide} />}
    {!state.winner && <ProfileMenu fromBottom={!wide} open={menuOpen} onClose={() => setMenuOpen(false)} onLeave={onLeave} items={[
      { key: "rules", icon: "book", label: uz.rules.open, onPress: onRules, tid: "rules-open" },
      ...(http ? [{ key: "history", icon: "clock", label: uz.history.title, onPress: () => setHistoryOpen(true), tid: "history-open" }] : []),
      ...(reqs.length > 0 ? [{ key: "req", icon: "bell", label: uz.req.bellN.replace("{n}", String(reqs.length)), onPress: reqModal.show, tid: "requests-open", badge: reqs.length }] : []),
      ...(voice && vs && vs.status === "on" && vs.hasMic ? [{ key: "mic", icon: vs.muted ? "micOff" : "mic", label: vs.muted ? uz.voice.headerOff : uz.voice.headerOn, onPress: () => voice.setMuted(!vs.muted), tid: "voice-header-mic" }] : []),
      { key: "sound", icon: snd.muted ? "mute" : "volume", label: snd.muted ? uz.sound.on : uz.sound.off, onPress: snd.toggle, tid: "sound-toggle" },
      { key: "help", icon: "help", label: uz.onboarding.help, onPress: replayTour, tid: "tour-help" },
    ]} />}
  </>);
  const header = (
    <View style={[s.header, flat && { gap: 2, paddingHorizontal: space.md }]} onLayout={(e) => setHdrW(e.nativeEvent.layout.width)}>
      <View style={[s.dotC, { backgroundColor: viewCircle === "big" ? color.red : color.green }, !wide && { marginRight: 4 }]} aria-hidden />
      <View style={[wide ? { flexDirection: "row", alignItems: "center", gap: space.sm } : { flexShrink: 1 }, { flexShrink: 1, minWidth: 0 }]}>{/* telefonda sarlavha va tur ustma-ust: 6 ta tugma ekranga sig'sin */}
        <Text style={[s.hTitle, !wide && { fontSize: font.md }]} aria-level={1} accessibilityRole="header" numberOfLines={1}>{circleName}</Text>
        <Text style={s.hSub} numberOfLines={1} accessibilityLabel={uz.hud.turnHelp.replace("{n}", String(state.round))} {...({ title: uz.hud.turnHelp.replace("{n}", String(state.round)) } as any)}>{state.round}-{uz.hud.turnWord}</Text>
      </View>
      {roomy && <View style={s.codePill}><Text style={s.codeT} aria-label={`${uz.home.code} ${room.code.split("").join(" ")}`}>{room.code}</Text></View>}
      <View style={{ flex: 1, minWidth: 0 }} />
      {!wide && <View style={s.hIcons} role="toolbar" aria-label={uz.hud.group.docs}>
        <HBtn ui={ui} icon="cards" label={uz.portfolio.title} onPress={() => setPortfolioOpen(true)} tid="portfolio-open" />
        <HBtn ui={ui} icon="sheet" label={uz.sheet.title} onPress={() => setSheetView(true)} tid="sheet-open" />
        {http && <HBtn ui={ui} icon="analytics" label={uz.live.title} onPress={() => setLiveOpen(true)} tid="live-open" />}
        {onChat && <HBtn ui={ui} icon="chat" label={chatUnread ? `${uz.chat.open}. ${uz.chat.unread.replace("{n}", String(chatUnread))}` : uz.chat.open} onPress={() => setChatOpen(true)} tid="chat-open">{chatUnread > 0 && <View style={s.chatBadge} aria-hidden><Text style={s.chatBadgeT}>{chatUnread > 9 ? "9+" : chatUnread}</Text></View>}</HBtn>}
      </View>}
      {wide && <Seg ui={ui} label={uz.hud.group.docs}>
        <HBtn ui={ui} icon="file" label={uz.portfolio.title} text={uz.portfolio.title} onPress={() => setPortfolioOpen(true)} tid="portfolio-open" />
        <HBtn ui={ui} icon="chart" label={uz.sheet.title} text={uz.sheet.open} onPress={() => setSheetView(true)} tid="sheet-open" />
        {http && <HBtn ui={ui} icon="analytics" label={uz.live.title} text={uz.live.title} onPress={() => setLiveOpen(true)} tid="live-open" />}
        {onChat && <HBtn ui={ui} icon="chat" label={chatUnread ? `${uz.chat.open}. ${uz.chat.unread.replace("{n}", String(chatUnread))}` : uz.chat.open} text={uz.chat.open} onPress={() => setChatOpen(true)} tid="chat-open">{chatUnread > 0 && <View style={s.chatBadge} aria-hidden><Text style={s.chatBadgeT}>{chatUnread > 9 ? "9+" : chatUnread}</Text></View>}</HBtn>}
      </Seg>}
      {wide && !state.winner && <Pressable accessibilityRole="button" aria-haspopup="menu" aria-expanded={menuOpen} accessibilityLabel={chatUnread ? `${uz.profMenu.menu}. ${uz.chat.unread.replace("{n}", String(chatUnread))}` : uz.profMenu.menu} onPress={() => setMenuOpen((v) => !v)} testID="profile-menu-open" style={({ pressed }) => [s.avatarBtn, pressed && { opacity: 0.8 }]}>
        <Avatar name={nameOf(room, userId)} colorIdx={room.names?.[userId]?.color ?? 0} size={36} photo={room.names?.[userId]?.photo} gender={room.names?.[userId]?.gender} frame={room.names?.[userId]?.cos?.frame} bgColor={room.names?.[userId]?.cos?.avatar} />
        {chatUnread + reqs.length > 0 && <View style={s.chatBadge} aria-hidden><Text style={s.chatBadgeT}>{chatUnread + reqs.length > 9 ? "9+" : chatUnread + reqs.length}</Text></View>}
      </Pressable>}
    </View>
  );

  if (wide) return (
    <View style={{ height, overflow: "hidden" as any }}>
      <MarketOfferLayer room={room} userId={userId} onAct={onAct} /><MomentLayer moments={mom.shown} dismiss={mom.dismiss} onHeight={setMomH} offset={wide ? 0 : Math.min(fx.chips.length, 5) * 54} /><DiceModal room={room} userId={userId} prompt={rollPrompt} />{(state.recaps?.length ?? 0) > 0 && <LaterOverlay><RecapLayer room={room} userId={userId} onAck={(id) => onAct({ type: "ack_restart", id })} onBreak={() => onBreak?.()} onLeave={onLeave} /></LaterOverlay>}{auctionOpen && <LaterOverlay><AuctionLayer room={room} userId={userId} onAct={onAct as any} /></LaterOverlay>}{chatNode}<CardToast room={room} userId={userId} hold={!settled} offset={momH} /><GambleToast room={room} userId={userId} hold={!settled} offset={momH} />
      <FxLayer chips={fx.chips} reduced={fx.reduced} style={{ top: HEADER_H + 6, left: Math.max(0, (width - 1440) / 2) + space.lg, width: sideW - space.sm }} /><BirthLayer room={room} userId={userId} />
      {room.mode === "tutorial" && !state.winner && <OnboardingPlan />}{portfolioOpen && <PortfolioDetail room={room} userId={userId} onClose={() => setPortfolioOpen(false)} />}
      {sheetView && <LaterOverlay><SheetDetail room={room} userId={userId} onClose={() => setSheetView(false)} /></LaterOverlay>}
      {historyOpen && http && <LaterOverlay><HistoryDetail http={http} code={room.code} onClose={() => setHistoryOpen(false)} /></LaterOverlay>}{liveOpen && http && <LaterOverlay><LiveAnalytics http={http} code={room.code} tick={(state.logN ?? 0) + (state.round ?? 0)} onClose={() => setLiveOpen(false)} /></LaterOverlay>}
      {header}{reqLayers}
      <View style={[s.shell, tri && { maxWidth: 1920 }]}>
        {card && mineTurn && mine && !deckPick && !sheetMin ? (
          <View style={{ width: sideW, flexGrow: 0, flexShrink: 0, paddingBottom: space.lg, gap: space.sm }}>
            <Pressable accessibilityRole="button" accessibilityLabel={uz.deck.minimize} onPress={() => setSheetMin(true)} style={s.minBtn} testID="decision-minimize"><Text style={s.grabT}>{uz.deck.minimize} ▼</Text></Pressable>
            <CardEnter id={card.id} style={{ flex: 1, minHeight: 0 }}>
              <DecisionCard horizontal={compact} card={card} me={mine} bankRoom={bank} turnSeconds={phaseSeconds(room)} calcMode={manualCalc} calcFb={calcFb} onAct={onAct} deadline={room.deadline} die={myDie}
                layout={(body, actions) => (<View style={s.decide}><ScrollView tabIndex={0} role="region" aria-label={uz.deck.other} style={{ flex: 1 }} contentContainerStyle={{ gap: space.md }}>{body}{sideMain}</ScrollView>{actions ? <View style={s.decideActions}>{actions}</View> : null}</View>)} />
            </CardEnter>
          </View>
        ) : <ScrollView tabIndex={0} role="region" aria-label={uz.game.finance} style={{ width: sideW, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[s.sideScroll, { gap: space.md }]}>{card && mineTurn && mine && !deckPick && sheetMin ? miniBar(true) : null}{gate}{sideMain}</ScrollView>}
        <ScrollView tabIndex={0} role="region" aria-label={uz.hud.tabs.field} style={{ flex: 1, minWidth: 0 }} contentContainerStyle={s.mainScroll}>
          {banners}
          {!tri && !compact && <View style={{ width: boardWidth, flexDirection: "row", gap: space.md, alignItems: "center" }}><View style={{ flexShrink: 0 }}><PlayersLane room={room} userId={userId} wide /></View>{!timeInSide && <View style={{ flex: 1, minWidth: 0 }}><TimePanel room={room} userId={userId} settled={settled} /></View>}</View>}
          <Board room={room} userId={userId} width={boardWidth} wide tight={tight} compact={compact} viewCircle={viewCircle} movement={mv.shown} currentId={cur}>{centre}</Board>
          {!compact && state.players.some((q: any) => q.circle !== state.players[0].circle) && <Text style={s.caption}>{uz.hud.ownCircleNote}</Text>}
          {tri && mine && (
            <View style={{ width: boardWidth, gap: space.md }} testID="dock">
              {deckPick && card ? (
                <CardEnter id={card.id}>
                  <DecisionCard card={card} me={mine} bankRoom={bank} turnSeconds={phaseSeconds(room)} calcMode={manualCalc} calcFb={calcFb} onAct={onAct} deadline={room.deadline} die={myDie} layout={(body) => <Card accent="gold">{body}</Card>} />
                </CardEnter>) : null}
              <PortfolioCard room={room} userId={userId} onOpen={() => setPortfolioOpen(true)} onAct={onAct} cols={3} />
            </View>)}
          {!tri && !compact && <View style={{ width: boardWidth, flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            {!short && <View style={{ flex: 1 }}>{eventsCard(3)}</View>}
          </View>}
        </ScrollView>
      </View>
      {tri && !drawerOpen && <Pressable accessibilityRole="button" aria-haspopup="dialog" aria-expanded={false} accessibilityLabel={newLog > 0 ? `${uz.hud.drawer.open}. ${uz.hud.drawer.news.replace("{n}", String(newLog))}` : uz.hud.drawer.open} onPress={() => setDrawerOpen(true)} testID="players-drawer-open" style={s.edge}>
        <Text style={s.edgeT} aria-hidden>‹</Text>{newLog > 0 && <View style={[s.chatBadge, { top: 6, right: 4 }]} aria-hidden><Text style={s.chatBadgeT}>{newLog > 9 ? "9+" : newLog}</Text></View>}</Pressable>}
      {tri && drawerOpen && (<>
        <Pressable accessibilityRole="button" accessibilityLabel={uz.hud.drawer.close} onPress={() => setDrawerOpen(false)} testID="players-drawer-backdrop" style={{ position: "absolute", left: 0, right: 0, top: HEADER_H, bottom: 0, backgroundColor: "rgba(8,38,62,0.28)" }} />
        <SlideIn reduced={fx.reduced} style={s.drawer} testID="players-drawer" label={uz.hud.drawer.title}>
          <View style={s.drawerHead}><Text style={s.drawerT} aria-level={2} accessibilityRole="header">{uz.hud.drawer.title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={uz.hud.drawer.close} onPress={() => setDrawerOpen(false)} style={s.drawerX} testID="players-drawer-close"><Text style={s.drawerXT} aria-hidden>✕</Text></Pressable></View>
          <ScrollView tabIndex={0} role="region" aria-label={uz.hud.playersTitle} style={{ flex: 1 }} contentContainerStyle={[s.sideScroll, { gap: space.md, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.xl }]}>
            <TimePanel room={room} userId={userId} settled={settled} />
            <PlayerList room={room} userId={userId} accordion />
            {eventsCard(8)}
          </ScrollView>
        </SlideIn>
      </>)}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.white }}>
      <MarketOfferLayer room={room} userId={userId} onAct={onAct} /><MomentLayer moments={mom.shown} dismiss={mom.dismiss} onHeight={setMomH} offset={wide ? 0 : Math.min(fx.chips.length, 5) * 54} /><DiceModal room={room} userId={userId} prompt={rollPrompt} />{(state.recaps?.length ?? 0) > 0 && <LaterOverlay><RecapLayer room={room} userId={userId} onAck={(id) => onAct({ type: "ack_restart", id })} onBreak={() => onBreak?.()} onLeave={onLeave} /></LaterOverlay>}{auctionOpen && <LaterOverlay><AuctionLayer room={room} userId={userId} onAct={onAct as any} /></LaterOverlay>}{chatNode}<CardToast room={room} userId={userId} hold={!settled} offset={momH} /><GambleToast room={room} userId={userId} hold={!settled} offset={momH} />
      <FxLayer chips={fx.chips} reduced={fx.reduced} style={{ top: HEADER_H + 10, left: space.lg, right: space.lg }} /><BirthLayer room={room} userId={userId} />
      {room.mode === "tutorial" && !state.winner && <OnboardingPlan />}{portfolioOpen && <PortfolioDetail room={room} userId={userId} onClose={() => setPortfolioOpen(false)} />}
      {sheetView && <LaterOverlay><SheetDetail room={room} userId={userId} onClose={() => setSheetView(false)} /></LaterOverlay>}
      {historyOpen && http && <LaterOverlay><HistoryDetail http={http} code={room.code} onClose={() => setHistoryOpen(false)} /></LaterOverlay>}{liveOpen && http && <LaterOverlay><LiveAnalytics http={http} code={room.code} tick={(state.logN ?? 0) + (state.round ?? 0)} onClose={() => setLiveOpen(false)} /></LaterOverlay>}
      {header}{reqLayers}
      <ScrollView contentContainerStyle={[s.mwrap, tablet && s.mwrapT, sheetShown && { paddingBottom: Math.round(height * 0.62) }, sheetOpen && sheetMin && { paddingBottom: 96 }]}>
        {banners}
        {tab === "field" && (<>
          {stats}
          <View style={{ alignItems: "center" }}><Board room={room} userId={userId} width={boardWidth} wide={false} roomy={tablet} fillH={tablet ? undefined : height - PHONE_RESERVE - 2 * pad} viewCircle={viewCircle} movement={mv.shown} currentId={cur}>{centre}</Board></View>
          <PlayersLane room={room} userId={userId} />
          <View style={s.turnRow}>
            <DeadlineRing deadline={room.deadline} total={phaseSeconds(room)} size={52} />
            <Text style={s.turnHint} accessibilityLiveRegion="polite"><Text style={{ fontWeight: "800", color: mineTurn ? tone.good : color.navy }}>{mineTurn ? uz.hud.yourTurn : ""}</Text>{mineTurn ? " " : ""}<Countdown deadline={room.deadline}>{(left) => hintOf(left)}</Countdown></Text>
          </View>
        </>)}
        {tab === "blank" && (<View style={{ gap: space.md }}><TimePanel room={room} userId={userId} settled={settled} />{side}</View>)}
        {tab === "players" && (<View style={{ gap: space.md }}><PlayerList room={room} userId={userId} accordion />{eventsCard(6)}</View>)}
      </ScrollView>
      {tab === "field" && gate && <ScrollView style={s.gateSheet} contentContainerStyle={{ padding: space.md }}>{gate}</ScrollView>}
      {tab === "field" && canRoll && !promptOpen && (<View style={[s.cta, { position: "relative", zIndex: 95 }]} testID="roll-front"><Button label={curP?.circle === "big" ? uz.hud.rollBig : uz.hud.rollSmall} onPress={() => onAct({ type: "roll" })} /></View>)}
      {/* §9: telefonda qaror pastki varaqda (bottom sheet) */}
      {sheetOpen && mine && sheetMin && miniBar(false)}
      {sheetShown && mine && (
        <View style={[s.sheet, height < 520 && { maxHeight: "58%" as any }, tablet && { left: Math.max(0, (width - SHEET_T) / 2), right: Math.max(0, (width - SHEET_T) / 2), borderRadius: 24 }]} accessibilityViewIsModal>
          <Pressable accessibilityRole="button" accessibilityLabel={uz.deck.minimize} onPress={() => setSheetMin(true)} style={s.grabBtn} testID="decision-minimize"><View style={s.grab} aria-hidden /><Text style={s.grabT}>{uz.deck.minimize} ▼</Text></Pressable>
          <CardEnter id={card!.id} from={48} style={{ flexShrink: 1, minHeight: 0 }}><DecisionCard card={card} me={mine} bankRoom={bank} turnSeconds={phaseSeconds(room)} calcMode={manualCalc} calcFb={calcFb} onAct={onAct} sheet deadline={room.deadline} die={myDie}
            layout={(body, actions) => (<View style={{ flexShrink: 1, minHeight: 0 }}><ScrollView tabIndex={0} role="region" aria-label={uz.deck.other} style={{ flexShrink: 1 }}>{body}</ScrollView>{actions ? <View style={s.decideActions}>{actions}</View> : null}</View>)} /></CardEnter>
        </View>)}
      <BottomNav label={uz.hud.tabs.nav} active={tab} onChange={(k) => (k as string) === "profile" ? setMenuOpen((v) => !v) : setTab(k as "field" | "blank" | "players")}
        items={[{ key: "field", label: uz.hud.tabs.field, icon: "board", badge: navBadge("field") }, { key: "blank", label: uz.hud.tabs.blank, icon: "chart", badge: navBadge("blank") }, { key: "players", label: uz.hud.tabs.players, icon: "people", badge: navBadge("players") }, { key: "profile" as any, testID: "profile-menu-open", label: uz.hud.tabs.profile, icon: "person", badge: reqs.length > 0 ? { count: reqs.length, tone: "urgent", label: uz.req.bellN.replace("{n}", String(reqs.length)) } as any : null }]} />
    </View>
  );
}
const first = (t: string, n = 70) => { const x = (t.split(/(?<=[.!?])\s/)[0] ?? t).trim(); return x.length > n ? x.slice(0, n - 1) + "…" : x; };
/** Yon oyna: o'ng tomondan siljib chiqadi (harakatni kamaytirish yoqilgan bo'lsa — darrov). */
function SlideIn({ reduced, style, testID, label, children }: { reduced?: boolean; style: any; testID: string; label: string; children: React.ReactNode }) {
  const x = useRef(new Animated.Value(reduced ? 0 : 420)).current;
  useEffect(() => { if (reduced) return; Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== "web" }).start(); }, [reduced, x]);
  return <Animated.View role="dialog" aria-label={label} testID={testID} style={[style, { transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}
const SHEET_T = 640; // tik planshet: qaror varag'i butun kenglikka cho'zilmaydi, markazda o'qish uchun qulay kenglikda
const s = StyleSheet.create({
  avatarBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  edge: { position: "absolute", right: 0, top: "42%", width: 44, height: 96, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, backgroundColor: color.navy, alignItems: "center", justifyContent: "center", zIndex: 5, shadowColor: "#08263E", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: -2, height: 0 }, elevation: 6 }, edgeT: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 24 },
  drawer: { position: "absolute", right: 0, top: HEADER_H, bottom: 0, width: 400, maxWidth: "92%", backgroundColor: color.white, borderLeftWidth: 1, borderLeftColor: color.line, shadowColor: "#08263E", shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: -8, height: 0 }, elevation: 12 },
  drawerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: space.lg, borderBottomWidth: 1, borderBottomColor: color.line, minHeight: 52 }, drawerT: { color: color.navy, fontSize: font.lg, fontWeight: "800" }, drawerX: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, drawerXT: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  mwrap: { padding: space.lg, gap: space.md }, mwrapT: { width: "100%", maxWidth: 760, alignSelf: "center" }, // tik planshet: ustun markazda, o'qish uchun qulay kenglikda
  shell: { flex: 1, flexDirection: "row", gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.md, minHeight: 0, maxWidth: 1440, width: "100%", alignSelf: "center" },
  decide: { flex: 1, minHeight: 0, borderRadius: radius.lg, borderWidth: 2, borderColor: color.gold, backgroundColor: color.white, padding: space.md, gap: space.md },
  decideActions: { paddingTop: space.sm, borderTopWidth: 1, borderTopColor: "#E6ECEF" },
  sideScroll: { paddingBottom: space.lg }, mainScroll: { alignItems: "center", gap: space.md, paddingBottom: space.lg },
  hIcons: { flexDirection: "row", alignItems: "center", gap: 2 },
  srOnly: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
  chatBadge: { position: "absolute", top: 2, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }, chatBadgeT: { color: color.white, fontSize: 10, fontWeight: "800" },
  header: { minHeight: HEADER_H, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: "#E6ECEF", backgroundColor: color.white },
  dotC: { width: 10, height: 10, borderRadius: 5 }, hTitle: { fontSize: font.lg, fontWeight: "800", color: color.navy }, hSub: { fontSize: font.sm, color: tone.muted },
  hBtnP: { minWidth: 36, paddingHorizontal: 1 }, hBtnSeg: { minHeight: 40, borderRadius: 10, paddingHorizontal: 10 }, seg: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#F1F5F7", borderRadius: 12, padding: 2, flexShrink: 0 }, hBtn: { minHeight: 44, minWidth: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6 }, hBtnT: { color: color.navy, fontWeight: "700", fontSize: font.md },
  codePill: { backgroundColor: "#F4F7F8", borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 }, codeT: { fontWeight: "800", letterSpacing: 2, color: color.navy },
  stats: { flexDirection: "row", gap: space.md, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, stat: { flex: 1, gap: 2 },
  statL: { color: tone.muted, fontSize: 12, fontWeight: "700" }, statV: { color: color.navy, fontSize: font.xl, fontWeight: "800", fontVariant: ["tabular-nums"] }, statS: { color: tone.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
  bar: { height: 6, borderRadius: 3, backgroundColor: "#E6ECEF", overflow: "hidden", marginTop: 6 }, fill: { height: 6, backgroundColor: color.green },
  turnRow: { flexDirection: "row", alignItems: "center", gap: space.md }, turnHint: { flex: 1, color: tone.muted, fontSize: font.md, lineHeight: 21 },
  gateSheet: { maxHeight: "62%" as any, backgroundColor: color.white, borderTopWidth: 1, borderTopColor: "#E6ECEF" },
  cta: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, backgroundColor: color.white },
  caption: { color: tone.muted, fontSize: font.sm, textAlign: "center", maxWidth: 640 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 62, maxHeight: "80%" as any, backgroundColor: color.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.lg, paddingTop: space.sm, shadowColor: "#08263E", shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  grab: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#D5DEE4" },
  minBtn: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: color.line, backgroundColor: color.white },
  miniInline: { position: "relative", left: 0, right: 0, bottom: 0 },
  grabBtn: { minHeight: 44, alignItems: "center", justifyContent: "center", gap: 4, marginBottom: space.xs }, grabT: { color: tone.muted, fontSize: font.sm, fontWeight: "700" },
  miniBar: { position: "absolute", left: space.md, right: space.md, bottom: 70, minHeight: 56, flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: color.white, borderWidth: 2, borderColor: color.gold, shadowColor: "#08263E", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 10 }, miniK: { color: tone.warn, fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }, miniT: { color: color.navy, fontWeight: "800", fontSize: font.md }, miniA: { color: GREEN_TEXT, fontWeight: "800", fontSize: font.sm },
  collHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }, collTitle: { color: color.navy, fontWeight: "800", fontSize: font.lg },
  muted: { color: tone.muted }, log: { color: tone.muted, fontSize: font.sm, lineHeight: 19 }, cardText: { color: color.navy, fontSize: font.md, lineHeight: 22 },
});
