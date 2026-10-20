import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { Avatar } from "./Avatar";
import { uz, errText } from "../i18n/uz";
import { color, font, space, tone } from "../theme";
import type { Http } from "../net/http";

const dom = () => (globalThis as any).document as Document | undefined;
/** Tanlangan rasmni kvadratga qirqib, 256 px gacha kichraytiradi va JPEG (≤ ~75 KB) qiladi — server 80 KB dan kattasini rad etadi. */
export async function shrinkPhoto(file: Blob, size = 256): Promise<string> {
  const d = dom(); if (!d) throw new Error("web_only");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("bad_photo")); img.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight); if (!side) throw new Error("bad_photo");
    const c = d.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d")!;
    g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    let q = 0.86, out = c.toDataURL("image/jpeg", q); while (out.length > 100_000 && q > 0.4) { q -= 0.12; out = c.toDataURL("image/jpeg", q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

/** Profil rasmi (avatar): rasm tanlash, almashtirish, olib tashlash. Faqat veb'da (rasm tanlash oynasi brauzerniki). */
export function PhotoPicker({ http, photo, name, colorIdx, onChange }: { http: Http; photo?: string | null; name: string; colorIdx: number; onChange: (photo: string | null) => void }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ kind: "ok" | "bad"; t: string } | null>(null);
  const canPick = !!dom();
  const pick = () => {
    const d = dom(); if (!d) return; const i = d.createElement("input"); i.type = "file"; i.accept = "image/*"; i.style.display = "none"; i.setAttribute("data-testid", "photo-input"); d.body.appendChild(i); // DOM'da turgani — rasm tanlash oynasi barcha brauzerlarda ochiladi
    i.onchange = async () => {
      const f = i.files?.[0]; i.remove(); if (!f) return; setBusy(true); setMsg(null);
      try { const r = await http.uploadAvatar(await shrinkPhoto(f)); onChange(r.photo); setMsg({ kind: "ok", t: uz.profile.photoSaved }); }
      catch (e) { setMsg({ kind: "bad", t: (e as any)?.message === "bad_photo" || (e as any)?.message === "web_only" ? uz.profile.photoBad : errText((e as any)?.code ?? "unknown") }); }
      setBusy(false);
    };
    i.click();
  };
  const remove = async () => { setBusy(true); setMsg(null); try { await http.removeAvatar(); onChange(null); setMsg({ kind: "ok", t: uz.profile.photoRemoved }); } catch (e) { setMsg({ kind: "bad", t: errText((e as any)?.code ?? "unknown") }); } setBusy(false); };
  return (
    <View style={{ gap: space.sm }} testID="photo-picker">
      <View style={s.row}>
        <Avatar name={name || "?"} colorIdx={colorIdx} photo={photo ?? undefined} size={72} />
        <View style={{ flex: 1, gap: space.sm }}>
          {canPick ? <Button label={photo ? uz.profile.photoChange : uz.profile.photoAdd} kind="ghost" onPress={pick} disabled={busy} /> : null}
          {photo ? <Button label={uz.profile.photoRemove} kind="ghost" onPress={remove} disabled={busy} /> : null}
        </View>
      </View>
      <Text style={s.hint}>{uz.profile.photoHint}</Text>
      {msg ? <Text style={[s.hint, { color: msg.kind === "ok" ? tone.good : tone.bad, fontWeight: "700" }]} accessibilityRole={msg.kind === "bad" ? "alert" : undefined} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
    </View>);
}
const s = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: space.md }, hint: { color: tone.muted, fontSize: font.sm, lineHeight: 19 } });
void color;
