/** Fon rasmi turi: tik ekran (telefon, tik planshet, kvadrat) — butun portret; keng ekran (kompyuter, yotiq planshet/telefon) — kesilgan keng rasm. */
export const backdropKind = (w: number, h: number): "wide" | "portrait" => (w > h * 1.05 ? "wide" : "portrait");
