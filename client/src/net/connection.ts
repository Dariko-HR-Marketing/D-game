// Mijoz ulanishi: holat serverdan keladi (yagona manba), harakatlar `seq` bilan yuboriladi, uzilsa qayta ulanadi (§6.3).
export interface WS { readyState?: number; send(s: string): void; close(): void; onopen: (() => void) | null; onclose: ((e?: { code?: number }) => void) | null; onmessage: ((e: { data: string }) => void) | null }
export type WSFactory = (url: string) => WS;

export interface PendingCardView { id: string; text: string; mode: string; effect: any; file: string }
export interface RoomView { seats?: number; turnSeconds?: number; calc?: { mode: "auto" | "manual"; due: string[]; ledger?: Record<string, { cash: number; passive: number; flow: number }>; stats: Record<string, { firstTry: number; retried: number }> }; closed?: string; marketCards?: Record<number, { text: string; effect: any }>; names?: Record<string, { name: string; color: number; level?: number; photo?: string; gender?: "m" | "f"; cos?: { pawn?: string; frame?: string; avatar?: string } }>; code: string; members: { userId: string; bot: boolean; online: boolean }[]; state: any | null; seq: number; deadline: number | null; pendingCard: PendingCardView | null; dreams?: { name: string; price: number }[]; hostId?: string; professions?: Record<string, string>; lastCard?: { text: string; effect: any; mode: string; file: string } | null }
export interface Reaction { id: number; from: string; emoji: string; at: number }
/** `lost`: ulanish uzilgan (yoki ilovadan chiqib qaytilgan) va yangi holat hali kelmagan; `restoredAt`: oxirgi tiklanish vaqti («Aloqa tiklandi» xabari uchun). */
export interface ConnState { status: "connecting" | "online" | "offline"; room: RoomView | null; error: string | null; reactions: Reaction[]; lost: boolean; restoredAt: number | null; calcFb: { error: string; n: number; detail?: any } | null }
export const REACTIONS = ["👍", "👏", "😮", "😂"] as const; // server bilan bir xil (server/src/rooms.ts)

export class Connection {
  state: ConnState = { status: "connecting", room: null, error: null, reactions: [], lost: false, restoredAt: null, calcFb: null };
  private rid = 0; private fbN = 0;
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
      else if (this.state.lost) this.set({ lost: false, restoredAt: Date.now() }); // xonada emas: kutiladigan holat yo'q
    };
    ws.onmessage = (e) => {
      let m: any; try { m = JSON.parse(e.data); } catch { return; } // proksi xato sahifasi va h.k. — e'tiborsiz
      if (m.type === "state") {
        if (!this.expecting && !this.state.room) return;
        this.rejoinCode = m.room.code; this.set({ room: m.room, error: null, ...(this.state.lost ? { lost: false, restoredAt: Date.now() } : {}) });
        // Eski holat tufayli rad etilgan harakat: yangi holat kelgach bir marta qayta yuboriladi (server navbat/qoidani baribir tekshiradi).
        if (this.retryNext && this.lastAct && !this.lastAct.retried) { this.retryNext = false; this.lastAct.retried = true; this.send({ type: "act", seq: m.room.seq, action: this.lastAct.action }); }
      } else if (m.type === "reaction") {
        this.set({ reactions: [...this.state.reactions, { id: ++this.rid, from: m.from, emoji: m.emoji, at: Date.now() }].slice(-3) }); // so'nggi 3 tasi
      } else if (m.type === "error") {
        if (typeof m.error === "string" && m.error.startsWith("calc_")) this.set({ calcFb: { error: m.error, n: ++this.fbN, detail: m.detail } }); // hisob javobi: shaklda ko'rsatiladi, umumiy xato emas
        else if (m.error === "stale_seq" && this.lastAct && !this.lastAct.retried) this.retryNext = true; // xatoni foydalanuvchiga ko'rsatmaymiz
        else this.set({ error: m.error });
      }
    };
    ws.onclose = (e) => {
      if (e?.code === 4401) { this.closed = true; this.set({ status: "offline", error: "unauthorized" }); return; } // token eskirgan/yaroqsiz: qayta ulanish foydasiz, qayta kirish kerak
      this.set({ status: "offline", lost: true });
      if (this.closed) return;
      const delay = Math.min(10_000, 500 * 2 ** this.retry++);
      this.setTimer(() => this.connect(), delay);
    };
  }
  close() { this.closed = true; this.ws?.close(); }
  /** Ilovadan/ustundan chiqib qaytildi (yoki tarmoq qaytdi): eski ulanish jim o'lgan bo'lishi mumkin — «Aloqa uzildi» ko'rsatib, yangi ulanish ochamiz va holatni qayta olamiz. */
  resume() {
    if (this.closed) return;
    this.set({ lost: true });
    const old = this.ws; if (old) { old.onopen = null; old.onmessage = null; old.onclose = null; try { old.close(); } catch { /* allaqachon yopiq */ } }
    this.retry = 0; this.connect();
  }
  /** Tarmoq uzildi (brauzer «offline» hodisasi): darrov xabar beramiz. */
  markLost() { if (!this.closed) this.set({ lost: true }); }
  /** Ulanish tayyor bo'lmasa yuborilmaydi (brauzer istisno otmasin); `false` — yuborilmadi. */
  send(o: unknown): boolean {
    const w = this.ws; if (!w || (w.readyState !== undefined && w.readyState !== 1)) { this.set({ error: "offline" }); return false; }
    try { w.send(JSON.stringify(o)); return true; } catch { this.set({ error: "offline" }); return false; }
  }

  create(turnSeconds: 30 | 60 = 30, calc: "auto" | "manual" = "manual", players?: number) { this.expecting = true; this.send({ type: "create", turnSeconds, calc, ...(players ? { players } : {}) }); }
  join(code: string) { this.expecting = true; this.send({ type: "join", code: code.trim().toUpperCase() }); }
  start(events = true) { this.send({ type: "start", events }); }
  leave() { this.expecting = false; this.rejoinCode = null; this.send({ type: "leave" }); this.set({ room: null, reactions: [] }); }
  react(emoji: string) { this.send({ type: "react", emoji }); }
  /** Harakat: mijoz ko'rgan oxirgi `seq` bilan (eski holatdagi harakat serverda rad etiladi). */
  act(action: Record<string, unknown>) { this.lastAct = { action, retried: false }; this.retryNext = false; this.send({ type: "act", seq: this.state.room?.seq ?? 0, action }); }
}
