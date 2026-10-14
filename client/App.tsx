import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Connection, ConnState } from "./src/net/connection";
import { Home } from "./src/ui/Home";
import { Lobby } from "./src/ui/Lobby";
import { Game } from "./src/ui/Game";
import { color } from "./src/theme";

const SERVER = process.env.EXPO_PUBLIC_SERVER_URL ?? "ws://localhost:3000";
// Kirish xizmati (SMS/Google/Apple) ulanmaguncha — vaqtincha qurilma identifikatori.
const devUser = () => { try { const k = "poyga-dev-user"; const v = (globalThis as any).localStorage?.getItem(k) ?? `u${Math.random().toString(36).slice(2, 8)}`; (globalThis as any).localStorage?.setItem(k, v); return v; } catch { return `u${Math.random().toString(36).slice(2, 8)}`; } };

export default function App() {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold });
  const userId = useMemo(devUser, []);
  const conn = useMemo(() => new Connection(SERVER, userId, (u) => new WebSocket(u) as any), [userId]);
  const [st, setSt] = useState<ConnState>(conn.state);
  useEffect(() => { const un = conn.subscribe(setSt); conn.connect(); return () => { un(); conn.close(); }; }, [conn]);
  if (!fontsLoaded) return null;
  const room = st.room;
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      {!room ? <Home status={st.status} error={st.error} onCreate={() => conn.create()} onJoin={(c) => conn.join(c)} />
        : !room.state ? <Lobby room={room} userId={userId} error={st.error} onStart={() => conn.start()} onLeave={() => conn.leave()} />
        : <Game room={room} userId={userId} onAct={(a) => conn.act(a)} />}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg } });
