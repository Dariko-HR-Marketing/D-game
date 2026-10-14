import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { Button } from "./Button";
import { uz } from "../i18n/uz";
import { money } from "../format";
import { color, MIN_TAP } from "../theme";
import { bankRoom, canOfferPartner, loanBounds, loanGivers, me, myPartneredAssets, myProposals, partnerCandidates, suyunchiAmounts } from "../model";
import type { RoomView } from "../net/connection";

const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={s.box}><Text style={s.h} accessibilityRole="header">{title}</Text>{children}</View>);

function Pick({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label: string }) {
  return (<View style={s.chips} accessibilityLabel={label}>{options.map((o) => (
    <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: o === value }} onPress={() => onChange(o)} style={[s.chip, o === value && s.chipOn]}>
      <Text style={[s.chipT, o === value && { color: color.white }]}>{o}</Text></Pressable>))}</View>);
}
const Num = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
  <TextInput accessibilityLabel={label} placeholder={label} keyboardType="number-pad" value={value} onChangeText={(t) => onChange(t.replace(/\D/g, ""))} style={s.input} />);

export function Actions({ room, userId, onAct }: { room: RoomView; userId: string; onAct: (a: Record<string, unknown>) => void }) {
  const p = me(room, userId); const st = room.state;
  const [bank, setBank] = useState(""); const [giver, setGiver] = useState(""); const [loanAmt, setLoanAmt] = useState(""); const [months, setMonths] = useState("12");
  const [partner, setPartner] = useState(""); const [sAmt, setSAmt] = useState("100");
  if (!p || st.winner) return null;
  const mineTurn = st.players[st.turn % st.players.length].id === userId;
  const pr = myProposals(room, userId);
  const gv = loanGivers(room, userId); const bounds = giver ? loanBounds(room, userId, giver) : null;
  const buy = canOfferPartner(room, userId);
  const partnered = myPartneredAssets(p);

  return (
    <View style={{ gap: 12 }}>
      {pr.suyunchi.map((x: any) => (
        <Box key={x.id} title={`${uz.coop.suyunchi}: ${x.parent} ${uz.coop.suyunchiFor}`}>
          <Pick label={uz.coop.amount} options={suyunchiAmounts(p.cash).filter((a) => [10, 50, 100, 200, 500].includes(a)).map(String)} value={sAmt} onChange={setSAmt} />
          <Button label={`${uz.coop.give} ${money(Number(sAmt))}`} onPress={() => onAct({ type: "suyunchi", proposalId: x.id, amount: Number(sAmt) })} />
        </Box>))}

      {pr.loansToAccept.map((x: any) => (
        <Box key={x.id} title={`${uz.coop.loan}: ${x.receiver} ${uz.coop.loanReq} — ${money(x.amount)} · ${x.months} ${uz.coop.months.toLowerCase()}`}>
          <Button label={uz.coop.accept} onPress={() => onAct({ type: "loan_accept", proposalId: x.id })} /></Box>))}
      {pr.partnerToAccept.map((x: any) => (
        <Box key={x.id} title={`${uz.coop.partner}: ${x.owner} ${uz.coop.partnerFrom}`}>
          <Button label={uz.coop.accept} onPress={() => onAct({ type: "partner_accept", proposalId: x.id })} /></Box>))}
      {(pr.loansPending.length > 0 || pr.partnerPending.length > 0) && <Text style={s.note}>{uz.coop.waiting}</Text>}

      {mineTurn && (
        <Box title={uz.coop.bank}>
          <Text style={s.note}>{uz.coop.bankRoom}: {money(bankRoom(p))}</Text>
          <Num label={uz.coop.bankHint} value={bank} onChange={setBank} />
          <Button label={uz.coop.take} kind="ghost" disabled={!bank || Number(bank) % 100 !== 0 || Number(bank) > bankRoom(p)} onPress={() => { onAct({ type: "bank_loan", amount: Number(bank) }); setBank(""); }} />
        </Box>)}

      {buy && (
        <Box title={uz.coop.partner}>
          <Pick label={uz.coop.chooseHint} options={partnerCandidates(room, userId)} value={partner} onChange={setPartner} />
          <Button label={uz.coop.partnerOffer} disabled={!partner} onPress={() => onAct({ type: "partner_offer", partnerId: partner })} /></Box>)}
      {partnered.map((a: any) => (
        <Button key={a.code} label={`${uz.coop.partnerBuyout}: ${a.code}`} kind="ghost" onPress={() => onAct({ type: "partner_buyout", assetCode: a.code })} />))}

      {p.circle === "small" && gv.length > 0 && (
        <Box title={uz.coop.loan}>
          {!loanBounds(room, userId, gv[0]).enough ? <Text style={s.note}>{uz.coop.fewPlayers}</Text> : (<>
            <Pick label={uz.coop.giver} options={gv} value={giver} onChange={setGiver} />
            {bounds && <Text style={s.note}>{uz.coop.max}: {money(bounds.max)}</Text>}
            <Num label={uz.coop.amount} value={loanAmt} onChange={setLoanAmt} />
            <Num label={uz.coop.months} value={months} onChange={setMonths} />
            <Button label={uz.coop.loanAsk} kind="ghost" disabled={!giver || !loanAmt || !months || Number(loanAmt) > (bounds?.max ?? 0) || Number(months) > 36}
              onPress={() => { onAct({ type: "loan_request", giverId: giver, amount: Number(loanAmt), months: Number(months) }); setLoanAmt(""); }} /></>)}
        </Box>)}

      {p.handDebts?.length > 0 && (
        <Box title={uz.coop.debts}>{p.handDebts.map((d: any) => (
          <View key={d.id} style={s.row}><Text style={s.note}>{d.to}: {money(d.amount)}</Text>
            <Button label={uz.coop.repay} kind="ghost" onPress={() => onAct({ type: "loan_repay", debtId: d.id, amount: Math.min(d.amount, Math.floor(p.cash)) })} /></View>))}</Box>)}
    </View>
  );
}
const s = StyleSheet.create({
  box: { backgroundColor: color.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: color.line, gap: 10 },
  h: { fontWeight: "700", color: color.navy }, note: { color: color.text2 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  input: { minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, color: color.navy, backgroundColor: color.white },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { minHeight: MIN_TAP, minWidth: MIN_TAP, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: color.navy, borderColor: color.navy }, chipT: { color: color.navy, fontWeight: "600" },
});
