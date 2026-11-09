import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from "react-native";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { color, font, radius, shadow, space, tone } from "../theme";
import { uz } from "../i18n/uz";
import type { CellInfoData } from "../cellInfo";

/** Katak tushuntirishi: tur, nom, narx/daromad, qoida va egasi. Telefonda pastdan, kompyuterda markazda; fon, «Yopish» yoki Esc bilan yopiladi. */
export function CellSheet({ info, names, onClose }: { info: CellInfoData; names: (id: string) => string; onClose: () => void }) {
  useEffect(() => { const d = (globalThis as any).document; if (!d?.addEventListener) return; const k = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", k); return () => d.removeEventListener("keydown", k); }, [onClose]);
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>{/* butun ekran ustida (taxta ichida emas): xabarlar va boshqa qatlamlar to'smasin */}
    <View style={s.layer} testID="cell-sheet">
      <Pressable style={s.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={uz.cell.close} />
      <View style={s.card} role="dialog" aria-modal={true} aria-label={`${info.kind}: ${info.title}`}>
        <View style={s.head}><View style={{ flex: 1 }}><Text style={s.kind}>{info.kind}</Text><Text style={s.title} aria-level={2} accessibilityRole="header">{info.title}</Text></View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={uz.cell.close} style={s.x} testID="cell-close"><Icon name="close" size={20} color={color.navy} /></Pressable></View>
        <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: space.sm }} {...({ tabIndex: 0 } as any)} aria-label={info.title}>
          {info.text.map((t, i) => <Text key={i} style={s.text}>{t}</Text>)}
          {info.lines.length > 0 && <View style={s.lines}>{info.lines.map((l, i) => <View key={i} style={s.line}><Text style={s.lk}>{l.k}</Text><Text style={s.lv}>{l.v}</Text></View>)}</View>}
          {info.owners.length > 0 && <View style={s.lines}><Text style={s.lk}>{uz.cell.owners}</Text>{info.owners.map((o, i) => <View key={i} style={s.line}><Text style={s.lv}>{o.n}. {names(o.id)}</Text><Text style={s.lk}>{o.what}</Text></View>)}</View>}
        </ScrollView>
        <Button label={uz.cell.close} kind="ghost" onPress={onClose} />
      </View>
    </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,34,56,0.45)" },
  card: { width: "100%", maxWidth: 460, backgroundColor: color.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, gap: space.md, ...shadow, margin: 0 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm }, kind: { color: tone.muted, fontSize: font.sm, fontWeight: "800" }, title: { color: color.navy, fontSize: font.lg, fontWeight: "800", lineHeight: 24 },
  x: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, text: { color: color.navy, fontSize: font.md, lineHeight: 22 },
  lines: { backgroundColor: "#F3F7FA", borderRadius: radius.md, padding: space.md, gap: 6 }, line: { flexDirection: "row", justifyContent: "space-between", gap: space.md }, lk: { color: tone.muted, fontSize: font.sm, fontWeight: "700", flexShrink: 1 }, lv: { color: color.navy, fontSize: font.md, fontWeight: "800", fontVariant: ["tabular-nums"], textAlign: "right", flexShrink: 1 },
});
