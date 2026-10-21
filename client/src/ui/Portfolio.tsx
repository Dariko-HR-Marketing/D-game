import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, Easing, useWindowDimensions } from "react-native";
import { useReducedMotion } from "../motion";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";
import { CardFace } from "./CardFace";
import { portfolioOf, type AssetRow, type DebtRow, type Portfolio } from "../portfolio";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, HEADER_H, MIN_TAP, radius, space, surface, tone } from "../theme";

const seenByRoom = new Map<string, Set<string>>();
const ICON: Record<string, IconName> = { small_business: "cart", business: "dollar", land: "flag", dacha: "house", apartment: "home", car: "move", collectible: "star", shares: "chart", partner_stake: "people" };
const iconOf = (a: AssetRow): IconName => (a.kind === "shares" || a.kind === "partner_stake" ? ICON[a.kind] : ICON[a.sub ?? ""] ?? ICON[a.kind] ?? "file");
/** Aktiv turi bo'yicha rang (taxta kataklari bilan uyg'un): biznes — yashil, qimmatli qog'oz — ko'k, ko'chmas mulk — oltin, sheriklik — binafsha. */
const LOOK = {
  biz: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B" }, paper: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85" }, estate: { bg: "#FFE3B8", border: "#E9A64B", fg: "#6B4300" },
  stake: { bg: "#EADFF7", border: "#B79AD8", fg: "#4A2A78" }, other: { bg: "#EDF0F3", border: "#C3CBD3", fg: "#1B2733" },
};
const lookOf = (a: AssetRow) => (a.kind === "shares" ? LOOK.paper : a.kind === "partner_stake" || a.stakeOfName ? LOOK.stake : ["land", "dacha", "apartment"].includes(a.sub ?? "") ? LOOK.estate : a.kind === "business" || a.sub === "small_business" || a.sub === "business" ? LOOK.biz : LOOK.other);
const SEG = ["#082238", "#11835A", "#2C6DB5", "#F2B233", "#9E2A30", "#7B4FA3", "#E07A2F", "#4A5B6C"];
const sg = (n: number) => (n > 0 ? "+" : "") + money(n);

function Chip({ label, kind = "plain" }: { label: string; kind?: "good" | "bad" | "warn" | "info" | "plain" }) {
  const fg = kind === "good" ? tone.good : kind === "bad" ? tone.bad : kind === "warn" ? tone.warn : color.navy;
  return <View style={[s.chip, { backgroundColor: surface[kind] }]}><Text style={[s.chipT, { color: fg }]}>{label}</Text></View>;
}
const stateChips = (a: AssetRow) => [a.pledged ? <Chip key="p" label={uz.portfolio.pledged} kind="warn" /> : null, a.partnerName ? <Chip key="pa" label={`${uz.portfolio.partner}: ${a.partnerName}`} kind="info" /> : null,
  a.stakeOfName ? <Chip key="so" label={`${uz.portfolio.stakeOf}: ${a.stakeOfName}`} kind="info" /> : null, a.tokens ? <Chip key="t" label={`${a.tokens} ${uz.portfolio.tokens}`} /> : null];
const incomeText = (a: AssetRow) => (a.income ? `${sg(a.income)} / ${uz.portfolio.perMonth}` : a.shares ? `${a.shares} ${uz.portfolio.sharesWord}` : "—");

/** Yangi sotib olingan aktiv katagi «sakrab» chiqadi va qisqa muddat yorqin hoshiya bilan ajralib turadi (qo'shilganini ko'z bilan ko'rish uchun). */
function PopIn({ fresh, children, style }: { fresh: boolean; children: React.ReactNode; style?: object }) {
  const reduced = useReducedMotion(); const isNew = useRef(fresh).current; // faqat paydo bo'lish paytidagi holat hisobga olinadi
  const v = useRef(new Animated.Value(isNew && !reduced ? 0 : 1)).current; const glow = useRef(new Animated.Value(isNew ? 1 : 0)).current;
  useEffect(() => { if (!isNew) return; if (!reduced) Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }).start(); const h = setTimeout(() => Animated.timing(glow, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(), 1800); return () => clearTimeout(h); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], shadowColor: "#11835A", shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] }), shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 0 }]}>{children}</Animated.View>;
}

