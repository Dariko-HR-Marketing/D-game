import React, { useState } from "react";
import { bankLoanPayoff, lombardPayoff, mutualLoanLimit, oneTimeFee, RULES } from "@tajriba24/rules";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color, MIN_TAP } from "../theme";
import { offerHowLines } from "../offerHow";
import { nameOf, bankRoom, pledgeableAssets, sellableAssets, canOfferPartner, marketOffers, loanBounds, loanGivers, loanWitnessOptions, me, myPartneredAssets, myProposals, partnerCandidates, suyunchiAmounts } from "../model";
import type { RoomView } from "../net/connection";

/** Moliya amali bloki: sarlavha qatori bosilsa yig'iladi (akkordion; qaror 2026-11-27). Belgi amal turiga qarab; ochiq turadi, shunda amal shakli doim ko'rinadi. */
const Box = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: IconName }) => {
  const [open, setOpen] = useState(true);
  return (<View style={[s.box, !open && { paddingBottom: 0 }]}>
    <Pressable accessibilityRole="button" aria-expanded={open} accessibilityState={{ expanded: open }} accessibilityLabel={title} onPress={() => setOpen(!open)} style={s.hRow}>
      {icon ? <View style={s.hIco} aria-hidden><Icon name={icon} size={18} color={color.navy} /></View> : null}
      <Text style={[s.h, { flex: 1 }]} aria-level={2} accessibilityRole="header">{title}</Text>
      <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }} aria-hidden><Icon name="chevron" size={18} color={color.navy} /></View>
    </Pressable>{open ? children : null}</View>);
};

/** Limit o'lchagichi (infografika): to'ldirilgan qismi ishlatilgan; kengligi silliq o'zgaradi (web'da CSS o'tish). */
function Gauge({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((used / total) * 100))) : 0; const hot = pct >= 80;
  return (<View style={{ gap: 4 }} accessible accessibilityLabel={`${label}: ${money(used)} / ${money(total)}`} testID="gauge">
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={s.note}>{label}</Text><Text style={[s.note, { fontWeight: "800", color: hot ? color.red : color.navy }]}>{money(used)} / {money(total)}</Text></View>
    <View style={{ height: 10, borderRadius: 5, backgroundColor: "#E8EEF1", overflow: "hidden" }} aria-hidden><View style={[{ height: 10, borderRadius: 5, width: `${pct}%` as any, backgroundColor: hot ? color.red : color.green }, { transitionProperty: "width", transitionDuration: "450ms" } as any]} /></View>
  </View>);
}

/** Ulush chizig'i (infografika): ikki rangli, chap ulush `pct` %; qiymat belgilari ostida. */
function Split({ pct, left, right }: { pct: number; left: string; right: string }) {
  return (<View style={{ gap: 4 }} accessible accessibilityLabel={`${left} ${pct} %, ${right} ${100 - pct} %`} testID="split">
    <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" }} aria-hidden><View style={{ width: `${pct}%` as any, backgroundColor: color.green }} /><View style={{ flex: 1, backgroundColor: "#F0B429" }} /></View>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }} aria-hidden><Text style={s.note}>{left}: {pct} %</Text><Text style={s.note}>{right}: {100 - pct} %</Text></View>
  </View>);
}

function Pick({ options, value, onChange, label, names }: { options: string[]; value: string; onChange: (v: string) => void; label: string; names?: (id: string) => string }) {
  return (<View style={s.chips} role="group" aria-label={label}>{options.map((o) => (
    <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: o === value }} onPress={() => onChange(o)} style={[s.chip, o === value && s.chipOn]}>
      <Text style={[s.chipT, o === value && { color: color.white }]}>{names ? names(o) : o}</Text></Pressable>))}</View>);
}
const Num = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
  <TextInput accessibilityLabel={label} placeholder={label} keyboardType="number-pad" value={value} onChangeText={(t) => onChange(t.replace(/\D/g, ""))} style={s.input} />);

