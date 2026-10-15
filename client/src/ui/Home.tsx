import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { Button } from "./Button";
import { Card, Pill } from "./kit";
import { Logo } from "./Logo";
import { uz, errText } from "../i18n/uz";
import { color, font, radius, space, tone, MIN_TAP } from "../theme";

export function Home({ status, error, onCreate, onJoin, onProfile, onLeaderboard, onRules }: { status: string; error: string | null; onCreate: () => void; onJoin: (c: string) => void; onProfile: () => void; onLeaderboard: () => void; onRules: () => void }) {
  const [code, setCode] = useState("");
  const online = status === "online";
  const ready = code.length === 6;
  return (
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.wrap}>
        <View style={s.brand}>
          <Logo size={96} />
          <Text style={s.logo} aria-level={1} accessibilityRole="header">{uz.app.name}</Text>
          <Text style={s.tag}>{uz.home.tagline}</Text>
          <View><Pill label={online ? uz.home.online : status === "offline" ? uz.home.offline : uz.home.connecting} kind={online ? "good" : status === "offline" ? "bad" : "warn"} /></View>
        </View>

        <Card>
          <Button label={uz.home.create} onPress={onCreate} disabled={!online} />
          <View style={s.or} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={s.line} /><Text style={s.orText}>{uz.home.or}</Text><View style={s.line} /></View>
          <Text style={s.label} nativeID="codeLabel">{uz.home.codeLabel}</Text>
          <View style={s.joinRow}>
            <TextInput accessibilityLabelledBy="codeLabel" aria-label={uz.home.code} placeholder="ABC123" placeholderTextColor="#6B7C8C" value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              autoCapitalize="characters" autoCorrect={false} maxLength={6} onSubmitEditing={() => ready && online && onJoin(code)} returnKeyType="go" style={s.input} />
            <View style={{ flexShrink: 0 }}><Button label={uz.home.joinShort} onPress={() => onJoin(code)} disabled={!online || !ready} /></View>
          </View>
        </Card>

        <View style={s.grid}>
          <View style={s.cell}><Button label={uz.profile.title} kind="ghost" onPress={onProfile} /></View>
          <View style={s.cell}><Button label={uz.profile.leaderboard} kind="ghost" onPress={onLeaderboard} /></View>
          <View style={s.cell}><Button label={uz.rules.open} kind="ghost" onPress={onRules} /></View>
        </View>

        <Card raised={false} style={{ backgroundColor: "transparent", borderStyle: "dashed" }}>
          <Text style={s.howTitle} aria-level={2} accessibilityRole="header">{uz.home.howTitle}</Text>
          {uz.home.how.map((t, i) => (<View key={i} style={s.step}><View style={s.num}><Text style={s.numText}>{i + 1}</Text></View><Text style={s.stepText}>{t}</Text></View>))}
        </Card>
        {error && <Text style={s.err} accessibilityRole="alert">{errText(error)}</Text>}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center" },
  wrap: { gap: space.lg, padding: space.xl, maxWidth: 440, width: "100%", alignSelf: "center" },
  brand: { alignItems: "center", gap: space.sm, marginBottom: space.sm },
  logo: { fontSize: font.display, fontWeight: "800", color: color.navy, letterSpacing: 3 }, tag: { color: tone.muted, fontSize: font.md, textAlign: "center" },
  or: { flexDirection: "row", alignItems: "center", gap: space.md }, line: { flex: 1, height: 1, backgroundColor: color.line }, orText: { color: tone.muted, fontSize: font.sm },
  label: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  joinRow: { flexDirection: "row", gap: space.sm, alignItems: "stretch" },
  input: { flex: 1, minWidth: 0, width: 0, minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.lg, fontSize: font.xl, letterSpacing: 4, fontWeight: "700", backgroundColor: color.white, color: color.navy },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, cell: { flexGrow: 1, flexBasis: 120 },
  howTitle: { fontWeight: "800", color: color.navy, fontSize: font.md },
  step: { flexDirection: "row", gap: space.md, alignItems: "flex-start" }, num: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" },
  numText: { color: color.white, fontWeight: "800", fontSize: font.sm }, stepText: { flex: 1, color: tone.muted, fontSize: font.md, lineHeight: 21 },
  err: { color: color.red, textAlign: "center" },
});
