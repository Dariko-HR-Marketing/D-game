// Mijoz ulanishi: holat serverdan keladi (yagona manba), harakatlar `seq` bilan yuboriladi, uzilsa qayta ulanadi (§6.3).
export interface WS { readyState?: number; send(s: string): void; close(): void; onopen: (() => void) | null; onclose: ((e?: { code?: number }) => void) | null; onmessage: ((e: { data: string }) => void) | null }
export type WSFactory = (url: string) => WS;

export interface PendingCardView { id: string; text: string; mode: string; effect: any; file: string }
export interface RoomView { marketCards?: Record<number, { text: string; effect: any }>; names?: Record<string, { name: string; color: number }>; code: string; members: { userId: string; bot: boolean; online: boolean }[]; state: any | null; seq: number; deadline: number | null; pendingCard: PendingCardView | null; dreams?: { name: string; price: number }[]; hostId?: string; professions?: Record<string, string>; lastCard?: { text: string; effect: any; mode: string; file: string } | null }
export interface Reaction { id: number; from: string; emoji: string; at: number }
export interface ConnState { status: "connecting" | "online" | "offline"; room: RoomView | null; error: string | null; reactions: Reaction[] }
export const REACTIONS = ["👍", "👏", "😮", "😂"] as const; // server bilan bir xil (server/src/rooms.ts)

export class Connection {
  state: ConnState = { status: "connecting", room: null, error: null, reactions: [] };
  private rid = 0;
  private ws: WS | null = null;
  private listeners = new Set<(s: ConnState) => void>();
  private retry = 0;
  private closed = false;
  private rejoinCode: string | null = null;
  private lastAct: { action: Record<string, unknown>; retried: boolean } | null = null;
  private retryNext = false;
  private expecting = false; // xonaga kirish so'ralganmi (chiqqandan keyingi tasodifiy 'state' xabari e'tiborga olinmaydi)

  constructor(private url: string, private token: string, private make: WSFactory, private setTimer: (f: () => void, ms: number) => unknown = setTimeout) {}

  subscribe(f: (s: ConnState) => void) { this.listeners.add(f); f(this.state); return () => { this.listeners.delete(f); }; }
  private set(p: Partial<ConnState>) { this.state = { ...this.state, ...p }; for (const l of this.listeners) l(this.state); }

  connect() {
    this.closed = false;
    const ws = this.make(`${this.url}/ws?token=${encodeURIComponent(this.token)}`);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0; this.set({ status: "online", error: null });
      if (this.rejoinCode) { this.expecting = true; this.send({ type: "join", code: this.rejoinCode }); } // §6.3: qayta ulanganda holat tiklanadi
    };
    ws.onmessage = (e) => {
      let m: any; try { m = JSON.parse(e.data); } catch { return; } // proksi xato sahifasi va h.k. — e'tiborsiz
      if (m.type === "state") {
        if (!this.expecting && !this.state.room) return;
        this.rejoinCode = m.room.code; this.set({ room: m.room, error: null });
        // Eski holat tufayli rad etilgan harakat: yangi holat kelgach bir marta qayta yuboriladi (server navbat/qoidani baribir tekshiradi).
        if (this.retryNext && this.lastAct && !this.lastAct.retried) { this.retryNext = false; this.lastAct.retried = true; this.send({ type: "act", seq: m.room.seq, action: this.lastAct.action }); }
      } else if (m.type === "reaction") {
        this.set({ reactions: [...this.state.reactions, { id: ++this.rid, from: m.from, emoji: m.emoji, at: Date.now() }].slice(-3) }); // so'nggi 3 tasi
      } else if (m.type === "error") {
        if (m.error === "stale_seq" && this.lastAct && !this.lastAct.retried) this.retryNext = true; // xatoni foydalanuvchiga ko'rsatmaymiz
        else this.set({ error: m.error });
      }
    };
    ws.onclose = (e) => {
      if (e?.code === 4401) { this.closed = true; this.set({ status: "offline", error: "unauthorized" }); return; } // token eskirgan/yaroqsiz: qayta ulanish foydasiz, qayta kirish kerak
      this.set({ status: "offline" });
      if (this.closed) return;
      const delay = Math.min(10_000, 500 * 2 ** this.retry++);
      this.setTimer(() => this.connect(), delay);
    };
  }
  close() { this.closed = true; this.ws?.close(); }
  /** Ulanish tayyor bo'lmasa yuborilmaydi (brauzer istisno otmasin); `false` — yuborilmadi. */
  send(o: unknown): boolean {
    const w = this.ws; if (!w || (w.readyState !== undefined && w.readyState !== 1)) { this.set({ error: "offline" }); return false; }
    try { w.send(JSON.stringify(o)); return true; } catch { this.set({ error: "offline" }); return false; }
  }

  create() { this.expecting = true; this.send({ type: "create" }); }
  join(code: string) { this.expecting = true; this.send({ type: "join", code: code.trim().toUpperCase() }); }
  start(events = true) { this.send({ type: "start", events }); }
  leave() { this.expecting = false; this.rejoinCode = null; this.send({ type: "leave" }); this.set({ room: null, reactions: [] }); }
  react(emoji: string) { this.send({ type: "react", emoji }); }
  /** Harakat: mijoz ko'rgan oxirgi `seq` bilan (eski holatdagi harakat serverda rad etiladi). */
  act(action: Record<string, unknown>) { this.lastAct = { action, retried: false }; this.retryNext = false; this.send({ type: "act", seq: this.state.room?.seq ?? 0, action }); }
}
