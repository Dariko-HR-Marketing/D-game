// To'lov oqimi UX: sotib olish → kutish → (provayder tasdig'i) → «To'lov qabul qilindi»; provayderdan qaytish `?tolov=`; buyurtmalar tarixi.
// `pnpm tsx scripts/pay-check.ts` (oldindan client export:web va `cd client/dist && python3 -m http.server 8081`).
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { autoProfiles } from "./_seed";
import { buildApp } from "../src/app";
import type { PaymentProvider } from "../src/commerce";

const WEB = process.env.WEB ?? "http://localhost:8081"; process.env.CORS_ORIGINS = WEB;
let failed = 0; const check = (ok: boolean, msg: string) => { console.log(`${ok ? "OK   " : "XATO "} ${msg}`); if (!ok) failed++; };
const fake: PaymentProvider = { id: "payme", channels: ["web"], async checkout(o) { return { ref: "p-" + o.id, url: `${WEB}/?tolov=${o.id}` }; } };
const x = buildApp({ providers: [fake] }); await x.ready; x.commerce.seedPilot(); await x.app.listen({ port: 3000, host: "127.0.0.1" });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined), args: ["--no-sandbox"] });
autoProfiles(x, b);
for (const [tag, w, h] of [["kmp", 1280, 900], ["tel", 390, 844]] as const) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.addInitScript((u) => { localStorage.setItem("tajriba24-dev-user", u); localStorage.setItem("tajriba24-tours-off", "1"); localStorage.setItem("tajriba24-tutorial-done", "1"); }, "pay" + tag);
  const p = await c.newPage(); await p.goto(WEB);
  await p.getByTestId("home-packs").first().waitFor({ timeout: 20000 }); await p.getByTestId("home-packs").first().click(); await p.getByTestId("packs").waitFor();
  await p.getByTestId("pack-plus").getByRole("button", { name: "Sotib olish" }).click(); await p.getByTestId("checkout").waitFor();
  await p.getByTestId("pay-payme").click(); await p.getByRole("button", { name: "To'lash" }).click();
  await p.getByTestId("order-tracker").waitFor({ timeout: 8000 });
  check(await p.getByText("To'lov kutilmoqda").first().isVisible() && await p.getByRole("button", { name: "To'lov oynasini ochish" }).isVisible(), `${tag}: to'lov kutilmoqda va «To'lov oynasini ochish» tugmasi`);
  const ord = x.commerce.ordersOf("pay" + tag)[0]; check(!!ord && ord.status === "pending_payment" && ord.sku === "plus:monthly" && ord.amount === 49_000, `${tag}: buyurtma yaratildi (Plus oylik 49 000)`);
  x.commerce.confirmPaid(ord.id, ord.amount); // provayder xabari (server tomoni)
  await p.getByText("To'lov qabul qilindi").first().waitFor({ timeout: 9000 }); check(true, `${tag}: to'lov tasdiqlangach sahifa o'zi yangilanadi («To'lov qabul qilindi»)`);
  check(x.commerce.plan("pay" + tag) === "plus", `${tag}: paket Plus bo'ldi`);
  await p.getByRole("button", { name: "Davom etish" }).click(); await p.getByTestId("packs").waitFor();
  await p.getByTestId("packs-orders").click(); check(await p.getByText("To'langan").first().waitFor({ timeout: 6000 }).then(() => true, () => false), `${tag}: buyurtmalarim ro'yxatida «To'langan»`);
  // provayderdan qaytish
  await p.goto(`${WEB}/?tolov=${ord.id}`); await p.getByTestId("pay-result").waitFor({ timeout: 10000 }); check(await p.getByText("To'lov qabul qilindi").first().waitFor({ timeout: 8000 }).then(() => true, () => false), `${tag}: qaytgach (?tolov=) natija ko'rsatiladi`);
  // bekor qilish
  const o2 = await x.commerce.order("pay" + tag, "coupon:1", "web", undefined, "payme"); check(o2.ok, `${tag}: kupon buyurtmasi`);
  if (o2.ok) { await p.goto(`${WEB}/?tolov=${o2.order.id}`); await p.getByTestId("pay-result").waitFor(); await p.getByRole("button", { name: "Buyurtmani bekor qilish" }).click(); await p.getByText("Buyurtma bekor qilindi").first().waitFor({ timeout: 6000 }); check(true, `${tag}: buyurtmani bekor qilish`); }
  await c.close();
}
await b.close(); await x.app.close(); console.log(failed ? `PAY: ${failed} ta xato` : "PAY: hammasi to'g'ri"); process.exit(failed ? 1 : 0);
