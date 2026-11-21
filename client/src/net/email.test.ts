import { describe, it, expect } from "vitest";
import { validEmail } from "./http";
describe("email tekshiruvi (mijoz)", () => {
  it("to'g'ri va noto'g'ri manzillar", () => { for (const ok of ["ali@mail.uz", " Ali.V+x@Mail.Co.uz "]) expect(validEmail(ok)).toBe(true); for (const bad of ["", "ali", "ali@", "@mail.uz", "ali@mail", "a b@mail.uz", "a@b.c"]) expect(validEmail(bad)).toBe(false); });
});
