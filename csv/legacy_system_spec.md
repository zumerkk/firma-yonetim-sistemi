# Old Google Sheets System – Specification & Rules  
*(Generated 2025-07-21)*  

## Purpose  
These rules describe the **legacy Google Sheets + Apps Script** solution used by the consultancy to manage Turkish investment–incentive certificates.  
Feed this file to **Cursor IDE AI** so that it understands **all entities, workflows, columns, color‑codes, validations and limitations** before scaffolding the new web‑based automation.  

---  

## 1. Glossary  
| Term | Meaning | Notes |  
|------|---------|-------|  
| **GM ID** | Unique project key | Primary key for every operation |  
| **REVIZE ID** | Composite key of GM ID + rev. suffix (e.g. `AA0001/zV1r0R`) | Increments with each update |  
| **FIRMA ID** | Company master data key | Links to *admin* sheet |  
| **BELGE ID** | Incentive‑certificate key |  |  
| **TALEP / SONUÇ** | Status field (*T*alep, *O*nay, *R*ed, *G*üncelleme, *S*ilme) | Color‑coded |  
| **ETUYS** | MoIT online system that consumes CSV export |  |  

---  

## 2. Workbook Topology  
| Sheet | Rows × Cols | Role | Highlights |  
|-------|-------------|------|------------|  
| **REVIZE TALEP** | ~4 k × 152 | Master table | Conditional formatting, back‑references from Makina Listesi |  
| **Login** | 40 × 20 | User form | Dropdowns + Script buttons |  
| **Makina Listesi** | up to 10 k × 26 | Equipment items | `YERLI/ITHAL`, status colors |  
| **admin** | 10 k × 48 | Look‑ups | Firm master, geo codes, status list |  
| **yerlist** | — × 32 | Import template (local) | Grayed help rows |  
| **itlist** | — × 41 | Import template (import) | FOB amount, origin |  
| **dosyalar** | — × 3 | Drive index | auto‑refreshed links |  
| **GTIP KODLARI** | — × 2 | Customs codes | 10‑digit GTIP |  

A second workbook **belytbsütun çalışması.xlsx** extends *REVIZE TALEP* to **167** columns (adds SGK, müracaat sayısı, parcel, region etc.).  

---  

## 3. Color & Validation Rules  

| Context | Rule | RGB Sample | Purpose |  
|---------|------|-----------|---------|  
| *REVIZE TALEP* row | `TALEP/SONUÇ = "SONUÇ"` | `#ffc8d8` (pink) | Visually closes the record |  
| Mandatory field background | Custom range | `#ff0000` (red) | Prevent empty submission |  
| Status cell in *Makina Listesi* | `T/O/R/G/S` | Blue / Green / Red / Orange / White | Quick glance state |  
| Data‑validation | Province / district | pull‑down sourced from *admin* | Coherent values |  

---  

## 4. Apps Script Menu Functions  

| Menu Item | Sheet Scope | Key Logic |  
|-----------|-------------|-----------|  
| **Kayıt İşlemleri** | Login → REVIZE TALEP | Append form row, timestamp |  
| **Temizle** | Login | `clearContent()` |  
| **Firma ID Bul** | Login | `VLOOKUP(unvan, admin)` |  
| **Ünvan Bul** | Login | Reverse lookup |  
| **Revize Talep Çağır** | Login | Fetch by GM ID → pre‑fill form |  
| **Sonuç Çağır** | Login | Fetch where status = SONUÇ |  

On‑edit trigger writes `NOW()` into designated timestamp columns.  

---  

## 5. End‑to‑End Workflows  

1. **Create Request** → Login form (red = mandatory) → *Kayıt İşlemleri* → new row in REVIZE TALEP.  
2. **Add Machines** → Paste list into `yerlist` / `itlist` → “Gönder” macro → append rows in Makina Listesi, push totals back to master row.  
3. **Revise** → *Revize Talep Çağır* → update fields → increment `REVIZE ID`.  
4. **Finalize** → Copy ETUYS results → *Sonuç Çağır* → set status = SONUÇ (row turns pink).  
5. **Archive Files** → Upload to Drive → script indexes path in *dosyalar* sheet.  

---  

## 6. Known Limitations  

- Very wide tables (152–167 columns) hamper readability & performance.  
- No enforced foreign‑key constraints ➜ potential data drift.  
- Apps Script quotas at risk with 10k+ operations.  
- No granular RBAC or audit‑trail beyond simple timestamps.  

