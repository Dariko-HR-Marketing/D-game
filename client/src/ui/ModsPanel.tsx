import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Pill } from "./kit";
import { modLine } from "../opsFacts";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";
import { uz } from "../i18n/uz";

/**
 * Faol ta'sirlar: yig'iladigan bo'lim. Yopiq holatda faqat sarlavha va soni; yangi ta'sir kelsa «yangi» belgisi va ekran o'qigichga xabar.
 * Ochilganda ro'yxat (cheklangan balandlikda aylantiriladi), yangilari ajratib ko'rsatiladi. O'yin boshida/sahifa yangilanganda mavjud ta'sirlar «yangi» sanalmaydi.
 */
export function ModsPanel({ mods }: { mods: any[] }) {
  const ids: string[] = mods.map((m) => String(m.id)); const key = ids.join(",");
  const [open, setOpen] = useState(false); const seen = useRef<Set<string>>(new Set(ids)); const [hl, setHl] = useState<Set<string>>(new Set());
  const fresh = ids.filter((i) => !seen.current.has(i));
  const [announce, setAnnounce] = useState("");
  useEffect(() => { // yangi ta'sir kelganda (panel yopiq) — xabar; ochiq bo'lsa darrov ko'rilgan hisoblanadi
    const f = ids.filter((i) => !seen.current.has(i));
    if (open) { f.forEach((i) => seen.current.add(i)); return; }
    if (f.length) { const m = mods.find((x) => String(x.id) === f[0])!; setAnnounce(f.length === 1 ? uz.ops.mods.freshOne.replace("{text}", modLine(m).text) : uz.ops.mods.freshMany.replace("{n}", String(f.length))); } else setAnnounce("");
  }, [key, open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mods.length) return null;
  const toggle = () => { if (!open) { setHl(new Set(fresh)); ids.forEach((i) => seen.current.add(i)); setAnnounce(""); } setOpen(!open); };
  const nFresh = open ? 0 : fresh.length;
  return (
    <View style={s.wrap} testID="mods">
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${uz.ops.mods.title}: ${mods.length}${nFresh ? `, ${nFresh} ${uz.ops.mods.fresh}` : ""}`} style={s.head}>
        <Text style={s.title} aria-hidden>{open ? "▾" : "▸"} {uz.ops.mods.title}</Text>
        <View style={s.pills} aria-hidden>{nFresh ? <Pill label={`+${nFresh} ${uz.ops.mods.fresh}`} kind="warn" /> : null}<Pill label={String(mods.length)} kind="info" /></View>
      </Pressable>
      <View role="status" accessibilityLiveRegion="polite" style={s.sr}><Text>{announce}</Text></View>
      {open && (
        <ScrollView style={s.list} nestedScrollEnabled role="list" aria-label={uz.ops.mods.title}>
          {mods.map((m) => { const l = modLine(m), isNew = hl.has(String(m.id)); return (
            <View key={m.id} role="listitem" style={[s.row, isNew && s.rowNew]}>
              <Text style={s.text}>{l.text}</Text><Text style={s.left}>{l.left}{isNew ? ` · ${uz.ops.mods.fresh}` : ""}</Text>
            </View>); })}
        </ScrollView>)}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginTop: space.xs, paddingTop: space.xs, borderTopWidth: 1, borderTopColor: color.line },
  head: { minHeight: MIN_TAP, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  title: { color: color.navy, fontWeight: "800", fontSize: font.md }, pills: { flexDirection: "row", gap: space.xs, alignItems: "center" },
  list: { maxHeight: 240, marginTop: space.xs }, row: { paddingVertical: space.xs, paddingHorizontal: space.xs, borderRadius: radius.sm, gap: 2 }, rowNew: { backgroundColor: "#FFF6DD" },
  text: { color: color.navy, fontSize: font.md, lineHeight: 20 }, left: { color: tone.muted, fontSize: font.xs },
  sr: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
});
