import ExcelJS from "exceljs";

// Sayıyı güvenli biçimde Türk lirası formatında göster
const tl = (val) => {
  const n = Number(val);
  if (!val && val !== 0) return "-";
  if (isNaN(n)) return "-";
  return n.toLocaleString("tr-TR") + " ₺";
};

// String değeri güvenli döndür
const str = (val) => (val && val !== "" ? String(val) : "-");

export const exportTesvikToExcel = async (tesvik, isEski = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Teşvik Belgesi");

  // ── Yardımcı fonksiyonlar ───────────────────────────────────────────────────
  const BORDER = { top: { style: "thin", color: { argb: "FFCBD5E1" } }, left: { style: "thin", color: { argb: "FFCBD5E1" } }, bottom: { style: "thin", color: { argb: "FFCBD5E1" } }, right: { style: "thin", color: { argb: "FFCBD5E1" } } };
  const LABEL_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

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

  // Kırılım satırı (finansal)
  const addKirilimRow = (label, value) => {
    const row = worksheet.addRow([label, value, "", ""]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    row.getCell(1).font = { bold: true };
    applyBorder(row);
  };

  // Sütun genişlikleri
  worksheet.columns = [
    { width: 30 }, // A
    { width: 40 }, // B
    { width: 28 }, // C
    { width: 40 }  // D
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
  addHeaderRow("3. BELGE İLE İLGİLİ BİLGİLER");
  addDataRow("Belge NO", tesvik.belgeNo || tesvik.gmId, "Karar Sayısı", tesvik.kunyeBilgileri?.kararSayisi);
  addDataRow(
    "Belge / Karar Tarihi",
    tesvik.kunyeBilgileri?.belgeTarihi || (tesvik.kunyeBilgileri?.kararTarihi ? new Date(tesvik.kunyeBilgileri.kararTarihi).toLocaleDateString("tr-TR") : "-"),
    "Müracaat Tarihi",
    tesvik.kunyeBilgileri?.basvuruTarihi ? new Date(tesvik.kunyeBilgileri.basvuruTarihi).toLocaleDateString("tr-TR") : "-"
  );
  addDataRow("Dosya / Müracaat No", tesvik.kunyeBilgileri?.dosyaNo, "Başlama Tarihi", tesvik.kunyeBilgileri?.baslamaTarihi ? new Date(tesvik.kunyeBilgileri.baslamaTarihi).toLocaleDateString("tr-TR") : "-");
  addDataRow("Bitiş Tarihi", tesvik.kunyeBilgileri?.bitisTarihi ? new Date(tesvik.kunyeBilgileri.bitisTarihi).toLocaleDateString("tr-TR") : "-", "Süre Uzatım Tarihi", "-");

  const ozellikli = [
    tesvik.yatirimBilgileri?.cazibeMerkeziMi === "evet" ? "Cazibe Merkezi" : null,
    tesvik.yatirimBilgileri?.savunmaSanayiProjesi === "evet" ? "Savunma Sanayi" : null,
    tesvik.yatirimBilgileri?.hamleMi === "evet" ? "Hamle" : null,
  ].filter(Boolean).join(", ");
  addDataRow("Özellikli Yatırım İse", ozellikli || "-", "Ada / Parsel", `${tesvik.yatirimBilgileri?.ada || "-"} / ${tesvik.yatirimBilgileri?.parsel || "-"}`);

  const yatirimCinsi = [
    tesvik.yatirimBilgileri?.sCinsi1,
    tesvik.yatirimBilgileri?.tCinsi2,
    tesvik.yatirimBilgileri?.uCinsi3,
    tesvik.yatirimBilgileri?.vCinsi4,
  ].filter(Boolean).join(", ") || tesvik.yatirimBilgileri?.yatirimCinsi;
  addDataRow("Yatırım Cinsi", yatirimCinsi, "Destek Sınıfı", tesvik.yatirimBilgileri?.destekSinifi);
  worksheet.addRow([]);

  // ── 4. ÜRÜN BİLGİLERİ ─────────────────────────────────────────────────────
  addHeaderRow("4. ÜRÜN BİLGİLERİ");
  // Tablo başlığı
  const urunHeader = worksheet.addRow([
    isEski ? "US97 / U97 Kodu" : "NACE / U97 Kodu",
    "Ürün Adı / Cinsi",
    "Toplam Kapasite",
    "Birim"
  ]);
  urunHeader.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = LABEL_FILL;
    cell.border = BORDER;
  });

  if (tesvik.urunler && tesvik.urunler.length > 0) {
    tesvik.urunler.forEach(u => {
      // Hem eski hem yeni belge u97Kodu alanını kullanıyor
      const kod = u.u97Kodu || u.us97Kodu || u.naceKodu || u.kodu || "-";
      const ad = u.urunAdi || u.cinsi || u.adi || u.urunCinsi || "-";
      const kapasite = u.toplamKapasite ?? u.ilaveKapasite ?? u.mevcutKapasite ?? u.miktar ?? u.kapasite ?? "-";
      const birim = u.kapasiteBirimi || u.birim || "-";
      const row = worksheet.addRow([kod, ad, String(kapasite), birim]);
      row.eachCell(cell => {
        cell.border = BORDER;
        cell.alignment = { wrapText: true, vertical: "middle" };
      });
    });
  } else {
    const row = worksheet.addRow(["Belirtilmemiş", "-", "-", "-"]);
    applyBorder(row);
  }
  worksheet.addRow([]);

  // ── 5. FİNANSAL BİLGİLER ──────────────────────────────────────────────────
  addHeaderRow("5. FİNANSAL BİLGİLER");
  const mt = tesvik.maliHesaplamalar || {};
  const toplamMakina = mt.makinaTechizat?.toplamMakina ?? 0;
  const toplamBina = mt.binaInsaatGideri?.toplamBinaGideri ?? 0;
  const araziArsa = mt.maliyetlenen?.sn ?? mt.araciArsaBedeli ?? 0;
  const toplamSabit = mt.toplamSabitYatirim ?? 0;

  addDataRow("Toplam Makine ve Teçhizat", tl(toplamMakina), "Bina-İnşaat Harcaması", tl(toplamBina));
  addDataRow("Arazi-Arsa Bedeli", tl(araziArsa), "Toplam Sabit Yatırım", tl(toplamSabit));
  addDataRow("Yabancı Kaynak", tl(mt.finansman?.yabanciKaynak), "Öz Kaynak", tl(mt.finansman?.ozKaynak));

  worksheet.addRow([]);

  // Kırılım başlığı
  const kirilimHeader = worksheet.addRow(["YATIRIM HARCAMALARI KIRILIMI", "TUTAR", "", ""]);
  worksheet.mergeCells(`B${kirilimHeader.number}:D${kirilimHeader.number}`);
  kirilimHeader.getCell(1).font = { bold: true };
  kirilimHeader.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  kirilimHeader.getCell(2).font = { bold: true };
  kirilimHeader.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  applyBorder(kirilimHeader);

  const yh = mt.yatirimHesaplamalari || {};
  if (isEski) {
    addKirilimRow("Yardımcı İşletme Makine Ve Teçhizat", tl(yh.et));
    addKirilimRow("İthalat Ve Gümrükleme Giderleri", tl(yh.eu));
    addKirilimRow("Taşıma Ve Sigorta Giderleri", tl(yh.ev));
    addKirilimRow("Montaj Giderleri", tl(yh.ew));
    addKirilimRow("Etüd Proje Giderleri", tl(yh.ex));
    addKirilimRow("Diğer Harcamalar", tl(yh.ey));
  } else {
    addKirilimRow("Arazi - Arsa Giderleri", tl(araziArsa));
    addKirilimRow("Bina-İnşaat Giderleri (Yardımcı İşl.)", tl(mt.binaInsaatGideri?.yardimciBinaGideri));
    addKirilimRow("Makine Ve Teçhizat (Yerli)", tl(mt.makinaTechizat?.yerliMakina));
    addKirilimRow("Makine Ve Teçhizat (İthal)", tl(mt.makinaTechizat?.ithalMakina));
    addKirilimRow("İthalat Ve Gümrükleme Giderleri", tl(yh.eu));
    addKirilimRow("Taşıma Ve Sigorta Giderleri", tl(yh.ev));
    addKirilimRow("Montaj Giderleri", tl(yh.ew));
    addKirilimRow("Etüd Proje / Diğer Giderler", tl(yh.ey));
  }

  addKirilimRow("TOPLAM SABİT YATIRIM TUTARI", tl(toplamSabit));
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
      row.eachCell(cell => { cell.border = BORDER; cell.alignment = { wrapText: true, vertical: "top" }; });
    });
  } else {
    const row = worksheet.addRow(["-", "Özel şart bulunmuyor."]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    applyBorder(row);
  }
  worksheet.addRow([]);

  // ── 7. DESTEK UNSURLARI ───────────────────────────────────────────────────
  addHeaderRow("7. DESTEK UNSURLARI");
  const destekHeader = worksheet.addRow(["Destek Adı", "Şartı / Açıklama", "", ""]);
  worksheet.mergeCells(`B${destekHeader.number}:D${destekHeader.number}`);
  destekHeader.getCell(1).font = { bold: true }; destekHeader.getCell(1).fill = LABEL_FILL;
  destekHeader.getCell(2).font = { bold: true }; destekHeader.getCell(2).fill = LABEL_FILL;
  applyBorder(destekHeader);

  if (tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0) {
    tesvik.destekUnsurlari.forEach(d => {
      // Gerçek DB alan adları: destekUnsuru, sarti, aciklama
      const ad = d.destekUnsuru || d.adi || d.destekAdi || "-";
      const sart = d.sarti || d.aciklama || (d.orani ? d.orani + " %" : d.tutari ? d.tutari + " ₺" : "-");
      const row = worksheet.addRow([ad, sart]);
      worksheet.mergeCells(`B${row.number}:D${row.number}`);
      row.eachCell(cell => { cell.border = BORDER; cell.alignment = { wrapText: true, vertical: "middle" }; });
    });
  } else {
    const row = worksheet.addRow(["-", "Destek unsuru bulunmuyor."]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    applyBorder(row);
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
