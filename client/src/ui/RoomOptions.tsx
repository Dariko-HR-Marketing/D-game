import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { RoomVisibility, RoomStart } from "../net/http";
import { Icon, type IconName } from "./Icon";
import { uz } from "../i18n/uz";
import { color, font, radius, space } from "../theme";

const O = uz.openRooms;
export interface RoomOpts { visibility: RoomVisibility; start: RoomStart; kind: "standard" | "student" }
/** Rejim bo'yicha boshlang'ich ko'rinish (taklif, tasdiq kutilmoqda): Standart — Ochiq, Student — Qulfli, Korporativ — Ochiq (vaqtincha). */
export const defaultVisibility = (mode: "standard" | "student" | "corporate"): RoomVisibility => (mode === "student" ? "locked" : "open");
export const defaultOpts = (mode: "standard" | "student" | "corporate" = "standard"): RoomOpts => ({ visibility: defaultVisibility(mode), start: "host", kind: mode === "student" ? "student" : "standard" });

/** Xona kirishi va boshlanishi: ikonkali kartalar (so'z-uzun qatorlarsiz), tanlanganining izohi pastida. Botlar bilan boshlash faqat «ro'yxatsiz» xonada. */
const VIS_ICON: Record<RoomVisibility, IconName> = { open: "globe", locked: "lock", hidden: "eyeOff" };
const START_ICON: Record<RoomStart, IconName> = { host: "hand", full: "people", bots: "bot" };
export function RoomOptions({ value, onChange }: { value: RoomOpts; onChange: (v: RoomOpts) => void }) {
  const vis = ["open", "locked", "hidden"] as const, starts = (["host", "full", "bots"] as const).filter((k) => k !== "bots" || value.visibility === "hidden");
  const pickVis = (v: RoomVisibility) => onChange({ ...value, visibility: v, start: v !== "hidden" && value.start === "bots" ? "host" : value.start });
  const card = (on: boolean) => [s.card, on && s.cardOn];
  return (
    <View style={s.box} testID="room-options">
      <View style={s.row} role="radiogroup" aria-label={O.vis}>
        {vis.map((v) => { const on = value.visibility === v; return (
          <Pressable key={v} role="radio" aria-checked={on} testID={`vis-${v}`} accessibilityLabel={`${O.visName[v]}. ${O.visHint[v]}`} onPress={() => pickVis(v)} style={card(on)}>
            <Icon name={VIS_ICON[v]} size={20} color={on ? color.white : color.navy} /><Text style={[s.cardT, on && { color: color.white }]} aria-hidden>{O.visName[v]}</Text></Pressable>); })}
      </View>
      <Text style={s.hint}>{O.visHint[value.visibility]}</Text>
      <View style={s.row} role="radiogroup" aria-label={O.start}>
        {starts.map((k) => { const on = value.start === k; return (
          <Pressable key={k} role="radio" aria-checked={on} testID={`start-${k}`} accessibilityLabel={`${O.startName[k]}. ${O.startHint[k]}`} onPress={() => onChange({ ...value, start: k })} style={card(on)}>
            <Icon name={START_ICON[k]} size={20} color={on ? color.white : color.navy} /><Text style={[s.cardT, on && { color: color.white }]} aria-hidden>{O.startName[k]}</Text></Pressable>); })}
      </View>
      <Text style={s.hint}>{O.startHint[value.start]}</Text>
    </View>);
}
const s = StyleSheet.create({
  box: { gap: space.xs, marginTop: space.sm }, row: { flexDirection: "row", gap: space.sm },
  card: { flex: 1, minHeight: 68, gap: 4, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderRadius: radius.md, borderWidth: 2, borderColor: color.line, backgroundColor: color.white }, cardOn: { backgroundColor: color.navy, borderColor: color.navy },
  cardT: { color: color.navy, fontWeight: "800", fontSize: font.sm, textAlign: "center" }, hint: { color: color.text2, fontSize: 12, lineHeight: 17, marginBottom: space.xs },
});
