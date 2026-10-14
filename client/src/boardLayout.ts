/** Halqa katagi markazi, [0..1] kvadrat ichida; 0 = tepada, soat yo'nalishida. */
export function ringPosition(i: number, n: number, radius = 0.44, turns = 0): { x: number; y: number } {
  // turns: chorak burilish soni (1 = 90° soat yo'nalishida). Telefonda taxta 90° burilgan ko'rinadi (§9): START chapda.
  const a = (i / n) * 2 * Math.PI - Math.PI / 2 + (turns * Math.PI) / 2;
  return { x: 0.5 + radius * Math.cos(a), y: 0.5 + radius * Math.sin(a) };
}
