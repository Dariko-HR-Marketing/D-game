// Ovozli aloqa (veb): WebRTC mesh — har bir juftlik o'rtasida to'g'ridan-to'g'ri audio (server faqat signal uzatadi). Native (iOS/Android) uchun alohida modul kerak (react-native-webrtc) — hozircha qo'llanmaydi.
// Signalizatsiya: har bir juftlikda taklifni DOIM bir tomon (ID si kichigi) yuboradi — taklif to'qnashuvi (glare) bo'lmaydi; ikkinchi tomon javob beradi va o'z mikrofonini javobga qo'shadi.
export type VoiceStatus = "off" | "connecting" | "on";
export type VoiceError = null | "unsupported" | "denied" | "no_mic" | "restricted" | "failed";
export interface PeerView { id: string; state: "connecting" | "connected" | "failed"; speaking: boolean; muted: boolean }
export interface DeviceView { id: string; label: string }
export interface VoiceSnapshot { status: VoiceStatus; error: VoiceError; hasMic: boolean; muted: boolean; speaking: boolean; peers: PeerView[]; inputs: DeviceView[]; outputs: DeviceView[]; inputId: string; outputId: string; canPickOutput: boolean }

export interface VoiceDeps {
  selfId: string;
  send: (m: Record<string, unknown>) => boolean;
  iceServers: () => Promise<RTCIceServer[]>;
}
const SPEAK_RMS = 0.015; // gapirish sezgisi (0…1 amplituda); shovqin chegarasi
const HANG_MS = 450; // gapirish tugagandan keyin belgi shuncha turadi (miltillamasin)

export const voiceSupported = () => typeof globalThis !== "undefined" && typeof (globalThis as any).RTCPeerConnection === "function" && !!(globalThis as any).navigator?.mediaDevices?.getUserMedia;

interface Peer { id: string; pc: RTCPeerConnection; initiator: boolean; stream: MediaStream | null; audio: HTMLAudioElement | null; speak: Meter | null; muted: boolean; state: PeerView["state"]; failures: number; q: Promise<void> }
class Meter { // MediaStream ovoz balandligini o'lchaydi
  private ctx: AudioContext | null = null; private an: AnalyserNode | null = null; private buf: Float32Array | null = null; private last = 0; speaking = false;
  constructor(stream: MediaStream, ctx: AudioContext) { try { this.ctx = ctx; const src = ctx.createMediaStreamSource(stream); this.an = ctx.createAnalyser(); this.an.fftSize = 512; src.connect(this.an); this.buf = new Float32Array(this.an.fftSize); } catch { this.an = null; } }
  tick(now: number, enabled = true): boolean {
    if (!this.an || !this.buf) return false; let on = false;
    if (enabled) { this.an.getFloatTimeDomainData(this.buf as Float32Array<ArrayBuffer>); let s = 0; for (const v of this.buf) s += v * v; on = Math.sqrt(s / this.buf.length) > SPEAK_RMS; }
    if (on) this.last = now; const sp = on || now - this.last < HANG_MS; const ch = sp !== this.speaking; this.speaking = sp; return ch;
  }
}

export class VoiceEngine {
  private peers = new Map<string, Peer>(); private local: MediaStream | null = null; private joined = false; private status: VoiceStatus = "off"; private error: VoiceError = null;
  private muted = false; private listeners = new Set<() => void>(); private members: string[] = []; private ctx: AudioContext | null = null; private selfMeter: Meter | null = null; private timer: ReturnType<typeof setInterval> | null = null;
  private inputs: DeviceView[] = []; private outputs: DeviceView[] = []; private inputId = ""; private outputId = ""; private ice: RTCIceServer[] | null = null; private rejoinAt = 0; private snap: VoiceSnapshot | null = null; private early = new Map<string, Array<{ sdp?: { type: "offer" | "answer"; sdp: string }; candidate?: RTCIceCandidateInit }>>();
  constructor(private d: VoiceDeps) {}

  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private emit() { this.snap = null; for (const l of this.listeners) l(); }
  snapshot(): VoiceSnapshot { // keshlanadi: o'zgarmaguncha bir xil ob'ekt (React uchun)
    if (this.snap) return this.snap;
    return (this.snap = { status: this.status, error: this.error, hasMic: !!this.local, muted: this.muted, speaking: !!this.selfMeter?.speaking && !this.muted && !!this.local,
      peers: [...this.peers.values()].map((p) => ({ id: p.id, state: p.state, speaking: !!p.speak?.speaking && !p.muted, muted: p.muted })), inputs: this.inputs, outputs: this.outputs, inputId: this.inputId, outputId: this.outputId, canPickOutput: typeof HTMLAudioElement !== "undefined" && "setSinkId" in HTMLAudioElement.prototype });
  }

