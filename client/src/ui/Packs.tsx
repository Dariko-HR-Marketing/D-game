import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from "react-native";
import { PLANS, LIMITS, PRICES, purchasable, type PlanInfo, type PlanId } from "../billing/catalog";
import { money } from "../format";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { color, font, radius, space } from "../theme";

const K = uz.packs;
const desc = (id: PlanId) => (K.plans[id]?.d ?? "").replace("{rooms}", String(LIMITS.free.roomsPerDay)).replace("{games}", String(LIMITS.free.historyGames)).replace("{hours}", String(LIMITS.hostDay.hours)).replace("{tables}", String(id === "hostEvent" ? LIMITS.hostEvent.tables : LIMITS.hostDay.tables)).replace("{guests}", String(id === "hostEvent" ? LIMITS.hostEvent.guests : LIMITS.hostDay.guests)).replace("{days}", String(LIMITS.hostEvent.days)).replace("{students}", String(LIMITS.eduClass.students)).replace("{tiers}", LIMITS.corpTeamTiers.join(", "));

/** Paketlar sahifasi (kompyuter birinchi). Narxlar katalogda bo'sh bo'lsa «Narx aniqlanadi» va «Sotib olish» ko'rinmaydi. */
export function Packs({ onBack, current = "free", onBuy }: { onBack: () => void; current?: PlanId; onBuy?: (p: PlanInfo) => void }) {
  const [buying, setBuying] = useState<PlanInfo | null>(null);
  return (
    <View style={s.root} testID="packs">
      <View style={s.bar}><Pressable accessibilityRole="button" accessibilityLabel={K.back} onPress={onBack} style={s.back}><Text style={s.backT}>← {K.back}</Text></Pressable><Text style={s.title} aria-level={1} accessibilityRole="header">{K.title}</Text></View>
      <ScrollView contentContainerStyle={s.scroll} {...({ tabIndex: 0 } as any)} aria-label={K.title}>
        <View style={s.wrap}>
          <Text style={s.lead}>{K.lead}</Text>
          {(["personal", "group", "edu", "corp"] as const).map((g) => (
            <View key={g} style={{ gap: space.sm }}>
              <Text style={s.group} aria-level={2} accessibilityRole="header">{K.groups[g]}</Text>
              <View style={s.grid}>
                {PLANS.filter((p) => p.group === g).map((p) => { const can = purchasable(p); return (
                  <View key={p.id} style={[s.card, p.id === current && s.cardOn]} testID={`pack-${p.id}`}>
                    <Text style={s.cardT} aria-level={3} accessibilityRole="header">{K.plans[p.id].t}</Text>
                    <Text style={s.cardD}>{desc(p.id)}</Text>
                    <View style={{ flex: 1 }} />
                    {p.id === current ? <Text style={s.cur}>{K.current}</Text>
                      : p.priceKeys.length === 0 ? null
                      : can ? <Button label={K.buy} onPress={() => (onBuy ? onBuy(p) : setBuying(p))} />
                      : <Text style={s.tbd} testID={`pack-${p.id}-tbd`}>{K.priceTbd}</Text>}
                  </View>); })}
              </View>
            </View>))}
          <Text style={s.pay}>{K.pay}</Text>
        </View>
      </ScrollView>
      {buying && <Checkout plan={buying} onClose={() => setBuying(null)} />}
    </View>);
}

