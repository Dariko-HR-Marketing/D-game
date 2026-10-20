import type { IconName } from "./Icon";

/** Karta turi → sarlavha rangi va ikonka (maket N13: Imkoniyat — yashil, Bozor — ko'k, Xarajat — qizil). */
export const HEAD: Record<string, { bg: string; border: string; fg: string; icon: IconName; title: string }> = {
  kichik: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "move", title: "Imkoniyat" }, katta: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "move", title: "Imkoniyat" },
  choose: { bg: "#DCEEC4", border: "#A9CF7E", fg: "#0A5C3B", icon: "move", title: "Imkoniyat" },
  bozor: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85", icon: "cart", title: "Bozor" }, xar: { bg: "#FFD2D5", border: "#E8939B", fg: "#8F2434", icon: "search", title: "Xarajatlar" },
  kxar: { bg: "#FFD2D5", border: "#E8939B", fg: "#8F2434", icon: "star", title: "Orzu · katta xarajat" }, hod: { bg: "#EDF0F3", border: "#C3CBD3", fg: "#1B2733", icon: "alert", title: "Kutilmagan hodisa" },
  big: { bg: "#C9EBFA", border: "#7CC3E3", fg: "#0E5F85", icon: "house", title: "Katta aylana biznesi" }, rent: { bg: "#FFE3B8", border: "#E9A64B", fg: "#6B4300", icon: "house", title: "Birovning biznesi" },
};
export const headOf = (id: string, e: any) => {
  if (e?.kind === "gamble") return { ...HEAD.big, bg: "#FFE3B8", border: "#E9A64B", fg: "#6B4300", icon: "dice" as IconName, title: "Tavakkal biznes" };
  const known = HEAD[id.split("-")[0]]; if (known) return known;
  // Yangi kartalar («new») o'z dekasiga ko'ra: sarmoya/xarajat/bozor/hodisa
  return e?.kind === "pay" || e?.kind === "carInsurance" || e?.kind === "floodCarRepair" ? HEAD.xar : e?.kind === "buy" || e?.kind === "courseSalaryPlus" || e?.kind === "charity" ? HEAD.kichik : e?.kind === "marketSale" || e?.kind === "debtRepaid" || e?.kind === "tenantLeft" ? HEAD.bozor : HEAD.big;
};