  /** Ovozga qo'shilish: mikrofon so'raladi; ruxsat berilmasa/mikrofon yo'q bo'lsa — faqat tinglash. */
  async join(wantMic = true): Promise<void> {
    if (this.joined) return;
    if (!voiceSupported()) { this.error = "unsupported"; this.emit(); return; }
    this.error = null; this.status = "connecting"; this.joined = true; this.emit();
    try { this.ctx = new ((globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext)(); void this.ctx!.resume?.(); } catch { this.ctx = null; } // foydalanuvchi bosishi paytida (Safari talabi)
    if (wantMic) {
      try { this.local = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
      catch (e: any) { this.local = null; this.error = e?.name === "NotFoundError" || e?.name === "OverconstrainedError" ? "no_mic" : "denied"; }
    }
    if (!this.joined) { this.local?.getTracks().forEach((t) => t.stop()); this.local = null; return; } // kutish paytida chiqib ketilgan
    if (this.local && this.ctx) { this.selfMeter = new Meter(this.local, this.ctx); this.local.getAudioTracks().forEach((t) => (t.enabled = !this.muted)); }
    await this.listDevices(); this.timer = setInterval(() => this.tick(), 150);
    this.d.send({ type: "voice", op: "join" }); this.status = "on"; this.emit(); this.reconcile();
  }

  leave(): void {
    if (!this.joined && this.status === "off") return;
    this.joined = false; this.d.send({ type: "voice", op: "leave" }); this.teardown(); this.status = "off"; this.emit();
  }
  private teardown() {
    for (const p of this.peers.values()) this.closePeer(p); this.peers.clear(); this.early.clear();
    this.local?.getTracks().forEach((t) => t.stop()); this.local = null; this.selfMeter = null;
    if (this.timer) clearInterval(this.timer); this.timer = null; try { void this.ctx?.close(); } catch { /* yopiq */ } this.ctx = null;
  }
  /** Server «kim ovozda» ro'yxatini yuborganda: yangi a'zolar bilan ulanadi, ketganlarni yopadi. Server bizni tushirib yuborgan bo'lsa (uzilish) — qayta qo'shiladi. */
  onVoiceState(members: string[]) {
    this.members = members; if (!this.joined || this.status !== "on") return;
    if (!members.includes(this.d.selfId) && Date.now() - this.rejoinAt > 1500) { this.rejoinAt = Date.now(); for (const p of this.peers.values()) this.closePeer(p); this.peers.clear(); this.d.send({ type: "voice", op: "join" }); }
    this.reconcile();
  }
  private reconcile() {
    if (!this.joined || this.status !== "on") return;
    const want = new Set(this.members.filter((m) => m !== this.d.selfId));
    for (const [id, p] of this.peers) if (!want.has(id)) { this.closePeer(p); this.peers.delete(id); }
    for (const id of want) if (!this.peers.has(id)) void this.connect(id);
    this.emit();
  }
  private async connect(id: string) {
    if (!this.ice) { try { this.ice = await this.d.iceServers(); } catch { this.ice = [{ urls: "stun:stun.l.google.com:19302" }]; } }
    if (!this.joined || this.peers.has(id)) return;
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    const p: Peer = { id, pc, initiator: this.d.selfId < id, stream: null, audio: null, speak: null, muted: false, state: "connecting", failures: 0, q: Promise.resolve() };
    try { p.muted = !!JSON.parse(localStorage.getItem("poyga-voice-muted") ?? "[]").includes(id); } catch { /* xotira yopiq */ }
    this.peers.set(id, p);
    for (const d of this.early.get(id) ?? []) this.enqueue(p, d); this.early.delete(id); // peer yaratilguncha kelgan signallar
    if (p.initiator) { if (this.local) for (const t of this.local.getAudioTracks()) pc.addTrack(t, this.local); else pc.addTransceiver("audio", { direction: "recvonly" }); } // taklif beruvchi: audio qatorini o'zi ochadi
    pc.onicecandidate = (e) => { if (e.candidate) this.d.send({ type: "voice", op: "signal", to: id, candidate: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex, usernameFragment: e.candidate.usernameFragment } }); };
    pc.onnegotiationneeded = async () => { if (!p.initiator) return; try { await pc.setLocalDescription(); this.sendSdp(id, pc.localDescription); } catch { /* keyingi urinish */ } };
    pc.ontrack = (e) => { p.stream = e.streams[0] ?? new MediaStream([e.track]); this.attach(p); };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") { p.state = "connected"; p.failures = 0; } else if (s === "failed") { p.state = "failed"; if (p.initiator && ++p.failures <= 2) { try { pc.restartIce(); } catch { /* yopiq */ } } } else if (s === "connecting" || s === "new") p.state = "connecting";
      this.emit();
    };
    this.emit();
  }
  private sendSdp(to: string, d: RTCSessionDescription | null) { if (d) this.d.send({ type: "voice", op: "signal", to, sdp: { type: d.type, sdp: d.sdp } }); }
  private attach(p: Peer) {
    if (!p.stream) return;
    if (!p.audio) { const a = document.createElement("audio"); a.autoplay = true; (a as any).playsInline = true; a.style.display = "none"; document.body.appendChild(a); p.audio = a; }
    p.audio.srcObject = p.stream; p.audio.muted = p.muted; if (this.outputId && (p.audio as any).setSinkId) void (p.audio as any).setSinkId(this.outputId).catch(() => {});
    void p.audio.play().catch(() => {}); if (this.ctx && !p.speak) p.speak = new Meter(p.stream, this.ctx);
    this.emit();
  }
  /** Server orqali kelgan signal (taklif/javob/ICE). */
  onSignal(from: string, data: { sdp?: { type: "offer" | "answer"; sdp: string }; candidate?: RTCIceCandidateInit }) {
    if (!this.joined) return; const p = this.peers.get(from);
    if (!p) { const q = this.early.get(from) ?? []; if (q.length < 60) q.push(data); this.early.set(from, q); return; } // o'z peerimiz hali yaratilmagan: keyin qayta o'ynaladi
    this.enqueue(p, data);
  }
  /** Bir peer signallari ketma-ket qayta ishlanadi (SDP o'rnatilmay turib ICE nomzodi qo'shilmasin). */
  private enqueue(p: Peer, data: { sdp?: { type: "offer" | "answer"; sdp: string }; candidate?: RTCIceCandidateInit }) { p.q = p.q.then(() => this.handleSignal(p, data)).catch(() => {}); }
  private async handleSignal(p: Peer, data: { sdp?: { type: "offer" | "answer"; sdp: string }; candidate?: RTCIceCandidateInit }) {
    const from = p.id;
    try {
      if (data.sdp) {
        if ((data.sdp.type === "offer") === p.initiator) return; // taklifni faqat javob beruvchi, javobni faqat taklif beruvchi qabul qiladi
        await p.pc.setRemoteDescription(data.sdp);
        if (data.sdp.type === "offer") { // javobga o'z mikrofonimiz qo'shiladi (mavjud qatorni qayta ishlatadi — yangi kelishuv talab qilinmaydi)
          if (this.local && !p.pc.getSenders().some((x) => x.track)) for (const t of this.local.getAudioTracks()) p.pc.addTrack(t, this.local);
          await p.pc.setLocalDescription(); this.sendSdp(from, p.pc.localDescription);
        }
      } else if (data.candidate) { try { await p.pc.addIceCandidate(data.candidate); } catch { /* eskirgan/e'tiborsiz nomzod: ulanishga to'sqinlik qilmaydi */ } }
    } catch { p.state = "failed"; this.emit(); }
  }
  private closePeer(p: Peer) { try { p.pc.onicecandidate = p.pc.ontrack = p.pc.onnegotiationneeded = p.pc.onconnectionstatechange = null; p.pc.close(); } catch { /* yopiq */ } if (p.audio) { p.audio.srcObject = null; p.audio.remove(); } }
  private tick() {
    const now = Date.now(); let ch = this.selfMeter ? this.selfMeter.tick(now, !this.muted && !!this.local) : false;
    for (const p of this.peers.values()) if (p.speak?.tick(now, !p.muted)) ch = true;
    if (ch) this.emit();
  }

