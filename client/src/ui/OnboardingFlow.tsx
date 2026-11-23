import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { MODES } from "@tajriba24/rules";
import { Button } from "./Button";
import { money } from "../format";
import { uz } from "../i18n/uz";
import { color, font, night, radius, space } from "../theme";

const F = uz.flow;
const TABS = ["field", "blank", "cards", "hist", "ana", "chat"] as const;
const fill = (t: string) => t.replace("{passive}", money(MODES.standard.exitPassive)).replace("{cash}", money(MODES.standard.exitCash));

/** Majburiy birinchi tanishuv (buyurtmachi qarori 2026-11-21): o'ynaladigan o'quv o'yini o'rniga qadamma-qadam yo'riqnoma. Server maydoni yo'q; har qadamda foydalanuvchi namuna tugmani o'zi bosadi. Tugagach `onDone`. */
export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0); const [acted, setActed] = useState<Record<string, string>>({}); const [seenTabs, setSeenTabs] = useState<string[]>([]); const [tab, setTab] = useState<string | null>(null);
  const n = F.steps.length, last = i === n - 1, st = F.steps[i];
  const act = (v: string) => setActed((a) => ({ ...a, [i]: v }));
  // 0 balans, 1 maqsad, 9 bank, 11 g'alaba: faqat o'qiladi; qolganlarida namuna tugma bosilishi shart
  const needsAction = [2, 3, 4, 5, 6, 7, 8, 10].includes(i);
  const done = !needsAction || (i === 8 ? seenTabs.length === TABS.length : !!acted[i]);
  const go = (d: number) => { setI(i + d); setTab(null); };
  const Mock = ({ children, label }: { children: React.ReactNode; label?: string }) => <View style={s.mock} testID="flow-mock"><Text style={s.sample}>{label ?? F.sample}</Text>{children}</View>;
  const Act = ({ label, v, kind }: { label: string; v: string; kind?: "ghost" }) => <Pressable testID={`flow-act-${v}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => act(v)} style={[s.act, kind === "ghost" && s.actGhost, !!acted[i] && { opacity: 0.55 }]}><Text style={[s.actT, kind === "ghost" && { color: color.navy }]}>{label}</Text></Pressable>;
  const Stat = ({ k, v, c }: { k: string; v: string; c?: string }) => <View style={s.stat}><Text style={s.statK}>{k}</Text><Text style={[s.statV, c ? { color: c } : null]}>{v}</Text></View>;
  const Bar = ({ k, v, pct, c }: { k: string; v: string; pct: number; c: string }) => <View style={{ gap: 4 }}><View style={s.row}><Text style={s.statK}>{k}</Text><Text style={s.statV}>{v}</Text></View><View style={s.barBg}><View style={[s.bar, { width: `${pct}%`, backgroundColor: c }]} /></View></View>;
  const cell = acted[i];
  const body = (() => {
    switch (i) {
      case 0: return <Mock><View style={s.row}><Stat k={F.cash} v="3 000" /><Stat k={F.salary} v="5 000" /><Stat k={F.costs} v="3 500" c={color.red} /></View><Stat k={F.flowL} v="+ 1 500" c={color.green} /></Mock>;
      case 1: return <Mock label="Chiqish shartlari"><Bar k={F.passive} v={`0 / ${money(MODES.standard.exitPassive)}`} pct={4} c={color.green} /><Bar k={F.cash} v={`0 / ${money(MODES.standard.exitCash)}`} pct={2} c={color.gold} /><Bar k={F.debt} v="0" pct={100} c="#2C6DB5" /></Mock>;
      case 2: return <Mock><Act label={F.roll} v="roll" />{cell && <Text style={s.res} testID="flow-res">{F.rolled.split("{n}").join("4")}</Text>}</Mock>;
      case 3: return <Mock><View style={s.card}><Text style={s.cardH}>Kichik biznes</Text><Text style={s.cardP}>Imkoniyat</Text></View><View style={s.row}><Act label={F.buy} v="buy" /><Act label={F.skip} v="skip" kind="ghost" /></View>{cell && <Text style={s.res} testID="flow-res">{cell === "buy" ? F.bought : F.okd}</Text>}</Mock>;
      case 4: return <Mock><View style={s.card}><Text style={s.cardH}>Xarajat</Text><Text style={s.cardP}>Majburiy</Text></View><Act label={F.pay} v="pay" />{cell && <Text style={s.res} testID="flow-res">{F.paid}</Text>}</Mock>;
      case 5: return <Mock><View style={[s.card, { borderColor: color.gold }]}><Text style={s.cardH}>KUTILMAGAN HODISA!</Text><Text style={s.cardP}>Bozor o'zgardi</Text></View><Act label={F.ok} v="ok" />{cell && <Text style={s.res} testID="flow-res">{F.okd}</Text>}</Mock>;
      case 6: return <Mock><Act label={F.fin} v="fin" />{cell && <Text style={s.res} testID="flow-res">{F.finOpen}</Text>}</Mock>;
      case 7: return <Mock><View style={s.row}><Stat k={F.cash} v={cell ? "4 500" : "3 000"} /><Stat k={F.flowL} v="+ 1 500" c={color.green} /></View><Act label={F.month} v="month" />{cell && <Text style={s.res} testID="flow-res">{F.monthD}</Text>}</Mock>;
      case 8: return <Mock><View style={[s.row, { flexWrap: "wrap" }]}>{TABS.map((t) => <Pressable key={t} testID={`flow-tab-${t}`} accessibilityRole="button" accessibilityLabel={F.tabs[t]} onPress={() => { setTab(t); setSeenTabs((a) => (a.includes(t) ? a : [...a, t])); }} style={[s.tab, seenTabs.includes(t) && s.tabSeen, tab === t && { borderColor: color.green }]}><Text style={s.tabT}>{seenTabs.includes(t) ? "✓ " : ""}{F.tabs[t]}</Text></Pressable>)}</View>{tab && <Text style={s.res} testID="flow-res">{F.tabText[tab]}</Text>}<Text style={s.sample}>{seenTabs.length} / {TABS.length}</Text></Mock>;
      case 10: return <Mock><View style={s.card}><Text style={s.cardH}>Qarz so'rovi</Text><Text style={s.cardP}>Do'stingiz qarz so'rayapti. Guvohlar: 3.</Text></View><View style={s.row}><Act label={F.yes} v="yes" /><Act label={F.later} v="later" kind="ghost" /></View>{cell && <Text style={s.res} testID="flow-res">{F.answered}</Text>}</Mock>;
      default: return null;
    }
  })();
  return (
    <View style={s.root} testID="flow-root">
      <View style={s.head}><Text style={s.headT}>{F.title}</Text><Text style={s.headN}>{F.step.replace("{i}", String(i + 1)).replace("{n}", String(n))}</Text></View>
      <View style={s.prog} aria-hidden><View style={[s.fill, { width: `${Math.round(((i + 1) / n) * 100)}%` }]} /></View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.wrap}>
          <Text style={s.h} aria-level={1} accessibilityRole="header">{st.t}</Text>
          <Text style={s.p}>{fill(st.d)}</Text>
          {body}
          {needsAction && !done && <Text style={s.must} testID="flow-must" accessibilityRole="alert">{F.must}</Text>}
          {last && <View style={s.hint}><Text style={s.hintT}>{F.doneText}</Text></View>}
        </View>
      </ScrollView>
      <View style={s.foot}>
        <View style={{ flex: 1 }}>{i > 0 && <Button label={F.back} kind="ghost" onPress={() => go(-1)} />}</View>
        <View style={{ flex: 1.4 }}>{last ? <Button label={F.finish} onPress={onDone} disabled={!done} /> : <Button label={F.next} onPress={() => go(1)} disabled={!done} />}</View>
      </View>
    </View>);
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.white }, head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: night.bg, paddingHorizontal: space.lg, minHeight: 52 },
  headT: { color: "#fff", fontWeight: "800", fontSize: font.md }, headN: { color: night.accent, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  prog: { height: 6, backgroundColor: "#E7EDF1" }, fill: { height: 6, backgroundColor: color.green }, scroll: { padding: space.lg, alignItems: "center", flexGrow: 1 }, wrap: { width: "100%", maxWidth: 560, gap: space.md },
  h: { color: color.navy, fontSize: font.xxl, fontWeight: "800" }, p: { color: color.text2, fontSize: font.lg, lineHeight: 25 },
  mock: { gap: space.md, backgroundColor: "#F4F7F8", borderRadius: radius.lg, borderWidth: 1, borderColor: color.line, padding: space.md }, sample: { color: "#4A5B6C", fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", gap: space.sm, justifyContent: "space-between", alignItems: "center" }, stat: { flex: 1, backgroundColor: color.white, borderRadius: radius.md, padding: space.sm, gap: 2, borderWidth: 1, borderColor: color.line },
  statK: { color: color.text2, fontSize: font.sm, fontWeight: "700" }, statV: { color: color.navy, fontSize: font.lg, fontWeight: "800" },
  barBg: { height: 10, borderRadius: 5, backgroundColor: "#E7EDF1", overflow: "hidden" }, bar: { height: 10, borderRadius: 5 },
  card: { backgroundColor: color.white, borderRadius: radius.md, borderWidth: 2, borderColor: color.green, padding: space.md, gap: 4 }, cardH: { color: color.navy, fontWeight: "800", fontSize: font.lg }, cardP: { color: color.text2, fontSize: font.md },
  act: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: color.green, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md }, actGhost: { backgroundColor: color.white, borderWidth: 1, borderColor: color.line }, actT: { color: "#fff", fontWeight: "800", fontSize: font.md, textAlign: "center" },
  res: { color: "#0E6B4A", fontWeight: "700", fontSize: font.md, backgroundColor: "#E7F4EE", borderRadius: radius.md, padding: space.sm },
  tab: { minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 2, borderColor: color.line, backgroundColor: color.white, alignItems: "center", justifyContent: "center" }, tabSeen: { backgroundColor: "#E7F4EE" }, tabT: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  must: { color: color.red, fontWeight: "700", fontSize: font.sm }, hint: { backgroundColor: "#E7F4EE", borderRadius: radius.md, padding: space.md }, hintT: { color: "#0E6B4A", fontWeight: "700", fontSize: font.md },
  foot: { flexDirection: "row", gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.white },
});