/** Chap ustun/«Blank»: doimiy ko'rinadigan, ixcham «Mening kartalarim»: har bir aktiv — rangli katak; qarzlar va faol kartalar belgilar bilan. */
export function PortfolioCard({ room, userId, onOpen, onAct, cols }: { room: any; userId: string; onOpen: () => void; onAct: (a: Record<string, unknown>) => void; cols?: number }) {
  const p = portfolioOf(room, userId); if (!p) return null;
  // Xona bo'yicha eslab qolinadi (chap ustun qaror ko'rinishi ↔ oddiy ko'rinish almashganda katak qayta paydo bo'lib «yangi» deb sakramasin)
  const seen = { current: seenByRoom.get(room.code) ?? new Set(p.assets.map((a) => `${a.code}${a.idx}`)) }; seenByRoom.set(room.code, seen.current);
  const fresh = new Set(p.assets.map((a) => `${a.code}${a.idx}`).filter((k) => !seen.current.has(k))); useEffect(() => { for (const k of fresh) seen.current.add(k); });
  const hasDebts = p.lent.length + p.owed.length + p.bank.length + p.lombards.length > 0 || p.owe > 0;
  return (
    <View style={s.card} testID="portfolio" role="region" aria-label={uz.portfolio.title}>
      <View style={s.head}><Text style={s.h} aria-level={2} accessibilityRole="header">{uz.portfolio.title}</Text><Chip label={`${p.totals.count} ${uz.portfolio.count}`} kind={p.totals.count ? "good" : "plain"} /></View>
      {p.assets.length === 0 ? <Text style={s.muted}>{uz.portfolio.empty}</Text> : (
        <View style={s.grid}>
          {p.assets.map((a) => { const l = lookOf(a); const key = `${a.code}${a.idx}`; return (
            <PopIn key={key} fresh={fresh.has(key)} style={cols ? [s.tileWrap, { width: `${Math.floor(97 / cols)}%` as any }] : s.tileWrap}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${a.label}: ${a.title}. ${incomeText(a)}`} onPress={onOpen} style={({ pressed }) => [s.tile, { backgroundColor: l.bg, borderColor: l.border, width: "100%" }, pressed && { opacity: 0.85 }]}>
              <View style={s.tileTop} aria-hidden><Icon name={iconOf(a)} size={16} color={l.fg} /><Text style={[s.tileKind, { color: l.fg }]} numberOfLines={1}>{a.label}</Text></View>
              <Text style={s.tileTitle} numberOfLines={2} aria-hidden>{a.title}</Text>
              <Text style={[s.tileInc, { color: a.net < 0 ? tone.bad : l.fg }]} aria-hidden>{incomeText(a)}</Text>
              {a.pledged || a.partnerName || a.stakeOfName ? <View style={s.tileFlags} aria-hidden>{stateChips(a)}</View> : null}
            </Pressable></PopIn>); })}
        </View>)}
      {p.offers.map((o) => (
        <View key={`${o.proposalId}${o.assetCode}`} style={s.offer}>
          <View style={{ flex: 1 }}><Text style={s.offerK}>{uz.portfolio.offer}</Text><Text style={s.offerT} numberOfLines={2}>{o.text}</Text><Text style={s.offerP}>{uz.portfolio.sell}: {money(o.price)}</Text></View>
          <View style={{ width: 96 }}><Button label={uz.portfolio.sell} kind="ghost" onPress={() => onAct({ type: "market_sell", proposalId: o.proposalId, assetCode: o.assetCode })} /></View>
        </View>))}
      {(hasDebts || p.active.length > 0) && (
        <View style={s.chips}>
          {p.lent.length > 0 && <Chip label={`${uz.portfolio.lentTitle}: ${money(p.totals.lent)}`} kind="good" />}
          {p.owed.length > 0 && <Chip label={`${uz.portfolio.owedTitle}: ${money(p.owed.reduce((x, d) => x + d.amount, 0))}`} kind="bad" />}
          {p.bank.length > 0 && <Chip label={`${uz.portfolio.bankTitle}: ${money(p.bank.reduce((x, d) => x + d.amount, 0))}`} kind="bad" />}
          {p.lombards.length > 0 && <Chip label={uz.portfolio.lombardTitle} kind="warn" />}
          {p.owe > 0 && <Chip label={`${uz.portfolio.oweTitle}: ${money(p.owe)}`} kind="bad" />}
          {p.active.map((a) => <Chip key={a.key} label={a.value ? `${uz.portfolio.act[a.key]}: ${a.value}` : uz.portfolio.act[a.key]} kind={a.key === "noSalary" || a.key === "crisis" ? "bad" : "info"} />)}
        </View>)}
      <Button label={uz.portfolio.open} kind="ghost" onPress={onOpen} />
    </View>);
}

function Cell({ label, value, kind = "neutral", note }: { label: string; value: string; kind?: "good" | "bad" | "neutral"; note?: string }) {
  const fg = kind === "good" ? tone.good : kind === "bad" ? tone.bad : color.navy;
  return <View style={s.cell} role="group" accessible aria-label={`${label}: ${value}`}><Text style={s.cellL} aria-hidden>{label}</Text><Text style={[s.cellV, { color: fg }]} aria-hidden>{value}</Text>{note ? <Text style={s.cellN} aria-hidden>{note}</Text> : null}</View>;
}
function DebtGroup({ title, rows, kind }: { title: string; rows: DebtRow[]; kind: "good" | "bad" }) {
  if (!rows.length) return null;
  return (
    <View style={s.group}>
      <Text style={s.gt} aria-level={3} accessibilityRole="header">{title}</Text>
      {rows.map((d) => (
        <View key={d.id} style={s.debt} role="group" accessible aria-label={`${title}: ${d.who ?? d.note ?? ""} ${money(d.amount)}${d.months !== undefined ? `, ${d.months} ${uz.portfolio.leftMonths}` : ""}`}>
          <View style={[s.dot, { backgroundColor: kind === "good" ? tone.good : tone.bad }]} aria-hidden />
          <Text style={s.debtW} aria-hidden numberOfLines={1}>{d.who ?? d.note ?? title}</Text>
          {d.months !== undefined ? <Text style={s.debtM} aria-hidden>{d.months} {uz.portfolio.leftMonths}</Text> : null}
          <Text style={[s.debtA, { color: kind === "good" ? tone.good : tone.bad }]} aria-hidden>{money(d.amount)}</Text>
        </View>))}
    </View>);
}

/** To'liq ko'rinish: jamlanma kataklar, aktivlar jadvali (kompyuterda jadval, telefonda kartalar), daromad ulushi, qarzlar, faol kartalar va tahlil. */
export function PortfolioDetail({ room, userId, onClose }: { room: any; userId: string; onClose: () => void }) {
  const { width } = useWindowDimensions(); const wide = width >= 900; const p: Portfolio | null = portfolioOf(room, userId);
  useEffect(() => { const d = (globalThis as any).document; if (!d?.addEventListener) return; const h = (e: any) => { if (e.key === "Escape") onClose(); }; d.addEventListener("keydown", h); return () => d.removeEventListener("keydown", h); }, [onClose]);
  if (!p) return null; const t = p.totals;
  return (
    <View style={s.overlay} role="dialog" aria-modal aria-label={uz.portfolio.title} testID="portfolio-detail">
      <View style={s.bar}>
        <Text style={s.barT} aria-level={1} accessibilityRole="header">{uz.portfolio.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={uz.portfolio.close} onPress={onClose} style={s.x} testID="portfolio-close"><Text style={s.xT} aria-hidden>✕</Text></Pressable>
      </View>
      <ScrollView tabIndex={0} role="region" aria-label={uz.portfolio.assets} contentContainerStyle={[s.body, wide && { maxWidth: 1100 }]}>
        <View style={s.cells}>
          <Cell label={uz.portfolio.sumAssets} value={money(t.invested)} note={`${t.count} ${uz.portfolio.count}`} />
          <Cell label={uz.portfolio.sumPassive} value={sg(t.passive)} kind="good" /><Cell label={uz.portfolio.sumPayments} value={money(t.payments)} kind={t.payments ? "bad" : "neutral"} />
          <Cell label={uz.portfolio.sumNet} value={sg(t.netPassive)} kind={t.netPassive < 0 ? "bad" : "good"} />
          <Cell label={uz.portfolio.sumDebt} value={money(t.debt)} kind={t.debt ? "bad" : "neutral"} /><Cell label={uz.portfolio.sumLent} value={money(t.lent)} kind={t.lent ? "good" : "neutral"} />
          <Cell label={uz.portfolio.sumWorth} value={money(t.netWorth)} note={uz.portfolio.worthNote} />
        </View>

        <Text style={s.sec} aria-level={2} accessibilityRole="header">{uz.portfolio.assets}</Text>
        {p.assets.length === 0 ? <Text style={s.muted}>{uz.portfolio.empty}</Text> : wide ? (
          <View style={s.table} role="table" aria-label={uz.portfolio.assets}>
            <View style={[s.tr, s.th]} role="row">{[uz.portfolio.colCard, uz.portfolio.colPrice, uz.portfolio.colIncome, uz.portfolio.colPayment, uz.portfolio.colCredit, uz.portfolio.colYield, uz.portfolio.colPayback, uz.portfolio.colState].map((h, i) => <Text key={h} style={[s.thT, i === 0 ? { flex: 3 } : { flex: i === 7 ? 2 : 1.2 }]} role="columnheader">{h}</Text>)}</View>
            {p.assets.map((a) => { const l = lookOf(a); return (
              <View key={`${a.code}${a.idx}`} style={s.tr} role="row">
                <View style={[{ flex: 3, flexDirection: "row", alignItems: "center", gap: space.sm }]} role="cell">
                  <View style={[s.ico, { backgroundColor: l.bg, borderColor: l.border }]} aria-hidden><Icon name={iconOf(a)} size={18} color={l.fg} /></View>
                  <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={2}>{a.title}</Text><Text style={[s.kind, { color: l.fg }]}>{a.label}</Text></View>
                  {a.file ? <View style={{ width: 44 }} aria-hidden><CardFace file={a.file} label={a.title} maxH={60} /></View> : null}
                </View>
                <Text style={[s.td, s.num, { flex: 1.2 }]} role="cell">{money(a.price)}</Text>
                <Text style={[s.td, s.num, { flex: 1.2, color: a.income ? tone.good : tone.muted }]} role="cell">{a.income ? sg(a.income) : a.shares ? `${a.shares} ${uz.portfolio.sharesWord}` : "—"}</Text>
                <Text style={[s.td, s.num, { flex: 1.2, color: a.payment ? tone.bad : tone.muted }]} role="cell">{a.payment ? money(a.payment) : "—"}</Text>
                <Text style={[s.td, s.num, { flex: 1.2 }]} role="cell">{a.credit ? money(a.credit) : "—"}</Text>
                <Text style={[s.td, s.num, { flex: 1.2 }]} role="cell">{a.yearly !== null ? `${a.yearly} %` : "—"}</Text>
                <Text style={[s.td, s.num, { flex: 1.2 }]} role="cell">{a.payback !== null ? `${a.payback} ${uz.portfolio.months}` : "—"}</Text>
                <View style={[{ flex: 2, flexDirection: "row", flexWrap: "wrap", gap: 4 }]} role="cell">{stateChips(a)}</View>
              </View>); })}
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            {p.assets.map((a) => { const l = lookOf(a); return (
              <View key={`${a.code}${a.idx}`} style={[s.acard, { borderColor: l.border }]} role="group" accessible aria-label={`${a.label}: ${a.title}. ${uz.portfolio.colPrice} ${money(a.price)}. ${incomeText(a)}`}>
                <View style={[s.achead, { backgroundColor: l.bg }]} aria-hidden><Icon name={iconOf(a)} size={18} color={l.fg} /><Text style={[s.kind, { color: l.fg, flex: 1 }]}>{a.label}</Text>{a.yearly !== null ? <Text style={[s.kind, { color: l.fg }]}>{a.yearly} % / yil</Text> : null}</View>
                <Text style={[s.name, { paddingHorizontal: space.md, paddingTop: space.sm }]} aria-hidden>{a.title}</Text>
                <View style={s.agrid} aria-hidden>
                  <View style={s.ag}><Text style={s.cellL}>{uz.portfolio.colPrice}</Text><Text style={s.agv}>{money(a.price)}</Text></View>
                  <View style={s.ag}><Text style={s.cellL}>{uz.portfolio.colIncome}</Text><Text style={[s.agv, { color: a.income ? tone.good : tone.muted }]}>{a.income ? sg(a.income) : a.shares ? `${a.shares} ${uz.portfolio.sharesWord}` : "—"}</Text></View>
                  <View style={s.ag}><Text style={s.cellL}>{uz.portfolio.colPayment}</Text><Text style={[s.agv, { color: a.payment ? tone.bad : tone.muted }]}>{a.payment ? money(a.payment) : "—"}</Text></View>
                  <View style={s.ag}><Text style={s.cellL}>{uz.portfolio.colPayback}</Text><Text style={s.agv}>{a.payback !== null ? `${a.payback} ${uz.portfolio.months}` : "—"}</Text></View>
                </View>
                {a.pledged || a.partnerName || a.stakeOfName || a.tokens ? <View style={[s.chips, { paddingHorizontal: space.md, paddingBottom: space.sm }]} aria-hidden>{stateChips(a)}</View> : null}
              </View>); })}
          </View>)}

        {p.shares.length > 0 && (
          <View style={s.group} role="group" accessible aria-label={`${uz.portfolio.shareTitle}: ${p.shares.map((x) => `${x.label} ${x.pct} %`).join(", ")}`}>
            <Text style={s.gt} aria-hidden>{uz.portfolio.shareTitle}</Text>
            <View style={s.stack} aria-hidden>{p.shares.map((x, i) => <View key={x.code + i} style={{ flex: x.income, backgroundColor: SEG[i % SEG.length] }} />)}</View>
            <View style={s.legend} aria-hidden>{p.shares.map((x, i) => <View key={x.code + i} style={s.leg}><View style={[s.dot, { backgroundColor: SEG[i % SEG.length] }]} /><Text style={s.legT} numberOfLines={1}>{x.label} · {x.pct} %</Text></View>)}</View>
          </View>)}

        <Text style={s.sec} aria-level={2} accessibilityRole="header">{uz.portfolio.debts}</Text>
        {p.lent.length + p.owed.length + p.bank.length + p.lombards.length === 0 && p.owe === 0 ? <Text style={s.muted}>{uz.portfolio.noDebt}</Text> : (
          <View style={wide ? s.cols : { gap: space.sm }}>
            <DebtGroup title={uz.portfolio.lentTitle} rows={p.lent} kind="good" /><DebtGroup title={uz.portfolio.owedTitle} rows={p.owed} kind="bad" />
            <DebtGroup title={uz.portfolio.bankTitle} rows={p.bank} kind="bad" /><DebtGroup title={uz.portfolio.lombardTitle} rows={p.lombards} kind="bad" />
            {p.owe > 0 && <DebtGroup title={uz.portfolio.oweTitle} rows={[{ id: "owe", amount: p.owe }]} kind="bad" />}
          </View>)}

        <Text style={s.sec} aria-level={2} accessibilityRole="header">{uz.portfolio.activeTitle}</Text>
        {p.active.length === 0 ? <Text style={s.muted}>{uz.portfolio.none}</Text> : (
          <View style={s.chips}>{p.active.map((a) => <View key={a.key} style={s.act}><Text style={s.actT}>{uz.portfolio.act[a.key]}{a.value ? `: ${a.value}` : ""}</Text><Text style={s.actN}>{a.value ? uz.portfolio.actNote[a.key] : uz.portfolio.actNote[a.key]}</Text></View>)}</View>)}

        <Text style={s.sec} aria-level={2} accessibilityRole="header">{uz.portfolio.analysis}</Text>
        <View style={s.insights}>
          {p.best ? <Text style={s.ins}>• {uz.portfolio.bestIs}: <Text style={s.b}>{p.best.title}</Text> — {p.best.yearly} % / yil, {uz.portfolio.colPayback.toLowerCase()} {p.best.payback} {uz.portfolio.months}.</Text> : <Text style={s.ins}>• {uz.portfolio.noIncome}</Text>}
          {p.slowest ? <Text style={s.ins}>• {uz.portfolio.slowestIs}: <Text style={s.b}>{p.slowest.title}</Text> — {p.slowest.payback} {uz.portfolio.months}.</Text> : null}
          {t.coverage !== null ? <Text style={s.ins}>• {uz.portfolio.coverageIs} <Text style={s.b}>{t.coverage} %</Text> {uz.portfolio.coverageOf}.</Text> : null}
        </View>
      </ScrollView>
    </View>);
}

const s = StyleSheet.create({
  card: { backgroundColor: color.white, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: "#E6ECEF", shadowColor: "#082238", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }, h: { color: color.navy, fontWeight: "800", fontSize: font.lg }, muted: { color: tone.muted, fontSize: font.sm, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tileWrap: { width: "48.5%", flexGrow: 1, minWidth: 130 },
  tile: { minWidth: 130, borderWidth: 1.5, borderRadius: radius.md, padding: space.sm, gap: 3 }, tileTop: { flexDirection: "row", alignItems: "center", gap: 5 },
  tileKind: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 1 }, tileTitle: { color: color.navy, fontSize: font.sm, fontWeight: "700", lineHeight: 17 }, tileInc: { fontSize: font.md, fontWeight: "900", fontVariant: ["tabular-nums"] }, tileFlags: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }, chipT: { fontSize: 12, fontWeight: "800" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  offer: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: "#FFF6DD", borderWidth: 1.5, borderColor: "#E9A64B", borderRadius: radius.md, padding: space.sm }, offerK: { color: "#6B4300", fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" }, offerT: { color: color.navy, fontSize: font.sm, fontWeight: "600", lineHeight: 17 }, offerP: { color: "#6B4300", fontWeight: "800", fontSize: font.sm },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.bg, zIndex: 80 },
  bar: { minHeight: HEADER_H, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, backgroundColor: color.white, borderBottomWidth: 1, borderBottomColor: "#E6ECEF" }, barT: { color: color.navy, fontWeight: "800", fontSize: font.xl },
  x: { width: MIN_TAP, height: MIN_TAP, alignItems: "center", justifyContent: "center" }, xT: { color: tone.muted, fontSize: font.xl, fontWeight: "800" },
  body: { padding: space.lg, gap: space.md, width: "100%", alignSelf: "center", paddingBottom: space.xxl },
  cells: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, cell: { flexGrow: 1, flexBasis: 150, backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E6ECEF", padding: space.md, gap: 2 },
  cellL: { color: tone.muted, fontSize: 12, fontWeight: "700" }, cellV: { fontSize: font.xl, fontWeight: "900", fontVariant: ["tabular-nums"] }, cellN: { color: tone.muted, fontSize: 11, lineHeight: 15 },
  sec: { color: color.navy, fontWeight: "800", fontSize: font.lg, marginTop: space.sm },
  table: { backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E6ECEF", overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: "#EEF2F4" }, th: { backgroundColor: "#F4F7F8", borderTopWidth: 0 },
  thT: { color: tone.muted, fontSize: 12, fontWeight: "800" }, td: { color: color.navy, fontSize: font.md }, num: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  ico: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, name: { color: color.navy, fontSize: font.md, fontWeight: "700", lineHeight: 20 }, kind: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  acard: { backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1.5, overflow: "hidden" }, achead: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: 6 },
  agrid: { flexDirection: "row", flexWrap: "wrap", padding: space.md, gap: space.md }, ag: { width: "46%", gap: 1 }, agv: { color: color.navy, fontWeight: "800", fontSize: font.md, fontVariant: ["tabular-nums"] },
  group: { backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E6ECEF", padding: space.md, gap: space.sm, flexGrow: 1, flexBasis: 280 }, gt: { color: color.navy, fontWeight: "800", fontSize: font.md },
  cols: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  debt: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 36, borderTopWidth: 1, borderTopColor: "#EEF2F4" }, dot: { width: 10, height: 10, borderRadius: 5 }, debtW: { flex: 1, color: color.navy, fontWeight: "700", fontSize: font.md }, debtM: { color: tone.muted, fontSize: font.sm }, debtA: { fontWeight: "900", fontSize: font.md, fontVariant: ["tabular-nums"] },
  stack: { flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: "#E6ECEF" }, legend: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, leg: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 260 }, legT: { color: color.navy, fontSize: font.sm, fontWeight: "600" },
  act: { backgroundColor: surface.info, borderRadius: radius.md, padding: space.md, gap: 2, flexGrow: 1, flexBasis: 220 }, actT: { color: color.navy, fontWeight: "800", fontSize: font.md }, actN: { color: tone.muted, fontSize: font.sm, lineHeight: 18 },
  insights: { backgroundColor: color.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E6ECEF", padding: space.md, gap: space.sm }, ins: { color: color.navy, fontSize: font.md, lineHeight: 22 }, b: { fontWeight: "800" },
});
