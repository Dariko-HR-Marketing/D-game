// Veb eksportdan keyin index.html ni tuzatadi: til (uz — brauzer «tarjima qilinsinmi?» deb so'ramasin), mavzu rangi, tavsif,
// PWA (manifest, ikonka), yuklanish paytida bo'sh oq ekran o'rniga rangli fon va matn.
import { readFileSync, writeFileSync } from "node:fs";
const f = new URL("../dist/index.html", import.meta.url);
let h = readFileSync(f, "utf8");
const once = (a, b) => { if (!h.includes(a)) throw new Error("index.html shabloni o'zgargan: " + a); h = h.replace(a, b); };
once('<html lang="en">', '<html lang="uz" translate="no">');
once('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1" />\n    <meta name="theme-color" content="#0A7A50" />\n    <meta name="color-scheme" content="light" />\n    <meta name="google" content="notranslate" />\n    <meta name="description" content="POYGA onlayn — moliyaviy savodxonlik, pul oqimi va passiv daromad yaratishni o\'rgatadigan stol o\'yinining onlayn versiyasi." />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-title" content="POYGA" />\n    <link rel="manifest" href="/manifest.webmanifest" />\n    <link rel="apple-touch-icon" href="/icons/icon-180.png" />');
once("<title>POYGA</title>", "<title>POYGA onlayn</title>");
// birinchi bo'yash: bundle yuklanguncha fon rangi (oq chaqnash yo'q) va oddiy yuklanish belgisi
once("body {\n        overflow: hidden;\n      }", "body {\n        overflow: hidden;\n        background: #F4F7F8;\n        overscroll-behavior: none;\n        -webkit-text-size-adjust: 100%;\n      }\n      #boot { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font: 700 18px system-ui, sans-serif; color: #0A2540; letter-spacing: 1px }\n      #root:not(:empty) + #boot { display: none }");
once('<div id="root"></div>', '<div id="root"></div>\n    <div id="boot" aria-hidden="true">POYGA</div>');
once("<noscript>\n      You need to enable JavaScript to run this app.\n    </noscript>", "<noscript>\n      O'yinni ishga tushirish uchun JavaScript yoqilgan bo'lishi kerak.\n    </noscript>");
writeFileSync(f, h);
console.log("index.html tuzatildi");
