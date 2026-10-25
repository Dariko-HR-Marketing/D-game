import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { Button } from "./Button";
import { Banner, Pill } from "./kit";
import { Logo } from "./Logo";
import { Icon, type IconName } from "./Icon";
import { Avatar } from "./Avatar";
import { replayTour } from "./tourStore";
import { turnLabel, getTurnPref, setTurnPref, getCalcPref, setCalcPref, calcUiEnabled, getSeatsPref, setSeatsPref, seatsFor, clampSeats, getModePref, setModePref, GAME_MODES_UI, type GameMode, type TurnSeconds, type CalcMode, type Seats } from "../turnPref";
import { BottomNav } from "./BottomNav";
import { uz, errText } from "../i18n/uz";
import { color, font, radius, space, tone, MIN_TAP } from "../theme";
import type { Http } from "../net/http";

type Tab = "home" | "board" | "rules" | "profile";
function Row({ icon, title, sub, onPress, disabled, primary, testID, compact }: { icon: IconName; title: string; sub: string; onPress: () => void; disabled?: boolean; primary?: boolean; testID?: string; compact?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.row, compact && { minHeight: 52, paddingVertical: 4 }, pressed && { backgroundColor: "#F4F7F8" }, disabled && { opacity: 0.5 }]}>
      <View style={[s.rowIcon, primary && { backgroundColor: color.green }]} aria-hidden><Icon name={icon} size={20} color={primary ? color.white : color.navy} /></View>
      <View style={{ flex: 1, gap: 2 }} aria-hidden><Text style={s.rowT}>{title}</Text><Text style={s.rowS} numberOfLines={compact ? 1 : 2}>{sub}</Text></View>
      <Icon name="chevron" size={18} color="#6B7C8C" />
    </Pressable>);
}

