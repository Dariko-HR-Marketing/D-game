import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { marketOffers } from "../model";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, MIN_TAP, radius, shadow, space, tone } from "../theme";

/** Bozor taklifi: karta egasiga (mos aktivi bor o'yinchiga) doim ko'rinadigan oyna — «Moliya amallari» akkordioni yopiq yoki pastda bo'lsa ham yo'qolmaydi.
 *  «Keyinroq» faqat shu oynani yashiradi; taklif «Moliya amallari»da qoladi. Narx va sotish qoidasi serverda (`market_sell`). */
export function MarketOfferLayer({ room, userId, onAct }: { room: any; userId: string; onAct: (m: any) => void }) {
  const { width } = useWindowDimensions(); const [hidden, setHidden] = useState<Record<string, true>>({});
  const all = marketOffers(room, userId), offers = all.filter((o) => !hidden[`${o.proposalId}:${o.assetCode}`]);
  if (!offers.length) return null;
  const narrow = width < 520;
  return (
    <View style={[s.wrap, { top: HEADER_H + space.sm, ...(narrow ? { left: space.sm, right: space.sm } : { right: space.md, width: 360 }) }]} pointerEvents="box-none" testID="market-offers">
      {offers.slice(0, 2).map((o) => (
        <View key={`${o.proposalId}:${o.assetCode}`} style={s.card} role="alertdialog" aria-label={uz.portfolio.offer} testID="market-offer">
          <Text style={s.kicker}>{uz.portfolio.offer}</Text>
          <Text style={s.text}>{o.text}</Text>
          <Text style={s.meta}>{o.assetCode} · {uz.coop.sellFor}: {money(o.price)} · {uz.coop.net}: {money(o.net)}</Text>
          <View style={s.row}>
            <Pressable accessibilityRole="button" onPress={() => onAct({ type: "market_sell", proposalId: o.proposalId, assetCode: o.assetCode })} style={s.go} testID="market-offer-sell"><Text style={s.goT}>{uz.coop.sell} {money(o.price)}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setHidden((h) => ({ ...h, [`${o.proposalId}:${o.assetCode}`]: true }))} style={s.later} testID="market-offer-later"><Text style={s.laterT}>{uz.portfolio.later}</Text></Pressable>
          </View>
        </View>))}
      {offers.length > 2 && <Text style={s.more}>+{offers.length - 2}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { position: "absolute", zIndex: 40, gap: space.sm },
  card: { backgroundColor: color.white, borderRadius: radius.lg, borderWidth: 1, borderColor: color.green, padding: space.md, gap: 6, ...shadow },
  kicker: { color: color.green, fontSize: font.sm, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
  text: { color: color.navy, fontSize: font.md, fontWeight: "700" },
  meta: { color: color.text2, fontSize: font.sm },
  row: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  go: { minHeight: MIN_TAP, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: color.green, alignItems: "center", justifyContent: "center" },
  goT: { color: color.white, fontSize: font.md, fontWeight: "800" },
  later: { minHeight: MIN_TAP, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center" },
  laterT: { color: color.navy, fontSize: font.md, fontWeight: "700" },
  more: { color: tone.muted, fontSize: font.sm, fontWeight: "700", textAlign: "right" },
});
