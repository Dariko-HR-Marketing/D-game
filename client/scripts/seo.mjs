// Open Graph, Twitter, canonical va JSON-LD (11-band). Sayt manzili `SITE_URL` (standart https://tajriba24.uz) — absolyut URL kerak (Facebook/Telegram ko'rinishi uchun).
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
export const SITE_TITLE = "Tajriba 24 onlayn";
export const SITE_DESC = "Tajriba 24 onlayn — moliyaviy savodxonlik, pul oqimi va passiv daromad yaratishni do'stlar bilan o'ynab o'rganasiz. Asosiy o'yin bepul.";

export function seoHead(siteUrl = "https://tajriba24.uz") {
  const base = siteUrl.replace(/\/+$/, ""), img = `${base}/og.png`;
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: SITE_TITLE, url: `${base}/`, description: SITE_DESC, inLanguage: "uz", applicationCategory: "GameApplication", genre: "Moliyaviy savodxonlik o'yini", operatingSystem: "Web", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "UZS" }, publisher: { "@type": "Organization", name: "DARIKO" }, image: img };
  return [
    `<link rel="canonical" href="${esc(base)}/" />`,
    `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="${esc(SITE_TITLE)}" />`, `<meta property="og:locale" content="uz_UZ" />`,
    `<meta property="og:title" content="${esc(SITE_TITLE)}" />`, `<meta property="og:description" content="${esc(SITE_DESC)}" />`, `<meta property="og:url" content="${esc(base)}/" />`,
    `<meta property="og:image" content="${esc(img)}" />`, `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`, `<meta property="og:image:alt" content="Tajriba 24 onlayn: moliyaviy savodxonlik o'yini" />`,
    `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${esc(SITE_TITLE)}" />`, `<meta name="twitter:description" content="${esc(SITE_DESC)}" />`, `<meta name="twitter:image" content="${esc(img)}" />`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}
