import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Icon } from "./Icon";
import { Pill } from "./kit";
import { nameOf } from "../model";
import { getMuted, setMuted } from "../chatMute";
import { color, font, MIN_TAP, PLAYER_COLORS, radius, shadow, space, tone } from "../theme";
import { uz, errText } from "../i18n/uz";
import type { ChatMsg, RoomView } from "../net/connection";

export const CHAT_MAX = 200; // server bilan bir xil (server/src/chat.ts)
const hhmm = (at: number) => { const d = new Date(at); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

/** Matn: yuboruvchi, vaqt, matn yoki tayyor ibora. */
export const chatText = (m: ChatMsg) => (m.text ?? (m.phrase !== undefined ? uz.chat.phrases[m.phrase] ?? "" : ""));

/**
 * O'yin chati: yon panel (kompyuter) yoki pastki varaq (telefon). Erkin yozish 16 yoshgacha va ota-ona o'chirgan bolalar uchun yopiq (faqat tayyor iboralar).
 * Har bir yuboruvchini shu qurilmada jim qilish mumkin; haqoratli xabarga shikoyat yuboriladi (admin ko'radi).
 */
export function ChatSheet({ room, userId, chat, error, onSend, onClose, onReport, voice }: { room: RoomView; userId: string; chat: ChatMsg[]; error?: string | null; onSend: (m: { text: string } | { phrase: number }) => void; onClose: () => void; onReport?: (msg: ChatMsg) => Promise<boolean>; voice?: React.ReactNode }) {
  const { width, height } = useWindowDimensions(); const side = width >= 900 || (width > height && width >= 640), free = !(room.chatRestricted ?? []).includes(userId);
  const [text, setText] = useState(""); const [muted, setMutedState] = useState<Set<string>>(getMuted); const [open, setOpen] = useState<number | null>(null); const [sent, setSent] = useState<Set<number>>(new Set());
  const scroller = useRef<ScrollView>(null); const input = useRef<TextInput>(null);
  useEffect(() => { const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: false }), 30); return () => clearTimeout(t); }, [chat.length]);
  useEffect(() => { const d = (globalThis as any).document; if (!d?.addEventListener) return; const h = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", h); return () => d.removeEventListener("keydown", h); }, [onClose]);
  useEffect(() => { if (free) { const t = setTimeout(() => (input.current as any)?.focus?.(), 60); return () => clearTimeout(t); } }, [free]);
  const post = () => { const t = text.replace(/\s+/g, " ").trim(); if (!t) return; onSend({ text: t.slice(0, CHAT_MAX) }); setText(""); };
  const toggleMute = (id: string) => setMutedState(new Set(setMuted(id, !muted.has(id))));
  const report = async (m: ChatMsg) => { if (!onReport) return; if (await onReport(m)) setSent(new Set([...sent, m.id])); };
  const colorOf = (id: string) => { const k = room.state?.players?.findIndex((p: any) => p.id === id) ?? -1; return PLAYER_COLORS[(room.names?.[id]?.color ?? Math.max(0, k)) % PLAYER_COLORS.length]; };
  return (
    <View style={s.layer} role="dialog" aria-modal={true} aria-label={uz.chat.title} testID="chat">
      <Pressable accessibilityRole="button" accessibilityLabel={uz.chat.close} onPress={onClose} style={s.backdrop} testID="chat-backdrop" />
      <View style={[s.panel, side ? s.side : [s.sheet, { maxHeight: Math.min(height - 12, 640), height: Math.min(height - 12, 640) }]]}>
        <View style={s.head}><Text style={s.title} aria-level={2} accessibilityRole="header">{uz.chat.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={uz.chat.close} onPress={onClose} style={s.x} testID="chat-close"><Icon name="close" size={20} color={color.navy} /></Pressable></View>
        {voice}
        <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }} role="log" aria-live="polite" aria-label={uz.chat.title} testID="chat-log" {...({ tabIndex: 0 } as any)}>
          {chat.length === 0 && <Text style={s.empty}>{uz.chat.empty}</Text>}
          {chat.map((m) => {
            const mine = m.from === userId, mu = muted.has(m.from) && !mine, who = mine ? uz.chat.you : nameOf(room, m.from);
            return (
              <View key={m.id} style={[s.msgWrap, mine && { alignItems: "flex-end" }]}>
                <Pressable accessibilityRole={mine ? undefined : "button"} accessibilityLabel={mine ? undefined : `${who}: ${mu ? uz.chat.muted : chatText(m)}`} disabled={mine} onPress={() => setOpen(open === m.id ? null : m.id)} style={[s.msg, mine ? s.mine : s.theirs, mu && { opacity: 0.55 }]}>
                  <View style={s.meta}><View style={[s.dot, { backgroundColor: colorOf(m.from) }]} aria-hidden /><Text style={s.who} aria-hidden>{who}</Text><Text style={s.time} aria-hidden>{hhmm(m.at)}</Text></View>
                  <Text style={[s.txt, m.phrase !== undefined && { fontStyle: "italic" }]} aria-hidden={!mine}>{mu ? uz.chat.mutedNote : chatText(m)}</Text>
                </Pressable>
                {!mine && open === m.id && (
                  <View style={s.acts}>
                    <Pressable accessibilityRole="button" onPress={() => toggleMute(m.from)} style={s.act} testID="chat-mute"><Text style={s.actT}>{muted.has(m.from) ? uz.chat.unmute : uz.chat.mute}</Text></Pressable>
                    {onReport && !mu && (sent.has(m.id) ? <Pill label={uz.chat.reported} kind="good" /> : <Pressable accessibilityRole="button" onPress={() => report(m)} style={s.act} testID="chat-report"><Text style={[s.actT, { color: color.red }]}>{uz.chat.report}</Text></Pressable>)}
                  </View>)}
              </View>);
          })}
        </ScrollView>
        {error ? <Text style={s.err} accessibilityRole="alert">{errText(error)}</Text> : null}
        <View style={s.foot}>
          <Text style={s.small}>{uz.chat.phrasesTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, paddingVertical: 2 }} role="group" aria-label={uz.chat.phrasesTitle}>
            {uz.chat.phrases.map((p, i) => <Pressable key={i} accessibilityRole="button" onPress={() => onSend({ phrase: i })} style={s.chip} testID={`chat-phrase-${i}`}><Text style={s.chipT}>{p}</Text></Pressable>)}
          </ScrollView>
          {free ? (
            <View style={s.row}>
              <TextInput ref={input} value={text} onChangeText={setText} onSubmitEditing={post} placeholder={uz.chat.input} placeholderTextColor={tone.muted} maxLength={CHAT_MAX} returnKeyType="send" accessibilityLabel={uz.chat.input} style={s.field} testID="chat-input" />
              <Pressable accessibilityRole="button" accessibilityLabel={uz.chat.send} disabled={!text.trim()} onPress={post} style={[s.send, !text.trim() && { opacity: 0.5 }]} testID="chat-send"><Text style={s.sendT}>{uz.chat.send}</Text></Pressable>
            </View>) : <Text style={s.small} testID="chat-restricted">{uz.chat.restricted}</Text>}
          <Text style={s.small}>{uz.chat.hint}</Text>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }, backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,34,56,0.35)" },
  panel: { position: "absolute", backgroundColor: color.white, ...shadow, shadowOpacity: 0.25, shadowRadius: 24, padding: space.md, gap: space.sm },
  side: { top: 0, right: 0, bottom: 0, width: 380, borderLeftWidth: 1, borderLeftColor: color.line }, sheet: { left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: color.navy, fontSize: font.xl, fontWeight: "800" }, x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center" },
  empty: { color: tone.muted, fontSize: font.md, textAlign: "center", paddingVertical: space.xl },
  msgWrap: { gap: 4 }, msg: { maxWidth: "88%", borderRadius: radius.lg, paddingVertical: space.sm, paddingHorizontal: space.md, gap: 2 }, theirs: { backgroundColor: "#F1F5F8", alignSelf: "flex-start" }, mine: { backgroundColor: "#DDF1E6" },
  meta: { flexDirection: "row", alignItems: "center", gap: space.xs }, dot: { width: 10, height: 10, borderRadius: 5 }, who: { color: color.navy, fontSize: font.xs, fontWeight: "800" }, time: { color: tone.muted, fontSize: font.xs },
  txt: { color: color.navy, fontSize: font.md, lineHeight: 21 }, acts: { flexDirection: "row", gap: space.sm, alignItems: "center", paddingLeft: space.sm }, act: { minHeight: 36, paddingHorizontal: space.sm, justifyContent: "center" }, actT: { color: color.navy, fontSize: font.sm, fontWeight: "700", textDecorationLine: "underline" },
  err: { color: color.red, fontSize: font.sm },
  foot: { gap: space.xs, borderTopWidth: 1, borderTopColor: color.line, paddingTop: space.sm }, small: { color: tone.muted, fontSize: font.xs, lineHeight: 16 },
  chip: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, backgroundColor: "#F7FAFC", justifyContent: "center" }, chipT: { color: color.navy, fontSize: font.sm, fontWeight: "700" },
  row: { flexDirection: "row", gap: space.sm, alignItems: "center" }, field: { flex: 1, minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, color: color.navy, fontSize: font.md, backgroundColor: color.white },
  send: { minHeight: MIN_TAP, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: color.green, alignItems: "center", justifyContent: "center" }, sendT: { color: color.white, fontWeight: "800", fontSize: font.md },
});
