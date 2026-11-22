import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { Button } from "./Button";
import { Banner, Pill } from "./kit";
import { Logo } from "./Logo";
import { Icon, type IconName } from "./Icon";
import { replayTour } from "./tourStore";
import { needsTutorial, markTutorialDone } from "../onboarding";
import { OnboardingFlow } from "./OnboardingFlow";
import { RoomsList } from "./RoomsList";
import { Acc } from "./Accordion";
import { PrivateToggle } from "./PrivateToggle";
import { SpeedPicker } from "./SpeedPicker";
import type { Lobbies } from "../net/connection";
import { defaultOpts, type RoomOpts } from "./RoomOptions";
import { featureOn } from "../features";
import { turnLabel, getTurnPref, setTurnPref, getCalcPref, setCalcPref, calcUiEnabled, getSeatsPref, setSeatsPref, seatsFor, clampSeats, getModePref, setModePref, GAME_MODES_UI, serverMode, type UiMode, type TurnSeconds, type CalcMode, type Seats } from "../turnPref";
import { BottomNav } from "./BottomNav";
import { HomeDesktop } from "./HomeDesktop";
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

function Tile({ icon, title, onPress, testID }: { icon: IconName; title: string; onPress: () => void; testID?: string }) {
  return (<Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [s.tile, pressed && { backgroundColor: "#F4F7F8" }]}>
    <View style={s.tileIco} aria-hidden><Icon name={icon} size={20} color={color.navy} /></View><Text style={s.tileT} numberOfLines={2}>{title}</Text></Pressable>);
}

