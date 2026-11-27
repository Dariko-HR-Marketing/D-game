import { describe, it, expect } from "vitest";
import { backdropKind } from "./backdropKind";

describe("fon rasmi: ekran nisbatiga qarab tanlanadi", () => {
  it("tik ekranlar — butun portret; keng ekranlar — kesilgan keng rasm", () => {
    expect(backdropKind(390, 844)).toBe("portrait"); expect(backdropKind(768, 1024)).toBe("portrait"); expect(backdropKind(1024, 1366)).toBe("portrait");
    expect(backdropKind(1440, 900)).toBe("wide"); expect(backdropKind(2560, 1440)).toBe("wide"); expect(backdropKind(3440, 1440)).toBe("wide");
    expect(backdropKind(844, 390)).toBe("wide"); // yotiq telefon
    expect(backdropKind(900, 900)).toBe("portrait"); // kvadrat — portret
  });
});
