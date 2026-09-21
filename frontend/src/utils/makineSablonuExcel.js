// 📗 BOŞ MAKİNE LİSTESİ ŞABLONU (Excel)
//
// Müşteri (21.09.2026): "Listeleri içe aktarmak için standart boş bir Excel şablonu oluşturabilir
// miyiz? Arkadaşlar bilgileri doğrudan o şablona doldurup Plansis'e aktarırsa çok daha pratik olur."
// Düzen müşterinin gönderdiği mak_list_sablon.xlsx'teki gibi: YERLİ ve İTHAL sayfaları, E-TUYS'a
// benzeyen büyük harfli başlıklar. Başlıklar makineSablonu.js'teki SABLON_SUTUNLARI'ndan gelir —
// içe aktarmanın tanıdığı adların ta kendisi.
//
// Eklenenler: başlık notları (sütunun açıklaması + E-TUYS'taki karşılığı), EVET/HAYIR, birim,
// döviz ve kullanılmışlık için açılır listeler, sayı/tarih biçimleri, "Nasıl Kullanılır" sayfası.

import ExcelJS from 'exceljs';
import { SABLON_SUTUNLARI, SABLON_SAYFA_ADLARI } from './makineSablonu';
import { BIRIM_KODLARI, KULLANILMIS_KODLARI } from './makineFormat';

const SATIR_SAYISI = 1000; // açılır listelerin uygulandığı veri satırı sayısı
const BASLIK_ZEMIN = 'FF1E3A5F';
const ZORUNLU_ZEMIN = 'FFB45309';
const INCE = { style: 'thin', color: { argb: 'FF94A3B8' } };

export const SABLON_LISTELERI = {
  birim: Object.entries(BIRIM_KODLARI).filter(([kod]) => kod !== '136').map(([, ad]) => ad),
  doviz: ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY', 'SEK', 'DKK', 'NOK', 'CAD', 'AUD', 'RUB', 'KRW', 'TRY'],
  kullanilmis: [KULLANILMIS_KODLARI['2'], KULLANILMIS_KODLARI['1'], KULLANILMIS_KODLARI['3']],
  evetHayir: ['EVET', 'HAYIR']
};

const LISTE_SUTUNU = { birim: 'A', doviz: 'B', kullanilmis: 'C', evetHayir: 'D' };

export const SABLON_KURALLARI = [
  'Her makineyi "YERLİ" ya da "İTHAL" sayfasına bir satır olarak yazın. Sayfa adlarını ve başlıkları değiştirmeyin; kullanmadığınız sütunu boş bırakabilir ya da silebilirsiniz.',
  'Dosyayı Plansis\'te belgenin Makine Listesi ekranındaki "İçe Aktar" düğmesiyle yükleyin, ekrandaki listeyi kontrol edip kaydedin.',
  'Mevcut liste silinmez: eşleşen makineler güncellenir, yeniler eklenir, dosyada olmayanlara dokunulmaz. Eşleştirme önce MAKİNE ID\'ye, yoksa ADI VE ÖZELLİĞİ\'ne göre yapılır.',
  'Boş bıraktığınız hücreler sistemdeki mevcut değeri silmez; yalnız dolu hücreler aktarılır.',
  'Turuncu başlıklı sütunlar zorunludur: ADI VE ÖZELLİĞİ, MİKTARI, BİRİM (İTHAL\'de ayrıca DÖVİZ CİNSİ).',
  'EVET / HAYIR sütunlarında listeden seçin ("Evet", "E", "VAR", "YOK" da tanınır).',
  'BİRİM için E-TUYS birim adını yazın: ADET(UNIT), SET, KİLOGRAM… "ADET", "KG" gibi kısaltmalar da tanınır. Tam liste "Listeler" sayfasında.',
  'Tutarları sayı olarak yazın (1.234.567,89 biçimi de olur). TOPLAM TUTARI boş bırakılırsa Miktar × Birim Fiyatı hesaplanır; yazılırsa yazdığınız korunur.',
  'İTHAL\'de TOPLAM TUTAR $ ve TOPLAM TUTAR TL E-TUYS\'taki gibi yazılırsa korunur; boş bırakılırsa sistem kurla hesaplar.',
  'Tarihleri gg.aa.yyyy yazın (31.05.2027). TALEP TARİH yazılan makinenin talebi "Bakanlığa gönderildi", SONUÇ TARİH yazılanın kararı "Onay" olarak işaretlenir; sistemde zaten bir durum varsa o korunur.',
  'Başlık hücrelerinin üzerine gelince o sütunun açıklaması görünür.'
];

const sutunHarfi = (n) => {
  let s = '';
  let x = n;
  while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); }
  return s;
};

