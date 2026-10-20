import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Connection, ConnState } from "./src/net/connection";
import { Home } from "./src/ui/Home";
import { Lobby } from "./src/ui/Lobby";
import { DreamPick } from "./src/ui/DreamPick";
import { Game } from "./src/ui/Game";
import { ProfileScreen } from "./src/ui/ProfileScreen";
import { Result } from "./src/ui/Result";
import { RulesScreen } from "./src/ui/RulesScreen";
import { Screen } from "./src/ui/Screen";
import { Banner } from "./src/ui/kit";
import { Leaderboard } from "./src/ui/Leaderboard";
import { ShopScreen, ClassScreen, TournamentScreen } from "./src/ui/Biz";
import { httpBase, makeHttp, makeAuth } from "./src/net/http";
import { Login } from "./src/ui/Login";
import { Tour } from "./src/ui/Tour";
import { gameTourId, type TourId } from "./src/tours";
import { isMyTurn } from "./src/model";
import { color } from "./src/theme";
import { errText, uz } from "./src/i18n/uz";
import { Button } from "./src/ui/Button";

const SERVER = process.env.EXPO_PUBLIC_SERVER_URL ?? "ws://localhost:3000";
// Kirish xizmati (SMS/Google/Apple) ulanmaguncha — vaqtincha qurilma identifikatori.
const devUser = () => { try { const k = "poyga-dev-user"; const v = (globalThis as any).localStorage?.getItem(k) ?? `u${Math.random().toString(36).slice(2, 8)}`; (globalThis as any).localStorage?.setItem(k, v); return v; } catch { return `u${Math.random().toString(36).slice(2, 8)}`; } };

const store = {
  get: (k: string): string | null => { try { return (globalThis as any).localStorage?.getItem(k) ?? null; } catch { return null; } },
  set: (k: string, v: string | null) => { try { v === null ? (globalThis as any).localStorage?.removeItem(k) : (globalThis as any).localStorage?.setItem(k, v); } catch { /* maxfiy rejim */ } },
};
type Sess = { token: string; userId: string };

/** Kirish rejimini aniqlaydi: server SMS yoqqan bo'lsa — kirish ekrani; sinov rejimida — qurilma identifikatori. */
export default function App() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold });
  const auth = useMemo(() => makeAuth(httpBase(SERVER)), []);
  const [sess, setSess] = useState<Sess | null | undefined>(undefined); // undefined: yuklanmoqda
  const [loginErr, setLoginErr] = useState(false);
  useEffect(() => {
    let off = false;
    const saved = store.get("poyga-session");
    (async () => {
      try {
        const cfg = await auth.config(); if (off) return;
        if (cfg.dev) { const u = devUser(); setSess({ token: u, userId: u }); }
        else if (saved) { try { const j = JSON.parse(saved) as Sess; setSess(j.token && j.userId ? j : null); } catch { setSess(null); } }
        else setSess(null);
      } catch { // server vaqtincha javob bermasa ham saqlangan sessiya yo'qolmasin (qayta SMS kodi shart bo'lmasin)
        if (off) return;
        if (saved) { try { const j = JSON.parse(saved) as Sess; if (j.token && j.userId) return setSess(j); } catch { /* buzilgan yozuv */ } }
        setLoginErr(true); setSess(null);
      }
    })();
    return () => { off = true; };
  }, [auth]);
  if (!fontsLoaded || sess === undefined) return null;
  if (!sess) return (
    <SafeAreaView style={s.root}><StatusBar style="dark" /><View role="main" style={{ flex: 1 }}>
      <Login auth={auth} onDone={(x) => { store.set("poyga-session", JSON.stringify(x)); setSess(x); }} />
      {loginErr && <Text style={{ color: color.red, textAlign: "center" }} accessibilityRole="alert">{errText("network")}</Text>}
    </View></SafeAreaView>);
  return <Game_ session={sess} onLogout={() => { if (sess.token !== sess.userId) void fetch(httpBase(SERVER) + "/auth/logout", { method: "POST", headers: { authorization: `Bearer ${sess.token}` } }).catch(() => {}); store.set("poyga-session", null); setSess(null); }} />;
}