/** To'lov oynasi: buyurtma, usul (Payme/Click; Humo, Uzcard va korporativ karta shular orqali), karta ma'lumoti provayderda. Hozir server ulanmagan: «To'lash» faol emas. */
export function Checkout({ plan, onClose }: { plan: PlanInfo; onClose: () => void }) {
  const [method, setMethod] = useState<"payme" | "click">("payme"); const price = plan.priceKeys.map((k) => PRICES[k]).find((v) => v != null) ?? null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.back2}><View style={s.sheet} role="dialog" aria-label={K.checkout.title} testID="checkout">
        <Text style={s.cardT} aria-level={2} accessibilityRole="header">{K.checkout.title}</Text>
        <Text style={s.group}>{K.checkout.order}: {K.plans[plan.id].t}</Text>
        <Text style={s.cardD}>{K.checkout.total}: {price == null ? K.priceTbd : `${money(price)} so'm`}</Text>
        <Text style={s.l}>{K.checkout.method}</Text>
        <View style={s.row} role="radiogroup">{(["payme", "click"] as const).map((m) => <Pressable key={m} role="radio" aria-checked={method === m} accessibilityLabel={K.checkout[m]} onPress={() => setMethod(m)} style={[s.seg, method === m && s.segOn]}><Text style={[s.segT, method === m && { color: color.white }]} aria-hidden>{K.checkout[m]}</Text></Pressable>)}</View>
        <Text style={s.cardD}>{K.checkout.cardNote}</Text><Text style={s.cardD}>{K.checkout.minorNote}</Text>
        <Button label={K.checkout.pay} onPress={() => {}} disabled /><Text style={s.tbd}>{K.checkout.unavailable}</Text>
        <Button label={K.back} kind="ghost" onPress={onClose} />
      </View></View>
    </Modal>);
}

/** Paywall: xona yaratish chegarasiga yetganda chiqadi (server `limit_reached`); o'yin davomida hech qachon. */
export function Paywall({ used, onPlus, onHost, onLater }: { used: number; onPlus: () => void; onHost: () => void; onLater: () => void }) {
  const W = K.paywall;
  return (
    <Modal transparent animationType="fade" onRequestClose={onLater}>
      <View style={s.back2}><View style={s.sheet} role="dialog" aria-label={W.title.replace("{n}", String(used))} testID="paywall">
        <Text style={s.cardT} aria-level={2} accessibilityRole="header">{W.title.replace("{n}", String(used))}</Text>
        <Text style={s.cardD}>{W.text}</Text>
        <Button label={W.plus} onPress={onPlus} />
        <Pressable accessibilityRole="button" accessibilityLabel={W.host} onPress={onHost} style={s.gold}><Text style={s.goldT}>{W.host}</Text></Pressable>
        <Button label={W.later} kind="ghost" onPress={onLater} />
        <Text style={s.tbd}>{W.note}</Text>
      </View></View>
    </Modal>);
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.white }, bar: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, minHeight: 56, borderBottomWidth: 1, borderBottomColor: color.line }, back: { minHeight: 44, justifyContent: "center" }, backT: { color: color.navy, fontWeight: "800", fontSize: font.md }, title: { color: color.navy, fontSize: font.xl, fontWeight: "800" },
  scroll: { padding: space.lg, alignItems: "center" }, wrap: { width: "100%", maxWidth: 1080, gap: space.lg }, lead: { color: color.text2, fontSize: font.md, lineHeight: 22 }, group: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, card: { flexGrow: 1, flexBasis: 300, minWidth: 260, gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: color.bg, borderWidth: 2, borderColor: color.line }, cardOn: { borderColor: color.green },
  cardT: { color: color.navy, fontSize: font.xl, fontWeight: "800" }, cardD: { color: color.text2, fontSize: font.md, lineHeight: 22 }, cur: { color: "#0E6B4A", fontWeight: "800", fontSize: font.md }, tbd: { color: color.text2, fontWeight: "700", fontSize: font.sm }, pay: { color: color.text2, fontSize: font.sm },
  back2: { flex: 1, backgroundColor: "rgba(8,34,56,0.55)", alignItems: "center", justifyContent: "center", padding: space.lg }, sheet: { width: "100%", maxWidth: 440, gap: space.md, padding: space.xl, borderRadius: radius.lg, backgroundColor: color.white },
  l: { color: color.text2, fontSize: font.sm, fontWeight: "700" }, row: { flexDirection: "row", gap: space.sm }, seg: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 2, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, segOn: { backgroundColor: color.green, borderColor: color.green }, segT: { color: color.navy, fontWeight: "800", fontSize: font.md },
  gold: { minHeight: 52, borderRadius: 10, backgroundColor: color.gold, alignItems: "center", justifyContent: "center" }, goldT: { color: color.navy, fontWeight: "800", fontSize: 16 },
});
