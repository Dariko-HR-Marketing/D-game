import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { Button } from "./Button";
import { Banner, Pill } from "./kit";
import { Logo } from "./Logo";
import { Icon, type IconName } from "./Icon";
import { Avatar } from "./Avatar";
import { BottomNav } from "./BottomNav";
import { uz, errText } from "../i18n/uz";
import { color, font, radius, space, tone, MIN_TAP } from "../theme";
import type { Http } from "../net/http";

type Tab = "home" | "board" | "rules" | "profile";
function Row({ icon, title, sub, onPress, disabled }: { icon: IconName; title: string; sub: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: "#F4F7F8" }, disabled && { opacity: 0.5 }]}>
      <View style={s.rowIcon} aria-hidden><Icon name={icon} size={20} color={color.navy} /></View>
      <View style={{ flex: 1, gap: 2 }} aria-hidden><Text style={s.rowT}>{title}</Text><Text style={s.rowS}>{sub}</Text></View>
      <Icon name="chevron" size={18} color="#6B7C8C" />
    </Pressable>);
}

/** Bosh sahifa (maket N05): salom, ro'yxat qatorlari (yangi o'yin, kod bilan qo'shilish, qoidalar), pastki navigatsiya. */
export function Home({ status, error, http, onCreate, onJoin, onProfile, onLeaderboard, onRules, onShop, onClass, onTournaments }: { status: string; error: string | null; http?: Http; onCreate: () => void; onJoin: (c: string) => void; onProfile: () => void; onLeaderboard: () => void; onRules: () => void; onShop?: () => void; onClass?: () => void; onTournaments?: () => void }) {
  const [code, setCode] = useState(""); const [joinOpen, setJoinOpen] = useState(false);
  const [me, setMe] = useState<{ name: string; color: number; level: number } | null>(null);
  useEffect(() => { let off = false; http?.profile().then((r: any) => { if (!off && r?.profile) setMe({ name: r.profile.name, color: r.profile.color, level: r.stats?.level ?? 0 }); }).catch(() => {}); return () => { off = true; }; }, [http]);
  const [notes, setNotes] = useState<{ id: string; text: string; kind: "info" | "warn" }[]>([]);
  useEffect(() => { let off = false; Promise.all([http?.announcements().catch(() => ({ announcements: [] })), http?.status().catch(() => null)]).then(([a, st]: any) => { if (off) return; const list = [...(st?.maintenance ? [{ id: "maint", kind: "warn" as const, text: `Texnik ishlar olib borilmoqda${st.text ? `: ${st.text}` : "."}` }] : []), ...(a?.announcements ?? [])]; setNotes(list); }); return () => { off = true; }; }, [http]);
  const online = status === "online", ready = code.length === 6;
  return (
    <View style={{ flex: 1, backgroundColor: color.white }}>
      <View style={s.header}>
        <View style={s.brand}><Logo size={30} /><Text style={s.logoT}>{uz.app.name}</Text></View>
        <View style={{ flex: 1 }} />
        <Pill label={online ? uz.home.online : status === "offline" ? uz.home.offline : uz.home.connecting} kind={online ? "good" : status === "offline" ? "bad" : "warn"} />
        <Pressable accessibilityRole="button" accessibilityLabel={uz.profile.title} onPress={onProfile} style={s.avatarBtn}><Avatar name={me?.name ?? "?"} colorIdx={me?.color ?? 0} level={me?.level} size={34} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.wrap}>
          {notes.map((n) => <Banner key={n.id} kind={n.kind === "warn" ? "warn" : "info"}>{n.text}</Banner>)}
          <Text style={s.h1} aria-level={1} accessibilityRole="header">{me ? `${uz.home.hello}, ${me.name}` : uz.home.hello}</Text>
          <View>
            <Row icon="plus" title={uz.home.newGame} sub={uz.home.newGameSub} onPress={onCreate} disabled={!online} />
            <Row icon="people" title={uz.home.joinByCode} sub={uz.home.joinSub} onPress={() => setJoinOpen((v) => !v)} />
            {joinOpen && (
              <View style={s.join}>
                <Text style={s.label} nativeID="codeLabel">{uz.home.codeLabel}</Text>
                <View style={s.joinRow}>
                  <TextInput accessibilityLabelledBy="codeLabel" aria-label={uz.home.code} placeholder="ABC123" placeholderTextColor="#6B7C8C" value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    autoCapitalize="characters" autoCorrect={false} maxLength={6} onSubmitEditing={() => ready && online && onJoin(code)} returnKeyType="go" style={s.input} autoFocus />
                  <View style={{ flexShrink: 0 }}><Button label={uz.home.joinShort} onPress={() => onJoin(code)} disabled={!online || !ready} /></View>
                </View>
              </View>)}
            <Row icon="book" title={uz.home.rulesRow} sub={uz.home.rulesSub} onPress={onRules} />
            <Row icon="trophy" title={uz.profile.leaderboard} sub={uz.home.boardSub} onPress={onLeaderboard} />
            {onTournaments && <Row icon="trophy" title="Turnirlar" sub="Homiylar bilan musobaqalar" onPress={onTournaments} />}
            {onClass && <Row icon="people" title="Sinf" sub="Maktab: sinfga qo'shilish yoki o'qituvchi paneli" onPress={onClass} />}
            {onShop && <Row icon="plus" title="Do'kon va Plus" sub="Ko'rinish uchun narsalar, cheklovsiz xonalar" onPress={onShop} />}
          </View>
          <View style={s.how}>
            <Text style={s.howT} aria-level={2} accessibilityRole="header">{uz.home.howTitle}</Text>
            {uz.home.how.map((t, i) => (<View key={i} style={s.step}><View style={s.num}><Text style={s.numText}>{i + 1}</Text></View><Text style={s.stepText}>{t}</Text></View>))}
          </View>
          {error && <Text style={s.err} accessibilityRole="alert">{errText(error)}</Text>}
        </View>
      </ScrollView>
      <BottomNav<Tab> label={uz.home.nav} active="home" onChange={(k) => (k === "board" ? onLeaderboard() : k === "rules" ? onRules() : k === "profile" ? onProfile() : undefined)}
        items={[{ key: "home", label: uz.home.tabHome, icon: "home" }, { key: "board", label: uz.profile.leaderboard, icon: "trophy" }, { key: "rules", label: uz.hud.tabs.rules, icon: "book" }, { key: "profile", label: uz.profile.title, icon: "person" }]} />
    </View>
  );
}
const s = StyleSheet.create({
  header: { height: 56, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm }, logoT: { fontSize: font.lg, fontWeight: "800", color: color.navy, letterSpacing: 2 }, avatarBtn: { minWidth: MIN_TAP, minHeight: MIN_TAP, alignItems: "center", justifyContent: "center" },
  scroll: { flexGrow: 1 }, wrap: { gap: space.lg, padding: space.lg, maxWidth: 560, width: "100%", alignSelf: "center" },
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
