// Mijoz ulanishi: holat serverdan keladi (yagona manba), harakatlar `seq` bilan yuboriladi, uzilsa qayta ulanadi (§6.3).
export interface WS { send(s: string): void; close(): void; onopen: (() => void) | null; onclose: (() => void) | null; onmessage: ((e: { data: string }) => void) | null }
export type WSFactory = (url: string) => WS;

export interface PendingCardView { id: string; text: string; mode: string; effect: any; file: string }
export interface RoomView { marketCards?: Record<number, { text: string; effect: any }>; names?: Record<string, { name: string; color: number }>; code: string; members: { userId: string; bot: boolean; online: boolean }[]; state: any | null; seq: number; deadline: number | null; pendingCard: PendingCardView | null }
export interface ConnState { status: "connecting" | "online" | "offline"; room: RoomView | null; error: string | null }

export class Connection {
  state: ConnState = { status: "connecting", room: null, error: null };
  private ws: WS | null = null;
  private listeners = new Set<(s: ConnState) => void>();
  private retry = 0;
  private closed = false;
  private rejoinCode: string | null = null;
  private lastAct: { action: Record<string, unknown>; retried: boolean } | null = null;
  private retryNext = false;

  constructor(private url: string, private token: string, private make: WSFactory, private setTimer: (f: () => void, ms: number) => unknown = setTimeout) {}

  subscribe(f: (s: ConnState) => void) { this.listeners.add(f); f(this.state); return () => { this.listeners.delete(f); }; }
  private set(p: Partial<ConnState>) { this.state = { ...this.state, ...p }; for (const l of this.listeners) l(this.state); }

  connect() {
    this.closed = false;
    const ws = this.make(`${this.url}/ws?token=${encodeURIComponent(this.token)}`);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0; this.set({ status: "online", error: null });
      if (this.rejoinCode) this.send({ type: "join", code: this.rejoinCode }); // §6.3: qayta ulanganda holat tiklanadi
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "state") {
        this.rejoinCode = m.room.code; this.set({ room: m.room, error: null });
        // Eski holat tufayli rad etilgan harakat: yangi holat kelgach bir marta qayta yuboriladi (server navbat/qoidani baribir tekshiradi).
        if (this.retryNext && this.lastAct && !this.lastAct.retried) { this.retryNext = false; this.lastAct.retried = true; this.send({ type: "act", seq: m.room.seq, action: this.lastAct.action }); }
      } else if (m.type === "error") {
        if (m.error === "stale_seq" && this.lastAct && !this.lastAct.retried) this.retryNext = true; // xatoni foydalanuvchiga ko'rsatmaymiz
        else this.set({ error: m.error });
      }
    };
    ws.onclose = () => {
      this.set({ status: "offline" });
      if (this.closed) return;
      const delay = Math.min(10_000, 500 * 2 ** this.retry++);
      this.setTimer(() => this.connect(), delay);
    };
  }
  close() { this.closed = true; this.ws?.close(); }
  send(o: unknown) { this.ws?.send(JSON.stringify(o)); }

  create() { this.send({ type: "create" }); }
  join(code: string) { this.send({ type: "join", code: code.trim().toUpperCase() }); }
  start() { this.send({ type: "start" }); }
  leave() { this.rejoinCode = null; this.send({ type: "leave" }); this.set({ room: null }); }
  /** Harakat: mijoz ko'rgan oxirgi `seq` bilan (eski holatdagi harakat serverda rad etiladi). */
  act(action: Record<string, unknown>) { this.lastAct = { action, retried: false }; this.retryNext = false; this.send({ type: "act", seq: this.state.room?.seq ?? 0, action }); }
}
