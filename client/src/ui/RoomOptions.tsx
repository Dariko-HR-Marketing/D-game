import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { RoomVisibility, RoomStart } from "../net/http";
import { uz } from "../i18n/uz";
import { color, font, radius, space } from "../theme";

const O = uz.openRooms;
export interface RoomOpts { visibility: RoomVisibility; start: RoomStart }
/** Rejim bo'yicha boshlang'ich ko'rinish (taklif, tasdiq kutilmoqda): Standart — Ochiq, Student — Qulfli, Korporativ — Ochiq (vaqtincha). */
export const defaultVisibility = (mode: "standard" | "student" | "corporate"): RoomVisibility => (mode === "student" ? "locked" : "open");
export const defaultOpts = (mode: "standard" | "student" | "corporate" = "standard"): RoomOpts => ({ visibility: defaultVisibility(mode), start: "host" });

/** Xona yaratish: «Ko'rinish» (Ochiq / Qulfli / Yashirin) va «Boshlash usuli». Botlar bilan avtomatik boshlash faqat Yashirin xonada. */
export function RoomOptions({ value, onChange }: { value: RoomOpts; onChange: (v: RoomOpts) => void }) {
  const vis = ["open", "locked", "hidden"] as const, starts = (["host", "full", "bots"] as const).filter((k) => k !== "bots" || value.visibility === "hidden");
  const pickVis = (v: RoomVisibility) => onChange({ visibility: v, start: v !== "hidden" && value.start === "bots" ? "host" : value.start });
  return (
    <View style={s.box} testID="room-options">
      <Text style={s.l} nativeID="visL">{O.vis}</Text>
      <View style={s.row} role="radiogroup" aria-labelledby="visL">
        {vis.map((v) => <Pressable key={v} role="radio" aria-checked={value.visibility === v} testID={`vis-${v}`} accessibilityLabel={`${O.visName[v]}. ${O.visHint[v]}`} onPress={() => pickVis(v)} style={[s.seg, value.visibility === v && s.on]}><Text style={[s.segT, value.visibility === v && { color: color.white }]} aria-hidden>{O.visName[v]}</Text></Pressable>)}
      </View>
      <Text style={s.hint}>{O.visHint[value.visibility]}</Text>
      <Text style={s.l} nativeID="startL">{O.start}</Text>
      <View style={s.col} role="radiogroup" aria-labelledby="startL">
        {starts.map((k) => <Pressable key={k} role="radio" aria-checked={value.start === k} testID={`start-${k}`} accessibilityLabel={O.startName[k]} onPress={() => onChange({ ...value, start: k })} style={[s.opt, value.start === k && s.optOn]}><Text style={s.optT} aria-hidden>{value.start === k ? "● " : "○ "}{O.startName[k]}</Text></Pressable>)}
      </View>
    </View>);
}
const s = StyleSheet.create({
  box: { gap: space.xs }, l: { color: color.text2, fontSize: font.sm, fontWeight: "700" }, row: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" }, col: { gap: space.xs },
  seg: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 2, borderColor: color.line, backgroundColor: color.white, alignItems: "center", justifyContent: "center" }, on: { backgroundColor: color.green, borderColor: color.green }, segT: { color: color.navy, fontWeight: "800", fontSize: font.sm },
  hint: { color: color.text2, fontSize: 12 }, opt: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: color.line, backgroundColor: color.white }, optOn: { borderColor: color.green }, optT: { color: color.navy, fontWeight: "600", fontSize: font.sm },
});
