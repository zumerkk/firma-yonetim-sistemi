import ExcelJS from "exceljs";

export const exportTesvikToExcel = async (tesvik, isEski = false) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Teşvik Belgesi");

  // Format Helpers
  const addHeaderRow = (title) => {
    const row = worksheet.addRow([title]);
    row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.mergeCells(`A${row.number}:D${row.number}`);
    row.height = 25;
    return row;
  };

  const addDataRow = (label1, value1, label2, value2) => {
    const row = worksheet.addRow([label1 || "", value1 || "-", label2 || "", value2 || ""]);
    
    // Label cells
    if (label1) {
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }
    if (label2) {
      row.getCell(3).font = { bold: true };
      row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }

    // Wrap text for values
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
    row.getCell(4).alignment = { wrapText: true, vertical: "middle" };
    
    // Add borders to all cells in the row
    for(let i=1; i<=4; i++) {
        row.getCell(i).border = {
            top: {style:"thin", color: {argb:"FFCBD5E1"}},
            left: {style:"thin", color: {argb:"FFCBD5E1"}},
            bottom: {style:"thin", color: {argb:"FFCBD5E1"}},
            right: {style:"thin", color: {argb:"FFCBD5E1"}}
        };
    }
    return row;
  };

  const addFullWidthDataRow = (label, value) => {
    const row = worksheet.addRow([label || "", value || ""]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    
    if (label) {
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    }
    
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
    
    for(let i=1; i<=4; i++) {
        row.getCell(i).border = {
            top: {style:"thin", color: {argb:"FFCBD5E1"}},
            left: {style:"thin", color: {argb:"FFCBD5E1"}},
            bottom: {style:"thin", color: {argb:"FFCBD5E1"}},
            right: {style:"thin", color: {argb:"FFCBD5E1"}}
        };
    }
    return row;
  };

  // Set column widths
  worksheet.columns = [
    { width: 25 }, // A
    { width: 45 }, // B
    { width: 25 }, // C
    { width: 45 }  // D
  ];

  // 1. GMdigi Bilgileri
  addHeaderRow("1. GMdigi BİLGİLERİ");
  addDataRow("Kayıt ID (GMdigi)", tesvik.gmId, "Firma ID", tesvik.firma?.gmId);
  addDataRow("Kayıt Sahibi (Kullanıcı)", tesvik.createdBy?.name || tesvik.kullaniciBilgileri?.kaydeden, "Genel Talep Durumu", tesvik.durumBilgileri?.genelDurum);
  addFullWidthDataRow("Kayıt Tarihi", tesvik.createdAt ? new Date(tesvik.createdAt).toLocaleDateString("tr-TR") : "");
  worksheet.addRow([]);

  // 2. Yatırımcı
  addHeaderRow("2. YATIRIMCI İLE İLGİLİ BİLGİLER");
  addDataRow("Yatırımcı Ünvanı", tesvik.firmaBilgileri?.unvan || tesvik.firma?.tamUnvan, "Vergi Dairesi", tesvik.firmaBilgileri?.vergiDairesi || tesvik.firma?.vergiDairesi);
  addDataRow("Vergi No", tesvik.firmaBilgileri?.vergiNo || tesvik.firma?.vergiNo, "SGK Sicil No", tesvik.kunyeBilgileri?.sgkSicilNo);
  worksheet.addRow([]);

  // 3. Yatırım
  addHeaderRow("3. YATIRIM İLE İLGİLİ BİLGİLER");
  addDataRow("Yatırımın Yeri (İl)", tesvik.yatirimBilgileri?.yerinIl, "Yatırımın Yeri (İlçe)", tesvik.yatirimBilgileri?.yerinIlce);
  addFullWidthDataRow("Yatırım Adresi", [tesvik.yatirimBilgileri?.yatirimAdresi1, tesvik.yatirimBilgileri?.yatirimAdresi2, tesvik.yatirimBilgileri?.yatirimAdresi3].filter(Boolean).join(", "));
  addDataRow("OSB Adı", tesvik.yatirimBilgileri?.osbIseMudurluk, "Serbest Bölge Adı", tesvik.yatirimBilgileri?.serbsetBolge || tesvik.yatirimBilgileri?.serbestBolge);
  addDataRow("İl Bazlı Bölgesi", tesvik.yatirimBilgileri?.ilBazliBolge, "İlçe Bazlı Bölgesi", tesvik.yatirimBilgileri?.ilceBazliBolge);
  addDataRow("Mevcut İstihdam", tesvik.istihdam?.mevcutKisi, "İlave İstihdam", tesvik.istihdam?.ilaveKisi);
  worksheet.addRow([]);

  // 4. Belge
  addHeaderRow("4. BELGE İLE İLGİLİ BİLGİLER");
  addDataRow("Belge ID", tesvik._id, "Belge NO", tesvik.belgeNo);
  addDataRow("Belge Tarihi", tesvik.kunyeBilgileri?.belgeTarihi || tesvik.kunyeBilgileri?.kararTarihi, "Müracaat Tarihi", tesvik.kunyeBilgileri?.basvuruTarihi);
  addDataRow("Müracaat Sayısı", tesvik.kunyeBilgileri?.dosyaNo, "Belge Başlama Tarihi", tesvik.kunyeBilgileri?.baslamaTarihi);
  addDataRow("Belge Bitiş Tarihi", tesvik.kunyeBilgileri?.bitisTarihi, "Süre Uzatım Tarihi", "-");
  
  const ozellikli = [
    tesvik.yatirimBilgileri?.cazibeMerkeziMi === "evet" ? "Cazibe Merkezi" : null,
    tesvik.yatirimBilgileri?.savunmaSanayiProjesi === "evet" ? "Savunma Sanayi" : null,
    tesvik.yatirimBilgileri?.hamleMi === "evet" ? "Hamle" : null
  ].filter(Boolean).join(", ");
  addDataRow("Özellikli Yatırım İse", ozellikli, "Ada", tesvik.yatirimBilgileri?.ada);
  
  const yatirimCinsi = [
    tesvik.yatirimBilgileri?.sCinsi1,
    tesvik.yatirimBilgileri?.tCinsi2,
    tesvik.yatirimBilgileri?.uCinsi3,
    tesvik.yatirimBilgileri?.vCinsi4
  ].filter(Boolean).join(", ") || tesvik.yatirimBilgileri?.yatirimCinsi;
  addDataRow("Parsel", tesvik.yatirimBilgileri?.parsel, "Yatırım Cinsi", yatirimCinsi);
  worksheet.addRow([]);

  // 5. Ürün
  addHeaderRow("5. ÜRÜN BİLGİLERİ");
  const tableHeaderRow5 = worksheet.addRow([isEski ? "US97 Kodu" : "NACE Kodu", "Kapasite Adı / Cinsi", "Miktar", "Birim"]);
  tableHeaderRow5.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} };
  });

  if (tesvik.urunler && tesvik.urunler.length > 0) {
    tesvik.urunler.forEach(u => {
      const row = worksheet.addRow([
        isEski ? (u.us97Kodu || "-") : (u.naceKodu || u.gümrükTarifeIstatistikPozisyonu || u.kodu || "-"),
        u.cinsi || u.adi || u.urunCinsi || "-",
        u.miktar || u.kapasite || "0",
        u.birim || "-"
      ]);
      row.eachCell(cell => {
        cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} };
        cell.alignment = { wrapText: true, vertical: "middle" };
      });
    });
  } else {
    const row = worksheet.addRow(["Belirtilmemiş", "-", "-", "-"]);
    row.eachCell(cell => cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} });
  }
  worksheet.addRow([]);

  // 6. Finansal
  addHeaderRow("6. FİNANSAL BİLGİLER");
  addDataRow("Toplam Makine ve Teçhizat", tesvik.maliHesaplamalar?.makineTechizatToplami?.toLocaleString("tr-TR") + " ₺", "Bina-İnşaat Harcaması", tesvik.maliHesaplamalar?.binaInsaatToplami?.toLocaleString("tr-TR") + " ₺");
  addFullWidthDataRow("Diğer Yatırım Harcamaları", tesvik.maliHesaplamalar?.digerYatirimHarcamalari?.toLocaleString("tr-TR") + " ₺");
  
  // Detay Kırılımı (Finansal)
  addFullWidthDataRow("DİĞER YATIRIM HARCAMALARI KIRILIMI", "TUTAR");
  const addKirilimRow = (label, value) => {
    const row = worksheet.addRow([label, value, "", ""]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    row.getCell(1).font = { bold: true };
    for(let i=1; i<=4; i++) {
        row.getCell(i).border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} };
    }
  };

  const mt = tesvik.maliHesaplamalar;
  if (isEski) {
    addKirilimRow("Yardımcı İşletme Makine Ve Teçhizat", (mt?.yardimciIsletmeMakineVeTechizat || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("İthalat Ve Gümrükleme Giderleri", (mt?.ithalatVeGumruklemeGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Taşıma Ve Sigorta Giderleri", (mt?.tasimaVeSigortaGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Montaj Giderleri", (mt?.montajGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Etüd Proje Giderleri", (mt?.etudProjeGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Diğer Harcamalar", (mt?.digerHarcamalar || 0).toLocaleString("tr-TR") + " ₺");
  } else {
    addKirilimRow("Arazi - Arsa Giderleri", (mt?.araziArsaGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Bina - İnşaat Giderleri (Yardımcı İşl.)", (mt?.yardimciIsletmeBinaInsaatGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Makine Ve Teçhizat Giderleri (Yardımcı İşl.)", (mt?.yardimciIsletmeMakineVeTechizat || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("İthalat Ve Gümrükleme Giderleri", (mt?.ithalatVeGumruklemeGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Taşıma Ve Sigorta Giderleri", (mt?.tasimaVeSigortaGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Montaj Giderleri", (mt?.montajGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Etüd Proje Giderleri", (mt?.etudProjeGiderleri || 0).toLocaleString("tr-TR") + " ₺");
    addKirilimRow("Faiz Gibi Giderler + İşletme Malzemesi + ...", (mt?.yatirimaGirenDigerHarcamalar || mt?.digerHarcamalar || 0).toLocaleString("tr-TR") + " ₺");
  }

  addFullWidthDataRow("TOPLAM SABİT YATIRIM TUTARI", (mt?.toplamSabitYatirim || 0).toLocaleString("tr-TR") + " ₺");
  worksheet.addRow([]);

  // 7. Özel Şartlar
  addHeaderRow("7. ÖZEL ŞARTLAR");
  const tableHeaderRow7 = worksheet.addRow(["Kısaltma", "Açıklama", "", ""]);
  worksheet.mergeCells(`B${tableHeaderRow7.number}:D${tableHeaderRow7.number}`);
  tableHeaderRow7.getCell(1).font = { bold: true }; tableHeaderRow7.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  tableHeaderRow7.getCell(2).font = { bold: true }; tableHeaderRow7.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  tableHeaderRow7.eachCell(cell => cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} });

  if (tesvik.ozelSartlar && tesvik.ozelSartlar.length > 0) {
    tesvik.ozelSartlar.forEach((sart, i) => {
      const row = worksheet.addRow([
        sart?.koşulMetni || sart?.kisaltma || `Şart ${i+1}`,
        sart?.aciklamaNotu || sart?.sart || sart?.metin || sart?.aciklama || "-"
      ]);
      worksheet.mergeCells(`B${row.number}:D${row.number}`);
      row.eachCell(cell => {
        cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} };
        cell.alignment = { wrapText: true, vertical: "top" };
      });
    });
  } else {
    const row = worksheet.addRow(["-", "Bulunmuyor"]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    row.eachCell(cell => cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} });
  }
  worksheet.addRow([]);

  // 8. Destek Unsurları
  addHeaderRow("8. DESTEK UNSURLARI");
  const tableHeaderRow8 = worksheet.addRow(["Destek Adı", "Oran / Tutar", "", ""]);
  worksheet.mergeCells(`B${tableHeaderRow8.number}:D${tableHeaderRow8.number}`);
  tableHeaderRow8.getCell(1).font = { bold: true }; tableHeaderRow8.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  tableHeaderRow8.getCell(2).font = { bold: true }; tableHeaderRow8.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  tableHeaderRow8.eachCell(cell => cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} });

  if (tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0) {
    tesvik.destekUnsurlari.forEach(d => {
      const row = worksheet.addRow([
        d.adi || d.destekAdi || "-",
        d.orani ? d.orani + " %" : (d.tutari ? d.tutari + " ₺" : "Yok")
      ]);
      worksheet.mergeCells(`B${row.number}:D${row.number}`);
      row.eachCell(cell => cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} });
    });
  } else {
    const row = worksheet.addRow(["-", "Bulunmuyor"]);
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    row.eachCell(cell => cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} });
  }
  worksheet.addRow([]);

  // 9. Proje Tanıtım
  addHeaderRow("9. PROJE TANITIMI");
  const projRow = worksheet.addRow(["Proje Özeti", tesvik.projeOzeti || "Boş", "", ""]);
  worksheet.mergeCells(`B${projRow.number}:D${projRow.number}`);
  projRow.getCell(1).font = { bold: true }; projRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  projRow.eachCell(cell => {
    cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} };
    cell.alignment = { wrapText: true, vertical: "top" };
  });
  projRow.height = 60;
  worksheet.addRow([]);

  // 10. Evrak Listesi
  addHeaderRow("10. EVRAK LİSTESİ");
  const evrakRow = worksheet.addRow(["Ekli Evraklar", "Sistem üzerinden taranmış evrakları görüntüleyebilirsiniz.", "", ""]);
  worksheet.mergeCells(`B${evrakRow.number}:D${evrakRow.number}`);
  evrakRow.getCell(1).font = { bold: true }; evrakRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  evrakRow.eachCell(cell => cell.border = { top: {style:"thin", color: {argb:"FFCBD5E1"}}, left: {style:"thin", color: {argb:"FFCBD5E1"}}, bottom: {style:"thin", color: {argb:"FFCBD5E1"}}, right: {style:"thin", color: {argb:"FFCBD5E1"}} });

  // İndirme işlemi
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Tesvik_Detay_${tesvik.belgeNo || tesvik._id}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
