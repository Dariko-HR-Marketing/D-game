#!/usr/bin/env python3
"""Tajriba24 kartalar import jadvalini tekshiruvchi (faqat standart kutubxona).
Ishlatish:  python3 validate_cards.py tajriba24_cards_import.csv
Chiqish kodi: 0 — xato yo'q; 1 — xato bor (import to'xtatilsin). Ogohlantirishlar importni to'xtatmaydi."""
import csv,re,sys,collections
EFFECTS={"SOTISH_FOIZ","SOTISH_FOIZ_BIRINCHI","SOTISH_NARX","NARX_FOIZ","DAROMAD_FOIZ","DAROMAD_NOL","DAROMAD_KOPAYTIRISH","KECHIKTIRILGAN_NARX_FOIZ","KECHIKTIRILGAN_DAROMAD_FOIZ","NAQD_XARAJAT","NAQD_BONUS","NAQD_JARIMA","XARAJAT_FOIZ","KREDIT_TOLOV_FOIZ","ISH_HAQI_FOIZ","ISH_HAQI_QOSHISH","ISH_HAQI_NOL","OYLIK_XARAJAT","OYLIK_DAROMAD","DOIMIY_XARAJAT","DEPOZIT_FOIZ","SUGURTA_PREMIYA","SUGURTA_QOPLASH","XP_BONUS","MISSIYA_MUKOFOT","ORZU_SHARTI","AUKSION_BOSHLANISH","VIKTORINA_JAVOB"}
OPS={"INSERT","UPDATE","NOCHANGE","REMOVE"}
DECKS={1:"Kasb",2:"Kichik sarmoya",3:"Katta sarmoya",4:"Bozor",5:"Xarajat",6:"Katta aylana xarajati",7:"Kutilmagan hodisa"}
KINDS={"ASSET_BUY","ASSET_SELL_OFFER","EXPENSE","EVENT","MARKET_EVENT","INCOME_CHANGE","MARKET_SIGNAL","GOAL","DEVELOPMENT","QUIZ","FINANCE_OFFER","INSURANCE","SPONSOR_INFO","ONE_TIME_INCOME","SOCIAL_DUTY","PROFESSION","AUCTION","CAREER_EVENT","DREAM","TEACHER_CASE","DEPOSIT",""}
INTC=["deck_no","price","down_payment","loan","loan_payment_monthly","income_monthly","rent_monthly","market_price","salary","monthly_surplus","share_pct","qty_min","qty_max"]
BOOL=["publish","draw_enabled","needs_engine_mapping"]
REQ=["option_a","card_id","operation","deck_no","deck_name","card_type","direction","card_kind","text","pool","ranked_pool","needs_engine_mapping","draw_enabled","source_batch","review_status","image_status","publish"]
def kind_q(r): return r['card_kind']=='QUIZ'
def main(p):
    err=[];warn=[]
    rows=list(csv.DictReader(open(p,encoding='utf-8-sig',newline='')))
    if not rows: print("Bo'sh fayl");return 1
    miss=[c for c in REQ if c not in rows[0]]
    if miss: print("Ustunlar yetishmaydi:",miss);return 1
    ids=collections.Counter(r['card_id'] for r in rows)
    for k,v in ids.items():
        if v>1: err.append(f"card_id takror: {k} ({v})")
    for n,r in enumerate(rows,2):
        cid=r['card_id'] or f"qator {n}"
        E=lambda m:err.append(f"{cid} (qator {n}): {m}")
        W=lambda m:warn.append(f"{cid} (qator {n}): {m}")
        if not r['card_id']: E("card_id bo'sh")
        if r['operation'] not in OPS: E("operation noto'g'ri")
        if r['operation'] in('UPDATE','NOCHANGE','REMOVE') and not r['legacy_file']: E("legacy_file kerak")
        if r['operation']=='INSERT' and r['legacy_file']: E("INSERT uchun legacy_file bo'sh bo'lishi kerak")
        for c in INTC:
            if r[c]!='' and not re.fullmatch(r'-?\d+',r[c]): E(f"{c} butun son bo'lishi kerak: {r[c]!r}")
        for c in BOOL:
            if r[c] not in('TRUE','FALSE'): E(f"{c} TRUE/FALSE bo'lishi kerak")
        try: d=int(r['deck_no'])
        except: E("deck_no son emas");continue
        if d not in DECKS: E("deck_no 1..7")
        elif DECKS[d]!=r['deck_name']: E(f"deck_name mos emas: {r['deck_name']!r}")
        if r['card_kind'] not in KINDS: E("card_kind noto'g'ri: "+r['card_kind'])
        if r['operation']=='REMOVE': continue
        if kind_q(r) and not (r['option_a'] and r['option_b'] and r['option_v']): E('viktorina variantlari (option_a/b/v) to‘liq emas')
        if not r['text'] and not r['title']: E("text bo'sh")
        for c in("title","text","learning_goal"):
            v=r[c]
            if re.search(r"[A-Za-z]['`´ʻʼ][A-Za-z]|[oOgG]['`´ʻʼ’]",v): W(f"{c}: apostrof shakli (o‘ g‘ uchun ‘ ishlating)")
            if '  ' in v: W(f"{c}: ortiqcha bo'shliq")
            if re.search(r'[Ѐ-ӿ]',v): E(f"{c}: kirill harflari aralashgan")
            if re.search(r'\b\d{4,}\b',v) and not re.search(r'\b(19|20)\d\d\b',v): W(f"{c}: mingliklar bo'shliq bilan yozilishi kerak")
        for i in('1','2'):
            t=r.get(f'effect{i}_type','')
            if t and t not in EFFECTS: E(f"effect{i}_type noma'lum: {t}")
            if t and r.get(f'effect{i}_value','')=='' and t not in('DAROMAD_NOL',): E(f"effect{i}_value kerak")
            if t and not r.get(f'effect{i}_target'): E(f"effect{i}_target kerak")
        if r['effect2_type'] and not r['effect1_type']: E("effect2 bor, effect1 yo'q")
        if r['draw_enabled']=='TRUE' and r['needs_engine_mapping']=='TRUE': E("draw_enabled=TRUE bo'lishi mumkin emas: effekt xaritalanmagan")
        if r['pool']=='TEACHER_PANEL' and r['draw_enabled']=='TRUE': E("o'qituvchi paneli kartasi kolodaga tushmasin")
        kind=r['card_kind'];pr=int(r['price']) if r['price'] else None
        if d==5 and pr is not None and pr>2000 and kind=='EXPENSE': E(f"Xarajat kolodasi chegarasi (≤ 2 000): {pr}")
        if d==6 and pr is not None and pr<3000 and kind=='EXPENSE': E(f"Katta aylana xarajati chegarasi (≥ 3 000): {pr}")
        if kind=='ASSET_BUY' and r['income_monthly'] and pr and r['source_batch']=='V4_HOZIRGI_MUHIT':
            pb=pr/int(r['income_monthly']);lo,hi=(2.5,9) if d==2 else (12,60)
            if not lo<=pb<=hi: E(f"qoplanish {pb:.1f} oy oraliqdan tashqari ({lo}-{hi})")
        if kind=='DREAM':
            if not(pr and 800000<=pr<=3000000): E('orzu narxi 800 000–3 000 000 oralig‘ida bo‘lishi kerak')
            if re.search(r'kazino|casino|qimor|tikish|lotereya|tungi klub|spirtli|tamaki|qurol',(r['title']+' '+r['text']).lower()): E('nomaqbul mavzudagi orzu')
        if r['down_payment'] and r['loan'] and pr and int(r['down_payment'])+int(r['loan'])!=pr: E("down_payment + loan != price")
        if r['loan_payment_monthly'] and int(r['loan_payment_monthly'])>0: E("loan_payment_monthly manfiy bo'lishi kerak")
        if r['pool']=='DECK' and r['publish']=='FALSE': W("publish=FALSE")
        if r['image_status'] not in('OK','REDRAW','NEW_ART','TEXT_ONLY','NONE'): E("image_status noto'g'ri")
    c=collections.Counter(r['operation'] for r in rows)
    print("Qatorlar:",len(rows),dict(c))
    print("Kolodaga tushadi:",sum(1 for r in rows if r['draw_enabled']=='TRUE'),"| Xaritalash kerak:",sum(1 for r in rows if r['needs_engine_mapping']=='TRUE'))
    for m in warn[:20]: print("OGOHLANTIRISH:",m)
    if len(warn)>20: print(f"... yana {len(warn)-20} ogohlantirish")
    for m in err[:50]: print("XATO:",m)
    if len(err)>50: print(f"... yana {len(err)-50} xato")
    print("NATIJA:", "XATO BOR" if err else "TOZA",f"(xato {len(err)}, ogohlantirish {len(warn)})")
    return 1 if err else 0
if __name__=="__main__": sys.exit(main(sys.argv[1] if len(sys.argv)>1 else "tajriba24_cards_import.csv"))