/** Bosh sahifa (maket N05): salom, ro'yxat qatorlari (yangi o'yin, kod bilan qo'shilish, qoidalar), pastki navigatsiya. */
export function Home({ status, error, http, onCreate, onJoin, onProfile, onLeaderboard, onRules, onShop, onClass, onTournaments }: { status: string; error: string | null; http?: Http; onCreate: (turnSeconds: TurnSeconds, calc: CalcMode, seats: Seats, mode: GameMode) => void; onJoin: (c: string) => void; onProfile: () => void; onLeaderboard: () => void; onRules: () => void; onShop?: () => void; onClass?: () => void; onTournaments?: () => void }) {
  const [code, setCode] = useState(""); const [joinOpen, setJoinOpen] = useState(false); const [turn, setTurn] = useState<TurnSeconds>(getTurnPref); const [calc, setCalc] = useState<CalcMode>(getCalcPref); const [mode, setMode] = useState<GameMode>(getModePref); const [seats, setSeats] = useState<Seats>(() => clampSeats(getModePref(), getSeatsPref())); const [optsOpen, setOptsOpen] = useState(false);
  const pickTurn = (v: TurnSeconds) => { setTurn(v); setTurnPref(v); };
  const pickMode = (m: GameMode) => { setMode(m); setModePref(m); setSeats((n) => clampSeats(m, n)); };
  const [me, setMe] = useState<{ name: string; color: number; level: number; games: number; gender?: "m" | "f" } | null>(null);
  useEffect(() => { let off = false; http?.profile().then((r: any) => { if (!off && r?.profile) setMe({ name: r.profile.name, color: r.profile.color, level: r.stats?.level ?? 0, games: r.stats?.games ?? 1, gender: r.profile.gender }); }).catch(() => {}); return () => { off = true; }; }, [http]);
  const [active, setActive] = useState<{ code: string; started: boolean; round: number; players: number } | null>(null);
  useEffect(() => { let off = false; http?.active().then((r) => { if (!off) setActive(r.active); }).catch(() => {}); return () => { off = true; }; }, [http]); // yangi sahifa ochilganda faol o'yinga qaytish yo'li
  const [notes, setNotes] = useState<{ id: string; text: string; kind: "info" | "warn" }[]>([]);
  useEffect(() => { let off = false; Promise.all([http?.announcements().catch(() => ({ announcements: [] })), http?.status().catch(() => null)]).then(([a, st]: any) => { if (off) return; const list = [...(st?.maintenance ? [{ id: "maint", kind: "warn" as const, text: `Texnik ishlar olib borilmoqda${st.text ? `: ${st.text}` : "."}` }] : []), ...(a?.announcements ?? [])]; setNotes(list); }); return () => { off = true; }; }, [http]);
  const online = status === "online", ready = code.length === 6; const { width: winW, height } = useWindowDimensions(); const compact = height < 700; const tiny = winW < 340; // katlanuvchi telefon: sarlavha sig'sin // bitta sahifaga sig'sin: past ekranda qatorlar zichroq
  return (
    <View style={{ flex: 1, backgroundColor: color.white }}>
      <View style={s.header}>
        <View style={[s.brand, { flexShrink: 1, minWidth: 0 }]}><Logo size={30} /><Text style={s.logoT} numberOfLines={1}>{uz.app.name}</Text></View>
        <View style={{ flex: 1 }} />
        {(!tiny || !online) && <View style={{ alignSelf: "center" }}><Pill label={online ? uz.home.online : status === "offline" ? uz.home.offline : uz.home.connecting} kind={online ? "good" : status === "offline" ? "bad" : "warn"} /></View>}
        <Pressable accessibilityRole="button" accessibilityLabel={uz.onboarding.help} onPress={replayTour} style={s.avatarBtn} testID="tour-help"><Icon name="help" size={22} color={color.navy} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={uz.profile.title} onPress={onProfile} style={s.avatarBtn}><Avatar name={me?.name ?? "?"} colorIdx={me?.color ?? 0} level={me?.level} gender={me?.gender} size={34} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={[s.wrap, compact && { gap: space.md, padding: space.md }]}>
          {notes.map((n) => <Banner key={n.id} kind={n.kind === "warn" ? "warn" : "info"}>{n.text}</Banner>)}
          {height >= 600 ? <Text style={s.h1} aria-level={1} accessibilityRole="header">{me ? `${uz.home.hello}, ${me.name}` : uz.home.hello}</Text> : <Text style={s.sr} aria-level={1} accessibilityRole="header">{uz.home.hello}</Text>}
          <View>
            {active && <Row compact={compact} testID="home-resume" icon="clock" primary title={uz.home.resume} sub={`${active.started ? `${active.round}-${uz.hud.turnWord}` : uz.home.resumeLobby} · ${active.code}`} onPress={() => onJoin(active.code)} disabled={!online} />}
            {me && me.games === 0 && <Row compact={compact} testID="home-tutorial" icon="book" primary title={uz.home.tutorialOffer} sub={uz.home.tutorialSub} onPress={() => onCreate(turn, calc, 3, "tutorial")} disabled={!online} />}
            <Row compact={compact} testID="home-new" icon="dice" primary title={uz.home.newGame} sub={uz.home.newGameSub} onPress={() => onCreate(turn, calc, seats, mode)} disabled={!online} />
            {compact && (
              <Pressable accessibilityRole="button" aria-expanded={optsOpen} accessibilityLabel={`${uz.home.roomSettings}: ${uz.home.modes[mode]}, ${mode === "tutorial" ? "" : uz.home.seatsOpt.replace("{n}", String(seats)) + ","} ${turnLabel(turn)}, ${calc === "manual" ? uz.ledger.manual : uz.ledger.auto}`} onPress={() => setOptsOpen((v) => !v)} style={[s.turnRow, { minHeight: 48 }]} testID="home-opts">
                <Text style={s.turnL} numberOfLines={1}>{uz.home.roomSettings}: <Text style={{ color: color.navy, fontWeight: "800" }}>{uz.home.modes[mode]} · {mode === "tutorial" ? "" : `${uz.home.seatsOpt.replace("{n}", String(seats))} · `}{turnLabel(turn)} · {calc === "manual" ? uz.ledger.manual : uz.ledger.auto}</Text></Text><Icon name="chevron" size={16} color="#6B7C8C" />
              </Pressable>)}
            {(!compact || optsOpen) && (<>
            <View style={[s.turnRow, { flexWrap: "wrap", rowGap: space.xs }]} role="radiogroup" aria-label={uz.home.modeLabel} testID="home-mode">
              <Text style={[s.turnL, { flexBasis: "100%" }]} aria-hidden>{uz.home.modeLabel}</Text>
              {GAME_MODES_UI.map((m) => (
                <Pressable key={m} role="radio" aria-checked={mode === m} testID={`mode-${m}`} accessibilityLabel={`${uz.home.modes[m]}. ${uz.home.modeHints[m]}`} onPress={() => pickMode(m)} style={[s.seg, mode === m && s.segOn]}>
                  <Text style={[s.segT, mode === m && { color: color.white }]} aria-hidden>{uz.home.modes[m]}</Text>
                </Pressable>))}
              <Text style={[s.turnL, { flexBasis: "100%", fontWeight: "600" }]}>{uz.home.modeHints[mode]}</Text>
            </View>
            {mode !== "tutorial" && <View style={[s.turnRow, { flexWrap: "wrap", rowGap: space.xs }]} role="radiogroup" aria-label={uz.home.seatsLabel} testID="home-seats">
              <Text style={[s.turnL, { flexBasis: "100%" }]} aria-hidden>{uz.home.seatsLabel}</Text>
              {seatsFor(mode).map((v) => (
                <Pressable key={v} role="radio" aria-checked={seats === v} accessibilityLabel={`${uz.home.seatsOpt.replace("{n}", String(v))}. ${uz.home.seatsHint}`} onPress={() => { setSeats(v); setSeatsPref(v); }} style={[s.seg, seats === v && s.segOn, { paddingHorizontal: space.sm, minWidth: MIN_TAP }]} testID={`seats-${v}`}>
                  <Text style={[s.segT, seats === v && { color: color.white }]} aria-hidden>{v}</Text>
                </Pressable>))}
            </View>}
            <View style={s.turnRow} role="radiogroup" aria-label={uz.home.turnLabel} testID="home-turn">
              <Text style={s.turnL} aria-hidden>{uz.home.turnLabel}</Text>
              {([30, 60] as const).map((v) => (
                <Pressable key={v} role="radio" aria-checked={turn === v} accessibilityLabel={v === 60 ? uz.home.turn60 : uz.home.turn30} onPress={() => pickTurn(v)} style={[s.seg, turn === v && s.segOn]}>
                  <Text style={[s.segT, turn === v && { color: color.white }]} aria-hidden>{v === 60 ? uz.home.turn60 : uz.home.turn30}</Text>
                </Pressable>))}
            </View>
            {calcUiEnabled() && <View style={s.turnRow} role="radiogroup" aria-label={uz.ledger.modeLabel} testID="home-calc">
              <Text style={s.turnL} aria-hidden>{uz.ledger.modeLabel}</Text>
              {(["manual", "auto"] as const).map((v) => (
                <Pressable key={v} role="radio" aria-checked={calc === v} accessibilityLabel={`${v === "manual" ? uz.ledger.manual : uz.ledger.auto}. ${v === "manual" ? uz.ledger.manualHint : uz.ledger.autoHint}`} onPress={() => { setCalc(v); setCalcPref(v); }} style={[s.seg, calc === v && s.segOn]}>
                  <Text style={[s.segT, calc === v && { color: color.white }]} aria-hidden>{v === "manual" ? uz.ledger.manual : uz.ledger.auto}</Text>
                </Pressable>))}
            </View>}
            </>)}
            <Row compact={compact} icon="people" title={uz.home.joinByCode} sub={uz.home.joinSub} onPress={() => setJoinOpen((v) => !v)} />
            {joinOpen && (
              <View style={s.join}>
                <Text style={s.label} nativeID="codeLabel">{uz.home.codeLabel}</Text>
                <View style={s.joinRow}>
                  <TextInput accessibilityLabelledBy="codeLabel" aria-label={uz.home.code} placeholder="ABC123" placeholderTextColor="#6B7C8C" value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    autoCapitalize="characters" autoCorrect={false} maxLength={6} onSubmitEditing={() => ready && online && onJoin(code)} returnKeyType="go" style={s.input} autoFocus />
                  <View style={{ flexShrink: 0 }}><Button label={uz.home.joinShort} onPress={() => onJoin(code)} disabled={!online || !ready} /></View>
                </View>
              </View>)}
            <Row compact={compact} icon="book" title={uz.home.rulesRow} sub={uz.home.rulesSub} onPress={onRules} />
            <Row compact={compact} icon="trophy" title={uz.profile.leaderboard} sub={uz.home.boardSub} onPress={onLeaderboard} />
            {onTournaments && <Row compact={compact} icon="flag" title="Turnirlar" sub="Homiylar bilan musobaqalar" onPress={onTournaments} />}
            {onClass && <Row compact={compact} icon="house" title="Sinf" sub="Maktab: sinfga qo'shilish yoki o'qituvchi paneli" onPress={onClass} />}
            {onShop && <Row compact={compact} icon="star" title="Do'kon va Plus" sub="Ko'rinish uchun narsalar, cheklovsiz xonalar" onPress={onShop} />}
          </View>
          {error && <Text style={s.err} accessibilityRole="alert">{errText(error)}</Text>}
        </View>
      </ScrollView>
      <BottomNav<Tab> testID="home-nav" label={uz.home.nav} active="home" onChange={(k) => (k === "board" ? onLeaderboard() : k === "rules" ? onRules() : k === "profile" ? onProfile() : undefined)}
        items={[{ key: "home", label: uz.home.tabHome, icon: "home" }, { key: "board", label: uz.profile.leaderboard, icon: "trophy" }, { key: "rules", label: uz.hud.tabs.rules, icon: "book" }, { key: "profile", label: uz.profile.title, icon: "person" }]} />
    </View>
  );
}
const s = StyleSheet.create({
  header: { height: 56, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm }, logoT: { fontSize: font.lg, fontWeight: "800", color: color.navy, letterSpacing: 2 }, avatarBtn: { minWidth: MIN_TAP, minHeight: MIN_TAP, alignItems: "center", justifyContent: "center" },
  scroll: { flexGrow: 1 }, wrap: { gap: space.lg, padding: space.lg, maxWidth: 560, width: "100%", alignSelf: "center" },
  turnRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, turnL: { flex: 1, color: tone.muted, fontSize: font.sm, fontWeight: "700" },
  seg: { minHeight: MIN_TAP, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, segOn: { backgroundColor: color.green, borderColor: color.green }, segT: { color: color.navy, fontWeight: "800", fontSize: font.sm },
  sr: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
  h1: { fontSize: 26, fontWeight: "800", color: color.navy, letterSpacing: -0.2 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F4F7F8", alignItems: "center", justifyContent: "center" }, rowT: { fontSize: 15, fontWeight: "800", color: color.navy }, rowS: { fontSize: 13, color: tone.muted },
  join: { gap: space.sm, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, label: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  joinRow: { flexDirection: "row", gap: space.sm, alignItems: "stretch" },
  input: { flex: 1, minWidth: 0, width: 0, minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: font.xl, letterSpacing: 4, fontWeight: "700", backgroundColor: color.white, color: color.navy },
  how: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: "#F4F7F8" }, howT: { fontWeight: "800", color: color.navy, fontSize: font.md },
  step: { flexDirection: "row", gap: space.md, alignItems: "flex-start" }, num: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" },
  numText: { color: color.white, fontWeight: "800", fontSize: font.sm }, stepText: { flex: 1, color: tone.muted, fontSize: font.md, lineHeight: 21 },
  err: { color: color.red, textAlign: "center" },
});