/** Bosh sahifa (maket N05): salom, ro'yxat qatorlari (yangi o'yin, kod bilan qo'shilish, qoidalar), pastki navigatsiya. */
export function Home({ status, error, http, onCreate, onJoin, onProfile, onLeaderboard, onRules, onShop, onClass, onTournaments, onPacks, lobbies, onWatchLobbies }: { status: string; error: string | null; http?: Http; onCreate: (turnSeconds: TurnSeconds, calc: CalcMode, seats: Seats, mode: "standard" | "quick" | "rated" | "tutorial", opts?: RoomOpts) => void; onJoin: (c: string) => void; onProfile: () => void; onLeaderboard: () => void; onRules: () => void; onShop?: () => void; onClass?: () => void; onTournaments?: () => void; onPacks?: () => void; lobbies?: Lobbies | null; onWatchLobbies?: (on: boolean) => void }) {
  const [flow, setFlow] = useState(false); const roomsOn = featureOn("rooms"), billingOn = featureOn("billing"); const [ropts, setRopts] = useState<RoomOpts>(() => defaultOpts(getModePref())); const [turn, setTurn] = useState<TurnSeconds>(getTurnPref); const [calc, setCalc] = useState<CalcMode>(getCalcPref); const [mode, setMode] = useState<UiMode>(getModePref); const [seats, setSeats] = useState<Seats>(() => clampSeats(getModePref(), getSeatsPref())); const [acc, setAcc] = useState<"opts" | "rooms" | null>(null); const optsOpen = acc === "opts"; // akkordionlar: bittasi ochilsa ikkinchisi yopiladi
  const [corp, setCorp] = useState(false); const [orgCode, setOrgCode] = useState(""); const [orgErr, setOrgErr] = useState<string | null>(null); const [orgBusy, setOrgBusy] = useState(false);
  const pickTurn = (v: TurnSeconds) => { setTurn(v); setTurnPref(v); };
  const effTurn: TurnSeconds = turn; // Standart va Student: barcha tezlik, jumladan vaqtsiz
  const priv = ropts.visibility === "locked"; const pickPriv = (v: boolean) => setRopts((o) => ({ ...o, visibility: v ? "locked" : "open" }));
  const pickMode = (m: UiMode) => { setCorp(false); setMode(m); setRopts(defaultOpts(m)); setModePref(m); setSeats((n) => clampSeats(m, n)); };
  const orgReady = orgCode.length === 8;
  const orgJoin = async () => { if (!http || !orgReady || orgBusy) return; setOrgBusy(true); setOrgErr(null); try { await http.tJoin(orgCode); onTournaments?.(); } catch (e: any) { setOrgErr(String(e?.message ?? e)); } finally { setOrgBusy(false); } };
  const [me, setMe] = useState<{ name: string; color: number; level: number; games: number; gender?: "m" | "f" } | null>(null);
  useEffect(() => { let off = false; http?.profile().then((r: any) => { if (!off && r?.profile) setMe({ name: r.profile.name, color: r.profile.color, level: r.stats?.level ?? 0, games: r.stats?.games ?? 1, gender: r.profile.gender }); }).catch(() => {}); return () => { off = true; }; }, [http]);
  const [active, setActive] = useState<{ code: string; started: boolean; round: number; players: number } | null>(null);
  useEffect(() => { let off = false; http?.active().then((r) => { if (!off) setActive(r.active); }).catch(() => {}); return () => { off = true; }; }, [http]); // yangi sahifa ochilganda faol o'yinga qaytish yo'li
  const [notes, setNotes] = useState<{ id: string; text: string; kind: "info" | "warn" }[]>([]);
  useEffect(() => { let off = false; Promise.all([http?.announcements().catch(() => ({ announcements: [] })), http?.status().catch(() => null)]).then(([a, st]: any) => { if (off) return; const list = [...(st?.maintenance ? [{ id: "maint", kind: "warn" as const, text: `Texnik ishlar olib borilmoqda${st.text ? `: ${st.text}` : "."}` }] : []), ...(a?.announcements ?? [])]; setNotes(list); }); return () => { off = true; }; }, [http]);
  const gated = needsTutorial(me); const online = status === "online"; const { width: winW, height } = useWindowDimensions(); const compact = height < 700; const wide = winW >= 900; const tiny = winW < 340; // katlanuvchi telefon: sarlavha sig'sin // bitta sahifaga sig'sin: past ekranda qatorlar zichroq
  const SUM = `${uz.home.modes[mode]} · ${uz.home.seatsOpt.replace("{n}", String(seats))} · ${turnLabel(effTurn)}${calcUiEnabled() ? ` · ${calc === "manual" ? uz.ledger.manual : uz.ledger.auto}` : ""}`;
  if (flow) return <OnboardingFlow onDone={() => { markTutorialDone(); setFlow(false); }} />; // majburiy tanishuv: server xonasisiz, tugagach oddiy o'yin ochiladi
  const roomsNode = roomsOn && http && !gated && !corp ? <RoomsList http={http} online={online} onJoin={onJoin} live={lobbies} watch={onWatchLobbies} collapsible={winW < 1100} open={acc === "rooms"} onToggleOpen={() => setAcc((a) => (a === "rooms" ? null : "rooms"))} /> : null;
  if (winW >= 1100) return <HomeDesktop roomsNode={roomsNode} onPacks={billingOn ? onPacks : undefined} gated={gated} me={me} online={online} status={status} error={error} notes={notes} active={active} mode={mode} calc={calc} pickCalc={(v) => { setCalc(v); setCalcPref(v); }} corp={corp} seats={seats} turn={turn} effTurn={effTurn} orgCode={orgCode} orgErr={orgErr} orgBusy={orgBusy}
    priv={roomsOn && priv} showPriv={roomsOn} pickPriv={pickPriv} pickMode={pickMode} pickCorp={() => setCorp(true)} pickSeats={(n) => { setSeats(n as Seats); setSeatsPref(n as Seats); }} pickTurn={pickTurn} setOrgCode={(c) => { setOrgCode(c); setOrgErr(null); }}
    create={() => onCreate(effTurn, calc, seats, serverMode(mode), roomsOn ? ropts : undefined)} startTutorial={() => setFlow(true)} join={onJoin} orgJoin={orgJoin} onProfile={onProfile} onLeaderboard={onLeaderboard} onRules={onRules} onTournaments={onTournaments} onShop={onShop} onClass={onClass} resume={onJoin} />;
  return (
    <View style={{ flex: 1, backgroundColor: color.white }}>
      <View style={s.header}>
        <View style={[s.brand, { flexShrink: 1, minWidth: 0 }]}><Logo height={tiny ? 42 : 46} /></View>
        <View style={{ flex: 1 }} />
        {(!tiny || !online) && <View style={{ alignSelf: "center" }}><Pill label={online ? uz.home.online : status === "offline" ? uz.home.offline : uz.home.connecting} kind={online ? "good" : status === "offline" ? "bad" : "warn"} /></View>}
        <Pressable accessibilityRole="button" accessibilityLabel={uz.onboarding.help} onPress={replayTour} style={s.avatarBtn} testID="tour-help"><Icon name="help" size={22} color={color.navy} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={[s.wrap, compact && { gap: space.md, padding: space.md }, wide && { maxWidth: 1040 }]}>
          {notes.map((n) => <Banner key={n.id} kind={n.kind === "warn" ? "warn" : "info"}>{n.text}</Banner>)}
          {height >= 600 ? <Text style={s.h1} aria-level={1} accessibilityRole="header">{me ? `${uz.home.hello}, ${me.name}` : uz.home.hello}</Text> : <Text style={s.sr} aria-level={1} accessibilityRole="header">{uz.home.hello}</Text>}
          <View>
            {active && <Row compact={compact} testID="home-resume" icon="clock" primary title={uz.home.resume} sub={`${active.started ? `${active.round}-${uz.hud.turnWord}` : uz.home.resumeLobby} · ${active.code}`} onPress={() => onJoin(active.code)} disabled={!online} />}
            {gated && <Banner kind="info"><Text style={{ fontWeight: "800" }}>{uz.home.gateTitle}. </Text>{uz.home.gateText}</Banner>}
            {gated && !compact && (<View style={s.learn} role="list" aria-label={uz.home.desk.learnTitle} testID="home-learn">
              <Text style={s.learnH}>{uz.home.desk.learnTitle}</Text>
              {uz.home.desk.learn.map((t: string, i: number) => <View key={t} style={s.learnRow} role="listitem"><View style={s.learnNum} aria-hidden><Text style={s.learnNumT}>{i + 1}</Text></View><Text style={s.learnT}>{t}</Text></View>)}
            </View>)}
            {gated && <Row compact={compact} testID="home-tutorial" icon="book" primary title={uz.home.tutorialOffer} sub={uz.home.tutorialSub} onPress={() => setFlow(true)} />}
            {!gated && <Row compact={compact} testID="home-new" icon="dice" primary title={uz.home.newGame} sub={uz.home.newGameSub} onPress={() => onCreate(effTurn, calc, seats, serverMode(mode), roomsOn ? ropts : undefined)} disabled={!online || corp} />}
            {!gated && roomsOn && !corp && <View style={s.accWrap}><PrivateToggle value={priv} onChange={pickPriv} /></View>}
            {!gated && (
              <View style={s.accWrap}>
                <Acc icon="sliders" title={uz.openRooms.accSettings} summary={corp ? uz.home.corporate : SUM} open={optsOpen} onToggle={() => setAcc((a) => (a === "opts" ? null : "opts"))} testID="home-opts" label={`${uz.home.roomSettings}: ${corp ? uz.home.corporate : SUM}`}>
                  <View style={{ gap: space.md }}>
                    <View style={s.sec} role="radiogroup" aria-label={uz.home.modeLabel} testID="home-mode">
                      <Text style={s.secL} aria-hidden>{uz.home.modeLabel}</Text>
                      <View style={s.segRow}>
                        {GAME_MODES_UI.map((m) => (
                          <Pressable key={m} role="radio" aria-checked={!corp && mode === m} testID={`mode-${m}`} accessibilityLabel={`${uz.home.modes[m]}. ${uz.home.modeHints[m]}`} onPress={() => pickMode(m)} style={[s.seg, !corp && mode === m && s.segOn]}>
                            <Text style={[s.segT, !corp && mode === m && { color: color.white }]} aria-hidden>{uz.home.modes[m]}</Text></Pressable>))}
                        <Pressable role="radio" aria-checked={corp} testID="mode-corporate" accessibilityLabel={`${uz.home.corporate}. ${uz.home.corporateHint}`} onPress={() => setCorp(true)} style={[s.seg, corp && s.segOn]}>
                          <Text style={[s.segT, corp && { color: color.white }]} aria-hidden>{uz.home.corporate}</Text></Pressable>
                      </View>
                      <Text style={s.hintT}>{corp ? uz.home.corporateHint : uz.home.modeHints[mode]}</Text>
                    </View>
                    {!corp && <View style={s.sec} role="radiogroup" aria-label={uz.home.seatsLabel} testID="home-seats">
                      <Text style={s.secL} aria-hidden>{uz.home.seatsLabel}</Text>
                      <View style={s.segRow}>
                        {seatsFor(mode).map((v) => (
                          <Pressable key={v} role="radio" aria-checked={seats === v} accessibilityLabel={`${uz.home.seatsOpt.replace("{n}", String(v))}. ${uz.home.seatsHint}`} onPress={() => { setSeats(v); setSeatsPref(v); }} style={[s.seat, seats === v && s.segOn]} testID={`seats-${v}`}>
                            <Text style={[s.segT, seats === v && { color: color.white }]} aria-hidden>{v}</Text></Pressable>))}
                      </View>
                    </View>}
                    {corp ? (
                      <View style={s.join} testID="home-corp">
                        <Text style={s.label} nativeID="orgCodeLabel">{uz.home.corpCodeLabel}</Text>
                        <View style={s.joinRow}>
                          <TextInput accessibilityLabelledBy="orgCodeLabel" aria-label={uz.home.corpCode} placeholder="ABCD1234" placeholderTextColor="#6B7C8C" value={orgCode} onChangeText={(t) => { setOrgCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "")); setOrgErr(null); }} autoCapitalize="characters" autoCorrect={false} maxLength={8} onSubmitEditing={orgJoin} returnKeyType="go" style={s.input} testID="corp-code" />
                          <View style={{ flexShrink: 0 }}><Button label={uz.home.joinShort} onPress={orgJoin} disabled={!online || !orgReady || orgBusy} /></View>
                        </View>
                        {orgErr && <Text style={s.err} accessibilityRole="alert">{errText(orgErr)}</Text>}
                      </View>) : (<>
                      <SpeedPicker value={effTurn} onChange={pickTurn} />
                      {calcUiEnabled() && <View style={s.sec} role="radiogroup" aria-label={uz.ledger.modeLabel} testID="home-calc">
                        <Text style={s.secL} aria-hidden>{uz.ledger.modeLabel}</Text>
                        <View style={s.segRow}>
                          {(["manual", "auto"] as const).map((v) => (
                            <Pressable key={v} role="radio" aria-checked={calc === v} accessibilityLabel={`${v === "manual" ? uz.ledger.manual : uz.ledger.auto}. ${v === "manual" ? uz.ledger.manualHint : uz.ledger.autoHint}`} onPress={() => { setCalc(v); setCalcPref(v); }} style={[s.seg, calc === v && s.segOn]}>
                              <Text style={[s.segT, calc === v && { color: color.white }]} aria-hidden>{v === "manual" ? uz.ledger.manual : uz.ledger.auto}</Text></Pressable>))}
                        </View>
                      </View>}
                    </>)}
                  </View>
                </Acc>
              </View>)}
            {roomsNode && <View style={s.accWrap}>{roomsNode}</View>}
            <View style={s.tiles} testID="home-tiles">
              {onTournaments && <Tile icon="flag" title={uz.home.tiles.tournaments} onPress={onTournaments} />}
              {onClass && <Tile icon="house" title={uz.home.tiles.cls} onPress={onClass} />}
              {onShop && <Tile icon="star" title={uz.home.tiles.shop} onPress={onShop} />}
              {billingOn && onPacks && <Tile icon="trophy" title={uz.packs.title} onPress={onPacks} testID="home-packs" />}
            </View>
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
  learn: { backgroundColor: "#F3F7FA", borderRadius: radius.md, padding: space.md, gap: space.sm, marginVertical: space.sm }, learnH: { color: color.navy, fontWeight: "800", fontSize: font.md },
  learnRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" }, learnNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" }, learnNumT: { color: color.white, fontWeight: "800", fontSize: font.xs }, learnT: { flex: 1, color: color.navy, fontSize: font.sm, lineHeight: 19 },
  accWrap: { marginTop: space.sm }, sec: { gap: space.xs }, secL: { color: tone.muted, fontSize: font.sm, fontWeight: "700" }, segRow: { flexDirection: "row", flexWrap: "wrap", gap: space.xs }, hintT: { color: tone.muted, fontSize: 12, lineHeight: 17 },
  seat: { minHeight: MIN_TAP, minWidth: MIN_TAP, paddingHorizontal: space.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingTop: space.md },
  tile: { flexGrow: 1, flexBasis: "30%", minWidth: 96, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 6, padding: space.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", backgroundColor: color.white },
  tileIco: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F4F7F8", alignItems: "center", justifyContent: "center" }, tileT: { color: color.navy, fontWeight: "800", fontSize: font.sm, textAlign: "center" },
  header: { height: 56, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm }, logoT: { fontSize: font.lg, fontWeight: "800", color: color.navy, letterSpacing: 0.3 }, avatarBtn: { minWidth: MIN_TAP, minHeight: MIN_TAP, alignItems: "center", justifyContent: "center" },
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
