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
import { Leaderboard } from "./src/ui/Leaderboard";
import { httpBase, makeHttp, makeAuth } from "./src/net/http";
import { Login } from "./src/ui/Login";
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
      } catch { if (!off) { setLoginErr(true); setSess(null); } }
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
  const [screen, setScreen] = useState<"home" | "profile" | "board" | "rules">("home");
  const [rulesOpen, setRulesOpen] = useState(false); // o'yin davomida ham ochiladi
  useEffect(() => { const un = conn.subscribe(setSt); conn.connect(); return () => { un(); conn.close(); }; }, [conn]);
  useEffect(() => { const d = (globalThis as any).document; if (d) { d.documentElement.lang = "uz"; d.title = "POYGA"; } }, []);
  useEffect(() => { if (st.error === "unauthorized") onLogout(); }, [st.error]);
  const room = st.room;
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      <View role="main" style={{ flex: 1 }}>
      {rulesOpen || (!room && screen === "rules") ? <RulesScreen onBack={() => { setRulesOpen(false); setScreen("home"); }} />
        : !room && screen === "profile" ? <ProfileScreen http={http} onBack={() => setScreen("home")} onDeleted={() => { setScreen("home"); onLogout(); }} />
        : !room && screen === "board" ? <Leaderboard http={http} onBack={() => setScreen("home")} />
        : !room ? <><Home status={st.status} error={st.error} onCreate={() => conn.create()} onJoin={(c) => conn.join(c)} onProfile={() => setScreen("profile")} onLeaderboard={() => setScreen("board")} onRules={() => setScreen("rules")} />{session.token !== session.userId && <View style={{ padding: 12, alignItems: "center" }}><Button label={uz.login.logout} kind="ghost" onPress={onLogout} /></View>}</>
        : !room.state ? <Lobby room={room} userId={userId} error={st.error} onStart={() => conn.start()} onLeave={() => conn.leave()} />
        : room.state.phase === "dreams" ? <DreamPick room={room} userId={userId} error={st.error} onPick={(i) => conn.act({ type: "choose_dream", dreamIdx: i })} />
        : room.state.winner ? <Result http={http} code={room.code} onHome={() => conn.leave()} />
        : <Game room={room} userId={userId} onAct={(a) => conn.act(a)} onReact={(e) => conn.react(e)} onLeave={() => conn.leave()} reactions={st.reactions} onRules={() => setRulesOpen(true)} />}
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg } });
