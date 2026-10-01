import ExcelJS from "exceljs";
import { birimEtiketi, finansalKiralamaEtiketi, kullanilmisEtiketi } from "./makineFormat";
import { disaAktarimAdi, etiketNormalle } from "./disaAktarimAdi";
import { kunyeBolumleri } from "./belgeKunye";
import { finansalBolumleri } from "./belgeFinansal";

// Sayıyı güvenli biçimde Türk lirası formatında göster
const tl = (val) => {
  const n = Number(val);
  if (!val && val !== 0) return "-";
  if (isNaN(n)) return "-";
  return n.toLocaleString("tr-TR") + " ₺";
};

// USD format
const usd = (val) => {
  const n = Number(val);
  if (!val && val !== 0) return "-";
  if (isNaN(n)) return "-";
  return "$" + n.toLocaleString("tr-TR");
};

// Sayı formatla (birimsiz)
const num = (val) => {
  const n = Number(val);
  if (!val && val !== 0) return "-";
  if (isNaN(n)) return "-";
  return n.toLocaleString("tr-TR");
};

// Tarihi güvenli formatla (TR)
const fmtDate = (val) => {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
};

// String değeri güvenli döndür
const str = (val) => (val && val !== "" ? String(val) : "-");

// EVET/HAYIR → Evet/Hayır (müşteri görünümü için title-case)
const evetHayir = (val) => {
  const s = String(val || "").trim().toUpperCase();
  if (s === "EVET") return "Evet";
  if (s === "HAYIR") return "Hayır";
  return "-";
};

// İthal makine yeni mi kullanılmış mı
// (müşteri: "kullanılmamış makineleri kullanılmış olarak gösteriyor") — bakanlık kodunda
// "HAYIR" da dolu bir değer olduğu için "alan dolu ⇒ kullanılmış" varsayımı yanlıştı.
const kullanilmisDurum = (m) => kullanilmisEtiketi(m.kullanilmisMakine, m.kullanilmisMakineAciklama);

// Birim: kayıtta kod tutulur ("142"), müşteriye "ADET" gitmeli
const birimDegeri = (m) => birimEtiketi(m.birim, m.birimAciklamasi) || "-";

// Müşteri: "makinelere onay tarihi sütunu da ekleyelim, makine revizyonlarındaki
// gibi sadece onay tarihi yeterli." Karar onaylandıysa tarihi, değilse "-".
const onayTarihi = (m) => {
  const d = m?.karar?.kararTarihi;
  const durum = m?.karar?.kararDurumu;
  if (!d || (durum && durum !== "onay" && durum !== "kismi_onay")) return "-";
  return fmtDate(d);
};

