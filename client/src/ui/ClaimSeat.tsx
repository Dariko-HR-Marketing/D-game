import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Banner } from "./kit";
import { Screen } from "./Screen";
import { uz } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { Http } from "../net/http";

/** Sinov rejimi: boshqa brauzer/ilovadan kirilganda boshlangan o'yinda o'z o'rnini (oflayn o'yinchi) qaytarib oladi. Haqiqiy kirishda kerak emas — hisob o'zi tiklaydi. */
export function ClaimSeat({ http, code, onClaim, onCancel }: { http: Http; code: string; onClaim: (userId: string) => void; onCancel: () => void }) {
  const [seats, setSeats] = useState<{ userId: string; name: string | null; online: boolean }[] | null>(null); const [failed, setFailed] = useState(false);
  useEffect(() => { let off = false; (http as any).devSeats(code).then((r: any) => { if (!off) setSeats(r.seats); }).catch(() => { if (!off) setFailed(true); }); return () => { off = true; }; }, [http, code]);
  const free = (seats ?? []).filter((x) => !x.online);
  return (
    <Screen title={uz.claim.title} subtitle={`${uz.claim.sub} · ${code}`} onBack={onCancel} backLabel={uz.claim.cancel} maxWidth={480}>
      <Text style={s.note}>{uz.claim.hint}</Text>
      {failed && <Banner kind="bad">{uz.claim.failed}</Banner>}
      {seats && free.length === 0 && <Banner kind="warn">{uz.claim.none}</Banner>}
      <View style={{ gap: space.sm }} testID="claim-seats">
        {free.map((x) => <Button key={x.userId} label={`${uz.claim.me}: ${x.name ?? uz.claim.unnamed}`} onPress={() => onClaim(x.userId)} />)}
      </View>
    </Screen>);
}
const s = StyleSheet.create({ note: { color: tone.muted, fontSize: font.md, lineHeight: 22 } });
void color;
