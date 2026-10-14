/** Halqa katagi markazi, [0..1] kvadrat ichida; 0 = tepada, soat yo'nalishida. */
export function ringPosition(i: number, n: number, radius = 0.44): { x: number; y: number } {
  const a = (i / n) * 2 * Math.PI - Math.PI / 2;
  return { x: 0.5 + radius * Math.cos(a), y: 0.5 + radius * Math.sin(a) };
}
