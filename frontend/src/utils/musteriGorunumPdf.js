// 📄 Müşteri Görünümü — PDF
//
// Müşteri: "müşteri görünümü Excel var ya, bir de ona müşteri görünümü PDF
// indirebilir miyiz sistemden" + "Excel'i PDF'e çevirdiğimde makine listelerinin
// başlığı yok, makine listelerinin başında YERLİ/İTHAL yazabilir mi".
//
// Aynı içerik Excel çıktısıyla (docxExcelExport.js) hizalı tutulmalıdır.
//
// FONT NOTU: jsPDF'in yerleşik fontları WinAnsi kodlamalı; ğ, ş, ı, İ gibi Türkçe
// harfleri TAŞIMIYOR ve bozuk basıyor. Bu yüzden Roboto (Apache 2.0) çalışma anında
// /fonts/ altından çekilip PDF'e gömülüyor. Font public klasörde durduğu için JS
// paketini şişirmiyor; yalnızca kullanıcı "PDF indir" dediğinde iniyor ve tarayıcı
// tarafından önbelleklenir.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { birimEtiketi, kullanilmisEtiketi } from './makineFormat';

const FONT_YOLLARI = {
  normal: `${process.env.PUBLIC_URL || ''}/fonts/Roboto-Regular.ttf`,
  bold: `${process.env.PUBLIC_URL || ''}/fonts/Roboto-Bold.ttf`
};

// Bir kez indirilip bellekte tutulur (aynı oturumda ikinci PDF anında üretilsin)
let fontOnbellek = null;

const base64Cevir = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let ikili = '';
  const parca = 0x8000; // büyük dosyada String.fromCharCode(...tümü) yığını taşırıyor
  for (let i = 0; i < bytes.length; i += parca) {
    ikili += String.fromCharCode.apply(null, bytes.subarray(i, i + parca));
  }
  return window.btoa(ikili);
};

const fontlariYukle = async () => {
  if (fontOnbellek) return fontOnbellek;
  const [normal, bold] = await Promise.all([
    fetch(FONT_YOLLARI.normal).then((r) => { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); }),
    fetch(FONT_YOLLARI.bold).then((r) => { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); })
  ]);
  fontOnbellek = { normal: base64Cevir(normal), bold: base64Cevir(bold) };
  return fontOnbellek;
};

// ── Biçimlendiriciler (Excel çıktısıyla aynı kurallar) ────────────────────
const tl = (v) => { const n = Number(v); if ((!v && v !== 0) || isNaN(n)) return '-'; return `${n.toLocaleString('tr-TR')} TL`; };
const usd = (v) => { const n = Number(v); if ((!v && v !== 0) || isNaN(n)) return '-'; return `$${n.toLocaleString('tr-TR')}`; };
const num = (v) => { const n = Number(v); if ((!v && v !== 0) || isNaN(n)) return '-'; return n.toLocaleString('tr-TR'); };
const str = (v) => (v && v !== '' ? String(v) : '-');
const tarih = (v) => { if (!v) return '-'; const d = new Date(v); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('tr-TR'); };
const evetHayir = (v) => {
  const s = String(v || '').trim().toUpperCase();
  if (s === 'EVET') return 'Evet';
  if (s === 'HAYIR') return 'Hayır';
  return '-';
};

const RENK = { baslik: [30, 58, 138], satirBaslik: [241, 245, 249], cizgi: [203, 213, 225] };

