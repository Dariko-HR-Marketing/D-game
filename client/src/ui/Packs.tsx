import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from "react-native";
import { PLANS, LIMITS, PRICES, purchasable, type PlanInfo, type PlanId, type PriceKey } from "../billing/catalog";
import type { Http } from "../net/http";
import { errText } from "../i18n/uz";
import { money } from "../format";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { color, font, radius, space } from "../theme";

const K = uz.packs;
const desc = (id: PlanId) => (K.plans[id]?.d ?? "").replace("{rooms}", String(LIMITS.free.roomsPerDay)).replace("{games}", String(LIMITS.free.historyGames)).replace("{hours}", String(LIMITS.hostDay.hours)).replace("{tables}", String(id === "hostEvent" ? LIMITS.hostEvent.tables : LIMITS.hostDay.tables)).replace("{guests}", String(id === "hostEvent" ? LIMITS.hostEvent.guests : LIMITS.hostDay.guests)).replace("{days}", String(LIMITS.hostEvent.days)).replace("{students}", String(LIMITS.eduClass.students)).replace("{tiers}", LIMITS.corpTeamTiers.join(", "));

/** Sotib olinadigan SKU lar (server `commerce`): hozir faqat Plus. Qolgan paketlar (host-pass, sinf, korporativ) serverda hali yo'q: «Narx aniqlanadi». */
const SKUS: Partial<Record<PlanId, { sku: string; label: string }[]>> = { plus: [{ sku: "plus:monthly", label: "Oylik" }, { sku: "plus:yearly", label: "Yillik" }] };
type Cat = { plus: { monthly: number | null; yearly: number | null }; providers?: string[] };

/** Paketlar sahifasi (kompyuter birinchi). Narx serverdagi katalogdan olinadi; bo'sh bo'lsa «Narx aniqlanadi» va «Sotib olish» ko'rinmaydi. */
export function Packs({ http, onBack, current = "free" }: { http?: Http; onBack: () => void; current?: PlanId }) {
  const [buying, setBuying] = useState<PlanInfo | null>(null); const [cat, setCat] = useState<Cat | null>(null);
  useEffect(() => { let off = false; http?.shop().then((c: Cat) => { if (!off) setCat(c); }).catch(() => {}); return () => { off = true; }; }, [http]);
  const prices: Record<PriceKey, number | null> = { ...PRICES, "plus.month": cat?.plus.monthly ?? null, "plus.year": cat?.plus.yearly ?? null };
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
                {PLANS.filter((p) => p.group === g).map((p) => { const can = purchasable(p, prices) && !!SKUS[p.id]; return (
                  <View key={p.id} style={[s.card, p.id === current && s.cardOn]} testID={`pack-${p.id}`}>
                    <Text style={s.cardT} aria-level={3} accessibilityRole="header">{K.plans[p.id].t}</Text>
                    <Text style={s.cardD}>{desc(p.id)}</Text>
                    <View style={{ flex: 1 }} />
                    {p.id === current ? <Text style={s.cur}>{K.current}</Text>
                      : p.priceKeys.length === 0 ? null
                      : can ? <Button label={K.buy} onPress={() => setBuying(p)} />
                      : <Text style={s.tbd} testID={`pack-${p.id}-tbd`}>{K.priceTbd}</Text>}
                  </View>); })}
              </View>
            </View>))}
          <Text style={s.pay}>{K.pay}</Text>
        </View>
      </ScrollView>
      {buying && <Checkout http={http} plan={buying} cat={cat} onClose={() => setBuying(null)} />}
    </View>);
}

/** To'lov oynasi: davr (oylik/yillik), usul (Payme/Click; Humo, Uzcard va korporativ karta shular orqali), «To'lash» buyurtma yaratib provayder oynasiga o'tkazadi. Karta ma'lumoti bizda yo'q. */
export function Checkout({ http, plan, cat, onClose }: { http?: Http; plan: PlanInfo; cat: Cat | null; onClose: () => void }) {
  const skus = SKUS[plan.id] ?? []; const providers = (cat?.providers ?? []).filter((x) => x === "payme" || x === "click");
  const [sku, setSku] = useState(skus[0]?.sku ?? ""); const [method, setMethod] = useState<string>(providers[0] ?? ""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const price = sku === "plus:yearly" ? cat?.plus.yearly : sku === "plus:monthly" ? cat?.plus.monthly : null;
  const pay = async () => { if (!http || !sku || !method) return; setBusy(true); setErr(null); try { const r = await http.order(sku, undefined, method); const url = r.order?.checkout; if (url) (globalThis as any).location.assign(url); else setErr("unknown"); } catch (e: any) { setErr(String(e?.code ?? "network")); } finally { setBusy(false); } };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.back2}><View style={s.sheet} role="dialog" aria-label={K.checkout.title} testID="checkout">
        <Text style={s.cardT} aria-level={2} accessibilityRole="header">{K.checkout.title}</Text>
        <Text style={s.group}>{K.checkout.order}: {K.plans[plan.id].t}</Text>
        {skus.length > 1 && <View style={s.row} role="radiogroup">{skus.map((k) => <Pressable key={k.sku} role="radio" aria-checked={sku === k.sku} accessibilityLabel={k.label} onPress={() => setSku(k.sku)} style={[s.seg, sku === k.sku && s.segOn]}><Text style={[s.segT, sku === k.sku && { color: color.white }]} aria-hidden>{k.label}</Text></Pressable>)}</View>}
        <Text style={s.cardD}>{K.checkout.total}: {price == null ? K.priceTbd : `${money(price)} so'm`}</Text>
        {providers.length > 0 ? (<><Text style={s.l}>{K.checkout.method}</Text>
          <View style={s.row} role="radiogroup">{providers.map((m) => <Pressable key={m} role="radio" aria-checked={method === m} testID={`pay-${m}`} accessibilityLabel={K.checkout[m as "payme" | "click"]} onPress={() => setMethod(m)} style={[s.seg, method === m && s.segOn]}><Text style={[s.segT, method === m && { color: color.white }]} aria-hidden>{K.checkout[m as "payme" | "click"]}</Text></Pressable>)}</View></>) : null}
        <Text style={s.cardD}>{K.checkout.cardNote}</Text><Text style={s.cardD}>{K.checkout.minorNote}</Text>
        <Button label={K.checkout.pay} onPress={pay} disabled={busy || !http || !sku || !method || price == null} />
        {providers.length === 0 && <Text style={s.tbd}>{K.checkout.unavailable}</Text>}
        {err && <Text style={[s.tbd, { color: color.red }]} accessibilityRole="alert" testID="checkout-err">{errText(err)}</Text>}
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
