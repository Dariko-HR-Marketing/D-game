import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
// Karta rasmlari generatori (buyurtmachi topshirig'i 2026-11-09: «dizayn kerak bo'lsa o'zing chizib tayyorla»).
// Mavjud 414 rasmning uslubida (kolodaga xos rang va tuzilma) kartaning HAQIQIY ma'lumotidan (matn, narx, daromad) 960×617 yuz chizadi:
//  • yangi kartalar (`image: NEW_ART`, content/data/cards.json katalogi) → `<id>.webp`, katalogdagi `file` maydoniga yoziladi;  chiqish: content/art/generated (repoda; VPS ga `deploy/vps/install-art.sh` ko‘chiradi);
//  • qayta chizish kerak kartalar (CSV `image_status=REDRAW`, eski kartalar) → eski fayl nomi ustiga (asl nusxa git tarixida).
// Dizayner haqiqiy rasm bersa, shu nomdagi faylni almashtirish kifoya. Ishlatish:
//   pnpm --filter @poyga/server exec tsx scripts/render-card-art.ts [--only=Y001,Y002] [--out=papka] [--no-write-json]
import { chromium } from "playwright-core";
import { parseCatalogCsv, fileKey } from "../../content/src/catalog";

const ROOT = new URL("../../", import.meta.url).pathname;
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const OUT = arg("out") ?? join(ROOT, "content/art/generated"), ONLY = arg("only")?.split(","), WRITE_JSON = !process.argv.includes("--no-write-json"), JSON_ONLY = process.argv.includes("--json-only");
const CARDS = join(ROOT, "content/data/cards.json"), CSV = join(ROOT, "content/imports/tajriba24/tajriba24_cards_import.csv");
const cards = JSON.parse(readFileSync(CARDS, "utf8")); const rows = parseCatalogCsv(readFileSync(CSV, "utf8"));

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); // §2.3: to'liq yoziladi, ming ajratuvchi — bo'sh joy
const up = (s: string) => s.toLocaleUpperCase("uz");
/** «Ish haqi +15 % (doimiy) · ichki izoh» → faqat o'yinchiga ko'rinadigan birinchi qism (ichki izohlar — «kind:», «Mavjud» — chiqmaydi). */
const effectLine = (d?: string) => { const p = (d ?? "").split(" · ")[0].trim(); return !p || /kind:|Mavjud|neytr|Karta kind|to[‘'’]g[‘'’]ri javob/i.test(p) ? "" : p; };

const BASE = `*{box-sizing:border-box;margin:0}body{width:960px;font-family:"DejaVu Sans",Verdana,sans-serif;-webkit-font-smoothing:antialiased}.fit{overflow:hidden}`;
type Job = { out: string; w: number; h: number; html: string; fit: { sel: string; max: number; min: number }[]; id?: string };
const wrap = (body: string, bg: string, h = 617) => `<html><head><style>${BASE}body{height:${h}px;background:${bg}}</style></head><body>${body}</body></html>`;