export const exportTesvikToPdf = async (tesvik) => {
  const { normal, bold } = await fontlariYukle();

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  doc.addFileToVFS('Roboto-Regular.ttf', normal);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'normal');

  const sayfaGenisligi = doc.internal.pageSize.getWidth();
  let y = 48;

  const baslik = (metin, boyut = 16) => {
    doc.setFont('Roboto', 'bold'); doc.setFontSize(boyut);
    doc.setTextColor(...RENK.baslik);
    doc.text(metin, sayfaGenisligi / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += boyut + 8;
  };

  const bolum = (metin) => {
    doc.setFont('Roboto', 'bold'); doc.setFontSize(11);
    doc.setTextColor(...RENK.baslik);
    doc.text(metin, 40, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  };

  // Etiket/değer çiftlerini iki sütunlu tabloya bas
  const bilgiTablosu = (satirlar) => {
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      body: satirlar.filter(Boolean),
      theme: 'grid',
      styles: { font: 'Roboto', fontSize: 8.5, cellPadding: 4, lineColor: RENK.cizgi, lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: 150, fontStyle: 'bold', fillColor: RENK.satirBaslik },
        1: { cellWidth: 'auto' }
      }
    });
    y = doc.lastAutoTable.finalY + 18;
  };

  const tablo = (kolonlar, satirlar, opts = {}) => {
    autoTable(doc, {
      startY: y,
      margin: { left: 30, right: 30 },
      head: [kolonlar],
      body: satirlar,
      theme: 'grid',
      styles: { font: 'Roboto', fontSize: 7.5, cellPadding: 3, lineColor: RENK.cizgi, lineWidth: 0.5, overflow: 'linebreak' },
      headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: RENK.baslik, textColor: 255, fontSize: 7.5 },
      ...opts
    });
    y = doc.lastAutoTable.finalY + 18;
  };

  // ── Kapak / künye ───────────────────────────────────────────────────────
  baslik('TEŞVİK BELGESİ — MÜŞTERİ GÖRÜNÜMÜ', 15);
  doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
  doc.text(`Oluşturma: ${new Date().toLocaleString('tr-TR')}`, sayfaGenisligi / 2, y, { align: 'center' });
  doc.setTextColor(0); y += 22;

  bolum('1. Belge Künyesi'); y += 6;
  bilgiTablosu([
    ['Firma', str(tesvik.firma?.tamUnvan || tesvik.firmaAdi || tesvik.yatirimciUnvan)],
    ['Belge No', str(tesvik.belgeNo)],
    ['Belge Tarihi', tarih(tesvik.belgeTarihi)],
    ['Belge Durumu', str(tesvik.belgeDurumu)],
    ['Müracaat Tarihi', tarih(tesvik.muracaatTarihi)],
    ['Yatırım Konusu', str(tesvik.yatirimKonusu || tesvik.yatirimBilgileri?.yatirimKonusu)],
    ['Yatırım Adresi', str(tesvik.yatirimAdresi || tesvik.yatirimBilgileri?.adres)],
    ['Destek Sınıfı', str(tesvik.destekSinifi)]
  ]);

  // ── Ürünler ─────────────────────────────────────────────────────────────
  const urunler = tesvik.urunler || tesvik.urunBilgileri || [];
  if (urunler.length) {
    bolum('2. Ürün Bilgileri'); y += 6;
    tablo(
      ['Kod', 'Ürün Adı', 'Mevcut', 'İlave', 'Toplam', 'Birim'],
      urunler.map((u) => [
        str(u.kod || u.u97Kodu), str(u.ad || u.aciklama),
        num(u.mevcut), num(u.ilave), num(u.toplam ?? (Number(u.mevcut || 0) + Number(u.ilave || 0))),
        str(u.kapasiteBirimi || u.birim)
      ])
    );
  }

  // ── Özel şartlar ────────────────────────────────────────────────────────
  const sartlar = tesvik.ozelSartlar || [];
  if (sartlar.length) {
    bolum('3. Özel Şartlar'); y += 6;
    tablo(
      ['Şart', 'Açıklama'],
      sartlar.map((s) => [str(s.kisaltma || s.sartAdi), str(s.aciklama || s.sartAciklamasi)]),
      { columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 'auto' } } }
    );
  }

  // ── Makine listeleri: HER BİRİ YENİ SAYFADA, BAŞLIKLI ───────────────────
  // Müşterinin asıl şikayeti buydu: Excel'den PDF'e çevirince listelerin
  // hangisi yerli hangisi ithal olduğu anlaşılmıyordu.
  const yerli = tesvik.makineListeleri?.yerli || [];
  if (yerli.length) {
    doc.addPage('a4', 'landscape');
    y = 44;
    baslik(`YERLİ MAKİNE LİSTESİ${tesvik.belgeNo ? ` — Belge No: ${tesvik.belgeNo}` : ''}`, 14);
    tablo(
      ['Sıra', 'Makine ID', 'GTİP', 'Adı ve Özelliği', 'Miktar', 'Birim', 'Birim Fiyatı (TL)', 'Toplam (TL)', 'KDV İstisnası'],
      yerli.map((m) => [
        str(m.siraNo), str(m.makineId), str(m.gtipKodu), str(m.adiVeOzelligi),
        num(m.miktar), birimEtiketi(m.birim, m.birimAciklamasi) || '-',
        tl(m.birimFiyatiTl), tl(m.toplamTutariTl || m.toplamTl), str(m.kdvIstisnasi)
      ]),
      { columnStyles: { 3: { cellWidth: 220 } } }
    );
  }

  const ithal = tesvik.makineListeleri?.ithal || [];
  if (ithal.length) {
    doc.addPage('a4', 'landscape');
    y = 44;
    baslik(`İTHAL MAKİNE LİSTESİ${tesvik.belgeNo ? ` — Belge No: ${tesvik.belgeNo}` : ''}`, 14);
    tablo(
      ['Sıra', 'GTİP', 'Adı ve Özelliği', 'Miktar', 'Birim', 'Birim Fiyatı', 'Döviz', 'Toplam ($)', 'Toplam (TL)', 'Kullanılmış', 'Gümrük İstisnası', 'KDV İstisnası'],
      ithal.map((m) => [
        str(m.siraNo), str(m.gtipKodu), str(m.adiVeOzelligi), num(m.miktar),
        birimEtiketi(m.birim, m.birimAciklamasi) || '-', num(m.birimFiyatiFob), str(m.gumrukDovizKodu),
        usd(m.toplamTutarFobUsd || m.toplamUsd), tl(m.toplamTutarFobTl || m.toplamTl),
        kullanilmisEtiketi(m.kullanilmisMakine, m.kullanilmisMakineAciklama),
        evetHayir(m.gumrukVergisiMuafiyeti), evetHayir(m.kdvMuafiyeti)
      ]),
      { columnStyles: { 2: { cellWidth: 180 } }, styles: { font: 'Roboto', fontSize: 6.5, cellPadding: 2.5, overflow: 'linebreak' } }
    );
  }

  // ── Sayfa numaraları ────────────────────────────────────────────────────
  const toplam = doc.internal.getNumberOfPages();
  for (let i = 1; i <= toplam; i++) {
    doc.setPage(i);
    doc.setFont('Roboto', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
    const g = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Sayfa ${i} / ${toplam}`, g - 40, h - 18, { align: 'right' });
  }

  doc.save(`Tesvik_MusteriGorunumu_${tesvik.belgeNo || tesvik.gmId || tesvik._id}.pdf`);
};

export default exportTesvikToPdf;
