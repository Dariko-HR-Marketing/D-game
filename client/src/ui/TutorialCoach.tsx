import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Button } from "./Button";
import { Banner } from "./kit";
import { coachStep, COACH_ORDER } from "../coach";
import { MODES } from "@poyga/rules";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { space } from "../theme";
import type { RoomView } from "../net/connection";

/** O'quv o'yini: kerakli paytda qisqa tushuntirish (har qadam bir marta). Yopilsa qayta chiqmaydi; matn ekran o'qish dasturiga o'qiladi. */
export function TutorialCoach({ room, userId }: { room: RoomView; userId: string }) {
  const [seen, setSeen] = useState<Set<string>>(new Set()); const step = useMemo(() => coachStep(room, userId, seen), [room, userId, seen]);
  useEffect(() => { setSeen(new Set()); }, [room.code]);
  if (!step) return null;
  const T = uz.coach, need = MODES.tutorial, n = COACH_ORDER.indexOf(step) + 1;
  const text = (T.steps as Record<string, string>)[step].replace("{passive}", money(need.exitPassive)).replace("{cash}", money(need.exitCash));
  return (
    <View testID="coach" role="status" aria-live="polite">
      <Banner kind="info"><Text style={{ fontWeight: "800" }}>{T.title} · {n}/{COACH_ORDER.length}. </Text>{text}</Banner>
      <View style={{ marginTop: space.xs }}><Button label={T.ok} kind="ghost" onPress={() => setSeen((p) => new Set([...p, step]))} /></View>
    </View>);
}
