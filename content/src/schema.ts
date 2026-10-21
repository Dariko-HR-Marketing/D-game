import { z } from "zod";

const file = z.string().regex(/\.(png|webp)$/i);
const money = z.number().int().nonnegative();

export const Kasb = z.object({
  n: z.number().int(), name: z.string().min(1), salary: money, exp: z.array(money).length(9),
  total: money, cf: z.number().int(), save: money, kv: money, car: money, child: money,
  flags: z.array(z.string()), file,
}).refine((k) => k.exp.reduce((a, b) => a + b, 0) === k.total, "exp yig'indisi total ga teng emas")
  .refine((k) => k.salary - k.total === k.cf, "salary − total ≠ cf");

const Kichik = z.object({ file, code: z.string(), type: z.string(), text: z.string(), note: z.string().optional(),
  price: money.optional(), income: money.optional(), amount: money.optional(),
  share: money.optional(), min: money.optional(), max: money.optional(),
  full: money.optional(), down: money.optional(), credit: money.optional(), interest: z.number().int().optional(),
  rent: money.optional(), real: z.union([z.number(), z.literal("?")]).optional() });
export const KichikCard = Kichik;

export const KattaCard = z.object({ file, code: z.string(), group: z.string(), text: z.string(), full: money,
  income: money.optional(), down: money.optional(), credit: money.optional(), interest: z.number().int().optional(),
  rent: money.optional(), real: z.union([z.number(), z.literal("?")]).optional(),
  decided: z.string().optional(), note: z.string().optional() });

export const BozorCard = z.object({ file, code: z.string(), group: z.string(), text: z.string(),
  amount: z.union([z.number(), z.string()]), who: z.string(), kind: z.string(), note: z.string() });

export const XarCard = z.object({ n: z.number().int(), text: z.string(), amount: money, note: z.string(), file });
export const KxarCard = z.object({ n: z.number().int(), file, text: z.string(), amount: money });
export const HodCard = z.object({ n: z.number().int(), file, text: z.string(),
  amount: z.union([money, z.string()]), note: z.string().optional() });
export const NewCard = z.object({ deck: z.enum(["kichik", "bozor", "xar", "hod"]), code: z.string(), file, text: z.string(),
  who: z.string(), kind: z.string(), amount: z.union([money, z.string()]).optional(),
  price: z.union([money, z.string()]).optional(), salary_plus: money.optional() });

export const Cards = z.object({
  kasb: z.array(Kasb), kichik: z.array(KichikCard), katta: z.array(KattaCard), bozor: z.array(BozorCard),
  xar: z.array(XarCard), kxar: z.array(KxarCard), hod: z.array(HodCard), new: z.array(NewCard),
});
export type Cards = z.infer<typeof Cards>;

export const EXPECTED_COUNTS = { kasb: 32, kichik: 82, katta: 85, bozor: 98, xar: 85, kxar: 25, hod: 9, new: 6 } as const;

export const Dream = z.object({ name: z.string().min(1), price: money });
export const BigCell = z.object({ i: z.number().int(), t: z.enum(["T", "V", "O", "X", "Y"]), name: z.string(),
  income: money.nullable(), price: money.nullable(), note: z.string(),
  faces: z.array(z.number().int().min(1).max(6)).min(1).max(6).optional(), // tavakkal (V): yutuqli kubik qirralari
  lump: money.optional() });                                                // tavakkal (V): bir martalik natija (oylik daromad o'rniga)
