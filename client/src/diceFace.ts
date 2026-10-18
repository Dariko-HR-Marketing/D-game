// 3D kubik: yuzlar joyi va aylanish burchaklari (sof mantiq, testlanadi). Qarama-qarshi yuzlar yig'indisi 7.
export type Face = "front" | "back" | "right" | "left" | "top" | "bottom";
export const FACE_VALUE: Record<Face, number> = { front: 1, back: 6, right: 2, left: 5, top: 3, bottom: 4 };
/** Yuzni tomoshabinga qaratadigan kub burchagi (gradus): rotateX(x) rotateY(y). */
export const FACE_ANGLE: Record<Face, { x: number; y: number }> = {
  front: { x: 0, y: 0 }, back: { x: 0, y: 180 }, right: { x: 0, y: -90 }, left: { x: 0, y: 90 }, top: { x: -90, y: 0 }, bottom: { x: 90, y: 0 },
};
export const faceOf = (v: number): Face => (Object.keys(FACE_VALUE) as Face[]).find((f) => FACE_VALUE[f] === v) ?? "front"; // 1..6; boshqasi (yig'indi) — old yuz raqam bilan

export type Angles = { x: number; y: number };
/** Yangi tashlash uchun mutlaq burchaklar: oldingisidan kamida 2 aylanish oldinga + natija yuzi (animatsiya doim bir tomonga aylanadi). */
export function rollAngles(prev: Angles, value: number | null, n: number): Angles {
  const t = FACE_ANGLE[value !== null && value >= 1 && value <= 6 ? faceOf(value) : "front"];
  const turnsX = 2 + (n % 2), turnsY = 3 + (n % 3);
  const base = (cur: number, target: number, turns: number) => target + 360 * (Math.ceil((cur - target) / 360) + turns);
  return { x: base(prev.x, t.x, turnsX), y: base(prev.y, t.y, turnsY) };
}
/** Burchak natija yuzini ko'rsatadimi (360 ga bo'lib). */
export const restsOn = (a: Angles, value: number) => { const t = FACE_ANGLE[faceOf(value)]; const m = (v: number) => ((v % 360) + 360) % 360; return m(a.x) === m(t.x) && m(a.y) === m(t.y); };