---  

## 7. Modernisation Roadmap (Reference)  

> Cursor IDE AI: map each legacy concept to the target stack as follows  

| Legacy | Proposed | Notes |  
|--------|----------|-------|  
| Google Sheet row | RDBMS table row | PostgreSQL recommended |  
| Apps Script macro | Backend service | Node/NestJS or FastAPI |  
| Conditional formatting | UI badges | Front‑end framework (React + Tailwind) |  
| VLOOKUP | SQL JOIN |  |  
| CSV export to ETUYS | REST or file upload | Module needs to re‑use column semantics |  

*(detailed ERD in §7.1 of previous report)*  

---  

## 8. Column Dictionaries  

### 8.1 REVIZE TALEP – **152 Columns**  
1. GM ID
2. TALEP/SONUÇ
3. REVIZE ID
4. FIRMA ID
5. YATIRIMCI UNVAN
6. BELGE ID
7. BELGE NO
8. BELGE TARIHI
9. DAYANDIĞI KANUN
10. BELGE MURACAAT NO
11. BELGE DURUMU
12. BELGE MURACAAT TARIHI
13. BELGE BASLAMA TARIHI
14. BELGE BITIS TARIHI (1)
15. UZATIM TARIHI
16. MUCBIR UZATIM TARIHI
17. 2-YATIRIM KONUSU
18. 3-CINSI(1)
19. 3-CINSI(2)
20. 3-CINSI(3)
21. 3-CINSI(4)
22. 4-DESTEK SINIFI
23. YERI IL
24. YERI ILCE
25. YATIRIM ADRESI(1)
26. YATIRIM ADRESI(2)
27. YATIRIM ADRESI(3)
28. OSB ISE MUDURLUK
29. Mevcut Kişi
30. İlave Kişi
31. TOPLAM Kişi
32. US97 Kodu (1)
33. Ürün(1)
34. Mevcut(1)
35. İlave(1)
36. Toplam(1)
37. Kapsite Birimi(1)
38. US97 Kodu (2)
39. Ürün(2)
40. Mevcut(2)
41. İlave(2)
42. Toplam(2)
43. Kapsite Birimi(2)
44. US97 Kodu (3)
45. Ürün(3)
46. Mevcut(3)
47. İlave(3)
48. Toplam(3)
49. Kapsite Birimi(3)
50. US97 Kodu (4)
51. Ürün(4)
52. Mevcut(4)
53. İlave(4)
54. Toplam(4)
55. Kapsite Birimi(4)
56. US97 Kodu (5)
57. Ürün(5)
58. Mevcut(5)
59. İlave(5)
60. Toplam(5)
...

### 8.2 REVIZE TALEP Extended – **167 Columns** *(belytbsütun çalışması.xlsx)*  
1. GM ID
2. TALEP/SONUÇ
3. REVIZE ID
4. FIRMA ID
5. YATIRIMCI UNVAN
6. SGK SİCİL NO
7. BELGE ID
8. BELGE NO
9. BELGE TARIHI
10. BELGE MURACAAT TARIHI
11. MÜRACAAT SAYISI
12. BELGE BASLAMA TARIHI
13. BELGE BITIS TARIHI
14. SÜRE UZATIM TARİHİ
15. ÖZELLİKLİ YATIRIM İSE
16. DAYANDIĞI KANUN
17. BELGE DURUMU
18. 2-YATIRIM KONUSU
19. 3-CINSI(1)
20. 3-CINSI(2)
21. 3-CINSI(3)
22. 3-CINSI(4)
23. DESTEK SINIFI
24. YERI IL
25. YERI ILCE
26. ADA
27. PARSEL
28. YATIRIM ADRESI(1)
29. YATIRIM ADRESI(2)
30. YATIRIM ADRESI(3)
31. OSB ISE MUDURLUK
32. İL BAZLI BÖLGE
33. İLÇE BAZLI BÖLGE
34. SERBEST BÖLGE
35. Mevcut Kişi
36. İlave Kişi
37. US97 Kodu (1)
38. Ürün(1)
39. Mevcut(1)
40. İlave(1)
41. Toplam(1)
42. Kapsite Birimi(1)
43. US97 Kodu (2)
44. Ürün(2)
45. Mevcut(2)
46. İlave(2)
47. Toplam(2)
48. Kapsite Birimi(2)
49. US97 Kodu (3)
50. Ürün(3)
51. Mev

