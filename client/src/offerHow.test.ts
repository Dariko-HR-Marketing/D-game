import { describe, it, expect } from "vitest";
import { marketOffers } from "./model";
import { offerHowLines } from "./offerHow";

const asset = (o: any) => ({ kind: "land", code: "E", price: 10000, monthlyIncome: 0, creditPayment: 0, credit: 0, ...o });
const room = (assets: any[], effect: any, over: any = {}) => ({ state: { players: [{ id: "a", assets, cash: 0, ...over }], proposals: [{ id: 1, kind: "market", cardId: "c", sold: [] }] }, marketCards: { 1: { text: "karta", effect } } });
const sale = (amount: number) => ({ kind: "marketSale", targets: ["Ye"], amount });

describe("bozor taklifi: yer «sotixiga» narxi sotix soniga ko'paytiriladi", () => {
  it("20 sotix × 800 = 16 000; hisob qatori ko'rinadi", () => {
    const o = marketOffers(room([asset({ units: 20 })], sale(800)), "a");
    expect(o).toHaveLength(1); expect(o[0].price).toBe(16000); expect(o[0].how).toEqual({ kind: "unit", per: 800, units: 20 }); expect(o[0].crisis).toBe(false);
    expect(offerHowLines(o[0]).join("|")).toMatch(/800.*20 sotix.*16 000/);
  });
  it("6 sotix × 700 = 4 200; sotix yo'q aktiv (eski o'yin) avvalgidek qat'iy narx", () => {
    expect(marketOffers(room([asset({ units: 6 })], sale(700)), "a")[0].price).toBe(4200);
    expect(marketOffers(room([asset({})], sale(700)), "a")[0].price).toBe(700);
  });
  it("inqirozda narx yarmi (server bilan bir xil) va qator buni aytadi", () => {
    const o = marketOffers(room([asset({ units: 20 })], sale(800), { crisisMonths: 6 }), "a")[0];
    expect(o.price).toBe(8000); expect(o.crisis).toBe(true); expect(offerHowLines(o).join("|")).toMatch(/16 000.*Inqiroz.*8 000/);
  });
  it("garovdagi yer taklifga chiqmaydi (server ham sotmaydi)", () => { expect(marketOffers(room([asset({ units: 20, pledged: true })], sale(800)), "a")).toHaveLength(0); });
  it("transport (+40 %): «sotib olingan 1 200 + 40 % = 1 680»", () => {
    const biz = { kind: "small_business", code: "Y002", price: 1200, monthlyIncome: 200, creditPayment: 0, credit: 0, name: "Kuryerlik xizmati", sector: "Transport va logistika", since: 0 };
    const e = { kind: "sellOffer", sel: { any: [{ sector: "Transport va logistika" }] }, mode: "pct", value: 40, first: true, holdMonths: 0 };
    const o = marketOffers(room([biz], e), "a")[0]; expect(o.price).toBe(1680); expect(o.how).toMatchObject({ kind: "pct", base: 1200, bought: 1200, pct: 40 });
    expect(offerHowLines(o)[0]).toMatch(/sotib olingan narx 1 200 \+ 40 % = 1 680/);
  });
});
