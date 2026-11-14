import { describe, it, expect } from "vitest";
import { ActionIn } from "./protocol";

describe("qarz guvohlari: protokol", () => {
  it("qarz so'rovi 3 ta guvoh bilan; guvoh faqat «xabardor bo'ldim» yuboradi (accept maydoni yo'q)", () => {
    expect(ActionIn.safeParse({ type: "loan_request", giverId: "b", amount: 500, months: 12, witnesses: ["c", "d", "e"] }).success).toBe(true);
    expect(ActionIn.safeParse({ type: "loan_request", giverId: "b", amount: 500, months: 12 }).success).toBe(true); // eski o'yinlar: guvohsiz
    expect(ActionIn.safeParse({ type: "loan_request", giverId: "b", amount: 500, months: 12, witnesses: ["c", "d"] }).success).toBe(false);
    expect(ActionIn.safeParse({ type: "loan_witness", proposalId: 3 }).success).toBe(true);
    expect(ActionIn.safeParse({ type: "loan_witness", proposalId: 3, accept: true }).success).toBe(false);
  });
});
