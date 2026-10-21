// Ekran turi: o'lcham bo'yicha to'rt tartib. Hamma ekran shu yerdan foydalanadi (bitta qoida, bitta joyda).
//  phone   — tik telefon (< 600 px): bitta ustun, pastki menyu, qaror — pastki varaq.
//  tablet  — tik planshet (≥ 600 px, tik yo'nalish): telefon tartibi, lekin kengroq taxta va markazlangan ustun.
//  compact — yotiq telefon (balandlik < 520): chapda qaror/moliya, o'ngda sig'adigan taxta; sahifa aylanmaydi.
//  wide    — yotiq planshet va kompyuter (≥ 900 px): chapda moliya, markazda taxta (≥ 1366 da uch ustun).
export type LayoutKind = "phone" | "tablet" | "compact" | "wide";
export interface Layout { kind: LayoutKind; wide: boolean; compact: boolean; tablet: boolean }

export function layoutOf(width: number, height: number): Layout {
  const compact = height < 520 && width >= height * 1.25;
  const portraitBig = width >= 900 && height > width * 1.15; // 1024×1366 kabi tik planshet: kompyuter tartibi pastda bo'sh joy qoldirardi
  const wide = !compact && width >= 900 && !portraitBig;
  const tablet = !compact && !wide && width >= 600;
  return { kind: compact ? "compact" : wide ? "wide" : tablet ? "tablet" : "phone", wide: wide || compact, compact, tablet };
}
