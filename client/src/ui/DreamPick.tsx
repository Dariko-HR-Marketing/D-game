import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Button } from "./Button";
import { uz, errText } from "../i18n/uz";
import { color, GREEN_TEXT } from "../theme";
import type { RoomView } from "../net/connection";

const money = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** §6.4 / N09: o'yin boshlanishidan oldin har bir o'yinchi orzusini tanlaydi (takrorlanmaydi). */
export function DreamPick({ room, userId, error, onPick }: { room: RoomView; userId: string; error?: string | null; onPick: (idx: number) => void }) {
  const players: any[] = room.state?.players ?? [];
  const mine = players.find((p) => p.id === userId)?.dreamIdx ?? null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);
  const left = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : null;
  const takenBy = (i: number) => players.find((p) => p.dreamIdx === i)?.id as string | undefined;
  return (
    <View style={s.wrap}>
      <Text style={s.h} aria-level={1} accessibilityRole="header">{uz.dreams.title}</Text>
      <Text style={s.note}>{uz.dreams.hint}</Text>
      {left !== null && <Text style={s.note}>{uz.dreams.timeLeft}: {left} s</Text>}
      {mine !== null && <Text style={s.ok}>{uz.dreams.waiting}</Text>}
      {error && <Text style={s.err} accessibilityRole="alert">{errText(error)}</Text>}
      <ScrollView contentContainerStyle={{ gap: 10 }}>
        {(room.dreams ?? []).map((d, i) => {
          const by = takenBy(i); const isMine = by === userId;
          return (
            <View key={i} style={[s.card, isMine && s.mine]}>
              <Text style={s.name}>{d.name}</Text>
              <Text style={s.price}>{uz.dreams.price}: {money(d.price)} sh.b.</Text>
              {by ? <Text style={s.taken}>{isMine ? uz.dreams.yours : `${uz.dreams.taken} · ${room.names?.[by]?.name ?? by}`}</Text>
                : <Button label={uz.dreams.pick} onPress={() => onPick(i)} />}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, gap: 10, padding: 20, maxWidth: 560, width: "100%", alignSelf: "center" },
  h: { fontSize: 24, fontWeight: "800", color: color.navy }, note: { color: color.text2 }, ok: { color: GREEN_TEXT, fontWeight: "700" },
  card: { backgroundColor: color.white, borderRadius: 12, borderWidth: 1, borderColor: color.line, padding: 14, gap: 6 },
  mine: { borderColor: color.green, borderWidth: 2 }, name: { color: color.navy, fontSize: 16, fontWeight: "700" }, price: { color: color.text2 }, taken: { color: color.text2 }, err: { color: color.red },
});
