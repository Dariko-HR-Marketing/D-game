/** §2.3: katta summalar doim to'liq: 1 020 000 (qisqartirishsiz). */
export function money(n: number): string {
  const neg = n < 0, s = Math.abs(Math.round(n)).toString();
  return (neg ? "−" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
export const sh = (n: number) => `${money(n)} sh.b.`;