export function Actions({ room, userId, onAct }: { room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void }) {
  const p = me(room, userId); const st = room.state;
  const [bank, setBank] = useState(""); const [giver, setGiver] = useState(""); const [wit, setWit] = useState<string[]>(["", "", ""]); const [loanAmt, setLoanAmt] = useState(""); const [months, setMonths] = useState("12");
  const [listPct, setListPct] = useState(50);
  const [partner, setPartner] = useState(""); const [sAmt, setSAmt] = useState("100"); const [sellIdx, setSellIdx] = useState<number | null>(null);
  if (!p || st.winner) return null;
  const mineTurn = st.players[st.turn % st.players.length].id === userId;
  const pk = room.pendingCard?.effect?.kind; const buyCardOpen = mineTurn && (pk === "buy" || pk === "buyShares") && !String(room.pendingCard?.id ?? "").startsWith("big-");
  const pr = myProposals(room, userId);
  const gv = loanGivers(room, userId); const bounds = giver ? loanBounds(room, userId, giver) : null;
  const buy = canOfferPartner(room, userId);
  const partnered = myPartneredAssets(p);
  const offers = marketOffers(room, userId);

  return (
    <View style={{ gap: 12 }}>
      {offers.map((o) => (
        <Box key={`${o.proposalId}${o.assetCode}`} title={`${uz.coop.market}: ${o.assetCode}`}>
          <Text style={s.note}>{o.text}</Text>
          <Text style={s.note}>{uz.coop.sellFor}: {money(o.price)} · {uz.coop.net}: {money(o.net)}</Text>
          {offerHowLines(o).map((l, i) => <Text key={i} style={s.note}>{l}</Text>)}
          <Button label={`${uz.coop.sell} ${money(o.price)}`} onPress={() => onAct({ type: "market_sell", proposalId: o.proposalId, assetCode: o.assetCode })} />
        </Box>))}
      {pr.suyunchi.map((x: any) => (
        <Box key={x.id} title={`${uz.coop.suyunchi}: ${nameOf(room, x.parent)} ${uz.coop.suyunchiFor}`}>
          <Pick label={uz.coop.amount} options={suyunchiAmounts(p.cash).filter((a) => [10, 50, 100, 200, 500].includes(a)).map(String)} value={sAmt} onChange={setSAmt} />
          <Button label={`${uz.coop.give} ${money(Number(sAmt))}`} onPress={() => onAct({ type: "suyunchi", proposalId: x.id, amount: Number(sAmt) })} />
        </Box>))}

      {pr.loansToWitness.map((x: any) => (
        <Box key={`w${x.id}`} title={uz.coop.witnessTitle.replace("{a}", nameOf(room, x.receiver)).replace("{b}", nameOf(room, x.giver)) + ` — ${money(x.amount)} · ${x.months} ${uz.coop.months.toLowerCase()}`}>
          <Text style={s.note}>{uz.coop.witnessAsk}</Text>
          <Button label={uz.coop.witnessYes} onPress={() => onAct({ type: "loan_witness", proposalId: x.id })} /></Box>))}
      {pr.loansToAccept.map((x: any) => (
        <Box key={x.id} title={`${uz.coop.loan}: ${nameOf(room, x.receiver)} ${uz.coop.loanReq} — ${money(x.amount)} · ${x.months} ${uz.coop.months.toLowerCase()}`}>
          {x.witnesses && (x.confirmed ?? []).length < x.witnesses.length && <Text style={s.note} accessibilityRole="alert">{uz.coop.witnessWait.replace("{n}", String((x.confirmed ?? []).length)).replace("{m}", String(x.witnesses.length))}</Text>}
          {p.cash < x.amount && <Text style={s.note} accessibilityRole="alert">{uz.coop.needCashLoan.replace("{n}", money(x.amount))}</Text>}
          <View style={s.btns}>
            <View style={s.btn}><Button label={uz.coop.accept} disabled={p.cash < x.amount || (!!x.witnesses && (x.confirmed ?? []).length < x.witnesses.length)} onPress={() => onAct({ type: "loan_accept", proposalId: x.id })} /></View>
            <View style={s.btn}><Button kind="ghost" label={uz.coop.decline} onPress={() => onAct({ type: "loan_decline", proposalId: x.id })} /></View>
          </View></Box>))}
      {pr.partnerToAccept.map((x: any) => (
        <Box key={x.id} title={`${uz.coop.partner}: ${nameOf(room, x.owner)} ${uz.coop.partnerFrom}`}>
          {x.half != null && <Text style={s.note}>{uz.coop.yourShare}: {money(x.half)}</Text>}
          {x.half != null && p.cash < x.half && <Text style={s.note} accessibilityRole="alert">{uz.coop.needCashPartner.replace("{n}", money(x.half))}</Text>}
          <View style={s.btns}>
            <View style={s.btn}><Button label={uz.coop.accept} disabled={x.half != null && p.cash < x.half} onPress={() => onAct({ type: "partner_accept", proposalId: x.id })} /></View>
            <View style={s.btn}><Button kind="ghost" label={uz.coop.decline} onPress={() => onAct({ type: "partner_decline", proposalId: x.id })} /></View>
          </View></Box>))}
      {pr.loansPending.map((x: any) => x.witnesses ? <Text key={`lp${x.id}`} style={s.note} accessibilityLiveRegion="polite">{uz.coop.witnessWait.replace("{n}", String((x.confirmed ?? []).length)).replace("{m}", String(x.witnesses.length))}</Text> : null)}
      {(pr.loansPending.length > 0 || pr.partnerPending.length > 0) && <Text style={s.note}>{uz.coop.waiting}</Text>}
      {pr.loansPending.map((x: any) => (<Box key={`lc${x.id}`} title={`${uz.coop.myRequest}: ${nameOf(room, x.giver)} — ${money(x.amount)}`}>
        <Text style={s.note}>{uz.coop.requestLife}</Text>
        <Button kind="ghost" label={uz.coop.cancelRequest} onPress={() => onAct({ type: "loan_cancel", proposalId: x.id })} /></Box>))}

      {mineTurn && (
        <Box title={uz.coop.bank} icon="bank">
          <Gauge used={Math.max(0, RULES.bankLimit - bankRoom(p))} total={RULES.bankLimit} label={uz.coop.bankLimitUsed} />
          <Text style={s.note}>{uz.coop.bankRoom}: {money(bankRoom(p))}</Text>
          <Text style={s.note}>{buyCardOpen ? uz.coop.bankRules : uz.coop.bankPurpose}</Text>
          <Num label={uz.coop.bankHint} value={bank} onChange={setBank} />
          {p.halalFin && Number(bank) >= RULES.bankMin && <Text style={s.note}>{uz.coop.bankFee.replace("{v}", money(oneTimeFee(Number(bank), RULES.bankFeePct, p.children))).replace("{p}", String(RULES.childFeeDiscountPct))}</Text>}
          <Button label={uz.coop.take} kind="ghost" disabled={!buyCardOpen || !bank || Number(bank) % 100 !== 0 || Number(bank) < 2000 || Number(bank) > bankRoom(p)} onPress={() => { onAct({ type: "bank_loan", amount: Number(bank) }); setBank(""); }} />
          {(p.bankLoans ?? []).map((l: any, i: number) => { const elapsed = 36 - l.left, cost = bankLoanPayoff(l);
            return (<Button key={i} kind="ghost" label={`${uz.coop.repayEarly}: ${money(l.amount)} · ${money(cost)}`} disabled={elapsed < RULES.bankEarlyCloseMonths || p.cash < cost} onPress={() => onAct({ type: "bank_repay", loanIdx: i })} />); })}
        </Box>)}
      {mineTurn && p.halalFin && p.circle === "small" && !room.state?.auction && pledgeableAssets(p).length > 0 && (
        <Box title={uz.auction.listTitle} icon="board">
          <Text style={s.note}>{uz.auction.listHint}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{[50, 60, 70, 80, 90, 100].map((v) => (<Button key={v} kind={listPct === v ? "primary" : "ghost"} label={uz.auction.listPct.replace("{p}", String(v))} onPress={() => setListPct(v)} />))}</View>
          {(() => { const rivals = st.players.filter((o: any) => o.id !== userId && o.circle === p.circle && !(st.restricted ?? []).includes(o.id)); const enough = (start: number) => rivals.filter((o: any) => o.cash >= start).length >= RULES.auctionMinBidders; let blocked = false;
            const btns = pledgeableAssets(p).map(({ idx, a }) => { const start = Math.ceil((a.price * listPct) / 100 / 100) * 100, ok = enough(start); if (!ok) blocked = true;
              return (<Button key={`al${idx}`} kind="ghost" label={`${uz.auction.listBtn}: ${a.code} · ${money(start)}`} disabled={!ok} onPress={() => onAct({ type: "auction_list", assetIdx: idx, pct: listPct })} />); });
            return (<>{btns}{blocked && <Text style={s.note} accessibilityRole="alert" testID="auction-few">{uz.auction.listFew.replace("{n}", String(RULES.auctionMinBidders))}</Text>}</>); })()}
        </Box>)}
      {mineTurn && pledgeableAssets(p).length > 0 && (
        <Box title={uz.coop.lombard} icon="lock">
          <Text style={s.note}>{uz.coop.lombardRules}</Text>
          <Split pct={50} left={uz.coop.splitYouGet} right={uz.coop.splitPledged} />
          {pledgeableAssets(p).map(({ idx, a }) => (<Button key={idx} kind="ghost" label={`${a.code} → +${money(Math.floor((a.price * 0.5) / 100) * 100)}`} onPress={() => onAct({ type: "lombard", assetIdx: idx })} />))}
        </Box>)}
      {mineTurn && sellableAssets(p).length > 0 && (
        <Box title={uz.slots.sellTitle} icon="dollar">
          <Text style={s.note}>{uz.slots.sellHint}</Text>
          {sellableAssets(p).map(({ idx, a, proceeds }) => sellIdx === idx ? (
            <View key={idx} style={{ gap: 6 }}>
              <Text style={s.note}>{a.code}: +{money(proceeds)} {uz.slots.youGet}{a.credit > 0 ? ` · ${uz.slots.creditClosed}` : ""}</Text>
              <Button label={uz.slots.confirm} onPress={() => { onAct({ type: "sell_asset", assetIdx: idx }); setSellIdx(null); }} />
              <Button label={uz.slots.cancel} kind="ghost" onPress={() => setSellIdx(null)} />
            </View>) : (
            <Button key={idx} kind="ghost" label={`${uz.slots.sell}: ${a.code} → +${money(proceeds)}`} onPress={() => setSellIdx(idx)} />))}
        </Box>)}
      {(p.lombards ?? []).length > 0 && (<Text style={s.note}>{uz.coop.lombardActive}: {(p.lombards as any[]).map((l) => `${l.code} ${money(l.amount)} · ${l.left} ${uz.coop.months.toLowerCase()}`).join("; ")}</Text>)}
      {mineTurn && (p.lombards ?? []).map((l: any, i: number) => (<Button key={`lr${i}`} kind="ghost" label={`${uz.coop.lombardRepay}: ${l.code} · ${money(lombardPayoff(l))}`} disabled={p.cash < lombardPayoff(l)} onPress={() => onAct({ type: "lombard_repay", lombardIdx: i })} />))}

      {buy && (
        <Box title={uz.coop.partner} icon="people">
          <Split pct={50} left={uz.coop.splitYou} right={uz.coop.splitPartner} />
          <Pick label={uz.coop.chooseHint} options={partnerCandidates(room, userId)} value={partner} onChange={setPartner} names={(id) => nameOf(room, id)} />
          <Button label={uz.coop.partnerOffer} disabled={!partner} onPress={() => onAct({ type: "partner_offer", partnerId: partner })} /></Box>)}
      {partnered.map((a: any) => (
        <Button key={a.code} label={`${uz.coop.partnerBuyout}: ${a.code}`} kind="ghost" onPress={() => onAct({ type: "partner_buyout", assetCode: a.code })} />))}

      {p.circle === "small" && gv.length > 0 && (
        <Box title={uz.coop.loan} icon="hand">
          {!loanBounds(room, userId, gv[0]).enough ? <Text style={s.note}>{uz.coop.fewPlayers}</Text> : (<>
            <Pick label={uz.coop.giver} options={gv} value={giver} onChange={(v: string) => { setGiver(v); setWit(["", "", ""]); }} names={(id) => nameOf(room, id)} />
            <Gauge used={(p.handDebts ?? []).reduce((t: number, d: any) => t + d.amount, 0)} total={mutualLoanLimit(p.salary, (p.assets ?? []).reduce((t: number, as: any) => t + as.monthlyIncome, 0))} label={uz.coop.loanLimitUsed} />
            {bounds && <Text style={s.note}>{uz.coop.max}: {money(bounds.max)}</Text>}
            <Num label={uz.coop.amount} value={loanAmt} onChange={setLoanAmt} />
            <Num label={uz.coop.months} value={months} onChange={setMonths} />
            {giver !== "" && !!room.state.witnessLoans && loanWitnessOptions(room, userId, giver).length < 3 && <Text style={s.note} accessibilityRole="alert">{uz.coop.fewWitnesses}</Text>}
            {giver !== "" && !!room.state.witnessLoans && [0, 1, 2].map((i) => (
              <View key={`wv${i}`} style={{ gap: 4 }}><Text style={s.note}>{uz.coop.witnessPick.replace("{n}", String(i + 1))}</Text><Pick key={`wp${i}`} label={uz.coop.witnessPick.replace("{n}", String(i + 1))} options={loanWitnessOptions(room, userId, giver).filter((id) => !wit.some((w, j) => j !== i && w === id))} value={wit[i] ?? ""} onChange={(v: string) => setWit((w) => w.map((x, j) => (j === i ? v : x)))} names={(id) => nameOf(room, id)} /></View>))}
            <Button label={uz.coop.loanAsk} kind="ghost" disabled={!giver || !loanAmt || !months || Number(loanAmt) > (bounds?.max ?? 0) || Number(months) > 36 || (!!room.state.witnessLoans && wit.some((w) => !w))}
              onPress={() => { onAct({ type: "loan_request", giverId: giver, amount: Number(loanAmt), months: Number(months), ...(room.state.witnessLoans ? { witnesses: wit } : {}) }); setLoanAmt(""); setWit(["", "", ""]); }} /></>)}
        </Box>)}

      {(() => {
        const owed = (room.state.players as any[]).flatMap((q) => (q.handDebts ?? []).filter((d: any) => d.to === userId).map((d: any) => ({ ...d, debtor: q.id })));
        return owed.length > 0 && (
          <Box title={uz.coop.owed} icon="clock">{owed.map((d: any) => (
            <View key={d.id} style={s.row}><Text style={s.note}>{nameOf(room, d.debtor)}: {money(d.amount)}</Text>
              <Button label={uz.coop.remind} kind="ghost" disabled={d.remindedRound === room.state.round} onPress={() => onAct({ type: "loan_remind", debtorId: d.debtor, debtId: d.id })} /></View>))}</Box>);
      })()}

      {p.handDebts?.length > 0 && (
        <Box title={uz.coop.debts} icon="list">{p.handDebts.map((d: any) => (
          <View key={d.id} style={s.row}><Text style={s.note}>{nameOf(room, d.to)}: {money(d.amount)}</Text>
            <Button label={uz.coop.repay} kind="ghost" onPress={() => onAct({ type: "loan_repay", debtId: d.id, amount: Math.min(d.amount, Math.floor(p.cash)) })} /></View>))}</Box>)}
    </View>
  );
}
const s = StyleSheet.create({
  hRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: MIN_TAP }, hIco: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EAF3EF", alignItems: "center", justifyContent: "center" },
  box: { backgroundColor: color.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: color.line, gap: 10 },
  h: { fontWeight: "700", color: color.navy }, note: { color: color.text2 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  input: { minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, color: color.navy, backgroundColor: color.white },
  btns: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, btn: { flexGrow: 1, flexBasis: 140 }, // tor ekranda ustma-ust, keng ekranda yonma-yon
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { minHeight: MIN_TAP, minWidth: MIN_TAP, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: color.navy, borderColor: color.navy }, chipT: { color: color.navy, fontWeight: "600" },
});
