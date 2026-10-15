// Plus/do'kon (maket N44–N48, N53), sinf va o'qituvchi paneli (D10), homiy turniri (D11).
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Screen } from "./Screen";
import { Button } from "./Button";
import { Banner, Card, Divider, Pill, Row, SectionTitle, Stat } from "./kit";
import { errText } from "../i18n/uz";
import { color, font, MIN_TAP, radius, space, tone } from "../theme";
import type { Http } from "../net/http";
import { HttpError } from "../net/http";

const money = (n: number | null | undefined) => (n === null || n === undefined ? "narx belgilanmagan" : `${n.toLocaleString("uz").replace(/,/g, " ")} sh.b.`);
const date = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString("uz") : "—");
const code = (e: unknown) => (e instanceof HttpError ? e.code : "network");
const DEV_PAY = process.env.EXPO_PUBLIC_DEV_PAY === "1";

function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null); const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(() => { fn().then((d) => { setData(d); setErr(null); }).catch((e) => setErr(code(e))); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { data, err, reload };
}
function Field({ label, value, onChange, placeholder, max, keyboard, caps }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max?: number; keyboard?: "phone-pad" | "number-pad" | "default"; caps?: boolean }) {
  return (<View style={{ gap: space.xs, flex: 1, minWidth: 160 }}><Text style={s.label}>{label}</Text>
    <TextInput aria-label={label} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#6B7C8C" maxLength={max} keyboardType={keyboard} autoCapitalize={caps ? "characters" : "none"} style={s.input} /></View>);
}
const Msg = ({ e }: { e: string | null }) => (e ? <Banner kind="bad">{errText(e)}</Banner> : null);
function Tabs<T extends string>({ items, active, onChange, label }: { items: [T, string][]; active: T; onChange: (k: T) => void; label: string }) {
  return (<View role="tablist" aria-label={label} style={s.tabs}>{items.map(([k, l]) => (
    <Pressable key={k} role="tab" accessibilityRole="tab" aria-selected={k === active} accessibilityState={{ selected: k === active }} onPress={() => onChange(k)} style={[s.tab, k === active && s.tabOn]}><Text style={[s.tabT, k === active && { color: color.white }]}>{l}</Text></Pressable>))}</View>);
}

/* ---------------- Do'kon va Plus ---------------- */
const KINDS: [string, string][] = [["pawn", "Fishkalar"], ["frame", "Ramkalar"], ["avatar", "Fon"]];
export function ShopScreen({ http, onBack }: { http: Http; onBack: () => void }) {
  const shop = useLoad(() => http.shop(), [http]); const acc = useLoad(() => http.account(), [http]);
  const [tab, setTab] = useState("pawn"); const [err, setErr] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);
  const [parentPhone, setParentPhone] = useState(""); const [phone, setPhone] = useState(""); const [otp, setOtp] = useState(""); const [sent, setSent] = useState(false);
  const run = async (fn: () => Promise<any>, ok?: string) => { setErr(null); setNote(null); try { await fn(); if (ok) setNote(ok); } catch (e) { setErr(code(e)); } shop.reload(); acc.reload(); };
  const d = shop.data, a = acc.data;
  const pending = (d?.orders ?? []).filter((o: any) => o.status === "pending_parent" || o.status === "pending_payment");
  const minor = !!a && a.age !== null && a.age < 18;
  const buy = (sku: string) => run(async () => { const r = await http.order(sku, minor ? parentPhone : undefined); if (r.order?.checkout) (globalThis as any).window?.open?.(r.order.checkout, "_blank", "noopener"); }, "Buyurtma yaratildi");
  return (
    <Screen title="Do'kon va Plus" subtitle="Ko'rinish uchun narsalar. Ular o'yin natijasiga ta'sir qilmaydi." onBack={onBack} maxWidth={720}>
      <Msg e={err || shop.err} />{note && <Banner kind="good">{note}</Banner>}
      {a && !a.phoneVerified && (
        <Card label="Telefon tasdig'i" accent="gold"><SectionTitle>Telefonni tasdiqlang</SectionTitle>
          <Text style={s.p}>Xarid qilish va Plus uchun raqamingiz tasdiqlangan bo'lishi kerak. Bitta raqam — bitta hisob.</Text>
          {!a.smsAvailable ? <Banner kind="warn">SMS xizmati hozircha ulanmagan.</Banner> : !sent ? (<View style={s.rowW}><Field label="Telefon raqami" value={phone} onChange={setPhone} placeholder="+998 90 123 45 67" keyboard="phone-pad" max={20} /><Button label="Kod yuborish" disabled={phone.replace(/\D/g, "").length < 9} onPress={() => run(async () => { await http.phoneRequest(phone); setSent(true); })} /></View>)
            : (<View style={s.rowW}><Field label="SMS kodi (6 raqam)" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, ""))} keyboard="number-pad" max={6} /><Button label="Tasdiqlash" disabled={otp.length !== 6} onPress={() => run(async () => { await http.phoneVerify(phone, otp); setSent(false); setOtp(""); }, "Telefon tasdiqlandi")} /></View>)}
        </Card>)}
      {d && (<>
        <Card label="POYGA Plus" accent={d.plus.active ? "green" : undefined}>
          <SectionTitle right={<Pill label={d.plus.active ? "Faol" : "Faol emas"} kind={d.plus.active ? "good" : "plain"} />}>POYGA Plus</SectionTitle>
          <Text style={s.p}>Cheklovsiz xonalar, to'liq o'yin tarixi va barcha o'yinlar tahlili, reklamasiz, har oy bitta Plus narsa. O'yin kuchiga ta'sir qilmaydi.</Text>
          <Row l="Bepul tarifda" v={`kuniga ${d.plus.features.rooms ?? "∞"} xona, oxirgi ${d.plus.features.history ?? "∞"} o'yin`} />
          {d.plus.active ? (<>
            <Row l="Amal qiladi" v={`${date(d.plus.until)} gacha`} />
            {d.plus.cancelled ? <Banner kind="info">Avtomatik uzaytirish o'chirilgan. Muddat tugaguncha foydalanasiz.</Banner> : <Button kind="ghost" label="Uzaytirishni to'xtatish" onPress={() => run(() => http.cancelPlus(), "Uzaytirish to'xtatildi")} />}
          </>) : null}
          {minor && <Field label="Ota-onangizning telefon raqami" value={parentPhone} onChange={setParentPhone} placeholder="+998 …" keyboard="phone-pad" max={20} />}
          {minor && <Text style={s.small}>18 yoshgacha xarid ota-ona roziligi bilan. Unga SMS orqali havola yuboriladi; raqam qaror qabul qilingach o'chiriladi.</Text>}
          <View style={s.rowW}>
            <Button label={`Oylik · ${money(d.plus.monthly)}`} disabled={d.plus.monthly === null} onPress={() => buy("plus:monthly")} />
            <Button kind="ghost" label={`Yillik · ${money(d.plus.yearly)}`} disabled={d.plus.yearly === null} onPress={() => buy("plus:yearly")} />
          </View>
          {!d.paymentsReady && <Banner kind="warn">To'lov usullari hozircha ulanmagan.</Banner>}
          <Button kind="ghost" label="Xaridni tiklash" onPress={() => run(() => http.restore(), "Tekshirildi")} />
        </Card>

        {pending.map((o: any) => (
          <Card key={o.id} label={`Buyurtma ${o.title}`} accent="gold"><SectionTitle>{o.title}</SectionTitle>
            {o.status === "pending_parent" ? <Text style={s.p}>Ota-onangiz javobini kutyapmiz. SMS havolasi 3 kun amal qiladi.</Text> : <Text style={s.p}>To'lov kutilmoqda · {money(o.amount)}</Text>}
            <View style={s.rowW}>
              {o.status === "pending_parent" && <Button kind="ghost" label="SMS ni qayta yuborish" onPress={() => run(() => http.orderResend(o.id), "Yuborildi")} />}
              {o.status === "pending_payment" && o.checkout && <Button label="To'lovga o'tish" onPress={() => (globalThis as any).window?.open?.(o.checkout, "_blank", "noopener")} />}
              {o.status === "pending_payment" && DEV_PAY && <Button label="Sinov to'lovi" onPress={() => run(() => http.devPay(o.id), "To'landi")} />}
              <Button kind="ghost" label="Bekor qilish" onPress={() => run(() => http.orderCancel(o.id))} />
            </View></Card>))}

        <Card label="Do'kon"><SectionTitle>Ko'rinish</SectionTitle>
          <Tabs label="Turlari" items={KINDS as [string, string][]} active={tab} onChange={setTab} />
          <View style={s.grid}>
            {d.items.filter((i: any) => i.kind === tab).map((i: any) => {
              const usable = i.owned && (i.source !== "plus" || d.plus.active);
              return (<View key={i.id} style={[s.item, i.equipped && { borderColor: color.green, borderWidth: 2 }]} accessible accessibilityLabel={`${i.name}. ${i.desc}`}>
                <View style={[s.swatch, { backgroundColor: i.color }]} aria-hidden />
                <Text style={s.itemT}>{i.name}</Text><Text style={s.small}>{i.desc}</Text>
                {i.equipped ? <Pill label="Tanlangan" kind="good" /> : usable ? <Button kind="ghost" label="Tanlash" onPress={() => run(() => http.equip(i.kind, i.id))} />
                  : i.source === "shop" && i.available ? <Button label={i.price === null ? "Tez orada" : money(i.price)} disabled={i.price === null} onPress={() => buy(`item:${i.id}`)} />
                  : i.source === "plus" ? (d.plus.active && !d.plus.claimedThisMonth ? <Button label="Bu oy olish" onPress={() => run(() => http.claimMonthly(i.id), "Qo'shildi")} /> : <Pill label="Plus" kind="warn" />)
                  : i.source === "achievement" ? <Pill label="Yutuq uchun" kind="info" /> : <Pill label="Tez orada" kind="plain" />}
              </View>);
            })}
          </View>
        </Card>
      </>)}
    </Screen>
  );
}

/* ---------------- Sinf: o'quvchi va o'qituvchi ---------------- */
export function ClassScreen({ http, onBack, onEnterRoom }: { http: Http; onBack: () => void; onEnterRoom: (code: string) => void }) {
  const me = useLoad(() => http.eduMe(), [http]);
  const [open, setOpen] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState(""); const [invite, setInvite] = useState(""); const [err, setErr] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);
  const run = async (fn: () => Promise<any>, ok?: string) => { setErr(null); setNote(null); try { await fn(); if (ok) setNote(ok); } catch (e) { setErr(code(e)); } me.reload(); };
  if (open) return <TeacherClass http={http} id={open} onBack={() => { setOpen(null); me.reload(); }} onEnterRoom={onEnterRoom} />;
  const t = me.data?.teacher;
  return (
    <Screen title="Sinf" subtitle="Maktab va o'quv markazlari uchun. O'quvchi to'lamaydi." onBack={onBack} maxWidth={720}>
      <Msg e={err || me.err} />{note && <Banner kind="good">{note}</Banner>}
      <Card label="Sinfga qo'shilish"><SectionTitle>Sinfga qo'shilish</SectionTitle>
        <Text style={s.p}>O'qituvchi bergan sinf kodini kiriting. O'qituvchi faqat sinf xonalarida o'ynalgan o'yinlar natijasini ko'radi.</Text>
        <View style={s.rowW}><Field label="Sinf kodi" value={joinCode} onChange={(v) => setJoinCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))} max={6} caps placeholder="ABC123" /><Button label="Qo'shilish" disabled={joinCode.length !== 6} onPress={() => run(async () => { await http.eduJoin(joinCode); setJoinCode(""); }, "Sinfga qo'shildingiz")} /></View></Card>
      {(me.data?.classes ?? []).map((k: any) => (
        <Card key={k.id} label={`Sinf ${k.name}`}><SectionTitle>{k.name}</SectionTitle><Text style={s.p}>O'qituvchi: {k.teacher}</Text>
          <View style={s.rowW}>{k.roomCode && <Button label={`Sinf xonasiga kirish (${k.roomCode})`} onPress={() => onEnterRoom(k.roomCode)} />}<Button kind="ghost" label="Sinfdan chiqish" onPress={() => run(() => http.eduLeave(k.id), "Chiqdingiz")} /></View></Card>))}
      {t ? (
        <Card label="O'qituvchi paneli" accent="green"><SectionTitle right={<Pill label={t.active ? "Litsenziya faol" : "Litsenziya tugagan"} kind={t.active ? "good" : "bad"} />}>O'qituvchi paneli</SectionTitle>
          <Row l="Tashkilot" v={t.org} /><Row l="Litsenziya" v={`${date(t.licenseUntil)} gacha`} />
          <TeacherList http={http} onOpen={setOpen} active={t.active} /></Card>
      ) : (
        <Card label="O'qituvchi sifatida ulanish"><SectionTitle>O'qituvchimisiz?</SectionTitle>
          <Text style={s.p}>Maktabingiz POYGA bilan shartnoma tuzgan bo'lsa, tashkilot bergan taklif kodini kiriting.</Text>
          <View style={s.rowW}><Field label="Taklif kodi" value={invite} onChange={(v) => setInvite(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))} max={8} caps /><Button label="Ulanish" disabled={invite.length !== 8} onPress={() => run(async () => { await http.eduRedeem(invite); setInvite(""); }, "O'qituvchi sifatida ulandingiz")} /></View></Card>)}
    </Screen>
  );
}
function TeacherList({ http, onOpen, active }: { http: Http; onOpen: (id: string) => void; active: boolean }) {
  const l = useLoad(() => http.classes(), [http]); const [name, setName] = useState(""); const [err, setErr] = useState<string | null>(null);
  return (<View style={{ gap: space.md }}><Msg e={err || l.err} />
    {(l.data?.classes ?? []).map((k: any) => (<Pressable key={k.id} accessibilityRole="button" accessibilityLabel={`${k.name}, ${k.students} o'quvchi`} onPress={() => onOpen(k.id)} style={s.classRow}><Text style={s.itemT}>{k.name}</Text><Text style={s.small}>{k.students} o'quvchi · kod {k.joinCode}</Text></Pressable>))}
    <View style={s.rowW}><Field label="Yangi sinf nomi" value={name} onChange={setName} max={60} placeholder="7-A" /><Button label="Sinf yaratish" disabled={!active || name.trim().length < 2} onPress={async () => { setErr(null); try { await http.classCreate(name); setName(""); } catch (e) { setErr(code(e)); } l.reload(); }} /></View></View>);
}
const KIND_L: Record<string, string> = { games: "O'yin soni", wins: "G'alabalar", big: "Katta aylanaga chiqish" };
function TeacherClass({ http, id, onBack, onEnterRoom }: { http: Http; id: string; onBack: () => void; onEnterRoom: (c: string) => void }) {
  const c = useLoad(() => http.classGet(id), [http, id]); const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState(""); const [kind, setKind] = useState("games"); const [target, setTarget] = useState("3");
  const run = async (fn: () => Promise<any>) => { setErr(null); try { await fn(); } catch (e) { setErr(code(e)); } c.reload(); };
  const d = c.data;
  const csv = async () => { try { const text = await http.classCsv(id); const w: any = globalThis; const url = w.URL.createObjectURL(new w.Blob([text], { type: "text/csv;charset=utf-8" })); const a = w.document.createElement("a"); a.href = url; a.download = "sinf-hisobot.csv"; a.click(); w.URL.revokeObjectURL(url); } catch (e) { setErr(code(e)); } };
  return (
    <Screen title={d?.class.name ?? "Sinf"} subtitle={d ? `Sinf kodi: ${d.class.joinCode} · ${d.class.students} o'quvchi` : undefined} onBack={onBack} backLabel="Sinflar" maxWidth={920}>
      <Msg e={err || c.err} />
      {d && (<>
        <Card label="Sinf xonasi"><SectionTitle>Sinf xonasi</SectionTitle>
          {d.room ? (<><Row l="Holat" v={d.room.started ? "O'yin ketmoqda" : "Kutmoqda"} /><Text style={s.p}>{d.room.players.map((p: any) => `${p.name}${p.online ? "" : " (oflayn)"}`).join(", ") || "Hali hech kim kirmagan"}</Text></>) : <Text style={s.p}>Xona ochiq emas. Xonaga faqat shu sinf o'quvchilari kira oladi.</Text>}
          <View style={s.rowW}><Button label={d.room ? `Xonaga kirish (${d.room.code})` : "Sinf xonasini ochish"} onPress={() => run(async () => { const r = await http.classRoom(id); onEnterRoom(r.code); })} />
            <Button kind="ghost" label="Kodni yangilash" onPress={() => run(() => http.classCode(id))} /><Button kind="ghost" label="CSV yuklab olish" onPress={csv} /></View></Card>
        <Card label="Topshiriqlar"><SectionTitle>Topshiriqlar</SectionTitle>
          {d.assignments.length === 0 && <Text style={s.p}>Hali topshiriq yo'q.</Text>}
          {d.assignments.map((a: any) => (<View key={a.id} style={{ gap: 4 }}><View style={s.rowB}><Text style={s.itemT}>{a.title}</Text><Pill label={`${a.done}/${a.total}`} kind={a.total && a.done === a.total ? "good" : "info"} /></View>
            <Text style={s.small}>{KIND_L[a.kind]} ≥ {a.target}</Text><View style={s.rowW}><Button kind="ghost" label="O'chirish" onPress={() => run(() => http.assignDel(id, a.id))} /></View></View>))}
          <Divider />
          <View style={s.rowW}><Field label="Nomi" value={title} onChange={setTitle} max={120} /><Field label="Maqsad (soni)" value={target} onChange={(v) => setTarget(v.replace(/\D/g, ""))} keyboard="number-pad" max={3} /></View>
          <Tabs label="Topshiriq turi" items={Object.entries(KIND_L) as [string, string][]} active={kind} onChange={setKind} />
          <Button label="Topshiriq qo'shish" disabled={title.trim().length < 2 || !Number(target)} onPress={() => run(async () => { await http.assignAdd(id, { title, kind, target: Number(target) }); setTitle(""); })} /></Card>
        <Card label="O'quvchilar hisoboti"><SectionTitle>O'quvchilar</SectionTitle>
          {d.students.length === 0 && <Text style={s.p}>Sinf kodini o'quvchilarga bering.</Text>}
          {d.students.map((r: any) => (<View key={r.userId} style={s.student}>
            <View style={s.rowB}><Text style={s.itemT}>{r.name}</Text>{r.hidden ? <Pill label="Rozilik kutilmoqda" kind="warn" /> : <Pill label={`${r.level}-daraja`} kind="info" />}</View>
            {r.hidden ? <Text style={s.small}>16 yoshgacha o'quvchi natijalari ota-ona roziligi tasdiqlangach ko'rinadi.</Text>
              : <View style={s.rowW}><Stat label="O'yin" value={String(r.games)} /><Stat label="G'alaba" value={String(r.wins)} /><Stat label="Katta aylana" value={String(r.big)} /><Stat label="O'rtacha o'rin" value={r.avgPlace === null ? "—" : String(r.avgPlace)} /></View>}
            <View style={s.rowW}><Button kind="ghost" label={r.consent ? "Roziligi bor — bekor qilish" : "Ota-ona roziligi olingan"} onPress={() => run(() => http.classConsent(id, r.userId, !r.consent))} /><Button kind="ghost" label="Sinfdan chiqarish" onPress={() => run(() => http.classKick(id, r.userId))} /></View></View>))}</Card>
      </>)}
    </Screen>
  );
}

/* ---------------- Homiy turnirlari ---------------- */
export function TournamentScreen({ http, onBack, onEnterRoom }: { http: Http; onBack: () => void; onEnterRoom: (code: string) => void }) {
  const l = useLoad(() => http.tournaments(), [http]); const [open, setOpen] = useState<string | null>(null);
  if (open) return <TournamentDetail http={http} id={open} onBack={() => { setOpen(null); l.reload(); }} onEnterRoom={onEnterRoom} />;
  const st: Record<string, string> = { open: "Ro'yxat ochiq", running: "Davom etmoqda", finished: "Yakunlangan" };
  return (
    <Screen title="Turnirlar" subtitle="Homiylar bilan musobaqalar. Turnir ballari umumiy reytingga ta'sir qilmaydi." onBack={onBack} maxWidth={720}>
      <Msg e={l.err} />
      {l.data && l.data.tournaments.length === 0 && <Card><Text style={s.p}>Hozircha faol turnir yo'q.</Text></Card>}
      {(l.data?.tournaments ?? []).map((t: any) => (
        <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.title}. ${st[t.status] ?? t.status}`} onPress={() => setOpen(t.id)}>
          <Card><SectionTitle right={<Pill label={st[t.status] ?? t.status} kind={t.status === "running" ? "good" : t.status === "open" ? "info" : "plain"} />}>{t.title}</SectionTitle>
            {t.sponsor ? <Text style={s.small}>Homiy: {t.sponsor}</Text> : null}<Text style={s.small}>{t.players} ishtirokchi{t.registered ? (t.approved ? " · siz ro'yxatdasiz" : " · ota-ona roziligi kutilmoqda") : ""}</Text></Card></Pressable>))}
    </Screen>
  );
}
function TournamentDetail({ http, id, onBack, onEnterRoom }: { http: Http; id: string; onBack: () => void; onEnterRoom: (c: string) => void }) {
  const l = useLoad(() => http.tournament(id), [http, id]); const acc = useLoad(() => http.account(), [http]);
  const [err, setErr] = useState<string | null>(null); const [pp, setPp] = useState("");
  const run = async (fn: () => Promise<any>) => { setErr(null); try { await fn(); } catch (e) { setErr(code(e)); } l.reload(); };
  const t = l.data?.tournament; const minor = !!acc.data && acc.data.age !== null && acc.data.age < 16;
  return (
    <Screen title={t?.title ?? "Turnir"} subtitle={t?.sponsor ? `Homiy: ${t.sponsor}` : undefined} onBack={onBack} backLabel="Turnirlar" maxWidth={720}>
      <Msg e={err || l.err} />
      {t && (<>
        <Card label="Turnir haqida"><SectionTitle>Shartlar</SectionTitle>
          {t.format ? <Row l="Format" v={t.format} /> : null}{t.prize ? <Row l="Sovrin" v={t.prize} /> : null}{t.startsAt ? <Row l="Boshlanishi" v={date(t.startsAt)} /> : null}{t.endsAt ? <Row l="Tugashi" v={date(t.endsAt)} /> : null}
          <Row l="Ishtirokchilar" v={t.maxPlayers ? `${t.players} / ${t.maxPlayers}` : String(t.players)} />
          {t.rules ? <Text style={s.p}>{t.rules}</Text> : null}</Card>
        <Card label="Ishtirok">
          {!t.registered ? (<>
            {t.status === "open" ? (<>{minor && <><Text style={s.p}>16 yoshgacha ishtirok uchun ota-ona roziligi kerak. Unga SMS havola yuboriladi.</Text><Field label="Ota-onangizning telefon raqami" value={pp} onChange={setPp} keyboard="phone-pad" max={20} placeholder="+998 …" /></>}
              <Button label="Ro'yxatdan o'tish" disabled={minor && pp.replace(/\D/g, "").length < 9} onPress={() => run(() => http.tRegister(id, minor ? pp : undefined))} /></>) : <Banner kind="info">Ro'yxatdan o'tish yopiq.</Banner>}</>)
            : !t.approved ? (<Banner kind="warn">Ota-onangiz roziligini kutyapmiz.</Banner>)
            : (<><Pill label="Siz ro'yxatdasiz" kind="good" />
              {t.status === "running" && <Button label={t.room ? `Turnir xonasiga kirish (${t.room})` : "Turnir xonasini ochish"} onPress={() => run(async () => { const r = t.room ? { code: t.room } : await http.tRoom(id); onEnterRoom(r.code); })} />}
              {t.status === "open" && <Button kind="ghost" label="Ro'yxatdan chiqish" onPress={() => run(() => http.tUnregister(id))} />}</>)}
        </Card>
        <Card label="Turnir reytingi"><SectionTitle>Reyting</SectionTitle>
          {l.data.board.length === 0 && <Text style={s.p}>Hali o'yin tugamagan.</Text>}
          {l.data.board.map((r: any) => (<View key={r.userId} style={s.rowB}><Text style={s.itemT}>{r.rank}. {r.name}</Text><Text style={s.small}>{r.points} ball · {r.wins} g'alaba · {r.games} o'yin</Text></View>))}</Card>
      </>)}
    </Screen>
  );
}

const s = StyleSheet.create({
  p: { color: tone.muted, fontSize: font.md, lineHeight: 21 }, small: { color: tone.muted, fontSize: font.sm, lineHeight: 18 }, label: { color: color.navy, fontWeight: "700", fontSize: font.sm },
  input: { minHeight: MIN_TAP, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.md, color: color.navy, backgroundColor: color.white },
  rowW: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "flex-end" }, rowB: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  tabs: { flexDirection: "row", gap: space.xs, flexWrap: "wrap" }, tab: { minHeight: MIN_TAP, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, justifyContent: "center", backgroundColor: color.white }, tabOn: { backgroundColor: color.navy, borderColor: color.navy }, tabT: { fontWeight: "700", color: color.navy, fontSize: font.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md }, item: { width: 200, flexGrow: 1, gap: space.xs, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, alignItems: "flex-start" },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: color.line }, itemT: { fontWeight: "800", color: color.navy, fontSize: font.md },
  classRow: { minHeight: MIN_TAP, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: color.line, gap: 2 }, student: { gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.line },
});