// secenek: { oecdGoster, konuGoster } — belge görünümü ve PDF ile aynı künye tanımı (utils/belgeKunye.js)
export const exportTesvikToExcel = async (tesvik, isEski = false, secenek = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Teşvik Belgesi");

  // ── Yardımcı fonksiyonlar ───────────────────────────────────────────────────
  const BORDER = { top: { style: "thin", color: { argb: "FFCBD5E1" } }, left: { style: "thin", color: { argb: "FFCBD5E1" } }, bottom: { style: "thin", color: { argb: "FFCBD5E1" } }, right: { style: "thin", color: { argb: "FFCBD5E1" } } };
  const LABEL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  const SUBHEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  const TOTAL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };

  // Tüm satırlar 6 sütun (A:F) genişliğinde — ürün tablosu ile hizalı, sağdan taşma olmaz
  const FULL = 6;
  const colLetter = (n) => String.fromCharCode(64 + n); // 1→A ... 6→F
  const applyBorder = (row, count = FULL) => {
    for (let i = 1; i <= count; i++) row.getCell(i).border = BORDER;
  };

  // Bölüm başlığı (mavi, tam satır A:F)
  const addHeaderRow = (title) => {
    const row = worksheet.addRow([title]);
    row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.mergeCells(`A${row.number}:${colLetter(FULL)}${row.number}`);
    row.height = 25;
    return row;
  };

  // Alt-başlık (gri arka plan, tam satır A:F)
  const addSubHeaderRow = (title) => {
    const row = worksheet.addRow([title]);
    row.getCell(1).font = { bold: true, color: { argb: "FF0F172A" } };
    row.getCell(1).fill = SUBHEADER_FILL;
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    worksheet.mergeCells(`A${row.number}:${colLetter(FULL)}${row.number}`);
    applyBorder(row);
    return row;
  };

  // İki sütunlu satır: Etiket | Değer | Etiket | Değer(D:F birleşik → sağ kenara kadar)
  const addDataRow = (label1, value1, label2, value2) => {
    const row = worksheet.addRow([label1 || "", str(value1), label2 || "", str(value2)]);
    worksheet.mergeCells(`D${row.number}:${colLetter(FULL)}${row.number}`);
    if (label1) { row.getCell(1).font = { bold: true }; row.getCell(1).fill = LABEL_FILL; }
    if (label2) { row.getCell(3).font = { bold: true }; row.getCell(3).fill = LABEL_FILL; }
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
    row.getCell(4).alignment = { wrapText: true, vertical: "middle" };
    applyBorder(row);
    return row;
  };

  // Tek satır: Etiket | Değer (B:F birleşik)
  const addWideRow = (label, value) => {
    const row = worksheet.addRow([label || "", str(value), "", "", "", ""]);
    worksheet.mergeCells(`B${row.number}:${colLetter(FULL)}${row.number}`);
    if (label) { row.getCell(1).font = { bold: true }; row.getCell(1).fill = LABEL_FILL; }
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
    applyBorder(row);
    return row;
  };

  // Kırılım satırı (finansal) - A: Etiket, B:E boş, F: Tutar (sağa yaslı)
  const addKirilimRow = (label, value, opts = {}) => {
    const row = worksheet.addRow([label, "", "", "", "", value]);
    worksheet.mergeCells(`B${row.number}:E${row.number}`);
    if (opts.bold) {
      row.getCell(1).font = { bold: true };
      row.getCell(FULL).font = { bold: true };
    }
    if (opts.fill) {
      row.getCell(1).fill = opts.fill;
      row.getCell(2).fill = opts.fill;
      row.getCell(FULL).fill = opts.fill;
    }
    row.getCell(FULL).alignment = { horizontal: "right", vertical: "middle" };
    applyBorder(row);
    return row;
  };

  // Sütun genişlikleri (6 sütun)
  worksheet.columns = [
    { width: 30 }, // A - Etiket / US97 Kodu
    { width: 30 }, // B - Değer / Ürün Adı
    { width: 24 }, // C - Etiket2 / Mevcut Kapasite
    { width: 15 }, // D - Değer2 / İlave Kapasite
    { width: 15 }, // E - Toplam Kapasite
    { width: 14 }  // F - Birim / Tutar
  ];

  // 🖨️ PDF / yazdırma düzeni: tüm sütunlar tek sayfa enine sığsın (PDF'te taşma/bozulma olmaz)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
  };

  // ── 1-3. KÜNYE — belge görünümü ve müşteri PDF'i ile aynı tanım ──────────
  // Müşteri (01.10.2026): "Genel belge görünümünü 1-1 aynı bilgiler görünecek şekilde ...
  // bütün sekmeler için". Satırlar E-TUYS künyesindeki sırayla, ikişer ikişer yerleşir;
  // uzun değerler (firma adı, adres) tek satıra yayılır.
  const kunyeT = kunyeBolumleri(tesvik, { tur: isEski ? "eski" : "yeni", ...secenek });
  const kunyeYaz = (satirlar) => {
    let bekleyen = null;
    satirlar.forEach((r) => {
      if (r.uzun) { addWideRow(r.etiket, r.deger); return; }
      if (!bekleyen) { bekleyen = r; return; }
      addDataRow(bekleyen.etiket, bekleyen.deger, r.etiket, r.deger);
      bekleyen = null;
    });
    if (bekleyen) addDataRow(bekleyen.etiket, bekleyen.deger, "", "");
  };

  addHeaderRow("1. YATIRIMCI İLE İLGİLİ BİLGİLER");
  kunyeYaz([
    ...kunyeT.yatirimci,
    { etiket: "Vergi Dairesi", deger: str(tesvik.firmaBilgileri?.vergiDairesi || tesvik.firma?.vergiDairesi) },
    { etiket: "Vergi No", deger: str(tesvik.firmaBilgileri?.vergiNo || tesvik.firma?.vergiNo) }
  ]);
  worksheet.addRow([]);

  addHeaderRow("2. YATIRIM İLE İLGİLİ BİLGİLER");
  kunyeYaz(kunyeT.yatirim);
  worksheet.addRow([]);

  addHeaderRow("3. BELGE İLE İLGİLİ BİLGİLER");
  kunyeYaz(kunyeT.belge);
  worksheet.addRow([]);

  // ── 4. YATIRIM CİNSİ (E-TUYS'te ayrı sekme) ────────────────────────────────
  addHeaderRow("4. YATIRIM CİNSİ");
  const yb = tesvik.yatirimBilgileri || {};
  const cinsler = [yb.sCinsi1, yb.tCinsi2, yb.uCinsi3, yb.vCinsi4].filter(Boolean);
  if (!cinsler.length && yb.yatirimCinsi) cinsler.push(yb.yatirimCinsi);
  if (cinsler.length) cinsler.forEach((c, i) => addWideRow(`Yatırım Cinsi ${i + 1}`, etiketNormalle(c)));
  else addWideRow("Yatırım Cinsi", "-");
  worksheet.addRow([]);

  // ── 5. ÜRÜN BİLGİLERİ ─────────────────────────────────────────────────────
  addHeaderRow("5. ÜRÜN BİLGİLERİ");
  // Tablo başlığı: 6 sütun (A: Kod, B: Ad, C: Mevcut, D: İlave + alttaki sıra ile Toplam, Birim)
  // Genişletilmiş 6 sütunlu görünüm için ekstra satır kullanıyoruz.
  // Sütun yapısı: A | B | C | D
  // Burada: A=Kod, B=Ad, C=Mevcut Kapasite, D=İlave Kapasite
  //         sonra E,F için yeni satır gerekmiyor; A:B birinci hücrede Kod+Ad birleşik;
  // Daha temiz: 6 sütun yerine 4 sütunda dengeli gösterim:
  //   Satır 1: Kod | Ad | Mevcut | İlave    (başlıklar)
  //   Satır 2: kod | ad | mevcut | ilave    (değerler)
  //   Hemen alttaki satır: "" | "" | Toplam | Birim için ayrı bir alt satır
  // Daha doğru görünüm için 6 sütuna çıkıyoruz: E ve F kullanıyoruz, sayfa genişliği yeterli.
  const urunHeader = worksheet.addRow([
    isEski ? "US97 / U97 Kodu" : "NACE / U97 Kodu",
    "Ürün Adı / Cinsi",
    "Mevcut Kapasite",
    "İlave Kapasite",
    "Toplam Kapasite",
    "Birim"
  ]);
  urunHeader.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = LABEL_FILL;
    cell.border = BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  if (tesvik.urunler && tesvik.urunler.length > 0) {
    tesvik.urunler.forEach((u) => {
      const kod = u.u97Kodu || u.us97Kodu || u.naceKodu || u.kodu || "-";
      const ad = u.urunAdi || u.cinsi || u.adi || u.urunCinsi || "-";
      const mevcut = u.mevcutKapasite;
      const ilave = u.ilaveKapasite;
      // Toplam DB'de yoksa Mevcut + İlave hesapla
      const toplamDb = u.toplamKapasite;
      const toplam =
        toplamDb !== undefined && toplamDb !== null && toplamDb !== ""
          ? toplamDb
          : (Number(mevcut) || 0) + (Number(ilave) || 0);
      const birim = u.kapasiteBirimi || u.birim || "-";
      const row = worksheet.addRow([kod, ad, num(mevcut), num(ilave), num(toplam), birim]);
      row.getCell(1).alignment = { wrapText: true, vertical: "middle" };
      row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle", font: { bold: true } };
      row.getCell(5).font = { bold: true };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      for (let i = 1; i <= 6; i++) row.getCell(i).border = BORDER;
    });
  } else {
    const row = worksheet.addRow(["Belirtilmemiş", "-", "-", "-", "-", "-"]);
    for (let i = 1; i <= 6; i++) row.getCell(i).border = BORDER;
  }
  worksheet.addRow([]);

  // ── 6. FİNANSAL BİLGİLER — belge görünümü ve PDF ile aynı tanım (utils/belgeFinansal.js) ──
  // Diğer harcama kalemleri artık doğru sütunlardan okunuyor (bkz. utils/digerHarcamalar.js);
  // eskiden bir kutu kayıktı ve ithal makine $ tutarı yanlış alan adıyla hep 0 geliyordu.
  addHeaderRow("6. FİNANSAL BİLGİLER");
  const finansalBicim = (r) => {
    if (r.tur === "metin") return str(String(r.deger ?? "").trim());
    if (r.tur === "usd") return usd(r.deger || 0);
    if (r.tur === "adet") return num(r.deger || 0);
    return tl(r.deger || 0);
  };
  const { sol: finSol, sag: finSag } = finansalBolumleri(tesvik);
  [...finSol, ...finSag].forEach((g, i) => {
    addSubHeaderRow(`6.${i + 1} ${g.baslik}`);
    g.satirlar.forEach((r) => addKirilimRow(r.etiket, finansalBicim(r), r.hesap ? { bold: true, fill: TOTAL_FILL } : {}));
  });

  worksheet.addRow([]);

  // ── 7. ÖZEL ŞARTLAR ───────────────────────────────────────────────────────
  addHeaderRow("7. ÖZEL ŞARTLAR");
  const sartHeader = worksheet.addRow(["Şart Adı / Kısaltma", "Açıklama", "", "", "", ""]);
  worksheet.mergeCells(`B${sartHeader.number}:F${sartHeader.number}`);
  sartHeader.getCell(1).font = { bold: true }; sartHeader.getCell(1).fill = LABEL_FILL;
  sartHeader.getCell(2).font = { bold: true }; sartHeader.getCell(2).fill = LABEL_FILL;
  applyBorder(sartHeader);

  if (tesvik.ozelSartlar && tesvik.ozelSartlar.length > 0) {
    tesvik.ozelSartlar.forEach((sart, i) => {
      const row = worksheet.addRow([
        sart?.koşulMetni || sart?.kisaltma || `Şart ${i + 1}`,
        sart?.aciklamaNotu || sart?.sart || sart?.metin || sart?.aciklama || "-"
      ]);
      worksheet.mergeCells(`B${row.number}:F${row.number}`);
      row.eachCell((cell) => { cell.border = BORDER; cell.alignment = { wrapText: true, vertical: "top" }; });
    });
  } else {
    const row = worksheet.addRow(["-", "Özel şart bulunmuyor."]);
    worksheet.mergeCells(`B${row.number}:F${row.number}`);
    applyBorder(row);
  }
  worksheet.addRow([]);

  // ── 8. DESTEK UNSURLARI ───────────────────────────────────────────────────
  addHeaderRow("8. DESTEK UNSURLARI");
  const destekHeader = worksheet.addRow(["Destek Adı", "Şartı", "Açıklama", "", "", ""]);
  worksheet.mergeCells(`C${destekHeader.number}:F${destekHeader.number}`);
  destekHeader.eachCell((cell) => { cell.font = { bold: true }; cell.fill = LABEL_FILL; cell.border = BORDER; cell.alignment = { horizontal: "center", vertical: "middle" }; });

  if (tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0) {
    tesvik.destekUnsurlari.forEach((d) => {
      const ad = d.destekUnsuru || d.adi || d.destekAdi || "-";
      const sart = d.sarti || d.sart || "-";
      const aciklama = d.aciklama || (d.orani ? d.orani + " %" : d.tutari ? d.tutari + " ₺" : "-");
      const row = worksheet.addRow([ad, sart, aciklama, "", "", ""]);
      worksheet.mergeCells(`C${row.number}:F${row.number}`);
      row.eachCell((cell) => { cell.border = BORDER; cell.alignment = { wrapText: true, vertical: "middle" }; });
    });
  } else {
    const row = worksheet.addRow(["-", "-", "Destek unsuru bulunmuyor.", "", "", ""]);
    worksheet.mergeCells(`C${row.number}:F${row.number}`);
    applyBorder(row);
  }

  // ── 9. MAKİNE LİSTELERİ ───────────────────────────────────────────────────
  const yerliList = tesvik.makineListeleri?.yerli || [];
  if (yerliList.length > 0) {
    const yerliSheet = workbook.addWorksheet("Yerli Makine Listesi");
    yerliSheet.columns = [
      // Müşteri: "yerli makinelerde GTİP sütununa gerek yok, gizleyebiliriz."
      // Yerine onay tarihi geldi; sütun sayısı 9'da kaldığı için A:I birleştirmesi bozulmuyor.
      { width: 10 }, // Sıra No
      { width: 15 }, // Makine ID
      { width: 45 }, // Adı ve Özelliği
      { width: 12 }, // Miktar
      { width: 15 }, // Birim
      { width: 20 }, // Birim Fiyatı (TL)
      { width: 20 }, // Toplam Tutar (TL)
      { width: 15 }, // KDV İstisnası
      { width: 16 }, // Finansal Kiralama (müşteri, 21.09.2026 — PDF ile aynı)
      { width: 16 }  // Onay Tarihi
    ];
    yerliSheet.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };

    // Müşteri: "Excel'i PDF'e çevirdiğimde makine listelerinin başlığı yok."
    // Sayfa ADI PDF'e taşınmıyor; bu yüzden başlık sayfanın İÇİNE yazılıyor.
    yerliSheet.addRow([`YERLİ MAKİNE LİSTESİ${tesvik.belgeNo ? ` — Belge No: ${tesvik.belgeNo}` : ""}`]);
    const yBaslik = yerliSheet.lastRow;
    // Sütun sayısı 10 (Finansal Kiralama eklendi) → başlık birleştirmesi J'ye kadar
    yerliSheet.mergeCells(`A${yBaslik.number}:J${yBaslik.number}`);
    yBaslik.getCell(1).font = { bold: true, size: 14 };
    yBaslik.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    yBaslik.height = 24;
    yerliSheet.addRow([]);

    const hRow = yerliSheet.addRow([
      "Sıra No", "Makine ID", "Adı ve Özelliği", "Miktar", "Birim",
      "Birim Fiyatı (TL)", "Toplam Tutar (TL)", "KDV İstisnası", "Finansal Kiralama", "Onay Tarihi"
    ]);
    hRow.eachCell(c => { c.font = { bold: true }; c.fill = LABEL_FILL; c.border = BORDER; });
    // Uzun listeler birden fazla sayfaya taşıyor; başlık her sayfada tekrarlansın
    yerliSheet.pageSetup.printTitlesRow = `${hRow.number}:${hRow.number}`;

    yerliList.forEach(m => {
      const r = yerliSheet.addRow([
        m.siraNo || "-",
        m.makineId || "-",
        m.adiVeOzelligi || "-",
        num(m.miktar),
        birimDegeri(m),
        tl(m.birimFiyatiTl),
        tl(m.toplamTutariTl || m.toplamTl),
        m.kdvIstisnasi || "-",
        finansalKiralamaEtiketi(m.finansalKiralamaMi),
        onayTarihi(m)
      ]);
      r.eachCell(c => { c.border = BORDER; c.alignment = { wrapText: true, vertical: "middle" }; });
    });
  }

  const ithalList = tesvik.makineListeleri?.ithal || [];
  if (ithalList.length > 0) {
    const ithalSheet = workbook.addWorksheet("İthal Makine Listesi");
    ithalSheet.columns = [
      { width: 10 }, // Sıra No
      { width: 15 }, // GTİP Kodu
      { width: 45 }, // Adı ve Özelliği
      { width: 12 }, // Miktar
      { width: 15 }, // Birim
      { width: 18 }, // Birim Fiyatı
      { width: 10 }, // Döviz
      { width: 20 }, // Toplam Tutar (USD)
      { width: 20 }, // Toplam Tutar (TL)
      { width: 18 }, // Kullanılmış Makine
      { width: 22 }, // Gümrük Vergisi İstisnası
      { width: 15 }, // KDV İstisnası
      { width: 16 }, // Finansal Kiralama
      { width: 16 }  // Onay Tarihi
    ];
    ithalSheet.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };

    ithalSheet.addRow([`İTHAL MAKİNE LİSTESİ${tesvik.belgeNo ? ` — Belge No: ${tesvik.belgeNo}` : ""}`]);
    const iBaslik = ithalSheet.lastRow;
    // Sütun sayısı 14 (Onay Tarihi, Finansal Kiralama eklendi) → başlık birleştirmesi N'ye kadar
    ithalSheet.mergeCells(`A${iBaslik.number}:N${iBaslik.number}`);
    iBaslik.getCell(1).font = { bold: true, size: 14 };
    iBaslik.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    iBaslik.height = 24;
    ithalSheet.addRow([]);

    const hRow = ithalSheet.addRow([
      "Sıra No", "GTİP Kodu", "Adı ve Özelliği", "Miktar", "Birim",
      "Birim Fiyatı", "Döviz", "Toplam Tutar (USD)", "Toplam Tutar (TL)",
      "Kullanılmış Makine", "Gümrük Vergisi İstisnası", "KDV İstisnası", "Finansal Kiralama", "Onay Tarihi"
    ]);
    hRow.eachCell(c => { c.font = { bold: true }; c.fill = LABEL_FILL; c.border = BORDER; });
    ithalSheet.pageSetup.printTitlesRow = `${hRow.number}:${hRow.number}`;

    ithalList.forEach(m => {
      const r = ithalSheet.addRow([
        m.siraNo || "-",
        m.gtipKodu || "-",
        m.adiVeOzelligi || "-",
        num(m.miktar),
        birimDegeri(m),
        num(m.birimFiyatiFob),
        m.gumrukDovizKodu || "-",
        usd(m.toplamTutarFobUsd || m.toplamUsd),
        tl(m.toplamTutarFobTl || m.toplamTl),
        kullanilmisDurum(m),
        evetHayir(m.gumrukVergisiMuafiyeti),
        evetHayir(m.kdvMuafiyeti),
        finansalKiralamaEtiketi(m.finansalKiralamaMi),
        onayTarihi(m)
      ]);
      r.eachCell(c => { c.border = BORDER; c.alignment = { wrapText: true, vertical: "middle" }; });
    });
  }

  // ── İndirme ───────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Aynı düzeltme PDF tarafındaki gibi: tesvik.belgeNo üretimde YOK.
  a.download = `${disaAktarimAdi(tesvik)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