  setMuted(m: boolean) { this.muted = m; this.local?.getAudioTracks().forEach((t) => (t.enabled = !m)); this.emit(); }
  setPeerMuted(id: string, m: boolean) {
    const p = this.peers.get(id); if (p) { p.muted = m; if (p.audio) p.audio.muted = m; }
    try { const s = new Set<string>(JSON.parse(localStorage.getItem("poyga-voice-muted") ?? "[]")); m ? s.add(id) : s.delete(id); localStorage.setItem("poyga-voice-muted", JSON.stringify([...s].slice(-200))); } catch { /* xotira yopiq */ }
    this.emit();
  }
  private async listDevices() {
    try { const all = await navigator.mediaDevices.enumerateDevices(); const lab = (d: MediaDeviceInfo, i: number, k: string) => d.label || `${k} ${i + 1}`;
      this.inputs = all.filter((d) => d.kind === "audioinput").map((d, i) => ({ id: d.deviceId, label: lab(d, i, "Mikrofon") })); this.outputs = all.filter((d) => d.kind === "audiooutput").map((d, i) => ({ id: d.deviceId, label: lab(d, i, "Dinamik") }));
      this.inputId = this.local?.getAudioTracks()[0]?.getSettings().deviceId ?? this.inputs[0]?.id ?? ""; } catch { /* ro'yxat yo'q */ }
  }
  async setInput(id: string) {
    if (!this.local) return; try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: id }, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); const t = s.getAudioTracks()[0]; t.enabled = !this.muted;
      for (const p of this.peers.values()) { const snd = p.pc.getSenders().find((x) => x.track?.kind === "audio"); if (snd) await snd.replaceTrack(t); }
      this.local.getTracks().forEach((x) => x.stop()); this.local = s; this.inputId = id; if (this.ctx) this.selfMeter = new Meter(s, this.ctx); this.emit();
    } catch { /* qurilma ochilmadi: avvalgisi qoladi */ }
  }
  async setOutput(id: string) { this.outputId = id; for (const p of this.peers.values()) if (p.audio && (p.audio as any).setSinkId) await (p.audio as any).setSinkId(id).catch(() => {}); this.emit(); }
  /** Xona tugasa/chiqilsa: hammasi yopiladi. */
  dispose() { this.joined = false; this.teardown(); this.status = "off"; this.emit(); }
}
