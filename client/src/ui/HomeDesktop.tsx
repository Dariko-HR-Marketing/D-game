import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { Button } from "./Button";
import { Banner, Pill } from "./kit";
import { Logo } from "./Logo";
import { Icon, type IconName } from "./Icon";
import { Avatar } from "./Avatar";
import { SpeedPicker } from "./SpeedPicker";
import { PrivateToggle } from "./PrivateToggle";
import { replayTour } from "./tourStore";
import { seatsFor, turnLabel, calcUiEnabled, type CalcMode, type UiMode, GAME_MODES_UI, type TurnSeconds } from "../turnPref";
import { uz, errText } from "../i18n/uz";
import { color, font, MIN_TAP, night, radius, space, tone } from "../theme";

const D = uz.home.desk;
const MODE_ICON: Record<UiMode, IconName> = { standard: "board", student: "book" };
export type DesktopProps = {
  roomsNode?: React.ReactNode; priv: boolean; showPriv: boolean; pickPriv: (v: boolean) => void; onPacks?: () => void; onClubs?: () => void;
  gated: boolean;   me: { name: string; color: number; level: number; games: number; gender?: "m" | "f" } | null; online: boolean; status: string; error: string | null;
  notes: { id: string; text: string; kind: "info" | "warn" }[]; active: { code: string; started: boolean; round: number; players: number } | null;
  mode: UiMode; calc: CalcMode; pickCalc: (v: CalcMode) => void; corp: boolean; seats: number; turn: number; effTurn: TurnSeconds; orgCode: string; orgErr: string | null; orgBusy: boolean;
  pickMode: (m: UiMode) => void; pickCorp: () => void; pickSeats: (n: number) => void; pickTurn: (v: TurnSeconds) => void; setOrgCode: (c: string) => void;
  create: () => void; startTutorial: () => void; join: (c: string) => void; orgJoin: () => void;
  onProfile: () => void; onLeaderboard: () => void; onRules: () => void; onTournaments?: () => void; onShop?: () => void; onClass?: () => void; resume: (c: string) => void;
};

