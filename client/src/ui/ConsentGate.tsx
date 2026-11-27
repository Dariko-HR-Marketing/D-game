import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { Icon } from "./Icon";
import { offer } from "../i18n/uz";
import { color, radius, space, tone } from "../theme";
import type { Http, ConsentInfo } from "../net/http";

const base = (): string => { try { const l = (globalThis as any).location; return l ? l.origin : ""; } catch { return ""; } };
const open = (path: string) => { void Linking.openURL(`${base()}${path}`); };

/** Profil → «Rozilik va maxfiylik»: qabul qilingan versiya, hujjatlar havolasi, rozilikni qaytarib olish. */
export function ConsentCard({ http }: { http: Http }) {
  const [info, setInfo] = useState<ConsentInfo | null>(null); 
  const load = () => http.consent().then(setInfo).catch(() => {}); useEffect(() => { void load(); }, [http]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ gap: space.sm }}>
      <Text style={c.t}>{info?.accepted ? `${offer.acceptedVersion}: ${info.accepted}` : info?.required ? offer.notAccepted : offer.notRequired}</Text>
      <View style={c.row}><Pressable accessibilityRole="link" onPress={() => open(info?.links.offer ?? "/oferta.html")} style={c.lk}><Text style={c.lkT}>{offer.offerLink}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => open(info?.links.privacy ?? "/maxfiylik.html")} style={c.lk}><Text style={c.lkT}>{offer.privacyLink}</Text></Pressable></View>
          </View>
  );
}
const c = StyleSheet.create({ t: { color: tone.muted, fontSize: 13, lineHeight: 18 }, row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm }, lkT: { color: color.green, fontWeight: "700", fontSize: 14, textDecorationLine: "underline" }, lk: { minHeight: 44, justifyContent: "center", paddingRight: 8 }, b: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: color.red, justifyContent: "center", alignSelf: "flex-start" }, bt: { color: color.red, fontWeight: "700", fontSize: 14 } });
