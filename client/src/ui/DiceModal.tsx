import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Dice } from "./Dice";
import { diceBusyFlag } from "./tourStore";
import { Button } from "./Button";
import { TimerRing } from "./TimerRing";
import { useReducedMotion } from "../motion";
import { DICE_MS } from "../motionConfig";
import { diceOf } from "../dice";
import { nameOf } from "../model";
import { uz } from "../i18n/uz";
import { color, radius, shadow, space, tone } from "../theme";
import type { RoomView } from "../net/connection";

/** Kubik tashlandi: kubik(lar) oynaning ENG OLDIDA, markazda — 3D aylanib to'xtaydi, so'ng yig'indi (ikki kubik bo'lsa «4 + 5 = 9»).
 *  Tashlagan o'yinchida modal (orqa fon xiralashadi, bosilsa yoki Esc bilan yopiladi); boshqalarda — to'sib qo'ymaydigan ko'rsatma. Sahifa ochilganda eski tashlash ko'rsatilmaydi. */
export interface RollPrompt { circle: string; twoDice?: number; left: number; total: number; waiting: boolean; onRoll: () => void; onLater: () => void; onDisable: () => void }

export function DiceModal({ room, userId, prompt }: { room: RoomView; userId: string; prompt?: RollPrompt | null }) {
  const reduced = useReducedMotion(); const { width, height } = useWindowDimensions();
  const lr = (room.state as any)?.lastRoll as { playerId: string; die: number; dice?: number[]; n: number } | null | undefined;
  const seen = useRef<number | undefined>(undefined);
  const [show, setShow] = useState<{ n: number; playerId: string; dice: number[]; die: number } | null>(null); const [done, setDone] = useState(false);
  useLayoutEffect(() => { // chizishdan oldin: yo'riqnoma shu paytda ochilib qolmasin (bayroq darrov ko'tariladi)
    if (seen.current === undefined) { seen.current = lr?.n ?? 0; return; }
    if (!lr || lr.n === seen.current) return; seen.current = lr.n;
    diceBusyFlag.set(true); const dice = diceOf(lr, false) ?? [lr.die]; setShow({ n: lr.n, playerId: lr.playerId, dice, die: lr.die }); setDone(false);
    const t1 = setTimeout(() => setDone(true), reduced ? 150 : DICE_MS + 80), t2 = setTimeout(() => setShow(null), reduced ? 1300 : DICE_MS + 1250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lr?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => setShow(null);
  useEffect(() => { if (!show) diceBusyFlag.set(false); }, [!!show]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => diceBusyFlag.set(false), []);
  useEffect(() => {
    const d = (globalThis as any).document; if (!show || !d?.addEventListener) return;
    const h = (e: any) => { if (e.key === "Escape") close(); }; d.addEventListener("keydown", h); return () => d.removeEventListener("keydown", h);
  }, [show]);
  useEffect(() => { // tugma darrov fokusda: probel/Enter bilan tashlanadi
    if (!prompt || show) return; const d = (globalThis as any).document; const f = () => d?.querySelector?.('[data-testid="dice-roll"] [role="button"]')?.focus?.(); f(); const t = setTimeout(f, 80); return () => clearTimeout(t); // darrov va yana bir marta (chizish tugagach)
  }, [!!prompt, !!show]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const d = (globalThis as any).document; if (!prompt || show || !d?.addEventListener) return;
    const h = (e: any) => { if (e.key === "Escape") prompt.onLater(); }; d.addEventListener("keydown", h); return () => d.removeEventListener("keydown", h);
  }, [prompt, show]);
  if (!show && prompt) return <RollPromptView prompt={prompt} width={width} height={height} />;
  if (!show) return null;
  const mine = show.playerId === userId, size = Math.round(Math.max(56, Math.min(110, width * 0.22, height * 0.26))); // past (yotiq) ekranda kubik kichrayadi
  const who = mine ? uz.dice.you : uz.dice.by.replace("{name}", nameOf(room, show.playerId));
  const sum = show.dice.length > 1 ? `${show.dice.join(" + ")} = ${show.die}` : String(show.die);
  const card = (
    <View style={[s.card, !mine && s.cardSoft]} testID="dice-card">
      <Text style={s.who}>{who}</Text>
      <View style={s.row} testID="dice-row">
        {show.dice.map((v, i) => <RollingDie key={`${show.n}-${i}`} value={v} n={show.n * 2 + i} size={size} />)}
      </View>
      <Text style={[s.sum, !done && { opacity: 0.35 }]} accessibilityLiveRegion="polite" testID="dice-sum">{done ? `${uz.dice.sum}: ${sum}` : uz.dice.rolling}</Text>
      {mine && <Text style={s.hint}>{uz.dice.hint}</Text>}
    </View>);
  return mine
    ? (<View style={s.layer} role="dialog" aria-modal={true} aria-label={uz.dice.title} testID="dice-modal">
        <Pressable accessibilityRole="button" accessibilityLabel={uz.dice.close} onPress={close} style={s.backdrop} testID="dice-backdrop" />
        <View pointerEvents="box-none" style={s.center}><Pressable accessibilityRole="button" accessibilityLabel={uz.dice.close} onPress={close} testID="dice-press">{card}</Pressable></View>
      </View>)
    : (<View style={s.layer} pointerEvents="none" role="status" aria-label={uz.dice.title} testID="dice-observer"><View pointerEvents="none" style={s.center}>{card}</View></View>);
}

/** Navbatingiz: kubik(lar) va «Kubikni tashlash» tugmasi oynaning eng oldida (modal). Fon/Esc — «keyinroq» (oddiy tugma sahifada qoladi). */
function RollPromptView({ prompt, width, height }: { prompt: RollPrompt; width: number; height: number }) {
  const two = prompt.circle === "big" || (prompt.twoDice ?? 0) > 0, compact = height < 520 && width > height, size = Math.round(Math.max(56, Math.min(120, width * 0.24, compact ? height * 0.21 : 999)));
  const label = prompt.waiting ? uz.dice.sending : two ? uz.hud.rollBig : uz.hud.rollSmall;
  const head = (<View style={s.promptHead}><Text style={s.title}>{uz.dice.yourTurn}</Text>{prompt.left > 0 && <TimerRing left={prompt.left} total={prompt.total} size={compact ? 38 : 44} label={`${prompt.left} ${uz.game.seconds}`} />}</View>);
  const dice = (<><View style={s.row} testID="roll-dice">{Array.from({ length: two ? 2 : 1 }, (_, i) => <Dice key={i} value={null} size={size} />)}</View>{!compact && <Text style={s.hint}>{two ? uz.dice.twoDice : uz.dice.oneDie}</Text>}</>);
  const actions = (<>
    <View style={{ alignSelf: "stretch" }} testID="dice-roll"><Button label={label} disabled={prompt.waiting} onPress={prompt.onRoll} /></View>
    <View style={{ alignSelf: "stretch" }}><Button label={uz.dice.later} kind="ghost" onPress={prompt.onLater} /></View>
    <Pressable accessibilityRole="button" onPress={prompt.onDisable} style={s.link}><Text style={s.linkT}>{uz.dice.disable}</Text></Pressable>
  </>);
  return (
    <View style={s.layer} role="dialog" aria-modal={true} aria-label={uz.dice.yourTurn} testID="roll-modal">
      <Pressable accessibilityRole="button" accessibilityLabel={uz.dice.close} onPress={prompt.onLater} style={s.backdrop} testID="roll-backdrop" />
      <View pointerEvents="box-none" style={s.center}>
        {compact ? (
          <View style={[s.card, { flexDirection: "row", alignItems: "center", maxWidth: Math.min(width - 24, 640), gap: space.lg, paddingVertical: space.md }]} testID="roll-card">
            <View style={{ alignItems: "center", gap: 4 }}>{head}{dice}</View>
            <View style={{ flex: 1, minWidth: 190, gap: space.xs }}>{actions}</View>
          </View>
        ) : (
          <View style={s.card} testID="roll-card">{head}{dice}{actions}</View>
        )}
      </View>
    </View>);
}

/** Kubik oldin dam olish yuzida paydo bo'lib, so'ng aylanadi (Dice3D faqat `n` o'zgarganda aylanadi): birinchi chizishda eski `n`, keyin yangisi. */
function RollingDie({ value, n, size }: { value: number; n: number; size: number }) {
  const [cur, setCur] = useState(n - 1000);
  useEffect(() => { setCur(n); }, [n]);
  return <Dice value={value} n={cur} size={size} />;
}

const s = StyleSheet.create({
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8,34,56,0.45)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  card: { backgroundColor: color.white, borderRadius: radius.lg + 4, paddingVertical: space.lg, paddingHorizontal: space.xl, alignItems: "center", gap: space.sm, minWidth: 240, maxWidth: 420, ...shadow, shadowOpacity: 0.3, shadowRadius: 28, borderWidth: 2, borderColor: color.navy },
  cardSoft: { borderWidth: 1, borderColor: "#D5DEE4", opacity: 0.96 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.md, paddingVertical: space.sm },
  who: { color: tone.muted, fontSize: 14, fontWeight: "700" },
  sum: { color: color.navy, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  hint: { color: tone.muted, fontSize: 12 }, title: { color: color.navy, fontSize: 20, fontWeight: "800" }, promptHead: { flexDirection: "row", alignItems: "center", gap: space.md },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.sm }, linkT: { color: tone.muted, fontSize: 13, textDecorationLine: "underline" },
});