/** Bosh sahifa — kompyuter ko'rinishi (prototip `Main.html`): chap menyu, o'quv bloki, 3 qadamli sozlash, «Sizning xonangiz» xulosasi, tezkor amallar. */
export function HomeDesktop(p: DesktopProps) {
  const { me, online } = p; const first = p.gated; const modeName = p.corp ? uz.home.corporate : uz.home.modes[p.mode];
  const dur = p.corp ? D.durCorp : D.dur.standard;
  const speed = turnLabel(p.effTurn);
  const startLabel = p.corp ? uz.home.corpEnter : D.start;
  const bots = Math.max(0, p.seats - 1);
  const nav: { k: string; label: string; icon: IconName; on?: () => void; cur?: boolean }[] = [
    { k: "home", label: uz.home.tabHome, icon: "home", cur: true }, { k: "board", label: uz.profile.leaderboard, icon: "trophy", on: p.onLeaderboard },
    ...(p.onTournaments ? [{ k: "tour", label: D.tournaments, icon: "flag" as IconName, on: p.onTournaments }] : []), { k: "rules", label: uz.hud.tabs.rules, icon: "book", on: p.onRules },
  ];
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: color.bg }}>
      <View style={s.side} role="navigation" aria-label={uz.home.nav}>
        <View style={s.brand}><View style={{ gap: 4 }}><Logo height={46} /><Text style={s.brandS}>{D.brandSub}</Text></View></View>
        <View style={{ gap: 4, marginTop: space.lg }}>{nav.map((n) => (
          <Pressable key={n.k} accessibilityRole="button" aria-current={n.cur ? "page" : undefined} accessibilityLabel={n.label} onPress={n.on} style={[s.navI, n.cur && s.navOn]}><Icon name={n.icon} size={20} color={n.cur ? color.green : tone.muted} /><Text style={[s.navT, n.cur && { color: "#0E6B4A" }]}>{n.label}</Text></Pressable>))}</View>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={uz.profile.title} onPress={p.onProfile} style={s.me}><Avatar name={me?.name ?? "?"} colorIdx={me?.color ?? 0} level={me?.level} gender={me?.gender} size={38} /><View style={{ flex: 1 }} aria-hidden><Text style={s.meN} numberOfLines={1}>{me?.name ?? "—"}</Text><Text style={s.meS}>{first ? D.newbie : `${me?.level ?? 0}-daraja`}</Text></View></Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.main} keyboardShouldPersistTaps="handled">
        <View style={s.top}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.h1} aria-level={1} accessibilityRole="header">{me ? `${uz.home.hello}, ${me.name}` : uz.home.hello}</Text>
            <Text style={s.lead}>{uz.login.welcomeLead}</Text>
          </View>
          <Pill label={online ? uz.home.online : p.status === "offline" ? uz.home.offline : uz.home.connecting} kind={online ? "good" : p.status === "offline" ? "bad" : "warn"} />
          <Pressable accessibilityRole="button" accessibilityLabel={uz.onboarding.help} onPress={replayTour} style={s.help} testID="tour-help"><Icon name="help" size={22} color={color.navy} /></Pressable>
        </View>
        {p.notes.map((n) => <Banner key={n.id} kind={n.kind === "warn" ? "warn" : "info"}>{n.text}</Banner>)}
        {p.active && <Pressable testID="home-resume" accessibilityRole="button" accessibilityLabel={`${uz.home.resume}. ${p.active.started ? `${p.active.round}-${uz.hud.turnWord}` : uz.home.resumeLobby} · ${p.active.code}`} disabled={!online} onPress={() => p.resume(p.active!.code)} style={s.resume}><Icon name="clock" size={20} color="#fff" /><Text style={s.resumeT}>{uz.home.resume} · {p.active.started ? `${p.active.round}-${uz.hud.turnWord}` : uz.home.resumeLobby} · {p.active.code}</Text><Icon name="chevron" size={18} color="#fff" /></Pressable>}

        {first && (
          <View style={s.hero}>
            <View style={{ flex: 1.2, gap: space.md }}>
              <Text style={s.heroBadge}>{D.heroBadge}</Text>
              <Text style={s.heroH} aria-level={2} accessibilityRole="header">{D.heroTitle}</Text>
              <Text style={s.heroP}>{D.heroText}</Text>
              <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
                <Pressable testID="home-tutorial" accessibilityRole="button" accessibilityLabel={uz.home.tutorialOffer} disabled={!online} onPress={p.startTutorial} style={[s.heroBtn, !online && { opacity: 0.5 }]}><Text style={s.heroBtnT}>{D.startTutorial}</Text><Icon name="arrow" size={18} color={night.bg} /></Pressable>
              </View>
            </View>
            <View style={s.heroList} role="list" aria-label={D.learnTitle}>
              <Text style={s.heroListH}>{D.learnTitle}</Text>
              {D.learn.map((t, i) => <View key={t} style={s.heroRow} role="listitem"><View style={s.heroNum} aria-hidden><Text style={s.heroNumT}>{i + 1}</Text></View><Text style={s.heroRowT}>{t}</Text></View>)}
              <Text style={s.heroNote}>{D.learnNote}</Text>
            </View>
          </View>)}

        {p.gated ? <View style={s.sumNote}><Text style={s.sumNoteT}><Text style={{ fontWeight: "800" }}>{uz.home.gateTitle}. </Text>{uz.home.gateText}</Text></View> : (<>
        <View style={s.stepHead}><Text style={s.eyebrow}>{D.newGame}</Text><View style={s.tag}><Text style={s.tagT}>{D.steps}</Text></View></View>
        <View style={s.cols}>
          <View style={s.card}>
            <StepTitle n={1} t={D.stepMode} />
            <View style={s.modes} role="radiogroup" aria-label={uz.home.modeLabel} testID="home-mode">
              {(GAME_MODES_UI as readonly UiMode[]).map((m) => { const on = !p.corp && p.mode === m; return (
                <Pressable key={m} role="radio" aria-checked={on} testID={`mode-${m}`} accessibilityLabel={`${uz.home.modes[m]}. ${uz.home.modeHints[m]}`} onPress={() => p.pickMode(m)} style={[s.mode, on && s.modeOn]}>
                  <Icon name={MODE_ICON[m]} size={22} color={on ? "#0E6B4A" : tone.muted} /><Text style={s.modeN} aria-hidden>{uz.home.modes[m]}</Text><Text style={s.modeH} aria-hidden>{D.modeShort[m]}</Text></Pressable>); })}
              <Pressable role="radio" aria-checked={p.corp} testID="mode-corporate" accessibilityLabel={`${uz.home.corporate}. ${uz.home.corporateHint}`} onPress={p.pickCorp} style={[s.mode, p.corp && s.modeOn]}>
                <View style={s.newB} aria-hidden><Text style={s.newBT}>{D.newBadge}</Text></View><Icon name="house" size={22} color={p.corp ? "#0E6B4A" : tone.muted} /><Text style={s.modeN} aria-hidden>{uz.home.corporate}</Text><Text style={s.modeH} aria-hidden>{D.corpShort}</Text></Pressable>
            </View>

            {!p.corp && <View style={s.info}><Text style={s.infoH}>{uz.home.modes[p.mode]}</Text><Text style={s.infoP}>{D.modeInfo[p.mode]}</Text><Text style={s.infoM}>{D.with}: <Text style={s.b}>{D.withFriends}</Text>   {D.duration}: <Text style={s.b}>{dur}</Text></Text></View>}
            {p.corp && (
              <View style={s.corp} testID="home-corp">
                <Text style={s.corpH}>{D.corpWhy}</Text>
                {D.corpPoints.map((t, i) => <View key={t} style={s.corpRow}><Icon name={i === 0 ? "lock" : i === 1 ? "person" : "chart"} size={16} color={night.accent} /><Text style={s.corpT}>{t}</Text></View>)}
                <Text style={[s.corpT, { fontWeight: "800", marginTop: space.sm }]} nativeID="orgCodeLabelD">{uz.home.corpCodeLabel}</Text>
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <TextInput accessibilityLabelledBy="orgCodeLabelD" aria-label={uz.home.corpCode} placeholder="K7M2Q9XA" placeholderTextColor={night.placeholder} value={p.orgCode} onChangeText={(t) => p.setOrgCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))} autoCapitalize="characters" autoCorrect={false} maxLength={8} onSubmitEditing={p.orgJoin} returnKeyType="go" style={s.corpIn} testID="corp-code" />
                </View>
                {p.orgErr && <Text style={{ color: "#FCA5A5", fontWeight: "700" }} accessibilityRole="alert">{errText(p.orgErr)}</Text>}
              </View>)}

            {!p.corp && (<>
              <StepTitle n={2} t={D.stepSeats} sub={D.seatsSub} />
              <View style={s.seatRow} role="radiogroup" aria-label={uz.home.seatsLabel} testID="home-seats">
                {seatsFor(p.mode).map((v) => (<Pressable key={v} role="radio" aria-checked={p.seats === v} testID={`seats-${v}`} accessibilityLabel={`${uz.home.seatsOpt.replace("{n}", String(v))}. ${uz.home.seatsHint}`} onPress={() => p.pickSeats(v)} style={[s.seat, p.seats === v && s.seatOn]}><Text style={[s.seatT, p.seats === v && { color: "#fff" }]} aria-hidden>{v}</Text></Pressable>))}
              </View>
              <View style={s.slots} aria-hidden><View style={s.slotMe}><Text style={s.slotMeT}>{D.you}</Text></View>{Array.from({ length: Math.max(0, p.seats - 1) }, (_, i) => <View key={i} style={s.slot} />)}<Text style={s.slotN}>{D.slotsNote.replace("{n}", String(bots))}</Text></View>

              <StepTitle n={3} t={D.stepSpeed} sub={D.speedSub} />
              <SpeedPicker value={p.effTurn} onChange={p.pickTurn} />
              {calcUiEnabled() && (<>
                <StepTitle n={4} t={uz.ledger.modeLabel} />
                <View style={s.speeds} role="radiogroup" aria-label={uz.ledger.modeLabel} testID="home-calc">
                  {(["manual", "auto"] as const).map((v) => (
                    <Pressable key={v} role="radio" aria-checked={p.calc === v} accessibilityLabel={`${v === "manual" ? uz.ledger.manual : uz.ledger.auto}. ${v === "manual" ? uz.ledger.manualHint : uz.ledger.autoHint}`} onPress={() => p.pickCalc(v)} style={[s.speed, p.calc === v && s.speedOn]}>
                      <Text style={s.modeN} aria-hidden>{v === "manual" ? uz.ledger.manual : uz.ledger.auto}</Text><Text style={s.modeH} aria-hidden>{v === "manual" ? uz.ledger.manualHint : uz.ledger.autoHint}</Text></Pressable>))}
                </View>
              </>)}
            </>)}
          </View>

          <View style={s.sum}>
            <Text style={s.sumH} aria-level={2} accessibilityRole="header">{D.yourRoom}</Text>
            {[[D.rowType, modeName], [D.rowPlayers, p.corp ? D.corpPlayers : `${p.seats} ${D.kishi}`], [D.rowSpeed, p.corp ? "—" : speed], [D.rowDuration, dur]].map(([k, v]) => <View key={k} style={s.sumRow}><Text style={s.sumK}>{k}</Text><Text style={s.sumV}>{v}</Text></View>)}
            <View style={s.sumNote}><Text style={s.sumNoteT}>{p.corp ? uz.home.corporateHint : D.sumBots}</Text></View>
            {p.showPriv && !p.corp && <PrivateToggle value={p.priv} onChange={p.pickPriv} />}
            <Pressable testID="home-new" role="button" accessibilityLabel={`${uz.home.newGame}: ${startLabel}`} accessibilityState={{ disabled: !online || (p.corp && p.orgCode.length !== 8) }} disabled={!online || (p.corp && p.orgCode.length !== 8)} onPress={p.corp ? p.orgJoin : p.create} style={[s.go, (!online || (p.corp && p.orgCode.length !== 8)) && { opacity: 0.45 }]}><Text style={s.goT}>{startLabel}</Text></Pressable>
            {p.error && <Text style={{ color: color.red, textAlign: "center" }} accessibilityRole="alert">{errText(p.error)}</Text>}
          </View>
        </View>

        </>)}

        {!p.gated && p.roomsNode ? <View style={{ marginTop: space.lg }}>{p.roomsNode}</View> : null}
        <Text style={[s.eyebrow, { marginTop: space.lg }]}>{D.quick}</Text>
        <View style={s.cols}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${uz.home.rulesRow}. ${uz.home.rulesSub}`} onPress={p.onRules} style={[s.card, s.qCard]}><View style={s.qIco}><Icon name="book" size={20} color="#0E6B4A" /></View><View style={{ flex: 1 }} aria-hidden><Text style={s.qT}>{uz.home.rulesRow}</Text><Text style={s.qS}>{uz.home.rulesSub}</Text></View></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${uz.profile.leaderboard}. ${uz.home.boardSub}`} onPress={p.onLeaderboard} style={[s.card, s.qCard]}><View style={s.qIco}><Icon name="trophy" size={20} color="#0E6B4A" /></View><View style={{ flex: 1 }} aria-hidden><Text style={s.qT}>{uz.profile.leaderboard}</Text><Text style={s.qS}>{uz.home.boardSub}</Text></View></Pressable>
        </View>
        {(p.onClass || p.onShop || p.onPacks || p.onClubs) && <View style={[s.cols, { marginTop: space.md }]}>
          {p.onClass && <Pressable accessibilityRole="button" accessibilityLabel={D.classTitle} onPress={p.onClass} style={[s.card, s.qCard]}><View style={s.qIco}><Icon name="house" size={20} color="#0E6B4A" /></View><View style={{ flex: 1 }} aria-hidden><Text style={s.qT}>{D.classTitle}</Text><Text style={s.qS}>{D.classSub}</Text></View></Pressable>}
          {p.onShop && <Pressable accessibilityRole="button" accessibilityLabel={D.shopTitle} onPress={p.onShop} style={[s.card, s.qCard]}><View style={s.qIco}><Icon name="star" size={20} color="#0E6B4A" /></View><View style={{ flex: 1 }} aria-hidden><Text style={s.qT}>{D.shopTitle}</Text><Text style={s.qS}>{D.shopSub}</Text></View></Pressable>}
          {p.onClubs && <Pressable testID="home-clubs" accessibilityRole="button" accessibilityLabel={uz.clubs.title} onPress={p.onClubs} style={[s.card, s.qCard]}><View style={s.qIco}><Icon name="people" size={20} color="#0E6B4A" /></View><View style={{ flex: 1 }} aria-hidden><Text style={s.qT}>{uz.clubs.title}</Text><Text style={s.qS}>{uz.clubs.short}</Text></View></Pressable>}
          {p.onPacks && <Pressable testID="home-packs" accessibilityRole="button" accessibilityLabel={uz.packs.title} onPress={p.onPacks} style={[s.card, s.qCard]}><View style={s.qIco}><Icon name="trophy" size={20} color="#0E6B4A" /></View><View style={{ flex: 1 }} aria-hidden><Text style={s.qT}>{uz.packs.title}</Text><Text style={s.qS}>{uz.packs.lead}</Text></View></Pressable>}
        </View>}
      </ScrollView>
    </View>);
}
const StepTitle = ({ n, t, sub }: { n: number; t: string; sub?: string }) => (<View style={s.stepT}><View style={s.stepN} aria-hidden><Text style={s.stepNT}>{n}</Text></View><Text style={s.stepL} aria-level={2} accessibilityRole="header">{t}</Text>{sub ? <Text style={s.stepS}>— {sub}</Text> : null}</View>);