// ── bozor (ko'k sarlavha) ──
function bozor(o: { head: string; chip: string; title: string; text: string; foot?: string }): Pick<Job, "html" | "fit"> {
  return { fit: [{ sel: ".t", max: 38, min: 22 }], html: wrap(`
  <div style="position:absolute;left:24px;top:14px;width:912px;height:580px;background:#fff;border:2px solid #BFE0F5;border-radius:36px;overflow:hidden">
    <div style="height:108px;background:#0B58A8;display:flex;align-items:center;justify-content:space-between;padding:0 36px"><div style="color:#fff;font-weight:800;font-size:30px;letter-spacing:.5px">${esc(up(o.head))}</div><div style="background:#06305F;color:#fff;font-weight:800;font-size:30px;padding:14px 26px;border-radius:16px">${esc(up(o.chip))}</div></div>
    <div style="padding:26px 38px 0"><div style="color:#06305F;font-weight:800;font-size:38px;letter-spacing:.5px;height:50px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(up(o.title))}</div>
    <div style="display:flex;gap:22px;margin-top:14px"><div style="width:9px;border-radius:5px;background:#0B8AD6;flex:none"></div><div class="t fit" style="height:${o.foot ? 238 : 330}px;color:#0F3B66;font-size:36px;line-height:1.3">${esc(o.text)}</div></div></div>
    ${o.foot ? `<div style="position:absolute;left:38px;right:38px;bottom:24px;background:#E9F4FD;border:2px solid #BFE0F5;border-radius:18px;padding:16px 24px;color:#0B58A8;font-weight:800;font-size:28px">${esc(o.foot)}</div>` : ""}
  </div>`, "#F2F8FF") };
}
// ── xarajat / katta aylana xarajati / sug'urta ──
function xar(o: { head: string; chip: string; title: string; text: string; amountLabel: string; amount?: number; theme: "red" | "terra" | "blue" }): Pick<Job, "html" | "fit"> {
  const c = { red: ["#C62B3A", "#861624", "#0E2F55", "#D3243A", "#FDEDEC"], terra: ["#A94738", "#7E2E24", "#4A1F18", "#C9503B", "#FDEFEA"], blue: ["#0B58A8", "#06305F", "#06305F", "#0B8AD6", "#E9F4FD"] }[o.theme];
  return { fit: [{ sel: ".t", max: 36, min: 22 }], html: wrap(`
  <div style="position:absolute;left:24px;top:18px;width:912px;height:580px;background:#fff;border:2px solid #F0C9C4;border-radius:36px;overflow:hidden">
    <div style="height:102px;background:${c[0]};display:flex;align-items:center;justify-content:space-between;padding:0 40px"><div style="color:#fff;font-weight:800;font-size:30px">${esc(up(o.head))}</div><div style="background:${c[1]};color:#fff;font-weight:800;font-size:26px;padding:14px 24px;border-radius:16px">${esc(up(o.chip))}</div></div>
    <div style="padding:26px 40px 0"><div style="color:${c[2]};font-weight:800;font-size:40px;height:52px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(up(o.title))}</div>
    <div style="display:flex;gap:24px;margin-top:16px"><div style="width:9px;border-radius:5px;background:${c[3]};flex:none"></div><div class="t fit" style="height:${o.amount !== undefined ? 200 : 300}px;color:${c[2]};font-size:34px;line-height:1.35">${esc(o.text)}</div></div></div>
    ${o.amount !== undefined ? `<div style="position:absolute;left:40px;right:40px;bottom:28px;height:92px;background:${c[4]};border:2px solid ${c[3]};border-radius:20px;display:flex;align-items:center;justify-content:space-between;padding:0 34px"><div style="color:${c[1]};font-weight:800;font-size:24px">${esc(up(o.amountLabel))}</div><div style="color:${c[3]};font-weight:800;font-size:46px">${fmt(o.amount)} sh.b.</div></div>` : ""}
  </div>`, "#F4F7FA") };
}
// ── kutilmagan hodisa (qora sarlavha) ──
function hod(o: { sub: string; text: string; amount?: number; options?: string[]; foot?: string }): Pick<Job, "html" | "fit"> {
  return { fit: [{ sel: ".t", max: o.options ? 34 : 38, min: 22 }], html: wrap(`
  <div style="position:absolute;left:22px;top:16px;width:916px;height:588px;background:#fff;border:2px solid #DDE1E6;border-radius:34px;overflow:hidden">
    <div style="height:118px;background:#26282B;display:flex;align-items:center;padding:0 48px"><div style="color:#fff;font-weight:800;font-size:52px">KUTILMAGAN HODISA!</div></div>
    <div style="padding:26px 40px 0"><div style="color:#3A3C40;font-weight:800;font-size:30px;height:40px;overflow:hidden;white-space:nowrap">${esc(up(o.sub))}</div>
    <div style="display:flex;gap:24px;margin-top:14px"><div style="width:9px;border-radius:5px;background:#EF2F3C;flex:none"></div><div class="t fit" style="height:${o.options ? 84 : 250}px;color:#2B2D31;font-weight:700;font-size:36px;line-height:1.3">${esc(o.text)}</div></div>
    ${o.options ? `<div style="margin-top:10px;display:flex;flex-direction:column;gap:7px">${o.options.map((t, i) => `<div style="display:flex;gap:16px;align-items:center;background:#F3F4F6;border-radius:14px;padding:5px 18px;font-size:24px;color:#2B2D31"><b style="background:#26282B;color:#fff;border-radius:10px;padding:2px 14px">${"ABV"[i]}</b><span style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(t)}</span></div>`).join("")}</div>` : ""}</div>
    <div style="position:absolute;left:40px;right:40px;bottom:24px;border-top:2px solid #E3E5E8;padding-top:16px;display:flex;justify-content:space-between;align-items:center">
      ${o.amount !== undefined ? `<div style="background:#181B20;color:#fff;font-weight:800;font-size:38px;padding:14px 26px;border-radius:18px">${fmt(o.amount)} sh.b.</div>` : `<div style="background:#181B20;color:#fff;font-weight:800;font-size:28px;padding:14px 26px;border-radius:18px;max-width:700px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(o.foot ?? "")}</div>`}
      <div style="border:4px solid #E0283A;color:#E0283A;font-weight:900;font-size:44px;width:68px;height:68px;border-radius:10px;display:flex;align-items:center;justify-content:center">K</div></div>
  </div>`, "#F3F5F8") };
}
// ── kichik sarmoya (yashil) ──
function kichik(o: { title: string; text: string; boxes: [string, string][]; code: string; note: string }): Pick<Job, "html" | "fit"> {
  return { fit: [{ sel: ".h", max: 44, min: 28 }, { sel: ".t", max: 34, min: 20 }], html: wrap(`
  <div style="position:absolute;left:0;top:0;width:960px;height:617px;background:#F8FAFB">
    <div class="h fit" style="position:absolute;left:50px;right:50px;top:26px;height:112px;text-align:center;color:#0A4A28;font-weight:800;font-size:44px;line-height:1.25;display:flex;align-items:center;justify-content:center">${esc(o.title)}</div>
    <div class="t fit" style="position:absolute;left:60px;right:60px;top:146px;height:${o.boxes.length ? 150 : 270}px;text-align:center;color:#111;font-size:34px;line-height:1.3">${esc(o.text)}</div>
    ${o.boxes.length ? `<div style="position:absolute;left:50px;right:50px;top:318px;height:118px;display:flex;border:5px solid #00B957;background:#E7FDEC">${o.boxes.map(([l, v], i) => `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 22px;${i ? "border-left:5px solid #00B957" : ""}"><div style="font-weight:800;font-size:25px;color:#111;width:150px;line-height:1.15">${esc(l)}</div><div style="font-weight:800;font-size:${v.length <= 3 ? 60 : v.length <= 5 ? 52 : 42}px;color:#E1112B;white-space:nowrap">${esc(v)}</div></div>`).join("")}</div>` : ""}
    <div style="position:absolute;left:50px;right:50px;bottom:34px;height:108px;display:flex;gap:16px"><div style="width:206px;background:#009A4C;border-radius:8px;color:#fff;font-weight:900;font-size:${o.code.length > 3 ? 48 : 66}px;display:flex;align-items:center;justify-content:center">${esc(o.code)}</div><div style="flex:1;background:#E4FCE8;border-radius:8px;padding:12px 18px;font-size:25px;line-height:1.2;color:#111;display:flex;align-items:center">${esc(o.note)}</div></div>
  </div>`, "#F8FAFB") };
}
// ── katta sarmoya (to'q sariq) ──
function katta(o: { pill: string; code: string; label: string; title: string; text?: string; boxes: [string, string, "a" | "g"][]; note: string }): Pick<Job, "html" | "fit"> {
  return { fit: [{ sel: ".h", max: 54, min: 30 }, { sel: ".t", max: 28, min: 20 }], html: wrap(`
  <div style="position:absolute;left:0;top:0;width:960px;height:617px;background:#FFFCF7">
    <div style="height:18px;background:#FFB800"></div><div style="height:10px;background:#FF7A1A"></div>
    <div style="position:absolute;left:46px;top:48px;background:#153326;color:#fff;font-weight:800;font-size:25px;padding:14px 20px;border-radius:14px">${esc(up(o.pill))}</div>
    <div style="position:absolute;right:44px;top:48px;background:#FFE3A3;color:#1B2B25;font-weight:900;font-size:25px;padding:14px 24px;border-radius:14px">${esc(o.code)}</div>
    <div style="position:absolute;left:50px;top:116px;color:#9A5A12;font-weight:800;font-size:24px">${esc(up(o.label))}</div>
    <div class="h fit" style="position:absolute;left:50px;right:50px;top:150px;height:${o.text ? 78 : 130}px;color:#15281F;font-weight:800;font-size:54px;line-height:1.12">${esc(o.title)}</div>
    ${o.text ? `<div class="t fit" style="position:absolute;left:50px;right:50px;top:232px;height:70px;color:#3D4A44;font-size:26px;line-height:1.25">${esc(o.text)}</div>` : ""}
    <div style="position:absolute;left:44px;right:44px;top:318px;height:150px;display:flex;gap:14px">${o.boxes.map(([l, v, k]) => `<div style="flex:1;border-radius:20px;padding:20px 24px;background:${k === "a" ? "#FFF0D6" : "#E6F6EC"}"><div style="font-weight:800;font-size:23px;color:${k === "a" ? "#6A4412" : "#1F5A3B"}">${esc(up(l))}</div><div style="margin-top:18px;font-weight:800;font-size:${v.length > 9 ? 44 : 54}px;color:${k === "a" ? "#15281F" : "#0A8A4E"}">${esc(v)}</div></div>`).join("")}</div>
    <div style="position:absolute;left:44px;right:44px;bottom:36px;height:100px;background:#1A3B2E;border-radius:18px;padding:14px 22px;color:#fff;font-size:23px;line-height:1.25;display:flex;align-items:center">${esc(o.note)}</div>
  </div>`, "#FFFCF7") };
}
// ── karyera / missiya (kasb kartasi uslubida, yashil ramka) ──
function kasbExt(o: { label: string; title: string; text: string; foot: string }): Pick<Job, "html" | "fit"> {
  return { fit: [{ sel: ".t", max: 36, min: 22 }], html: wrap(`
  <div style="position:absolute;left:14px;top:12px;width:932px;height:593px;background:#fff;border:7px solid #0A9A5C;border-radius:44px;overflow:hidden">
    <div style="margin:34px 44px 0;height:78px;background:#0A9A5C;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:34px;letter-spacing:1px">${esc(up(o.label))}</div>
    <div style="padding:28px 54px 0"><div style="color:#0B2545;font-weight:800;font-size:44px;height:60px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(o.title)}</div><div class="t fit" style="margin-top:12px;height:170px;color:#183153;font-size:36px;line-height:1.3">${esc(o.text)}</div></div>
    <div style="position:absolute;left:44px;right:44px;bottom:30px;height:92px;background:#E3F7EC;border:3px solid #0A9A5C;border-radius:18px;display:flex;align-items:center;padding:0 28px;color:#0A5A36;font-weight:800;font-size:28px;overflow:hidden;white-space:nowrap">${esc(o.foot)}</div>
  </div>`, "#F4F8F6") };
}
// ── kasb xulosasi (qayta chizish: jami xarajat o'zgargan kasblar) ──
function kasbSummary(k: { name: string; salary: number; total: number; cf: number; save: number; kv?: number; car?: number; child: number }): Pick<Job, "html" | "fit"> {
  const rowH = (l: string, v: string, strong = false) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:0 24px;height:74px;border-bottom:2px solid #D7E3EA;${strong ? "background:#E3EEF5;font-weight:800" : ""}"><span style="font-size:30px">${esc(l)}</span><span style="font-size:36px;font-weight:800">${esc(v)}</span></div>`;
  return { fit: [{ sel: ".h", max: 44, min: 26 }], html: wrap(`
  <div style="position:absolute;left:18px;top:14px;width:924px;height:1042px;background:#fff;border:10px solid #0A9A5C;border-radius:52px;overflow:hidden">
    <div style="padding:46px 56px 0;color:#0B2545;font-weight:800;font-size:56px">KASB KARTOCHKASI</div>
    <div class="h fit" style="margin:26px 56px 0;height:124px;background:#0A9A5C;border-radius:20px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:44px;padding:0 20px;text-align:center">${esc(up(k.name))}</div>
    <div style="margin:36px 56px 0;border:2px solid #D7E3EA;border-radius:14px;overflow:hidden;color:#0B2545">${rowH("Ish haqi (aktiv daromad)", fmt(k.salary))}${rowH("Jami xarajat", fmt(k.total), true)}${rowH("Bir bolaga ketadigan xarajat", fmt(k.child))}</div>
    <div style="margin:34px 56px 0;background:#E3F7EC;border:4px solid #0A9A5C;border-radius:22px;padding:26px 32px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:800;font-size:40px;color:#0B2545">Oylik pul oqimi</div><div style="font-size:26px;color:#3D5568;margin-top:6px">Jami daromad − jami xarajat</div></div><div style="font-weight:900;font-size:80px;color:${k.cf >= 0 ? "#0A8A4E" : "#C62B3A"}">${fmt(k.cf)}</div></div>
    <div style="display:flex;gap:24px;margin:40px 56px 0"><div style="flex:1"><div style="background:#0B2545;color:#fff;text-align:center;font-weight:800;font-size:34px;padding:14px;border-radius:12px">AKTIVLAR</div><div style="display:flex;justify-content:space-between;padding:20px 12px;font-size:30px;color:#0B2545"><span>Jamg‘arma</span><b style="font-size:36px">${fmt(k.save)}</b></div></div>
    <div style="flex:1"><div style="background:#0B2545;color:#fff;text-align:center;font-weight:800;font-size:34px;padding:14px;border-radius:12px">KREDITLAR</div>${k.kv ? `<div style="display:flex;justify-content:space-between;padding:20px 12px 0;font-size:30px;color:#0B2545"><span>Kvartira</span><b style="font-size:36px">${fmt(k.kv)}</b></div>` : ""}${k.car ? `<div style="display:flex;justify-content:space-between;padding:14px 12px 0;font-size:30px;color:#0B2545"><span>Mashina</span><b style="font-size:36px">${fmt(k.car)}</b></div>` : ""}${!k.kv && !k.car ? `<div style="padding:20px 12px;font-size:30px;color:#3D5568">Kredit yo‘q</div>` : ""}</div></div>
    <div style="position:absolute;left:56px;right:56px;bottom:40px;text-align:center;font-weight:800;font-size:22px;color:#0B2545">BOSHLANG‘ICH MA’LUMOTLARNI O‘YIN BALANSINGIZGA KO‘CHIRIB OLING!</div>
  </div>`, "#F4F8F6", 1070) };
}

// ── ma'lumot → shablon ──
const sectorShort = (c: any) => (c.sector ?? c.cardType ?? "").slice(0, 14);
function fromCatalog(c: any): Pick<Job, "html" | "fit"> | null {
  const text = c.text ?? "", title = c.title ?? "", foot = effectLine(c.display), amount = typeof c.price === "number" ? c.price : undefined;
  switch (c.deckName) {
    case "Bozor": { const chips: Record<string, string> = { INCOME_CHANGE: "DAROMAD", ASSET_SELL_OFFER: "TAKLIF", MARKET_SIGNAL: "ALOMAT", MARKET_EVENT: "HODISA", SPONSOR_INFO: "HOMIY", AUCTION: "AUKSION", EXPENSE: "XARAJAT" };
      return bozor({ head: `BOZOR  /  ${c.sector ?? c.cardType ?? ""}`.trim(), chip: chips[c.kind] ?? "BOZOR", title: title || (c.kind === "SPONSOR_INFO" ? "HOMIY KARTASI" : "BOZOR XABARI"), text, foot: foot || (amount ? `${c.kind === "AUCTION" ? "Boshlang‘ich narx" : "Narx"}: ${fmt(amount)} sh.b.` : "") }); }
    case "Kichik sarmoya": {
      if (c.kind === "ASSET_BUY") return kichik({ title: title || "Sizda biznes imkoniyati mavjud:", text, boxes: [["Boshlang‘ich sarmoya", fmt(amount ?? 0)], ["Doimiy daromad", fmt(c.income ?? 0)]], code: "KB", note: "Agar ushbu biznes sizni qiziqtirsa, sarmoya miqdorini bankka topshiring va ko‘rsatilgan daromadni oylik daromadingizga qo‘shing." });
      const code = { DEVELOPMENT: "RIVOJ", DEPOSIT: "DEPOZIT", ONE_TIME_INCOME: "DAROMAD", FINANCE_OFFER: "TAKLIF" }[c.kind as string] ?? "KICHIK";
      return kichik({ title: title.length > 70 ? title.split(":")[0] : title, text: title.length > 70 ? `${title.split(":").slice(1).join(":").trim()} ${text}`.trim() : text, boxes: amount !== undefined ? [[c.kind === "ONE_TIME_INCOME" ? "Bir martalik daromad" : "Narxi", fmt(amount)], ...(c.income ? [[c.kind === "DEVELOPMENT" ? "Ish haqi / oy" : c.income > 0 ? "Oylik daromad" : "Oylik to‘lov", fmt(Math.abs(c.income))] as [string, string]] : [])] : [], code, note: foot || c.goal || "" }); }
    case "Katta sarmoya": {
      if (c.kind === "DREAM") { const flow = /≥\s*([\d ]+\d)/.exec(c.display ?? "")?.[1]; return katta({ pill: "Katta sarmoyalar", code: "ORZU", label: "Orzu (katta aylana)", title, text, boxes: [["Orzu narxi", fmt(amount ?? 0), "a"], ...(flow ? [["G‘alaba: pul oqimi", `≥ ${flow}`, "g"] as [string, string, "a" | "g"]] : [])], note: foot || "Orzu katagiga tushganda g‘alaba sharti bajarilsa — orzu amalga oshadi." }); }
      return katta({ pill: "Katta sarmoyalar", code: "KS", label: c.cardType ?? "Biznes", title, text, boxes: [["Boshlang‘ich sarmoya", fmt(amount ?? 0), "a"], ["Doimiy daromad / oy", fmt(c.income ?? 0), "g"]], note: "O‘yin qoidasi: biznesni sotib olish uchun boshlang‘ich sarmoyani bankka to‘lang. Doimiy daromadni oylik daromadingizga qo‘shing." }); }
    case "Xarajat": return xar({ head: `XARAJATLAR  /  ${c.cardType ?? ""}`, chip: c.kind === "INSURANCE" ? "SUG‘URTA" : "XARAJAT", title: title || "XARAJAT KARTASI", text, amountLabel: c.kind === "INSURANCE" ? "Sug‘urta narxi" : "Xarajat", amount, theme: c.kind === "INSURANCE" ? "blue" : "red" });
    case "Katta aylana xarajati": return xar({ head: "KATTA AYLANA  /  XARAJATLAR", chip: "TO‘LA", title: title || "XARAJAT XABARI", text, amountLabel: "Xarajat", amount, theme: "terra" });
    case "Kutilmagan hodisa": return c.kind === "QUIZ" ? hod({ sub: "Moliyaviy savod viktorinasi", text: `${title ? title + ". " : ""}${text}`, options: [c.optionA, c.optionB, c.optionV].filter(Boolean), foot: foot || "Viktorina · to‘g‘ri javobga XP" }) : hod({ sub: c.cardType ?? "Hodisa", text, amount, foot });
    case "Kasb": return kasbExt({ label: c.kind === "GOAL" ? "MISSIYA" : "KARYERA", title, text, foot: foot || c.goal || "" });
  }
  return null;
}

// ── ishlar ro'yxati ──
const jobs: Job[] = [];
for (const c of cards.catalog) {
  if (c.image !== "NEW_ART" || (ONLY && !ONLY.includes(c.id))) continue;
  const t = fromCatalog(c); if (!t) { console.log("o'tkazildi (shablon yo'q):", c.id, c.deckName, c.kind); continue; }
  jobs.push({ id: c.id, out: `${c.id}.webp`, w: 960, h: 617, ...t });
}
const DECKS = ["kasb", "kichik", "katta", "bozor", "xar", "kxar", "hod"] as const;
const findLegacy = (key: string) => { for (const d of DECKS) { const a = cards[d] as any[]; const i = a.findIndex((c) => c.file && fileKey(c.file) === key); if (i >= 0) return { d, c: a[i] }; } return null; };
let missing = 0;
for (const r of rows.filter((x) => x.image_status === "REDRAW")) {
  const hit = findLegacy(fileKey(r.legacy_file)); if (!hit) { missing++; console.log("eski karta topilmadi:", r.legacy_file); continue; }
  if (ONLY && !ONLY.includes(hit.c.file)) continue; const c = hit.c; let t: Pick<Job, "html" | "fit">, h = 617;
  switch (hit.d) {
    case "kasb": t = kasbSummary({ name: c.name, salary: c.salary, total: c.total, cf: c.cf, save: c.save, kv: c.kv, car: c.car, child: c.child }); h = 1070; break;
    case "kichik": t = kichik({ title: "Sizda kichik biznesni yo‘lga qo‘yish imkoniyati mavjud:", text: c.text, boxes: [["Boshlang‘ich sarmoya", fmt(c.price)], ["Doimiy daromad", fmt(c.income)]], code: c.code, note: "Agar ushbu biznes sizni qiziqtirsa, sarmoya miqdorini bankka topshiring va ko‘rsatilgan daromadni oylik daromadingizga qo‘shing." }); break;
    case "katta": t = katta({ pill: "Katta sarmoyalar", code: c.code, label: c.group ?? "Biznes", title: c.text, boxes: [["Boshlang‘ich sarmoya", fmt(c.full), "a"], ["Doimiy daromad / oy", fmt(c.income ?? 0), "g"]], note: "O‘yin qoidasi: biznesni sotib olish uchun boshlang‘ich sarmoyani bankka to‘lang. Doimiy daromadni oylik daromadingizga qo‘shing." }); break;
    case "bozor": t = bozor({ head: `BOZOR  /  ${c.group ?? ""}`, chip: c.code, title: "BOZOR XABARI", text: c.text }); break;
    case "xar": t = xar({ head: "XARAJATLAR", chip: "XARAJAT", title: "XARAJAT KARTASI", text: c.text, amountLabel: "Xarajat", amount: c.amount, theme: "red" }); break;
    case "kxar": t = xar({ head: "KATTA AYLANA  /  XARAJATLAR", chip: "TO‘LA", title: "XARAJAT XABARI", text: c.text, amountLabel: "Xarajat", amount: c.amount, theme: "terra" }); break;
    default: t = hod({ sub: "Moliyaviy yo‘qotish", text: c.text, amount: c.amount });
  }
  jobs.push({ out: c.file, w: 960, h, ...t });
}
console.log(`ishlar: ${jobs.length} (katalog ${jobs.filter((j) => j.id).length}, qayta chizish ${jobs.filter((j) => !j.id).length}), topilmagan eski karta: ${missing}`);

if (JSON_ONLY) { const ids = [...new Set<string>(jobs.filter((j) => j.id).map((j) => j.id!))].sort(); cards.art = ids; writeFileSync(CARDS, JSON.stringify(cards, null, 1) + "\n"); console.log(`cards.json: art = ${ids.length} ta karta kodi (chizilmadi)`); process.exit(0); }
// ── chizish ──
const TMP = join(ROOT, "node_modules/.cache/card-art"); mkdirSync(TMP, { recursive: true }); mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
const page = await b.newPage({ deviceScaleFactor: 1 }); const overflow: string[] = [];
for (const [i, j] of jobs.entries()) {
  await page.setViewportSize({ width: j.w, height: j.h }); await page.setContent(j.html, { waitUntil: "load" });
  const bad = await page.evaluate((fit) => { const out: string[] = []; for (const f of fit) for (const el of Array.from(document.querySelectorAll<HTMLElement>(f.sel))) { let s = f.max; el.style.fontSize = s + "px"; while (el.scrollHeight > el.clientHeight + 1 && s > f.min) { s -= 1; el.style.fontSize = s + "px"; } if (el.scrollHeight > el.clientHeight + 1) out.push(f.sel); } return out; }, j.fit);
  if (bad.length) overflow.push(`${j.out}:${bad.join(",")}`);
  await page.screenshot({ path: join(TMP, j.out.replace(/\.webp$/, ".png")) });
  if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${jobs.length}`);
}
await b.close();
// webp (PIL): 960 px, sifat 82 — mavjud rasmlar bilan bir xil o'lcham va format
const py = `import sys,os\nfrom PIL import Image\nsrc,dst=sys.argv[1],sys.argv[2]\nfor f in os.listdir(src):\n    if f.endswith('.png'):\n        Image.open(os.path.join(src,f)).convert('RGB').save(os.path.join(dst,f[:-4]+'.webp'),'WEBP',quality=82,method=6)\n`;
execFileSync("python3", ["-I", "-c", py, TMP, OUT]); for (const f of readdirSync(TMP)) if (f.endsWith(".png")) { /* vaqtinchalik */ }
if (overflow.length) console.log(`MATN SIG'MADI (${overflow.length}):`, overflow.slice(0, 20).join(" "));
if (WRITE_JSON) { const ids = [...new Set<string>([...(cards.art ?? []), ...jobs.filter((j) => j.id).map((j) => j.id!)])].sort(); cards.art = ids; writeFileSync(CARDS, JSON.stringify(cards, null, 1) + "\n"); console.log(`cards.json: art = ${ids.length} ta karta kodi`); }
console.log(`tayyor: ${jobs.length} ta rasm → ${OUT}`);
