import ExcelJS from "exceljs";

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

export const exportTesvikToExcel = async (tesvik, isEski = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Teşvik Belgesi");

  // ── Yardımcı fonksiyonlar ───────────────────────────────────────────────────
  const BORDER = { top: { style: "thin", color: { argb: "FFCBD5E1" } }, left: { style: "thin", color: { argb: "FFCBD5E1" } }, bottom: { style: "thin", color: { argb: "FFCBD5E1" } }, right: { style: "thin", color: { argb: "FFCBD5E1" } } };
  const LABEL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  const SUBHEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  const TOTAL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };

  const applyBorder = (row, count = 4) => {
    for (let i = 1; i <= count; i++) row.getCell(i).border = BORDER;
  };

  // Bölüm başlığı (mavi, tam satır)
  const addHeaderRow = (title) => {
    const row = worksheet.addRow([title]);
    row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.mergeCells(`A${row.number}:D${row.number}`);
    row.height = 25;
    return row;
  };

  // Alt-başlık (gri arka plan, tam satır)
  const addSubHeaderRow = (title) => {
    const row = worksheet.addRow([title]);
    row.getCell(1).font = { bold: true, color: { argb: "FF0F172A" } };
    row.getCell(1).fill = SUBHEADER_FILL;
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    worksheet.mergeCells(`A${row.number}:D${row.number}`);
    applyBorder(row);
    return row;
  };

  // İki sütunlu satır: Etiket | Değer | Etiket | Değer
  const addDataRow = (label1, value1, label2, value2) => {
    const row = worksheet.addRow([label1 || "", str(value1), label2 || "", str(value2)]);
    if (label1) { row.getCell(1).font = { bold: true }; row.getCell(1).fill = LABEL_FILL; }
    if (label2) { row.getCell(3).font = { bold: true }; row.getCell(3).fill = LABEL_FILL; }
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
    row.getCell(4).alignment = { wrapText: true, vertical: "middle" };
    applyBorder(row);
    return row;
  };

  // Tek satır: Etiket | Değer (B:D birleşik)
  const addWideRow = (label, value) => {
    const row = worksheet.addRow([label || "", str(value), "", ""]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    if (label) { row.getCell(1).font = { bold: true }; row.getCell(1).fill = LABEL_FILL; }
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
    applyBorder(row);
    return row;
  };

  // Kırılım satırı (finansal) - A: Etiket, B-C: boş, D: Tutar (sağa yaslı)
  const addKirilimRow = (label, value, opts = {}) => {
    const row = worksheet.addRow([label, "", "", value]);
    worksheet.mergeCells(`B${row.number}:C${row.number}`);
    if (opts.bold) {
      row.getCell(1).font = { bold: true };
      row.getCell(4).font = { bold: true };
    }
    if (opts.fill) {
      row.getCell(1).fill = opts.fill;
      row.getCell(2).fill = opts.fill;
      row.getCell(4).fill = opts.fill;
    }
    row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    applyBorder(row);
    return row;
  };

  // Sütun genişlikleri
  worksheet.columns = [
    { width: 38 }, // A
    { width: 32 }, // B
    { width: 28 }, // C
    { width: 32 }  // D
  ];

  // ── 1. YATIRIMCI İLE İLGİLİ BİLGİLER ─────────────────────────────────────
  addHeaderRow("1. YATIRIMCI İLE İLGİLİ BİLGİLER");
  addDataRow("Yatırımcı Ünvanı", tesvik.firmaBilgileri?.unvan || tesvik.firma?.tamUnvan, "Vergi Dairesi", tesvik.firmaBilgileri?.vergiDairesi || tesvik.firma?.vergiDairesi);
  addDataRow("Vergi No", tesvik.firmaBilgileri?.vergiNo || tesvik.firma?.vergiNo, "SGK Sicil No", tesvik.kunyeBilgileri?.sgkSicilNo);
  worksheet.addRow([]);

  // ── 2. YATIRIM İLE İLGİLİ BİLGİLER ──────────────────────────────────────
  addHeaderRow("2. YATIRIM İLE İLGİLİ BİLGİLER");
  addDataRow("Yatırımın Yeri (İl)", tesvik.yatirimBilgileri?.yerinIl, "Yatırımın Yeri (İlçe)", tesvik.yatirimBilgileri?.yerinIlce);
  addWideRow("Yatırım Adresi", [tesvik.yatirimBilgileri?.yatirimAdresi1, tesvik.yatirimBilgileri?.yatirimAdresi2, tesvik.yatirimBilgileri?.yatirimAdresi3].filter(Boolean).join(" "));
  addDataRow("OSB Adı", tesvik.yatirimBilgileri?.osbIseMudurluk, "Serbest Bölge Adı", tesvik.yatirimBilgileri?.serbsetBolge || tesvik.yatirimBilgileri?.serbestBolge);
  addDataRow("İl Bazlı Bölgesi", tesvik.yatirimBilgileri?.ilBazliBolge, "İlçe Bazlı Bölgesi", tesvik.yatirimBilgileri?.ilceBazliBolge);
  addDataRow("Mevcut İstihdam", tesvik.istihdam?.mevcutKisi, "İlave İstihdam", tesvik.istihdam?.ilaveKisi);
  worksheet.addRow([]);

  // ── 3. BELGE İLE İLGİLİ BİLGİLER ─────────────────────────────────────────
  // (UI'daki "Belge Bilgileri" Accordion'u ile birebir aynı alanlar - tesvik.belgeYonetimi.*)
  addHeaderRow("3. BELGE İLE İLGİLİ BİLGİLER");
  const by = tesvik.belgeYonetimi || {};
  const kunye = tesvik.kunyeBilgileri || {};

  addDataRow("Belge ID", by.belgeId || tesvik._id, "Belge NO", by.belgeNo || tesvik.belgeNo || tesvik.gmId);
  addDataRow(
    "Belge Tarihi",
    fmtDate(by.belgeTarihi || kunye.kararTarihi),
    "Dayandığı Kanun",
    by.dayandigiKanun || kunye.dayandigiKanun
  );
  addDataRow(
    "Müracaat No",
    by.belgeMuracaatNo || kunye.dosyaNo,
    "Müracaat Talep Tipi",
    by.belgeMuracaatTalepTipi
  );
  addWideRow(
    "Müracaat Tarihi",
    fmtDate(by.belgeMuracaatTarihi || kunye.basvuruTarihi)
  );
  addDataRow(
    "Belge Başlama Tarihi",
    fmtDate(by.belgeBaslamaTarihi || kunye.baslamaTarihi),
    "Belge Bitiş Tarihi",
    fmtDate(by.belgeBitisTarihi || kunye.bitisTarihi)
  );
  addDataRow(
    "Süre Uzatım Tarihi",
    fmtDate(by.uzatimTarihi),
    "Mücbir Uzama Tarihi",
    fmtDate(by.mucbirUzumaTarihi)
  );
  addDataRow(
    "Öncelikli Yatırım",
    by.oncelikliYatirim,
    "Öncelikli Yatırım Türü",
    by.oncelikliYatirimTuru
  );

  const yatirimCinsi = [
    tesvik.yatirimBilgileri?.sCinsi1,
    tesvik.yatirimBilgileri?.tCinsi2,
    tesvik.yatirimBilgileri?.uCinsi3,
    tesvik.yatirimBilgileri?.vCinsi4,
  ].filter(Boolean).join(", ") || tesvik.yatirimBilgileri?.yatirimCinsi;
  addDataRow("Yatırım Cinsi", yatirimCinsi, "Destek Sınıfı", tesvik.yatirimBilgileri?.destekSinifi);
  addDataRow("Ada", tesvik.yatirimBilgileri?.ada, "Parsel", tesvik.yatirimBilgileri?.parsel);
  worksheet.addRow([]);

  // ── 4. ÜRÜN BİLGİLERİ ─────────────────────────────────────────────────────
  addHeaderRow("4. ÜRÜN BİLGİLERİ");
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
  // ExcelJS, columns'tan fazla sütun verisi de yazabilir; ek genişlikleri ayarlayalım:
  worksheet.getColumn(5).width = 22;
  worksheet.getColumn(6).width = 16;

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

  // ── 5. FİNANSAL BİLGİLER (UI'daki "Finansal Bilgiler" Accordion'u ile birebir) ──
  addHeaderRow("5. FİNANSAL BİLGİLER");
  const mali = tesvik.maliHesaplamalar || {};

  const araziArsa = Number(mali.araciArsaBedeli || mali.araziArsaBedeli || mali.maliyetlenen?.sn || 0);
  const binaInsaat = Number(mali.binaInsaatGideri?.toplamBinaGideri || 0);
  const anaBina = Number(mali.binaInsaatGideri?.anaBinaGideri || 0);
  const yardimciBina = Number(mali.binaInsaatGideri?.yardimciBinaGideri || 0);
  const idareBina = 0;

  const ithalMak = Number(mali.makinaTechizat?.ithalMakina || 0);
  const yerliMak = Number(mali.makinaTechizat?.yerliMakina || 0);
  const toplamMak = Number(mali.makinaTechizat?.toplamMakina || 0);
  const yeniMakUsd = Number(mali.makinaTechizat?.yeniMakine || 0);
  const kullMakUsd = Number(mali.makinaTechizat?.kullanimisMakina || 0);
  const topMakUsd = yeniMakUsd + kullMakUsd;

  const yardimciIsletmeMakGider = 0;
  const ithalatGider = Number(mali.yatirimHesaplamalari?.ev || 0);
  const tasimaGider = Number(mali.yatirimHesaplamalari?.ew || 0);
  const montajGider = Number(mali.yatirimHesaplamalari?.et || 0);
  const etudGider = Number(mali.yatirimHesaplamalari?.ex || 0);
  const digerGider = Number(mali.yatirimHesaplamalari?.ey || 0);
  const toplamDigerHarcama =
    yardimciIsletmeMakGider + ithalatGider + tasimaGider + montajGider + etudGider + digerGider;

  let topSabit = Number(mali.toplamSabitYatirim || 0);
  if (!topSabit) topSabit = araziArsa + binaInsaat + toplamMak + toplamDigerHarcama;

  const yabanci = Number(mali.finansman?.yabanciKaynak || 0);
  const ozkaynak = Number(mali.finansman?.ozKaynak || 0);
  const topFin = Number(mali.finansman?.toplamFinansman || yabanci + ozkaynak);

  // 5.1 Arazi-Arsa Gideri
  addSubHeaderRow("5.1 Arazi-Arsa Gideri");
  addKirilimRow("Açıklama", str(mali.maliyetlenen?.aciklama));
  addKirilimRow("Metrekaresi (m²)", num(mali.maliyetlenen?.sl));
  addKirilimRow("Birim Fiyatı", tl(mali.maliyetlenen?.sm));
  addKirilimRow("Arazi-Arsa Bedeli (TOPLAM)", tl(araziArsa), { bold: true, fill: TOTAL_FILL });

  // 5.2 Bina-İnşaat Gideri
  addSubHeaderRow("5.2 Bina-İnşaat Gideri");
  addKirilimRow("Açıklama", str(mali.binaInsaatGideri?.aciklama));
  addKirilimRow("Ana bina ve tesisleri", tl(anaBina));
  addKirilimRow("Yardımcı işletmeler bina ve tesisleri", tl(yardimciBina));
  addKirilimRow("İdare binaları", tl(idareBina));
  addKirilimRow("Toplam Bina-İnşaat Giderleri", tl(binaInsaat), { bold: true, fill: TOTAL_FILL });

  // 5.3 Diğer Yatırım Harcamaları
  addSubHeaderRow("5.3 Diğer Yatırım Harcamaları");
  addKirilimRow("Yardımcı işletme makine teçhizat giderleri", tl(yardimciIsletmeMakGider));
  addKirilimRow("İthalat ve gümrükleme giderleri", tl(ithalatGider));
  addKirilimRow("Taşıma ve sigorta giderleri", tl(tasimaGider));
  addKirilimRow("Montaj giderleri", tl(montajGider));
  addKirilimRow("Etüd ve proje giderleri", tl(etudGider));
  addKirilimRow("Diğer giderler", tl(digerGider));
  addKirilimRow("Toplam Diğer Yatırım Harcamaları", tl(toplamDigerHarcama), { bold: true, fill: TOTAL_FILL });

  // 5.4 Toplam Sabit Yatırım Tutarı
  addKirilimRow("TOPLAM SABİT YATIRIM TUTARI", tl(topSabit), { bold: true, fill: TOTAL_FILL });

  // 5.5 Makina ve Teçhizat Giderleri
  addSubHeaderRow("5.5 Makina ve Teçhizat Giderleri");
  addKirilimRow("İthal", tl(ithalMak));
  addKirilimRow("Yerli", tl(yerliMak));
  addKirilimRow("Toplam Makine Teçhizat", tl(toplamMak), { bold: true, fill: TOTAL_FILL });

  // 5.6 İthal Makine (USD)
  addSubHeaderRow("5.6 İthal Makine ($)");
  addKirilimRow("Yeni Makine", usd(yeniMakUsd));
  addKirilimRow("Kullanılmış Makine", usd(kullMakUsd));
  addKirilimRow("Toplam İthal Makine ($)", usd(topMakUsd), { bold: true, fill: TOTAL_FILL });

  // 5.7 Finansman
  addSubHeaderRow("5.7 Finansman");
  addKirilimRow("Yabancı Kaynak", tl(yabanci));
  addKirilimRow("Öz Kaynak", tl(ozkaynak));
  addKirilimRow("TOPLAM FİNANSMAN", tl(topFin), { bold: true, fill: TOTAL_FILL });

  worksheet.addRow([]);

  // ── 6. ÖZEL ŞARTLAR ───────────────────────────────────────────────────────
  addHeaderRow("6. ÖZEL ŞARTLAR");
  const sartHeader = worksheet.addRow(["Şart Adı / Kısaltma", "Açıklama", "", ""]);
  worksheet.mergeCells(`B${sartHeader.number}:D${sartHeader.number}`);
  sartHeader.getCell(1).font = { bold: true }; sartHeader.getCell(1).fill = LABEL_FILL;
  sartHeader.getCell(2).font = { bold: true }; sartHeader.getCell(2).fill = LABEL_FILL;
  applyBorder(sartHeader);

  if (tesvik.ozelSartlar && tesvik.ozelSartlar.length > 0) {
    tesvik.ozelSartlar.forEach((sart, i) => {
      const row = worksheet.addRow([
        sart?.koşulMetni || sart?.kisaltma || `Şart ${i + 1}`,
        sart?.aciklamaNotu || sart?.sart || sart?.metin || sart?.aciklama || "-"
      ]);
      worksheet.mergeCells(`B${row.number}:D${row.number}`);
      row.eachCell((cell) => { cell.border = BORDER; cell.alignment = { wrapText: true, vertical: "top" }; });
    });
  } else {
    const row = worksheet.addRow(["-", "Özel şart bulunmuyor."]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    applyBorder(row);
  }
  worksheet.addRow([]);

  // ── 7. DESTEK UNSURLARI ───────────────────────────────────────────────────
  addHeaderRow("7. DESTEK UNSURLARI");
  const destekHeader = worksheet.addRow(["Destek Adı", "Şartı", "Açıklama", ""]);
  worksheet.mergeCells(`C${destekHeader.number}:D${destekHeader.number}`);
  destekHeader.eachCell((cell) => { cell.font = { bold: true }; cell.fill = LABEL_FILL; cell.border = BORDER; cell.alignment = { horizontal: "center", vertical: "middle" }; });

  if (tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0) {
    tesvik.destekUnsurlari.forEach((d) => {
      const ad = d.destekUnsuru || d.adi || d.destekAdi || "-";
      const sart = d.sarti || d.sart || "-";
      const aciklama = d.aciklama || (d.orani ? d.orani + " %" : d.tutari ? d.tutari + " ₺" : "-");
      const row = worksheet.addRow([ad, sart, aciklama, ""]);
      worksheet.mergeCells(`C${row.number}:D${row.number}`);
      row.eachCell((cell) => { cell.border = BORDER; cell.alignment = { wrapText: true, vertical: "middle" }; });
    });
  } else {
    const row = worksheet.addRow(["-", "-", "Destek unsuru bulunmuyor.", ""]);
    worksheet.mergeCells(`C${row.number}:D${row.number}`);
    applyBorder(row);
  }

  // ── 8. MAKİNE LİSTELERİ ───────────────────────────────────────────────────
  const yerliList = tesvik.makineListeleri?.yerli || [];
  if (yerliList.length > 0) {
    const yerliSheet = workbook.addWorksheet("Yerli Makine Listesi");
    yerliSheet.columns = [
      { width: 10 }, // Sıra No
      { width: 15 }, // Makine ID
      { width: 15 }, // GTİP Kodu
      { width: 45 }, // Adı ve Özelliği
      { width: 12 }, // Miktar
      { width: 15 }, // Birim
      { width: 20 }, // Birim Fiyatı (TL)
      { width: 20 }, // Toplam Tutar (TL)
      { width: 15 }, // KDV İstisnası
      { width: 20 }  // Tip
    ];
    
    const hRow = yerliSheet.addRow([
      "Sıra No", "Makine ID", "GTİP Kodu", "Adı ve Özelliği", "Miktar", "Birim",
      "Birim Fiyatı (TL)", "Toplam Tutar (TL)", "KDV İstisnası", "Makine Tipi"
    ]);
    hRow.eachCell(c => { c.font = { bold: true }; c.fill = LABEL_FILL; c.border = BORDER; });

    yerliList.forEach(m => {
      const r = yerliSheet.addRow([
        m.siraNo || "-",
        m.makineId || "-",
        m.gtipKodu || "-",
        m.adiVeOzelligi || "-",
        num(m.miktar),
        m.birim || "-",
        tl(m.birimFiyatiTl),
        tl(m.toplamTutariTl || m.toplamTl),
        m.kdvIstisnasi || "-",
        m.makineTechizatTipi || "-"
      ]);
      r.eachCell(c => { c.border = BORDER; c.alignment = { wrapText: true, vertical: "middle" }; });
    });
  }

  const ithalList = tesvik.makineListeleri?.ithal || [];
  if (ithalList.length > 0) {
    const ithalSheet = workbook.addWorksheet("İthal Makine Listesi");
    ithalSheet.columns = [
      { width: 10 }, // Sıra No
      { width: 15 }, // Makine ID
      { width: 15 }, // GTİP Kodu
      { width: 45 }, // Adı ve Özelliği
      { width: 12 }, // Miktar
      { width: 15 }, // Birim
      { width: 20 }, // Birim Fiyatı
      { width: 15 }, // Döviz
      { width: 20 }, // Toplam Tutar (USD)
      { width: 20 }, // Toplam Tutar (TL)
      { width: 20 }  // Makine Tipi
    ];

    const hRow = ithalSheet.addRow([
      "Sıra No", "Makine ID", "GTİP Kodu", "Adı ve Özelliği", "Miktar", "Birim",
      "Birim Fiyatı", "Döviz", "Toplam Tutar (USD)", "Toplam Tutar (TL)", "Makine Tipi"
    ]);
    hRow.eachCell(c => { c.font = { bold: true }; c.fill = LABEL_FILL; c.border = BORDER; });

    ithalList.forEach(m => {
      const r = ithalSheet.addRow([
        m.siraNo || "-",
        m.makineId || "-",
        m.gtipKodu || "-",
        m.adiVeOzelligi || "-",
        num(m.miktar),
        m.birim || "-",
        num(m.birimFiyatiFob),
        m.gumrukDovizKodu || "-",
        usd(m.toplamTutarFobUsd || m.toplamUsd),
        tl(m.toplamTutarFobTl || m.toplamTl),
        m.makineTechizatTipi || "-"
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
  a.download = `Tesvik_${tesvik.belgeNo || tesvik.gmId || tesvik._id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