const s = StyleSheet.create({
  side: { width: 248, backgroundColor: color.white, borderRightWidth: 1, borderRightColor: "#E6ECEF", padding: space.md, gap: 2 }, brand: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm }, brandT: { color: color.navy, fontSize: font.lg, fontWeight: "800" }, brandS: { color: tone.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  navI: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, borderRadius: radius.md }, navOn: { backgroundColor: "#E7F4EE" }, navT: { color: tone.muted, fontWeight: "700", fontSize: font.md },
  me: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF" }, meN: { color: color.navy, fontWeight: "800" }, meS: { color: tone.muted, fontSize: font.xs },
  main: { padding: space.xl, gap: space.md, maxWidth: 1180, width: "100%", alignSelf: "center" }, top: { flexDirection: "row", alignItems: "center", gap: space.md }, h1: { color: color.navy, fontSize: 32, fontWeight: "800" }, lead: { color: tone.muted, fontSize: font.md, maxWidth: 560 },
  help: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.white, borderWidth: 1, borderColor: "#E6ECEF", alignItems: "center", justifyContent: "center" },
  resume: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: color.green, padding: space.md, borderRadius: radius.lg, minHeight: MIN_TAP }, resumeT: { flex: 1, color: "#fff", fontWeight: "800" },
  hero: { flexDirection: "row", gap: space.xl, backgroundColor: night.brand, borderRadius: 20, padding: space.xl }, heroBadge: { color: night.accent, fontSize: font.sm, fontWeight: "800" }, heroH: { color: night.text, fontSize: 30, lineHeight: 36, fontWeight: "800" }, heroP: { color: night.muted, fontSize: font.md, lineHeight: 23 },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: night.accent, paddingHorizontal: space.xl, minHeight: 52, borderRadius: radius.md }, heroBtnT: { color: night.bg, fontWeight: "800", fontSize: font.md },
  heroList: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.lg, padding: space.lg, gap: space.sm }, heroListH: { color: night.muted, fontSize: font.sm, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }, heroRow: { flexDirection: "row", gap: space.sm, alignItems: "center" }, heroNum: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: night.accent, alignItems: "center", justifyContent: "center" }, heroNumT: { color: night.accent, fontWeight: "800", fontSize: 12 }, heroRowT: { color: night.text, fontWeight: "600", flex: 1 }, heroNote: { color: night.muted, fontSize: font.sm },
  stepHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md }, eyebrow: { color: tone.muted, fontSize: font.sm, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }, tag: { backgroundColor: "#E7F4EE", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }, tagT: { color: "#0E6B4A", fontWeight: "800", fontSize: 12, textTransform: "uppercase" },
  cols: { flexDirection: "row", gap: space.lg, alignItems: "flex-start" }, card: { flex: 1, backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", padding: space.lg, gap: space.md },
  stepT: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm }, stepN: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" }, stepNT: { color: "#fff", fontSize: 12, fontWeight: "800" }, stepL: { color: color.navy, fontSize: font.sm, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }, stepS: { color: tone.muted, fontSize: font.sm },
  modes: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" }, mode: { flexGrow: 1, flexBasis: 120, minHeight: 104, gap: 4, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: "#DCE3E8", backgroundColor: color.white }, modeOn: { borderColor: color.green, borderWidth: 2, backgroundColor: "#E7F4EE" }, modeN: { color: color.navy, fontWeight: "800", fontSize: font.md }, modeH: { color: tone.muted, fontSize: font.xs, lineHeight: 16 },
  newB: { position: "absolute", top: 6, right: 6, backgroundColor: color.gold, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }, newBT: { color: color.navy, fontSize: 12, fontWeight: "800" },
  info: { backgroundColor: "#E8F0F8", borderRadius: radius.md, padding: space.md, gap: 4 }, infoH: { color: color.navy, fontWeight: "800" }, infoP: { color: color.navy, fontSize: font.md }, infoM: { color: tone.muted, fontSize: font.sm }, b: { color: color.navy, fontWeight: "800" },
  corp: { backgroundColor: night.brand, borderRadius: radius.md, padding: space.lg, gap: space.xs }, corpH: { color: night.text, fontWeight: "800", fontSize: font.md, marginBottom: 4 }, corpRow: { flexDirection: "row", alignItems: "center", gap: space.sm }, corpT: { color: night.text, fontSize: font.sm }, corpIn: { flex: 1, minHeight: MIN_TAP, borderWidth: 1, borderColor: night.line, borderRadius: radius.md, paddingHorizontal: space.md, color: night.text, letterSpacing: 3, fontSize: font.lg, backgroundColor: "rgba(255,255,255,0.05)" },
  seatRow: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" }, seat: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: "#DCE3E8", alignItems: "center", justifyContent: "center", backgroundColor: color.white }, seatOn: { backgroundColor: color.green, borderColor: color.green }, seatT: { color: color.navy, fontWeight: "800", fontSize: font.lg },
  slots: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }, slotMe: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.green, alignItems: "center", justifyContent: "center" }, slotMeT: { color: "#fff", fontSize: 12, fontWeight: "800" }, slot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#B7C6CF" }, slotN: { color: tone.muted, fontSize: font.sm, marginLeft: space.sm },
  speeds: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" }, speed: { flexGrow: 1, flexBasis: 160, gap: 4, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: "#DCE3E8", backgroundColor: color.white }, speedOn: { borderColor: color.green, borderWidth: 2, backgroundColor: "#E7F4EE" }, speedV: { color: "#0E6B4A", fontWeight: "800" },
  sum: { width: 330, backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E6ECEF", padding: space.lg, gap: space.sm }, sumH: { color: color.navy, fontSize: font.lg, fontWeight: "800", marginBottom: 4 }, sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEF2F4" }, sumK: { color: tone.muted }, sumV: { color: color.navy, fontWeight: "800" },
  sumNote: { backgroundColor: "#FFF6DD", borderRadius: radius.md, padding: space.md }, sumNoteT: { color: "#5C3A00", fontSize: font.sm, lineHeight: 19 }, go: { minHeight: 52, borderRadius: radius.md, backgroundColor: color.green, alignItems: "center", justifyContent: "center" }, goT: { color: "#fff", fontWeight: "800", fontSize: font.md },
  qHead: { flexDirection: "row", alignItems: "center", gap: space.md }, qCard: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 88 }, qIco: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#E7F4EE", alignItems: "center", justifyContent: "center" }, qT: { color: color.navy, fontWeight: "800", fontSize: font.md }, qS: { color: tone.muted, fontSize: font.sm },
  codeIn: { flex: 1, minWidth: 0, width: 0, minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.lg, letterSpacing: 3, fontWeight: "700", color: color.navy, backgroundColor: color.white },
});
