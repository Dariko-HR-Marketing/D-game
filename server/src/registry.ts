// Kontent versiyalari (§12, §11): o'yin boshlanganda versiya qulflanadi, nashr qilingan yangi versiya faqat yangi o'yinlarga tegadi.
import { loadContent, parseBundle, validateBundle, type Bundle } from "@poyga/content";
import type { Ctx } from "@poyga/rules";
import { buildCtxFrom } from "./ctx";
import { WriteQueue, type Persist } from "./persist";

export type Part = "cards" | "bigBoard" | "dreams" | "cellRules";
export interface VersionInfo { version: number; part: Part | "initial"; note: string; author: string; at: number; published: boolean }

export class ContentRegistry {
  private bundles = new Map<number, Bundle>();
  private ctxs = new Map<number, Ctx>();
  infos: VersionInfo[] = [];
  activeVersion = 1;

  readonly writes = new WriteQueue();
  constructor(initial: Bundle = loadContent(), private now: () => number = Date.now, private persist?: Persist, restored?: { rows: { info: VersionInfo; bundle: Bundle }[]; active: number | null }) {
    if (restored && restored.rows.length) {
      for (const r of restored.rows) { this.bundles.set(r.info.version, r.bundle); this.ctxs.set(r.info.version, buildCtxFrom(r.bundle)); this.infos.push(r.info); }
      this.activeVersion = restored.active ?? Math.max(...this.bundles.keys());
    } else {
      const info: VersionInfo = { version: 1, part: "initial", note: "Paketdagi dastlabki kontent", author: "system", at: now(), published: true };
      this.add(1, initial, info);
      this.writes.push(async () => { await persist?.saveVersion(info, initial); await persist?.setActive(1); });
    }
  }
  /** Bazadan tiklaydi (server qayta ishga tushganda faol versiya va tarix saqlanadi). */
  static async restore(persist: Persist, initial: Bundle = loadContent(), now: () => number = Date.now) {
    const rows = await persist.loadVersions(); const active = await persist.loadActive();
    const r = new ContentRegistry(initial, now, persist, { rows, active }); await r.writes.flush(); return r;
  }
  private add(v: number, b: Bundle, info: VersionInfo) { this.bundles.set(v, b); this.ctxs.set(v, buildCtxFrom(b)); this.infos.push(info); }

  active(): { version: number; ctx: Ctx } { return { version: this.activeVersion, ctx: this.ctxs.get(this.activeVersion)! }; }
  ctxFor(v: number): Ctx | undefined { return this.ctxs.get(v); }
  bundle(v = this.activeVersion) { return this.bundles.get(v); }

  /** Faol versiya asosida bitta qismni almashtirib, yangi (nashr qilinmagan) versiya yaratadi. */
  createVersion(part: Part, data: unknown, author: string, note: string): { ok: true; version: number } | { ok: false; problems: string[] } {
    const base = this.bundles.get(this.activeVersion)!;
    let candidate: Bundle;
    try { candidate = parseBundle({ cards: base.cards, bigBoard: base.bigBoard, dreams: base.dreams, cellRules: base.cellRules, [part]: data }); }
    catch (e: any) { return { ok: false, problems: (e.issues ?? [{ message: String(e.message) }]).slice(0, 20).map((i: any) => `${(i.path ?? []).join(".")}: ${i.message}`) }; }
    const problems = validateBundle(candidate);
    if (problems.length) return { ok: false, problems };
    const version = Math.max(...this.bundles.keys()) + 1;
    const info: VersionInfo = { version, part, note, author, at: this.now(), published: false };
    this.add(version, candidate, info);
    this.writes.push(async () => this.persist?.saveVersion(info, candidate));
    return { ok: true, version };
  }

  publish(version: number): boolean {
    const info = this.infos.find((i) => i.version === version);
    if (!info) return false;
    info.published = true; this.activeVersion = version;
    this.writes.push(async () => this.persist?.setActive(version));
    return true;
  }
}