const listeDogrulamasi = (liste, baslik) => {
  const sayi = SABLON_LISTELERI[liste].length;
  const kaynak = `Listeler!$${LISTE_SUTUNU[liste]}$2:$${LISTE_SUTUNU[liste]}$${sayi + 1}`;
  const kesin = liste === 'evetHayir' || liste === 'kullanilmis';
  return {
    type: 'list',
    allowBlank: true,
    formulae: [kaynak],
    showErrorMessage: true,
    // Birim/döviz listesi tam olmayabilir: uyarır ama farklı değere izin verir
    errorStyle: kesin ? 'stop' : 'warning',
    errorTitle: baslik,
    error: kesin ? 'Listeden seçin.' : 'Listede yok. E-TUYS\'taki adı/kodu yazdığınızdan emin olun.'
  };
};

function veriSayfasi(wb, tur) {
  const sutunlar = SABLON_SUTUNLARI[tur];
  const ws = wb.addWorksheet(SABLON_SAYFA_ADLARI[tur], { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = sutunlar.map((s) => ({
    header: s.baslik,
    key: s.alan,
    width: s.genislik || 14,
    ...(s.bicim ? { style: { numFmt: s.bicim } } : {})
  }));

  const baslik = ws.getRow(1);
  baslik.height = 34;
  sutunlar.forEach((s, i) => {
    const hucre = baslik.getCell(i + 1);
    hucre.numFmt = 'General';
    hucre.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    hucre.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.zorunlu ? ZORUNLU_ZEMIN : BASLIK_ZEMIN } };
    hucre.border = { top: INCE, left: INCE, bottom: INCE, right: INCE };
    hucre.note = `${s.zorunlu ? 'ZORUNLU. ' : ''}${s.aciklama || ''}${s.etuys ? `\nE-TUYS: ${s.etuys}` : ''}`;
    if (s.liste) {
      const harf = sutunHarfi(i + 1);
      ws.dataValidations.add(`${harf}2:${harf}${SATIR_SAYISI + 1}`, listeDogrulamasi(s.liste, s.baslik));
    }
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sutunlar.length } };
  return ws;
}

function kullanimSayfasi(wb) {
  const ws = wb.addWorksheet('Nasıl Kullanılır');
  ws.columns = [{ width: 10 }, { width: 30 }, { width: 10 }, { width: 70 }, { width: 36 }];
  const baslik = ws.addRow(['Makine Listesi Şablonu — Nasıl Kullanılır']);
  baslik.font = { bold: true, size: 13 };
  baslik.height = 22;
  SABLON_KURALLARI.forEach((kural, i) => {
    const satir = ws.addRow([`${i + 1}.`, kural]);
    ws.mergeCells(satir.number, 2, satir.number, 5);
    satir.alignment = { wrapText: true, vertical: 'top' };
    // Birleştirilmiş hücrede Excel yüksekliği kendisi ayarlamıyor
    satir.height = Math.max(15, Math.ceil(kural.length / 120) * 15);
  });
  ws.addRow([]);
  const tabloBasi = ws.addRow(['Sayfa', 'Sütun', 'Zorunlu', 'Ne yazılır', 'E-TUYS\'taki karşılığı']);
  tabloBasi.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  tabloBasi.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BASLIK_ZEMIN } }; });
  for (const tur of ['yerli', 'ithal']) {
    for (const s of SABLON_SUTUNLARI[tur]) {
      const satir = ws.addRow([SABLON_SAYFA_ADLARI[tur], s.baslik, s.zorunlu ? 'Evet' : '', s.aciklama || '', s.etuys || '']);
      satir.alignment = { wrapText: true, vertical: 'top' };
    }
  }
  return ws;
}

function listelerSayfasi(wb) {
  const ws = wb.addWorksheet('Listeler');
  ws.columns = [
    { header: 'BİRİM', width: 36 },
    { header: 'DÖVİZ', width: 10 },
    { header: 'KULLANILMIŞ MI', width: 26 },
    { header: 'EVET / HAYIR', width: 14 }
  ];
  ws.getRow(1).font = { bold: true };
  const uzunluk = Math.max(...Object.values(SABLON_LISTELERI).map((l) => l.length));
  for (let i = 0; i < uzunluk; i++) {
    ws.addRow(['birim', 'doviz', 'kullanilmis', 'evetHayir'].map((ad) => SABLON_LISTELERI[ad][i] ?? null));
  }
  return ws;
}

/** Boş şablonun çalışma kitabı (ExcelJS) */
export function makineSablonuKitabi() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Plansis';
  wb.created = new Date();
  veriSayfasi(wb, 'yerli');
  veriSayfasi(wb, 'ithal');
  kullanimSayfasi(wb);
  listelerSayfasi(wb);
  return wb;
}

/** Şablonu oluşturup tarayıcıda indirir */
export async function makineSablonuIndir(dosyaAdi = 'Makine_Listesi_Sablonu.xlsx') {
  const buf = await makineSablonuKitabi().xlsx.writeBuffer();
  const url = window.URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Hemen iptal edilirse bazı tarayıcılarda indirme yarıda kalıyor
  setTimeout(() => window.URL.revokeObjectURL(url), 10000);
}
