import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Icon, type IconName } from "./Icon";
import { color, font, radius, space, tone } from "../theme";

export interface CardLook { bg: string; border: string; fg: string; icon: IconName; title: string }
export interface PaperRow { label: string; value: string; tone?: "good" | "bad" | "neutral" }

/**
 * Karta rasmi bo'lmaganda (yoki yuklanmaganda) matnli karta: taxta kataklari bilan bir xil rang va ikonka (Imkoniyat — yashil, Xarajat — qizil, Bozor — ko'k),
 * rangli sarlavha tasmasi, karta matni va «narx / daromad / pul oqimi» jadvali. Asl rasm bor bo'lsa u ko'rsatiladi, bu — faqat zaxira ko'rinish (§2.5).
 */
export function CardPaper({ look, deck, text, rows }: { look: CardLook; deck?: string; text: string; rows?: PaperRow[] }) {
  return (
    <View style={[s.paper, { borderColor: look.border }]}>
      {deck ? (
        <View style={[s.band, { backgroundColor: look.bg, borderBottomColor: look.border }]}>
          <View style={[s.badge, { borderColor: look.border }]}><Icon name={look.icon} size={20} color={look.fg} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.eyebrow, { color: look.fg }]} numberOfLines={1}>{deck.toUpperCase()}</Text>
            <Text style={[s.title, { color: look.fg }]} numberOfLines={2}>{look.title}</Text>
          </View>
        </View>
      ) : null}
      <View style={[s.body, !deck && { borderLeftWidth: 5, borderLeftColor: look.border }]}>
        <Text style={s.text}>{text}</Text>
      </View>
      {rows && rows.length > 0 ? (
        <View style={s.table}>
          {rows.map((r, i) => (
            <View key={r.label} style={[s.row, i > 0 && s.rowLine]}>
              <Text style={s.rl}>{r.label}</Text>
              <Text style={[s.rv, r.tone === "good" && s.good, r.tone === "bad" && s.bad]}>{r.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  paper: { backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 2, overflow: "hidden", alignSelf: "stretch", shadowColor: "#082238", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  band: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderBottomWidth: 2 },
  badge: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, backgroundColor: color.white, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1 }, title: { fontSize: font.lg, fontWeight: "800" },
  body: { paddingHorizontal: space.lg, paddingVertical: space.md + 2 },
  text: { color: color.navy, fontSize: font.lg, lineHeight: 25, fontWeight: "600" },
  table: { backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: color.line, paddingHorizontal: space.lg, paddingVertical: space.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.md, minHeight: 40 },
  rowLine: { borderTopWidth: 1, borderTopColor: "#E6ECEF" },
  rl: { color: tone.muted, fontSize: font.md, flexShrink: 1 },
  rv: { color: color.navy, fontSize: font.lg, fontWeight: "800", fontVariant: ["tabular-nums"] }, good: { color: tone.good }, bad: { color: tone.bad },
});
