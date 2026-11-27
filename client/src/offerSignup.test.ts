import { describe, it, expect } from "vitest";
import { clearSignupOffer, hasSignupOffer, markSignupOffer } from "./offerSignup";

describe("ro'yxatdan o'tishdagi oferta qabuli", () => {
  it("belgilanadi, o'qiladi va tozalanadi (xotira yopiq bo'lsa ham)", () => {
    clearSignupOffer(); expect(hasSignupOffer()).toBe(false);
    markSignupOffer(); expect(hasSignupOffer()).toBe(true);
    clearSignupOffer(); expect(hasSignupOffer()).toBe(false);
  });
});
