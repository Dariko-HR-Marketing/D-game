import React, { useState, useSyncExternalStore } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { nameOf } from "../model";
import { voiceSupported, type VoiceEngine } from "../voice/engine";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

export const useVoice = (e: VoiceEngine | undefined) => useSyncExternalStore((f) => (e ? e.subscribe(f) : () => {}), () => (e ? e.snapshot() : null), () => null);

/** Ovozli aloqa paneli (chat varag'ida): qo'shilish/chiqish, mikrofon, kim gapiryapti, qurilmalar. 16 yoshgacha yopiq (server ham rad etadi). */
export function VoicePanel({ engine, room, userId }: { engine: VoiceEngine; room: RoomView; userId: string }) {
  const v = useVoice(engine)!; const restricted = (room.chatRestricted ?? []).includes(userId); const [dev, setDev] = useState(false); const { height } = useWindowDimensions(); const short = height < 640; const [people, setPeople] = useState<boolean | null>(null); const showPeople = people ?? !short; const [more, setMore] = useState(false);
  if (restricted) return <Text style={s.note} testID="voice-restricted">{uz.voice.restricted}</Text>;
  if (!voiceSupported()) return <Text style={s.note} testID="voice-unsupported">{uz.voice.unsupported}</Text>;
  const on = v.status !== "off";
  return (
    <View style={s.box} role="group" aria-label={uz.voice.title} testID="voice">
      <View style={s.head}><Icon name={on ? "mic" : "micOff"} size={20} color={on ? color.green : tone.muted} /><Text style={s.title}>{uz.voice.title}</Text>{on && <Text style={s.count} aria-live="polite">{uz.voice.inCall.replace("{n}", String(v.peers.length + 1))}</Text>}
        {!on && <Pressable accessibilityRole="button" accessibilityLabel={uz.voice.join} onPress={() => void engine.join(true)} style={s.joinBtn} testID="voice-join"><Text style={s.joinT}>{uz.voice.join}</Text></Pressable>}
        {on && v.hasMic && <Pressable accessibilityRole="button" role="switch" aria-checked={!v.muted} aria-label={v.muted ? uz.voice.micOff : uz.voice.micOn} onPress={() => engine.setMuted(!v.muted)} style={[s.mic, v.muted && s.micOff]} testID="voice-mic"><Icon name={v.muted ? "micOff" : "mic"} size={18} color={v.muted ? color.white : color.navy} /><Text style={[s.micT, v.muted && { color: color.white }]}>{v.muted ? uz.voice.micOff : uz.voice.micOn}</Text></Pressable>}
      </View>
      {!on ? (
        <View style={s.row}>
          <Pressable accessibilityRole="button" onPress={() => void engine.join(false)} style={s.link} testID="voice-listen"><Text style={s.linkT}>{uz.voice.joinListen}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore(!more)} style={s.link}><Text style={s.linkT}>{more ? "▾" : "▸"} {uz.voice.about}</Text></Pressable>
          {more && <Text style={s.small}>{uz.voice.hint}</Text>}
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <View style={s.row}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPeople }} onPress={() => setPeople(!showPeople)} style={s.link} testID="voice-people-toggle"><Text style={s.linkT}>{showPeople ? "▾" : "▸"} {uz.voice.who}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => engine.leave()} style={s.leave} testID="voice-leave"><Text style={s.leaveT}>{uz.voice.leave}</Text></Pressable>
          </View>
          {v.error && <Text style={s.err} accessibilityRole="alert" testID="voice-error">{uz.voice.errors[v.error]}</Text>}
          {showPeople && <View style={{ gap: 4 }} role="list" aria-label={uz.voice.title} testID="voice-people">
            <View role="listitem" style={s.person}><View style={[s.dot, v.speaking && s.dotOn]} aria-hidden /><Text style={s.name}>{uz.voice.you}{v.muted && v.hasMic ? ` · ${uz.voice.muted}` : ""}{v.speaking ? ` · ${uz.voice.speaking}` : ""}</Text></View>
            {v.peers.map((p) => (
              <View key={p.id} role="listitem" style={s.person} testID={`voice-peer-${p.id}`}>
                <View style={[s.dot, p.speaking && s.dotOn, p.state === "failed" && { backgroundColor: color.red }]} aria-hidden />
                <Text style={[s.name, { flex: 1 }]}>{nameOf(room, p.id)} · {p.state === "connected" ? (p.speaking ? uz.voice.speaking : uz.voice.connected) : p.state === "failed" ? uz.voice.failed : uz.voice.connecting}{p.muted ? ` · ${uz.voice.muted}` : ""}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${nameOf(room, p.id)}: ${p.muted ? uz.voice.peerUnmute : uz.voice.peerMute}`} onPress={() => engine.setPeerMuted(p.id, !p.muted)} style={s.small2} testID={`voice-peer-mute-${p.id}`}><Text style={s.linkT}>{p.muted ? uz.voice.peerUnmute : uz.voice.peerMute}</Text></Pressable>
              </View>))}
            {v.peers.length === 0 && <Text style={s.small}>{uz.voice.only}</Text>}
          </View>}
          {(v.inputs.length > 1 || v.outputs.length > 1) && (<>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: dev }} onPress={() => setDev(!dev)} style={s.link}><Text style={s.linkT}>{dev ? "▾" : "▸"} {uz.voice.settings}</Text></Pressable>
            {dev && (
              <View style={{ gap: space.xs }}>
                {v.inputs.length > 1 && v.hasMic && <Picker label={uz.voice.input} value={v.inputId} items={v.inputs} onChange={(id) => void engine.setInput(id)} />}
                {v.canPickOutput && v.outputs.length > 1 && <Picker label={uz.voice.output} value={v.outputId} items={v.outputs} onChange={(id) => void engine.setOutput(id)} />}
              </View>)}
          </>)}
        </View>)}
    </View>
  );
}
function Picker({ label, value, items, onChange }: { label: string; value: string; items: { id: string; label: string }[]; onChange: (id: string) => void }) {
  // Oddiy <select> (veb): ekran o'qigich va klaviatura uchun eng ishonchlisi
  const el: any = "select";
  return (<View><Text style={s.small}>{label}</Text>{React.createElement(el, { value, "aria-label": label, onChange: (e: any) => onChange(e.target.value), style: { minHeight: MIN_TAP, borderRadius: 12, border: `1px solid ${color.line}`, padding: "0 10px", fontSize: 15, color: color.navy, background: "#fff", width: "100%" } }, items.map((i) => React.createElement("option", { key: i.id, value: i.id }, i.label)))}</View>);
}
const s = StyleSheet.create({
  box: { borderWidth: 1, borderColor: color.line, borderRadius: radius.lg, padding: space.sm, paddingHorizontal: space.md, gap: space.xs, backgroundColor: "#F8FBFD" },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm }, title: { color: color.navy, fontWeight: "800", fontSize: font.md, flex: 1 }, count: { color: tone.good, fontWeight: "800", fontSize: font.sm },
  row: { flexDirection: "row", gap: space.sm, flexWrap: "wrap", alignItems: "center" }, joinBtn: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: color.green, justifyContent: "center" }, joinT: { color: color.white, fontWeight: "800", fontSize: font.sm }, mic: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: space.xs, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, backgroundColor: color.white }, micOff: { backgroundColor: color.red, borderColor: color.red },
  micT: { color: color.navy, fontWeight: "700", fontSize: font.sm }, leave: { minHeight: MIN_TAP, justifyContent: "center", paddingHorizontal: space.md }, leaveT: { color: tone.muted, fontWeight: "700", fontSize: font.sm, textDecorationLine: "underline" },
  person: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 32 }, dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#C9D3DA" }, dotOn: { backgroundColor: color.green, shadowColor: color.green, shadowOpacity: 0.7, shadowRadius: 6 }, name: { color: color.navy, fontSize: font.sm },
  small: { color: tone.muted, fontSize: font.xs, lineHeight: 16 }, small2: { minHeight: 36, justifyContent: "center", paddingHorizontal: space.xs }, link: { minHeight: 40, justifyContent: "center" }, linkT: { color: color.navy, fontSize: font.sm, fontWeight: "700", textDecorationLine: "underline" },
  err: { color: color.red, fontSize: font.sm, lineHeight: 18 }, note: { color: tone.muted, fontSize: font.sm, lineHeight: 18, paddingVertical: space.xs },
});
