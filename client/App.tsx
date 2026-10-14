import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Connection, ConnState } from "./src/net/connection";
import { Home } from "./src/ui/Home";
import { Lobby } from "./src/ui/Lobby";
import { Game } from "./src/ui/Game";
import { ProfileScreen } from "./src/ui/ProfileScreen";
import { Result } from "./src/ui/Result";
import { RulesScreen } from "./src/ui/RulesScreen";
import { Leaderboard } from "./src/ui/Leaderboard";
import { httpBase, makeHttp } from "./src/net/http";
import { color } from "./src/theme";

const SERVER = process.env.EXPO_PUBLIC_SERVER_URL ?? "ws://localhost:3000";
// Kirish xizmati (SMS/Google/Apple) ulanmaguncha — vaqtincha qurilma identifikatori.
const devUser = () => { try { const k = "poyga-dev-user"; const v = (globalThis as any).localStorage?.getItem(k) ?? `u${Math.random().toString(36).slice(2, 8)}`; (globalThis as any).localStorage?.setItem(k, v); return v; } catch { return `u${Math.random().toString(36).slice(2, 8)}`; } };

export default function App() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold });
  const userId = useMemo(devUser, []);
  const conn = useMemo(() => new Connection(SERVER, userId, (u) => new WebSocket(u) as any), [userId]);
  const [st, setSt] = useState<ConnState>(conn.state);
  const http = useMemo(() => makeHttp(httpBase(SERVER), userId), [userId]);
  const [screen, setScreen] = useState<"home" | "profile" | "board" | "rules">("home");
  const [rulesOpen, setRulesOpen] = useState(false); // o'yin davomida ham ochiladi
  useEffect(() => { const un = conn.subscribe(setSt); conn.connect(); return () => { un(); conn.close(); }; }, [conn]);
  useEffect(() => { const d = (globalThis as any).document; if (d) { d.documentElement.lang = "uz"; d.title = "POYGA"; } }, []);
  if (!fontsLoaded) return null;
  const room = st.room;
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      <View role="main" style={{ flex: 1 }}>
      {rulesOpen || (!room && screen === "rules") ? <RulesScreen onBack={() => { setRulesOpen(false); setScreen("home"); }} />
        : !room && screen === "profile" ? <ProfileScreen http={http} onBack={() => setScreen("home")} onDeleted={() => { setScreen("home"); }} />
        : !room && screen === "board" ? <Leaderboard http={http} onBack={() => setScreen("home")} />
        : !room ? <Home status={st.status} error={st.error} onCreate={() => conn.create()} onJoin={(c) => conn.join(c)} onProfile={() => setScreen("profile")} onLeaderboard={() => setScreen("board")} onRules={() => setScreen("rules")} />
        : !room.state ? <Lobby room={room} userId={userId} error={st.error} onStart={() => conn.start()} onLeave={() => conn.leave()} />
        : room.state.winner ? <Result http={http} code={room.code} onHome={() => conn.leave()} />
        : <Game room={room} userId={userId} onAct={(a) => conn.act(a)} onReact={(e) => conn.react(e)} onLeave={() => conn.leave()} reactions={st.reactions} onRules={() => setRulesOpen(true)} />}
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg } });
