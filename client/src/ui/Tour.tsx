import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { TOUR_META } from "./tourData";
import { tourKV, onReplay } from "./tourStore";
import { uz } from "../i18n/uz";
import { useReducedMotion } from "../motion";
import { shouldShowTour, markTourSeen, type TourId } from "../tours";
import { placeCard, visibleRect, type Rect } from "../tourLayout";
import { ESTIMATE, MONTHS_PER_LAP, roundYears } from "../estimates";
import { color, font, radius, space, tone } from "../theme";

const fill = (t: string) => t.replace("{smallYears}", String(roundYears(ESTIMATE.smallExitMonths))).replace("{smallMonths}", String(ESTIMATE.smallExitMonths)).replace("{smallLaps}", String(Math.round(ESTIMATE.smallExitMonths / MONTHS_PER_LAP)))
  .replace("{bigYears}", String(roundYears(ESTIMATE.bigWinMonths))).replace("{bigMonths}", String(ESTIMATE.bigWinMonths));
const measure = (testID?: string): Rect | null => {
  const d = (globalThis as any).document; if (!testID || !d?.querySelector) return null;
  const el = d.querySelector(`[data-testid="${testID}"]`) as HTMLElement | null; if (!el) return null;
  const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/**
 * Sahifa yo'riqnomasi (onboarding): har bir sahifa uchun alohida, birinchi kirishda BIR MARTA. Veb'da kerakli element yoritiladi (spotlight),
 * karta shu element yonida chiqadi; element ko'rinmasa (masalan, telefonda boshqa bo'limda) — markazda. Esc/«O'tkazib yuborish» yopadi.
 */
export function Tour({ id, onRules, defer }: { id: TourId | null; onRules: () => void; defer?: boolean }) {
  const [open, setOpen] = useState(false); const [i, setI] = useState(0); const [rect, setRect] = useState<Rect | null>(null); const [box, setBox] = useState({ w: 400, h: 280, ready: false });
  const { width: vw, height: vh } = useWindowDimensions(); const reduced = useReducedMotion(); const card = useRef<any>(null);
  const steps = id ? uz.tour[id] ?? [] : []; const meta = id ? TOUR_META[id] : []; const last = i >= steps.length - 1;
  const prevId = useRef<TourId | null>(null);
  // `defer`: o'yinda o'z navbatingiz davomida yo'riqnoma ochilmaydi (server taymeri to'xtamaydi); navbat o'tgach ochiladi. Ochiq yo'riqnoma yopilmaydi.
  useEffect(() => {
    const changed = prevId.current !== id; prevId.current = id; const want = !!id && steps.length > 0 && !defer && shouldShowTour(tourKV, id);
    if (changed) { setI(0); setBox((b) => ({ ...b, ready: false })); setOpen(want); } else if (want) setOpen(true);
  }, [id, defer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onReplay(() => { if (id && steps.length) { setI(0); setBox((b) => ({ ...b, ready: false })); setOpen(true); } }), [id, steps.length]);
  const close = () => { if (id) markTourSeen(tourKV, id); setOpen(false); };
  // Maqsadni o'lchash: qadam o'zgarganda, oyna o'zgarganda va joylashuv tinchigach
  useEffect(() => {
    if (!open) return; const target = meta[i]?.target; const run = () => setRect(visibleRect(measure(target), vw, vh)); run();
    const t1 = setTimeout(run, 120), t2 = setTimeout(run, 500); return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open, i, vw, vh]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { const el: HTMLElement | null = card.current; if (!open || !el?.getBoundingClientRect) return; const r = el.getBoundingClientRect(); if (r.height && (Math.abs(r.height - box.h) > 1 || Math.abs(r.width - box.w) > 1 || !box.ready)) setBox({ w: r.width, h: r.height, ready: true }); });
  // Klaviatura: fokus oyna ichida qamaladi, Esc yopadi
  useEffect(() => {
    const doc = (globalThis as any).document; const root: HTMLElement | null = card.current; if (!open || !doc?.addEventListener || !root?.querySelectorAll) return;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>('[role="button"],button,a[href],[tabindex="0"]')).filter((e) => !(e as any).disabled);
    const prev = doc.activeElement as HTMLElement | null; items()[0]?.focus?.();
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return; const l = items(); if (!l.length) return; const f = l[0], z = l[l.length - 1];
      if (e.shiftKey && doc.activeElement === f) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); f.focus(); }
    };
    doc.addEventListener("keydown", h); return () => { doc.removeEventListener("keydown", h); prev?.focus?.(); };
  }, [open, i]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || !id || !steps[i]) return null;
  const cw = Math.min(440, vw - 24), pos = placeCard(rect, { w: cw, h: box.h }, vw, vh), st = steps[i], ic = meta[i]?.icon ?? "star";
  const P = 8; // yoritilgan joy atrofidagi bo'shliq
  return (
    <View style={s.back} pointerEvents="auto">
      <View style={s.dim} />{/* sahifani bosishdan to'sadi */}
      {rect && <View aria-hidden pointerEvents="none" style={[s.ring, { left: rect.left - P, top: rect.top - P, width: rect.width + 2 * P, height: rect.height + 2 * P }, ({ boxShadow: "0 0 0 9999px rgba(8,34,56,0.66)" } as any)]} />}
      {!rect && <View aria-hidden pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,34,56,0.66)" }]} />}
      <View ref={card} style={[s.card, { width: cw, left: pos.left, top: pos.top, opacity: box.ready ? 1 : 0 }, reduced ? null : ({ transition: "top .25s ease, left .25s ease, opacity .2s ease" } as any)]} role="dialog" aria-modal aria-label={st.title}>
        <View style={s.head}>
          <View style={s.badge} aria-hidden><Icon name={ic} size={22} color={color.white} /></View>
          <View style={{ flex: 1 }}><Text style={s.count}>{i + 1} / {steps.length}</Text><Text style={s.title} aria-level={2} accessibilityRole="header">{st.title}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={uz.onboarding.skip} onPress={close} style={s.x}><Icon name="close" size={20} color={tone.muted} /></Pressable>
        </View>
        <Text style={s.body}>{fill(st.text)}</Text>
        <View style={s.dots} aria-hidden>{steps.map((_, k) => <View key={k} style={[s.dot, k === i && s.dotOn, k < i && s.dotDone]} />)}</View>
        <View style={s.row}>
          {i > 0 && <View style={{ flex: 1 }}><Button label={uz.onboarding.back} kind="ghost" onPress={() => setI(i - 1)} /></View>}
          <View style={{ flex: 2 }}><Button label={last ? uz.onboarding.done : uz.onboarding.next} onPress={() => (last ? close() : setI(i + 1))} /></View>
        </View>
        <View style={s.foot}>
          {!last && <Text style={s.link} accessibilityRole="button" onPress={close}>{uz.onboarding.skip}</Text>}
          <Text style={s.link} accessibilityRole="link" onPress={() => { close(); onRules(); }}>{uz.onboarding.rules}</Text>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  back: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 200 }, dim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  ring: { position: "absolute", borderRadius: radius.lg, borderWidth: 2, borderColor: color.gold },
  card: { position: "absolute", backgroundColor: color.white, borderRadius: radius.lg + 4, padding: space.lg, gap: space.md, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: space.md }, badge: { width: 44, height: 44, borderRadius: 14, backgroundColor: color.green, alignItems: "center", justifyContent: "center" },
  count: { color: tone.muted, fontWeight: "800", fontSize: 12, letterSpacing: 0.6 }, title: { color: color.navy, fontWeight: "800", fontSize: font.xl, lineHeight: 26 },
  x: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -space.sm, marginTop: -space.sm }, body: { color: color.navy, fontSize: font.md, lineHeight: 23 },
  dots: { flexDirection: "row", gap: 4 }, dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.line, maxWidth: 40 }, dotOn: { backgroundColor: color.navy }, dotDone: { backgroundColor: color.green },
  row: { flexDirection: "row", gap: space.sm }, foot: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: space.sm },
  link: { color: tone.muted, textDecorationLine: "underline", fontWeight: "700", fontSize: font.sm, minHeight: 32, paddingVertical: 6 },
});
