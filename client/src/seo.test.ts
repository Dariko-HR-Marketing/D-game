import { describe, it, expect } from "vitest";
import { seoHead, SITE_TITLE } from "../scripts/seo.mjs";

describe("Open Graph va SEO (11-band)", () => {
  const h = seoHead("https://tajriba24.uz/");
  it("og:title/description/image/url, twitter:card va canonical absolyut URL bilan", () => {
    for (const t of ['property="og:title" content="Tajriba24 onlayn"', 'property="og:description"', 'property="og:image" content="https://tajriba24.uz/og.png"', 'property="og:url" content="https://tajriba24.uz/"', 'name="twitter:card" content="summary_large_image"', 'rel="canonical" href="https://tajriba24.uz/"', 'og:image:width" content="1200"', 'og:image:height" content="630"']) expect(h, t).toContain(t);
    expect(SITE_TITLE).toBe("Tajriba24 onlayn");
  });
  it("JSON-LD yaroqli JSON; WebApplication, bepul asosiy o'yin; atribut/teg chiqib ketmaydi", () => {
    const m = /<script type="application\/ld\+json">(.*)<\/script>/.exec(h)!; const ld = JSON.parse(m[1]);
    expect(ld["@type"]).toBe("WebApplication"); expect(ld.inLanguage).toBe("uz"); expect(ld.isAccessibleForFree).toBe(true); expect(ld.offers.price).toBe("0");
    const evil = seoHead('https://x.uz/"><script>alert(1)</script>'); expect(evil).not.toContain('"><script>'); expect(evil).toContain("&quot;"); expect(evil).not.toContain("<script>alert");
  });
});
