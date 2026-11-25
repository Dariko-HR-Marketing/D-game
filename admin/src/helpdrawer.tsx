import React, { useEffect, useRef } from "react";
import { GLOSSARY, ROLE_GUIDE } from "./help";

/** Yon panel: atamalar lug'ati, rollar, klaviatura. Har bo'limdan «Yordam» tugmasi bilan ochiladi. */
export function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (<dialog ref={ref} className="drawer" aria-labelledby="hd-t" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}><h2 id="hd-t">Yordam</h2><button onClick={onClose}>Yopish</button></div>
    <h3 style={{ margin: "16px 0 6px" }}>Asosiy qoidalar</h3>
    <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}><li>Har bo'limning tepasida «Qanday ishlatiladi?» bor — qadamlar va maslahat.</li><li>Xavfli amal (bloklash, qaytarish, nashr) har doim <b>sabab</b> so'raydi va auditga yoziladi.</li><li>Ko'rsatkich tagidagi kichik matn atamani tushuntiradi.</li><li>Sessiya 2 soat harakatsizlikdan keyin tugaydi.</li></ul>
    <h3 style={{ margin: "16px 0 6px" }}>Rollar</h3>
    <dl className="kv" style={{ gridTemplateColumns: "minmax(120px,170px) 1fr" }}>{ROLE_GUIDE.map(([r, d]) => <React.Fragment key={r}><dt>{r}</dt><dd style={{ fontSize: 14 }}>{d}</dd></React.Fragment>)}</dl>
    <h3 style={{ margin: "16px 0 6px" }}>Atamalar</h3>
    <dl className="kv" style={{ gridTemplateColumns: "minmax(110px,150px) 1fr" }}>{GLOSSARY.map(([k, d]) => <React.Fragment key={k}><dt>{k}</dt><dd style={{ fontSize: 14 }}>{d}</dd></React.Fragment>)}</dl>
    <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>Hujjat: docs/ADMIN.md. Muammo bo'lsa — «Tizim» bo'limidagi so'nggi xatolarni ko'rib, administratorga murojaat qiling.</p>
  </dialog>);
}
