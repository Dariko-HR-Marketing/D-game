import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, useWindowDimensions } from "react-native";
import { TextInput } from "react-native";
import { PLAN_ORDER, MATRIX, orgMonthly, orgYearly, yearlySavingPct, limitWindow, type PlanId, type Quota, type OrgTier } from "../billing/catalog";
import type { PaywallInfo } from "../net/connection";
import type { Http } from "../net/http";
import { errText } from "../i18n/uz";
import { money } from "../format";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Acc } from "./Accordion";
import { uz } from "../i18n/uz";
import { color, font, GREEN_TEXT, radius, space } from "../theme";

const K = uz.packs;
type Usage = { day: number; week: number; month: number; resets: { day: number; week: number; month: number } };
export interface Cat {
  plus: { active: boolean; monthly: number | null; yearly: number | null }; premium: { active: boolean; monthly: number | null; yearly: number | null };
  pkg: { trial?: { active: boolean; until: number | null; days: number }; plan: "start" | "plus" | "premium"; quotas: Record<"start" | "plus" | "premium", Quota>; usage: Usage; coupons: number; couponPrice: number | null; org: { seatMonthly: number | null; tiers: OrgTier[] } };
  providers?: string[]; orders?: Ord[];
}
const ICON: Record<PlanId, IconName> = { start: "arrow", plus: "plus", premium: "star", org: "bank" };
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
/** Toshkent vaqti (UTC+5): «25-noyabr, 00:00». */
const fmt = (t: number) => { const d = new Date(t + 5 * 3_600_000), p2 = (n: number) => String(n).padStart(2, "0"); return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}, ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
export const qText = (q: Quota) => [q.day !== null ? `${q.day} / ${K.usage.day.toLowerCase()}` : null, q.week !== null ? `${q.week} / ${K.usage.week.toLowerCase()}` : null, q.month !== null ? `${q.month} / ${K.usage.month.toLowerCase()}` : null].filter(Boolean).join(" · ") || K.usage.unlimited;

type SkuOpt = { sku: string; label: string; price: number | null };
const skusOf = (id: PlanId | "coupon", cat: Cat | null): SkuOpt[] => id === "plus" ? [{ sku: "plus:monthly", label: K.checkout.monthly, price: cat?.plus.monthly ?? null }, { sku: "plus:yearly", label: K.checkout.yearly, price: cat?.plus.yearly ?? null }]
  : id === "premium" ? [{ sku: "premium:monthly", label: K.checkout.monthly, price: cat?.premium.monthly ?? null }, { sku: "premium:yearly", label: K.checkout.yearly, price: cat?.premium.yearly ?? null }]
  : id === "coupon" ? [{ sku: "coupon:1", label: K.coupon.title, price: cat?.pkg.couponPrice ?? null }] : [];