function Game_({ session, onLogout }: { session: Sess; onLogout: () => void }) {
  const userId = session.userId;
  const conn = useMemo(() => new Connection(SERVER, session.token, (u) => new WebSocket(u) as any), [session.token]);
  const [st, setSt] = useState<ConnState>(conn.state);
  const http = useMemo(() => makeHttp(httpBase(SERVER), session.token), [session.token]);
  const [screen, setScreen] = useState<"home" | "profile" | "board" | "rules" | "shop" | "class" | "tournaments">("home");
  const [rulesOpen, setRulesOpen] = useState(false); // o'yin davomida ham ochiladi
  useEffect(() => { const un = conn.subscribe(setSt); conn.connect(); return () => { un(); conn.close(); }; }, [conn]);
  useEffect(() => { const d = (globalThis as any).document; if (d) { d.documentElement.lang = "uz"; d.title = "POYGA"; } }, []);
  useEffect(() => { if (st.error === "unauthorized") onLogout(); }, [st.error]);
  const room = st.room;
  // Sahifa yo'riqnomasi: har sahifada birinchi kirishda bir marta; o'yinda — o'yinchi turgan aylana uchun alohida (kichik/katta)
  const myCircle = room?.state?.players?.find((p: any) => p.id === userId)?.circle as string | undefined;
  const SCREEN_TOUR: Record<string, TourId | null> = { home: "home", profile: "profile", board: "leaderboard", shop: "shop", class: "class", tournaments: "tournaments", rules: null };
  const tourId: TourId | null = rulesOpen ? null : !room ? SCREEN_TOUR[screen] ?? null : room.closed ? null : !room.state ? "lobby" : room.state.phase === "dreams" ? "dreams" : room.state.winner ? "result" : gameTourId(myCircle);
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      <View role="main" style={{ flex: 1 }}>
      {rulesOpen || (!room && screen === "rules") ? <RulesScreen onBack={() => { setRulesOpen(false); setScreen("home"); }} />
        : !room && screen === "profile" ? <ProfileScreen http={http} onBack={() => setScreen("home")} onDeleted={() => { setScreen("home"); onLogout(); }} onLogout={session.token !== session.userId ? onLogout : undefined} />
        : !room && screen === "shop" ? <ShopScreen http={http} onBack={() => setScreen("home")} />
        : !room && screen === "class" ? <ClassScreen http={http} onBack={() => setScreen("home")} onEnterRoom={(c) => conn.join(c)} />
        : !room && screen === "tournaments" ? <TournamentScreen http={http} onBack={() => setScreen("home")} onEnterRoom={(c) => conn.join(c)} />
        : !room && screen === "board" ? <Leaderboard http={http} onBack={() => setScreen("home")} />
        : !room ? <><Home http={http} status={st.status} error={st.error} onCreate={(t) => conn.create(t)} onJoin={(c) => conn.join(c)} onProfile={() => setScreen("profile")} onLeaderboard={() => setScreen("board")} onShop={() => setScreen("shop")} onClass={() => setScreen("class")} onTournaments={() => setScreen("tournaments")} onRules={() => setScreen("rules")} /></>
        : room.closed ? <Screen title="Xona yopildi" maxWidth={520}><Banner kind="warn">{`Xona administrator tomonidan yopildi: ${room.closed}`}</Banner><Button label="Bosh sahifaga" onPress={() => conn.leave()} /></Screen>
        : !room.state ? <Lobby room={room} userId={userId} error={st.error} onStart={(events) => conn.start(events)} onLeave={() => conn.leave()} />
        : room.state.phase === "dreams" ? <DreamPick room={room} userId={userId} error={st.error} onPick={(i) => conn.act({ type: "choose_dream", dreamIdx: i })} />
        : room.state.winner ? <Result http={http} code={room.code} onHome={() => conn.leave()} />
        : <Game room={room} userId={userId} onAct={(a) => conn.act(a)} onReact={(e) => conn.react(e)} onLeave={() => conn.leave()} reactions={st.reactions} onRules={() => setRulesOpen(true)} error={st.error} status={st.status} />}
      </View>
      <Tour id={tourId} defer={!!room?.state && (tourId === "game-small" || tourId === "game-big") && isMyTurn(room, userId)} onRules={() => setRulesOpen(true)} />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg } });
