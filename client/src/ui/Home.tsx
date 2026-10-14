import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Button } from "./Button";
import { uz, errText } from "../i18n/uz";
import { color } from "../theme";

export function Home({ status, error, onCreate, onJoin, onProfile, onLeaderboard, onRules }: { status: string; error: string | null; onCreate: () => void; onJoin: (c: string) => void; onProfile: () => void; onLeaderboard: () => void; onRules: () => void }) {
  const [code, setCode] = useState("");
  const online = status === "online";
  return (
    <View style={s.wrap}>
      <Text style={s.logo} aria-level={1} accessibilityRole="header">{uz.app.name}</Text>
      {!online && <Text style={s.note}>{status === "offline" ? uz.home.offline : uz.home.connecting}</Text>}
      <Button label={uz.home.create} onPress={onCreate} disabled={!online} />
      <TextInput accessibilityLabel={uz.home.code} placeholder={uz.home.code} value={code} onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters" maxLength={6} style={s.input} />
      <Button label={uz.home.join} kind="ghost" onPress={() => onJoin(code)} disabled={!online || code.length !== 6} />
      <Button label={uz.profile.title} kind="ghost" onPress={onProfile} />
      <Button label={uz.profile.leaderboard} kind="ghost" onPress={onLeaderboard} />
      <Button label={uz.rules.open} kind="ghost" onPress={onRules} />
      {error && <Text style={s.err} accessibilityRole="alert">{errText(error)}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, gap: 14, padding: 24, justifyContent: "center", maxWidth: 420, width: "100%", alignSelf: "center" },
  logo: { fontSize: 40, fontWeight: "800", color: color.navy, textAlign: "center", letterSpacing: 2 },
  note: { color: color.text2, textAlign: "center" },
  input: { minHeight: 44, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 14, fontSize: 18, letterSpacing: 4, backgroundColor: color.white, color: color.navy },
  err: { color: color.red, textAlign: "center" },
});
