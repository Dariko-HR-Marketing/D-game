import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { coachStep, COACH_ORDER } from "../coach";
import { MODES } from "@tajriba24/rules";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, night, radius, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

/** O'quv o'yini: kerakli paytda qisqa tushuntirish (har qadam bir marta). Yopilsa qayta chiqmaydi; matn ekran o'qish dasturiga o'qiladi. */
export function TutorialCoach({ room, userId, tab }: { room: RoomView; userId: string; tab?: string }) {
  const [seen, setSeen] = useState<Set<string>>(new Set()); const step = useMemo(() => coachStep(room, userId, seen, tab), [room, userId, seen, tab]);
  useEffect(() => { setSeen(new Set()); }, [room.code]);
  if (!step) return null;
  const T = uz.coach, need = MODES.tutorial, n = COACH_ORDER.indexOf(step) + 1;
  const text = (T.steps as Record<string, string>)[step].replace("{passive}", money(need.exitPassive)).replace("{cash}", money(need.exitCash));
  const done = seen.size, total = COACH_ORDER.length;
  return (
    <View testID="coach" role="status" aria-live="polite" style={s.card}>
      <View style={s.head}><Text style={s.headL}>{T.title} · {n}/{total}</Text></View>
      <View style={s.prog} aria-hidden><View style={[s.fill, { width: `${Math.round(((done + 1) / total) * 100)}%` }]} /></View>
      <View style={s.body}>
        <Text style={s.text}>{text}</Text>
        <View style={s.foot}>
          <Button label={T.skipAll} kind="ghost" onPress={() => setSeen(new Set(COACH_ORDER))} />
          <Button label={T.ok} onPress={() => setSeen((p) => new Set([...p, step]))} />
        </View>
      </View>
    </View>);
}
const s = StyleSheet.create({
  card: { backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#DCE3E8", overflow: "hidden" },
  head: { backgroundColor: night.bg, paddingHorizontal: space.md, paddingVertical: space.sm }, headL: { color: night.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  prog: { height: 6, backgroundColor: "#E7EDF1" }, fill: { height: 6, backgroundColor: color.green },
  body: { padding: space.md, gap: space.sm }, text: { color: color.navy, fontSize: font.md, lineHeight: 22 }, foot: { flexDirection: "row", gap: space.sm, justifyContent: "flex-end", flexWrap: "wrap" },
});
