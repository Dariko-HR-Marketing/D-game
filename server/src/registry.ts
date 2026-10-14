// Kontent versiyalari (§12, §11): o'yin boshlanganda versiya qulflanadi, nashr qilingan yangi versiya faqat yangi o'yinlarga tegadi.
import { loadContent, parseBundle, validateBundle, type Bundle } from "@poyga/content";
import type { Ctx } from "@poyga/rules";
import { buildCtxFrom } from "./ctx";

export type Part = "cards" | "bigBoard" | "dreams";
export interface VersionInfo { version: number; part: Part | "initial"; note: string; author: string; at: number; published: boolean }

export class ContentRegistry {
  private bundles = new Map<number, Bundle>();
  private ctxs = new Map<number, Ctx>();
  infos: VersionInfo[] = [];
  activeVersion = 1;

  constructor(initial: Bundle = loadContent(), private now: () => number = Date.now) {
    this.add(1, initial, { version: 1, part: "initial", note: "Paketdagi dastlabki kontent", author: "system", at: now(), published: true });
  }
  private add(v: number, b: Bundle, info: VersionInfo) { this.bundles.set(v, b); this.ctxs.set(v, buildCtxFrom(b)); this.infos.push(info); }

  active(): { version: number; ctx: Ctx } { return { version: this.activeVersion, ctx: this.ctxs.get(this.activeVersion)! }; }
  bundle(v = this.activeVersion) { return this.bundles.get(v); }

  /** Faol versiya asosida bitta qismni almashtirib, yangi (nashr qilinmagan) versiya yaratadi. */
  createVersion(part: Part, data: unknown, author: string, note: string): { ok: true; version: number } | { ok: false; problems: string[] } {
    const base = this.bundles.get(this.activeVersion)!;
    let candidate: Bundle;
    try { candidate = parseBundle({ cards: base.cards, bigBoard: base.bigBoard, dreams: base.dreams, [part]: data }); }
    catch (e: any) { return { ok: false, problems: (e.issues ?? [{ message: String(e.message) }]).slice(0, 20).map((i: any) => `${(i.path ?? []).join(".")}: ${i.message}`) }; }
    const problems = validateBundle(candidate);
    if (problems.length) return { ok: false, problems };
    const version = Math.max(...this.bundles.keys()) + 1;
    this.add(version, candidate, { version, part, note, author, at: this.now(), published: false });
    return { ok: true, version };
  }

  publish(version: number): boolean {
    const info = this.infos.find((i) => i.version === version);
    if (!info) return false;
    info.published = true; this.activeVersion = version; return true;
  }
}