/** Paketlar sahifasi (PILOT): Start, Plus, Premium, Tashkilot. Narxlar va chegaralar serverdagi sozlamadan; bo'sh bo'lsa «Narx aniqlanadi». */
export function Packs({ http, onBack }: { http?: Http; onBack: () => void }) {
  const [cat, setCat] = useState<Cat | null>(null); const [buy, setBuy] = useState<PlanId | "coupon" | null>(null); const [open, setOpen] = useState(false); const [inq, setInq] = useState(false); const [ordOpen, setOrdOpen] = useState(false); const [track, setTrack] = useState<Ord | null>(null);
  const { width } = useWindowDimensions(); const wide = width >= 900;
  useEffect(() => { let off = false; http?.shop().then((c: Cat) => { if (!off) setCat(c); }).catch(() => {}); return () => { off = true; }; }, [http]);
  const cur: PlanId = cat?.pkg.plan ?? "start";
  return (
    <View style={s.root} testID="packs">
      <View style={s.bar}><Pressable accessibilityRole="button" accessibilityLabel={K.back} onPress={onBack} style={s.back}><Icon name="back" size={20} color={color.navy} /><Text style={s.backT}>{K.back}</Text></Pressable><Text style={s.title} aria-level={1} accessibilityRole="header">{K.title}</Text><View style={s.pilot}><Text style={s.pilotT}>{K.pilot}</Text></View></View>
      <ScrollView contentContainerStyle={s.scroll} {...({ tabIndex: 0 } as any)} aria-label={K.title}>
        <View style={s.wrap}>
          <View style={s.leadBox}><View style={s.leadIco} aria-hidden><Icon name="star" size={22} color={color.white} /></View><Text style={s.leadT}>{K.lead}</Text></View>
          <View style={[s.grid, wide && { flexWrap: "nowrap" }]} role="list">
            {PLAN_ORDER.map((id) => <PlanCard key={id} id={id} cat={cat} current={cur === id} onBuy={() => (id === "org" ? setInq(true) : setBuy(id))} />)}
          </View>
          {cat?.pkg.trial?.active && cat.pkg.trial.until && <View style={s.leadBox} testID="pack-trial"><Text style={s.leadT}>{K.trial.replace("{d}", String(cat.pkg.trial.days)).replace("{n}", String(Math.max(1, Math.ceil((cat.pkg.trial.until - Date.now()) / 86400000))))}</Text></View>}
          {cat && <Usage cat={cat} />}
          <View style={s.coupon} testID="pack-coupon">
            <View style={s.couponIco} aria-hidden><Icon name="dice" size={22} color={color.white} /></View>
            <View style={{ flex: 1, minWidth: 200, gap: 2 }}><Text style={s.cardT}>{K.coupon.title}{cat && cat.pkg.coupons > 0 ? ` · ${K.coupon.have.replace("{n}", String(cat.pkg.coupons))}` : ""}</Text><Text style={s.cardD}>{K.coupon.text}</Text></View>
            <View style={{ minWidth: 190 }}>{cat?.pkg.couponPrice != null ? <Button label={`${K.coupon.buy} · ${money(cat.pkg.couponPrice)}`} kind="ghost" onPress={() => setBuy("coupon")} /> : <Text style={s.tbd}>{K.priceTbd}</Text>}</View>
          </View>
          <Acc icon="list" title={K.table.title} summary={K.table.sub} open={open} onToggle={() => setOpen(!open)} testID="packs-table-acc">
            <Matrix />
          </Acc>
          {cat?.orders && <Acc icon="clock" title={K.track.orders} summary={cat.orders.length ? String(cat.orders.length) : K.track.noOrders} open={ordOpen} onToggle={() => setOrdOpen(!ordOpen)} testID="packs-orders">
            {cat.orders.length === 0 ? <Text style={s.cardD}>{K.track.noOrders}</Text> : cat.orders.map((o) => <View key={o.id} style={s.ordRow}><View style={{ flex: 1, minWidth: 0 }}><Text style={s.optT}>{o.title}</Text><Text style={s.optD}>{money(o.amount)} so'm{o.createdAt ? ` · ${fmt(o.createdAt)}` : ""}</Text></View><View style={[s.tagBox, o.status === "paid" && { backgroundColor: "#E3F3EB", borderColor: color.green }]}><Text style={s.tagT}>{K.track.st[o.status] ?? o.status}</Text></View>{(o.status === "pending_payment" || o.status === "pending_parent") && <Pressable accessibilityRole="button" accessibilityLabel={K.track.check} onPress={() => setTrack(o)} style={s.ordGo}><Icon name="chevron" size={18} color={color.navy} /></Pressable>}</View>)}
          </Acc>}
          <Text style={s.rules}>{K.rules}</Text><Text style={s.pay}>{K.pay}</Text>
        </View>
      </ScrollView>
      {buy && <Checkout http={http} id={buy} cat={cat} onClose={() => { setBuy(null); http?.shop().then(setCat).catch(() => {}); }} onPaid={() => http?.shop().then(setCat).catch(() => {})} />}
      {inq && <Inquiry http={http} onClose={() => setInq(false)} />}
      {track && <Modal transparent animationType="fade" onRequestClose={() => setTrack(null)}><View style={s.back2}><View style={s.sheet} role="dialog" aria-label={K.checkout.title}><Text style={s.cardT} aria-level={2} accessibilityRole="header">{K.checkout.title}</Text><OrderTracker http={http} orderId={track.id} first={track} onDone={() => http?.shop().then(setCat).catch(() => {})} onClose={() => { setTrack(null); http?.shop().then(setCat).catch(() => {}); }} /></View></View></Modal>}
    </View>);
}

function PlanCard({ id, cat, current, onBuy }: { id: PlanId; cat: Cat | null; current: boolean; onBuy: () => void }) {
  const P = K.plans[id], pts = K.pts[id];
  const sk = id === "plus" || id === "premium" ? skusOf(id, cat) : [];
  const monthly = sk[0]?.price ?? null, yearly = sk[1]?.price ?? null, save = yearlySavingPct(monthly, yearly);
  const hot = id === "plus", q = id === "org" ? null : cat?.pkg.quotas[id];
  return (
    <View style={[s.card, hot && s.hot, id === "premium" && s.prem, current && s.cur, id === "org" && s.org]} role="listitem" testID={`pack-${id}`}>
      <View style={s.cardHead}><View style={[s.ico, id === "premium" && { backgroundColor: "#FBF0D3" }]} aria-hidden><Icon name={ICON[id]} size={22} color={id === "premium" ? "#8A5A00" : GREEN_TEXT} /></View><View style={s.tagBox}><Text style={s.tagT}>{hot && !current ? uz.packs.paywall.rec : current ? K.current : P.tag}</Text></View></View>
      <Text style={s.cardT} aria-level={2} accessibilityRole="header">{P.t}</Text><Text style={s.who}>{P.who}</Text>
      <View style={s.priceBox}>
        {id === "start" ? <Text style={s.price}>{K.forFree}</Text>
          : id === "org" ? <Text style={s.price2}>{cat?.pkg.org.seatMonthly != null ? K.orgSeat.replace("{v}", money(cat.pkg.org.seatMonthly)).replace(", hajm chegirmasi {p}", "") : K.priceTbd}</Text>
          : monthly != null ? (<><Text style={s.price}>{money(monthly)} <Text style={s.per}>{K.perMonth}</Text></Text>{yearly != null && <Text style={s.yr}>{money(yearly)} {K.perYear}{save ? ` · ${K.save.replace("{n}", String(save))}` : ""}</Text>}</>) : <Text style={s.price2}>{K.priceTbd}</Text>}
        {q && <Text style={s.quota}>{id === "premium" ? K.usage.unlimited : qText(q)}</Text>}
      </View>
      <View style={s.pts}>{pts.map((t) => <View key={t} style={s.pt}><Icon name="check" size={16} color={GREEN_TEXT} /><Text style={s.ptT}>{t}</Text></View>)}</View>
      <View style={{ flex: 1 }} />
      {id === "org" ? <><OrgTiers cat={cat} /><Button label={K.orgContact} onPress={onBuy} /></>
        : current ? <Text style={s.curT}>{K.current}</Text>
        : id === "start" ? null
        : monthly != null ? <Button label={K.buy} onPress={onBuy} /> : <Text style={s.tbd} testID={`pack-${id}-tbd`}>{K.priceTbd}</Text>}
    </View>);
}

function OrgTiers({ cat }: { cat: Cat | null }) {
  const seat = cat?.pkg.org.seatMonthly ?? null, tiers = cat?.pkg.org.tiers ?? [];
  if (seat == null || !tiers.length) return <Text style={s.tbd}>{K.priceTbd}</Text>;
  return (<View style={{ gap: 6 }} testID="org-tiers"><Text style={s.orgH}>{K.orgHead}</Text>
    {tiers.map((t) => <View key={t.seats} style={s.orgRow}><Text style={s.orgS}>{K.orgSeats.replace("{n}", String(t.seats))}{t.pct ? ` · −${t.pct}%` : ""}</Text><Text style={s.orgV}>{money(orgMonthly(seat, t) ?? 0)}</Text></View>)}
    <Text style={s.tbd}>{K.orgYear.replace("{v}", money(orgYearly(seat, tiers[tiers.length - 1]) ?? 0))}</Text><Text style={s.orgN}>{K.orgNote}</Text></View>);
}

function Usage({ cat }: { cat: Cat }) {
  const q = cat.pkg.quotas[cat.pkg.plan], u = cat.pkg.usage;
  const rows: ["day" | "week" | "month", string][] = [["day", K.usage.day], ["week", K.usage.week], ["month", K.usage.month]];
  return (<View style={s.usage} testID="pack-usage"><Text style={s.orgH}>{K.usage.title}</Text>
    <View style={s.useRow}>{rows.map(([k, l]) => { const lim = q[k]; const pct = lim === null ? 0 : Math.min(1, u[k] / Math.max(1, lim)); return (
      <View key={k} style={s.useCell}><Text style={s.useL}>{l}</Text><Text style={s.useV}>{lim === null ? `${u[k]} · ${K.usage.unlimited}` : K.usage.of.replace("{a}", String(u[k])).replace("{b}", String(lim))}</Text>
        <View style={s.track}><View style={[s.fill, { width: `${pct * 100}%` }, pct >= 1 && { backgroundColor: color.red }]} /></View>
        <Text style={s.useR}>{K.usage.resets.replace("{t}", fmt(u.resets[k]))}</Text></View>); })}</View>
    {cat.pkg.coupons > 0 && <Text style={s.useL}>{K.usage.coupons.replace("{n}", String(cat.pkg.coupons))}</Text>}</View>);
}

function Matrix() {
  return (<View role="table" aria-label={K.table.title}>
    <View style={[s.mrow, { borderBottomWidth: 2 }]} role="row"><Text style={[s.mh, { flex: 1.6 }]}>{K.table.feature}</Text>{PLAN_ORDER.map((p) => <Text key={p} style={s.mh}>{K.plans[p].t}</Text>)}</View>
    {MATRIX.map((r) => (<View key={r.key} style={s.mrow} role="row"><Text style={[s.mc, { flex: 1.6, color: color.navy, fontWeight: "700" }]}>{K.rows[r.key]}</Text>{r.v.map((v, i) => <Text key={i} style={[s.mc, v === "yes" && { color: GREEN_TEXT, fontWeight: "800" }]}>{K.cell[v]}</Text>)}</View>))}
  </View>);
}

/** Tashkilot murojaati: nom, o'rinlar soni, aloqa. Shartnoma va o'rinlar qo'lda (admin «Moliya → Murojaatlar»). */
function Inquiry({ http, onClose }: { http?: Http; onClose: () => void }) {
  const Q = K.inq; const [org, setOrg] = useState(""); const [seats, setSeats] = useState(""); const [contact, setContact] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(false);
  const ok = org.trim().length >= 2 && Number(seats) >= 1 && contact.trim().length >= 5;
  const send = async () => { if (!http || !ok) return; setBusy(true); setErr(null); try { await http.orgInquiry({ org: org.trim(), seats: Number(seats), contact: contact.trim(), ...(note.trim() ? { note: note.trim() } : {}) }); setDone(true); } catch (e: any) { setErr(String(e?.code ?? "unknown")); } finally { setBusy(false); } };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.back2}><View style={s.sheet} role="dialog" aria-label={Q.title} testID="org-inquiry">
        <Text style={s.cardT} aria-level={2} accessibilityRole="header">{Q.title}</Text>
        {done ? <><Text style={s.cardD} testID="inq-done">{Q.sent}</Text><Button label={Q.close} onPress={onClose} /></> : <>
          <Text style={s.l} nativeID="iq1">{Q.org}</Text><TextInput accessibilityLabelledBy="iq1" aria-label={Q.org} value={org} onChangeText={setOrg} maxLength={80} style={s.inp} />
          <Text style={s.l} nativeID="iq2">{Q.seats}</Text><TextInput accessibilityLabelledBy="iq2" aria-label={Q.seats} value={seats} onChangeText={(t) => setSeats(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" style={s.inp} />
          <Text style={s.l} nativeID="iq3">{Q.contact}</Text><TextInput accessibilityLabelledBy="iq3" aria-label={Q.contact} value={contact} onChangeText={setContact} maxLength={80} autoCapitalize="none" style={s.inp} />
          <Text style={s.l} nativeID="iq4">{Q.note}</Text><TextInput accessibilityLabelledBy="iq4" aria-label={Q.note} value={note} onChangeText={setNote} maxLength={300} multiline style={[s.inp, { minHeight: 72 }]} />
          {err && <Text style={[s.tbd, { color: color.red }]} accessibilityRole="alert">{errText(err)}</Text>}
          <Button label={Q.send} onPress={send} disabled={!ok || busy} /><Button label={Q.close} kind="ghost" onPress={onClose} /></>}
      </View></View>
    </Modal>);
}

type Ord = { id: string; title: string; amount: number; status: string; checkout?: string | null; createdAt?: number };
/** Buyurtma kuzatuvi: har 3 soniyada holatni so'raydi; to'lov qabul qilinsa «rahmat», ota-ona tasdig'ini kutsa shuni aytadi, to'lov oynasini ochish tugmasi. Provayderdan qaytganda ham (`?tolov=`) shu ishlaydi. */
export function OrderTracker({ http, orderId, first, onDone, onClose }: { http?: Http; orderId: string; first?: Ord | null; onDone?: () => void; onClose: () => void }) {
  const T = K.track; const [o, setO] = useState<Ord | null>(first ?? null); const [miss, setMiss] = useState(false); const [tries, setTries] = useState(0); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const poll = async () => { if (!http) return; try { const r = await http.orderGet(orderId); setO(r.order); setMiss(false); } catch (e: any) { if (e?.status === 404 || e?.code === "not_found") setMiss(true); } setTries((n) => n + 1); };
  const st = o?.status; const live = st === "pending_payment" || st === "pending_parent" || !st;
  useEffect(() => { void poll(); }, [orderId]);
  useEffect(() => { if (!live || tries > 200) return; const h = setTimeout(() => void poll(), 3000); return () => clearTimeout(h); }, [tries, live]);
  useEffect(() => { if (st === "paid") onDone?.(); }, [st]);
  const act = async (f: () => Promise<any>, ok?: string) => { setBusy(true); setMsg(null); try { await f(); if (ok) setMsg(ok); await poll(); } catch (e: any) { setMsg(errText(String(e?.code ?? "unknown"))); } finally { setBusy(false); } };
  const openPay = () => { const u = o?.checkout; if (u) { const w = (globalThis as any).window; if (!w?.open?.(u, "_blank", "noopener")) (globalThis as any).location?.assign?.(u); } };
  return (<View style={{ gap: space.md }} testID="order-tracker">
    {miss ? <Text style={s.cardD}>{T.notFound}</Text> : !o ? <Text style={s.cardD}>{T.checking}</Text> : (<>
      <View style={[s.trk, st === "paid" && s.trkOk, (st === "cancelled" || st === "rejected" || st === "refunded") && s.trkBad]} role="status" accessibilityLiveRegion="polite">
        <Text style={s.trkT}>{st === "paid" ? T.paid : st === "pending_payment" ? T.waitingPay : st === "pending_parent" ? T.waitingParent : st === "rejected" ? T.rejected : st === "refunded" ? T.refunded : T.cancelled}</Text>
        <Text style={s.cardD}>{st === "paid" ? T.paidText : st === "pending_payment" ? T.waitingPayText : st === "pending_parent" ? T.waitingParentText : ""}</Text>
        <Text style={s.who}>{o.title} · {money(o.amount)} so'm</Text></View>
      {st === "pending_payment" && o.checkout && <Button label={T.open} onPress={openPay} />}
      {live && tries > 40 && <Text style={s.tbd}>{T.slow}</Text>}
      {live && <Button label={busy ? T.checking : T.check} kind="ghost" onPress={() => act(async () => {})} disabled={busy} />}
      {st === "pending_parent" && <Button label={T.resend} kind="ghost" onPress={() => act(() => http!.orderResend(orderId), T.resent)} disabled={busy} />}
      {live && <Button label={T.cancel} kind="ghost" onPress={() => act(() => http!.orderCancel(orderId))} disabled={busy} />}
    </>)}
    {msg && <Text style={s.tbd} accessibilityRole="alert">{msg}</Text>}
    <Button label={st === "paid" ? T.done : K.back} kind={st === "paid" ? "primary" : "ghost"} onPress={onClose} />
  </View>);
}

/** Provayderdan qaytganda (`?tolov=<buyurtma>`) ko'rsatiladi. */
export function PayResult({ http, orderId, onClose }: { http?: Http; orderId: string; onClose: () => void }) {
  return (<View style={s.root}><View style={[s.back2, { backgroundColor: "#FBFAF7" }]}><View style={s.sheet} role="dialog" aria-label={K.checkout.title} testID="pay-result">
    <Text style={s.cardT} aria-level={1} accessibilityRole="header">{K.checkout.title}</Text><OrderTracker http={http} orderId={orderId} onClose={onClose} /></View></View></View>);
}

/** To'lov oynasi: davr (oylik/yillik), usul (Payme/Click), «To'lash» buyurtma yaratib provayder oynasiga o'tkazadi. Karta ma'lumoti bizda yo'q. */
export function Checkout({ http, id, cat, onClose, onPaid }: { http?: Http; id: PlanId | "coupon"; cat: Cat | null; onClose: () => void; onPaid?: () => void }) {
  const skus = skusOf(id, cat); const providers = (cat?.providers ?? []).filter((x) => x === "payme" || x === "click");
  const [sku, setSku] = useState(skus[0]?.sku ?? ""); const [method, setMethod] = useState<string>(providers[0] ?? ""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [ord, setOrd] = useState<Ord | null>(null);
  const price = skus.find((k) => k.sku === sku)?.price ?? null; const title = id === "coupon" ? K.coupon.title : K.plans[id].t;
  const pay = async () => { if (!http || !sku || !method) return; setBusy(true); setErr(null); try { const r = await http.order(sku, undefined, method); if (r.order) setOrd(r.order); else setErr("unknown"); } catch (e: any) { setErr(String(e?.code ?? e?.message ?? "unknown")); } finally { setBusy(false); } };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.back2}><View style={s.sheet} role="dialog" aria-label={K.checkout.title} testID="checkout">
        <Text style={s.cardT} aria-level={2} accessibilityRole="header">{K.checkout.title}</Text>
        <Text style={s.who}>{K.checkout.order}: {title}</Text>
        {ord ? <OrderTracker http={http} orderId={ord.id} first={ord} onDone={onPaid} onClose={onClose} /> : <>
        {skus.length > 1 && <View style={s.row} role="radiogroup">{skus.map((k) => <Pressable key={k.sku} role="radio" aria-checked={sku === k.sku} accessibilityLabel={k.label} onPress={() => setSku(k.sku)} style={[s.seg, sku === k.sku && s.segOn]}><Text style={[s.segT, sku === k.sku && { color: color.white }]}>{k.label}</Text></Pressable>)}</View>}
        <Text style={s.cardD}>{K.checkout.total}: {price == null ? K.priceTbd : `${money(price)} so'm`}</Text>
        {providers.length > 0 ? (<><Text style={s.l}>{K.checkout.method}</Text>
          <View style={s.row} role="radiogroup">{providers.map((m) => <Pressable key={m} role="radio" aria-checked={method === m} testID={`pay-${m}`} accessibilityLabel={K.checkout[m as "payme" | "click"]} onPress={() => setMethod(m)} style={[s.seg, method === m && s.segOn]}><Text style={[s.segT, method === m && { color: color.white }]}>{K.checkout[m as "payme" | "click"]}</Text></Pressable>)}</View></>) : null}
        <Text style={s.cardD}>{K.checkout.cardNote}</Text><Text style={s.cardD}>{K.checkout.minorNote}</Text>
        <Button label={K.checkout.pay} onPress={pay} disabled={busy || !http || !sku || !method || price == null} />
        {providers.length === 0 && <Text style={s.tbd}>{K.checkout.unavailable}</Text>}
        {err && <Text style={[s.tbd, { color: color.red }]} accessibilityRole="alert" testID="checkout-err">{errText(err)}</Text>}
        <Button label={K.back} kind="ghost" onPress={onClose} /></>}
      </View></View>
    </Modal>);
}

/** Paywall: faqat yangi o'yin maydonini ochmoqchi bo'lganda limit tugagan lahzada. Hech qachon o'yin davomida emas, istalgan paytda yopiladi.
 *  Variantlar: kupon (bor bo'lsa sarflanadi, bo'lmasa sotib olinadi), Plus (tavsiya), Premium, Keyinroq. */
export function Paywall({ http, info, onCoupon, onLater }: { http?: Http; info: PaywallInfo; onCoupon: () => void; onLater: () => void }) {
  const [cat, setCat] = useState<Cat | null>(null); const [buy, setBuy] = useState<PlanId | "coupon" | null>(null);
  useEffect(() => { let off = false; http?.shop().then((c: Cat) => { if (!off) setCat(c); }).catch(() => {}); return () => { off = true; }; }, [http]);
  const w = limitWindow(info.detail.quota, info.detail.usage); const W = K.paywall; const plusP = cat?.plus.monthly ?? null, premP = cat?.premium.monthly ?? null, cP = cat?.pkg.couponPrice ?? null;
  const have = info.detail.coupons;
  return (
    <Modal transparent animationType="fade" onRequestClose={onLater}>
      <View style={s.back2}><View style={s.sheet} role="dialog" aria-label={W.title} testID="paywall">
        <Text style={s.cardT} aria-level={2} accessibilityRole="header">{W.title}</Text>
        {w && <Text style={s.who}>{W[w.win]} · {W.resets.replace("{t}", fmt(w.at))}</Text>}
        <Text style={s.cardD}>{W.text}</Text>
        {have > 0 ? <Button label={`${W.coupon} · ${W.couponHave.replace("{n}", String(have))}`} onPress={onCoupon} />
          : <Button label={cP != null ? `${W.couponBuy} · ${money(cP)}` : W.couponBuy} kind="ghost" onPress={() => cP != null && setBuy("coupon")} disabled={cP == null} />}
        <Pressable accessibilityRole="button" accessibilityLabel={`${K.plans.plus.t}. ${W.plusLine}`} onPress={() => plusP != null && setBuy("plus")} style={[s.opt, s.optHot]} testID="paywall-plus"><View style={{ flex: 1 }}><Text style={s.optT}>{K.plans.plus.t} <Text style={s.rec}>· {W.rec}</Text></Text><Text style={s.optD}>{W.plusLine}</Text></View><Text style={s.optP}>{plusP != null ? `${money(plusP)} ${K.perMonth}` : K.priceTbd}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${K.plans.premium.t}. ${W.premiumLine}`} onPress={() => premP != null && setBuy("premium")} style={s.opt} testID="paywall-premium"><View style={{ flex: 1 }}><Text style={s.optT}>{K.plans.premium.t}</Text><Text style={s.optD}>{W.premiumLine}</Text></View><Text style={s.optP}>{premP != null ? `${money(premP)} ${K.perMonth}` : K.priceTbd}</Text></Pressable>
        <Button label={W.later} kind="ghost" onPress={onLater} />
        <Text style={s.tbd}>{W.note}</Text>
      </View></View>
      {buy && <Checkout http={http} id={buy} cat={cat} onClose={() => setBuy(null)} />}
    </Modal>);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFAF7" }, bar: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, minHeight: 56, borderBottomWidth: 1, borderBottomColor: color.line, backgroundColor: color.white, flexWrap: "wrap" },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 }, backT: { color: color.navy, fontWeight: "700", fontSize: font.md }, title: { color: color.navy, fontSize: font.xl, fontWeight: "800", flex: 1 },
  pilot: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: "#FBF0D3", borderWidth: 1, borderColor: color.gold }, pilotT: { color: "#5E3E00", fontSize: 12, fontWeight: "800" },
  scroll: { padding: space.lg, alignItems: "center" }, wrap: { width: "100%", maxWidth: 1180, gap: space.lg },
  lead: { color: color.text2, fontSize: font.md, lineHeight: 22, maxWidth: 760 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md, alignItems: "stretch" },
  leadBox: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: 22, backgroundColor: color.navy }, leadIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }, leadT: { flex: 1, color: "#E3EBF1", fontSize: font.md, lineHeight: 22 },
  card: { flexGrow: 1, flexBasis: 250, minWidth: 240, gap: space.sm, padding: space.xl, borderRadius: 24, backgroundColor: color.white, borderWidth: 1, borderColor: color.line, shadowColor: "#08263E", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  prem: { borderWidth: 2, borderColor: color.gold, backgroundColor: "#FFFCF4" },
  hot: { borderWidth: 2, borderColor: color.green, shadowOpacity: 0.14 }, cur: { backgroundColor: "#EAF8F1" }, org: { backgroundColor: "#EEF3F7" },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, ico: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#E4F4EC", alignItems: "center", justifyContent: "center" },
  tagBox: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "#F3F6F4", borderWidth: 1, borderColor: color.line }, tagT: { color: color.navy, fontSize: 12, fontWeight: "800" },
  cardT: { color: color.navy, fontSize: font.xl, fontWeight: "800" }, cardD: { color: color.text2, fontSize: font.md, lineHeight: 22 }, who: { color: color.text2, fontSize: font.sm, fontWeight: "600" },
  priceBox: { gap: 2, paddingVertical: space.xs }, price: { color: color.navy, fontSize: 30, fontWeight: "800" }, price2: { color: color.navy, fontSize: font.lg, fontWeight: "800" }, per: { color: color.text2, fontSize: font.sm, fontWeight: "600" }, yr: { color: GREEN_TEXT, fontSize: font.sm, fontWeight: "700" }, quota: { color: color.text2, fontSize: 12, fontWeight: "700" },
  pts: { gap: 7 }, pt: { flexDirection: "row", gap: 8, alignItems: "flex-start" }, ptT: { color: color.navy, fontSize: font.sm, lineHeight: 19, flex: 1 },
  curT: { color: GREEN_TEXT, fontWeight: "800", fontSize: font.md, paddingVertical: space.sm }, tbd: { color: color.text2, fontWeight: "700", fontSize: font.sm },
  orgH: { color: color.navy, fontSize: font.sm, fontWeight: "800" }, orgRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, orgS: { color: color.text2, fontSize: 13 }, orgV: { color: color.navy, fontSize: 13, fontWeight: "800" }, orgN: { color: color.text2, fontSize: 12, lineHeight: 17 },
  usage: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: color.white, borderWidth: 1, borderColor: color.line }, useRow: { flexDirection: "row", flexWrap: "wrap", gap: space.lg }, useCell: { flexGrow: 1, flexBasis: 180, gap: 4 },
  useL: { color: color.text2, fontSize: 12, fontWeight: "700" }, useV: { color: color.navy, fontSize: font.md, fontWeight: "800" }, useR: { color: color.text2, fontSize: 12 }, track: { height: 8, borderRadius: 4, backgroundColor: "#E3EAE6", overflow: "hidden" }, fill: { height: 8, borderRadius: 4, backgroundColor: color.green },
  coupon: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: "#FBF0D3", borderWidth: 1, borderColor: color.gold }, couponIco: { width: 44, height: 44, borderRadius: 14, backgroundColor: color.navy, alignItems: "center", justifyContent: "center" },
  mrow: { flexDirection: "row", gap: 6, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#E8EEEA", alignItems: "center" }, mh: { flex: 1, color: color.navy, fontWeight: "800", fontSize: 12 }, mc: { flex: 1, color: color.text2, fontSize: 12 },
  rules: { color: color.text2, fontSize: 12, lineHeight: 18 }, pay: { color: color.text2, fontSize: 12 },
  back2: { flex: 1, backgroundColor: "rgba(8,38,62,0.55)", alignItems: "center", justifyContent: "center", padding: space.lg }, sheet: { width: "100%", maxWidth: 440, gap: space.md, padding: space.xl, borderRadius: radius.xl, backgroundColor: color.white },
  inp: { minHeight: 48, borderWidth: 1, borderColor: "#7C8FA0", borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.md, color: color.navy, backgroundColor: color.white },
  trk: { gap: 4, padding: space.md, borderRadius: radius.md, backgroundColor: "#FBF0D3", borderWidth: 1, borderColor: color.gold }, trkOk: { backgroundColor: "#E3F3EB", borderColor: color.green }, trkBad: { backgroundColor: "#FBE6E7", borderColor: color.red }, trkT: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  ordRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E8EEEA" }, ordGo: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  l: { color: color.text2, fontSize: font.sm, fontWeight: "700" }, row: { flexDirection: "row", gap: space.sm }, seg: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 2, borderColor: color.line, alignItems: "center", justifyContent: "center", backgroundColor: color.white }, segOn: { backgroundColor: color.green, borderColor: color.green }, segT: { color: color.navy, fontWeight: "800" },
  opt: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, backgroundColor: color.white }, optHot: { borderWidth: 2, borderColor: color.green, backgroundColor: "#EAF8F1" },
  optT: { color: color.navy, fontWeight: "800", fontSize: font.md }, rec: { color: GREEN_TEXT, fontSize: 12 }, optD: { color: color.text2, fontSize: 12 }, optP: { color: color.navy, fontWeight: "800", fontSize: font.sm },
});
