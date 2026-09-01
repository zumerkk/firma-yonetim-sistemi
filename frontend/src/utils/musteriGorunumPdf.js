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
// Müşteri: "makinelere onay tarihi sütunu da ekleyelim, makine revizyonlarındaki
// gibi sadece onay tarihi yeterli." Karar onaylandıysa tarihi, değilse '-'.
const onayTarihi = (m) => {
  const d = m?.karar?.kararTarihi;
  const durum = m?.karar?.kararDurumu;
  if (!d || (durum && durum !== 'onay' && durum !== 'kismi_onay')) return '-';
  return tarih(d);
};

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

  // Boş bölümlerde tablo yerine tek satır not: "-" dolu tablolar çıktıyı kirletiyordu
  const bosSatir = (metin) => {
    doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(120);
    doc.text(metin, 40, y + 8);
    doc.setTextColor(0);
    y += 26;
  };

  // ── Kapak ───────────────────────────────────────────────────────────────
  // ALAN YOLLARI docxExcelExport.js İLE BİREBİR AYNI OLMALI.
  // İlk sürümde alan adları tahmin edilmişti (tesvik.belgeNo, u.ad, s.kisaltma…) ve
  // çıktıda künye/ürün/şart sütunları "-" geliyordu; veri aslında iç nesnelerde
  // duruyor (belgeYonetimi, yatirimBilgileri, maliHesaplamalar…).
  baslik('TEŞVİK BELGESİ — MÜŞTERİ GÖRÜNÜMÜ', 15);
  doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
  doc.text(`Oluşturma: ${new Date().toLocaleString('tr-TR')}`, sayfaGenisligi / 2, y, { align: 'center' });
  doc.setTextColor(0); y += 22;

  const fb = tesvik.firmaBilgileri || {};
  const yb = tesvik.yatirimBilgileri || {};
  const by = tesvik.belgeYonetimi || {};
  const kunye = tesvik.kunyeBilgileri || {};
  const mali = tesvik.maliHesaplamalar || {};

  // ── 1. Yatırımcı ────────────────────────────────────────────────────────
  bolum('1. Yatırımcı Bilgileri'); y += 6;
  bilgiTablosu([
    ['Yatırımcı Ünvanı', str(fb.unvan || tesvik.firma?.tamUnvan)],
    ['Vergi Dairesi', str(fb.vergiDairesi || tesvik.firma?.vergiDairesi)],
    ['Vergi No', str(fb.vergiNo || tesvik.firma?.vergiNo)],
    ['SGK Sicil No', str(kunye.sgkSicilNo)]
  ]);

  // ── 2. Yatırım ──────────────────────────────────────────────────────────
  const adres = [yb.yatirimAdresi1, yb.yatirimAdresi2, yb.yatirimAdresi3].filter(Boolean).join(' ');
  const yatirimCinsi = [yb.sCinsi1, yb.tCinsi2, yb.uCinsi3, yb.vCinsi4].filter(Boolean).join(', ') || yb.yatirimCinsi;
  bolum('2. Yatırım Bilgileri'); y += 6;
  bilgiTablosu([
    ['Yatırımın Yeri', [yb.yerinIl, yb.yerinIlce].filter(Boolean).join(' / ') || '-'],
    ['Yatırım Adresi', str(adres)],
    ['OSB Adı', str(yb.osbIseMudurluk)],
    ['Bölge (İl / İlçe bazlı)', [yb.ilBazliBolge, yb.ilceBazliBolge].filter(Boolean).join(' / ') || '-'],
    ['Yatırım Cinsi', str(yatirimCinsi)],
    ['Destek Sınıfı', str(yb.destekSinifi)],
    ['İstihdam (Mevcut / İlave)', `${num(tesvik.istihdam?.mevcutKisi)} / ${num(tesvik.istihdam?.ilaveKisi)}`],
    ['Ada / Parsel', [yb.ada, yb.parsel].filter(Boolean).join(' / ') || '-']
  ]);

  // ── 3. Belge ────────────────────────────────────────────────────────────
  bolum('3. Belge Bilgileri'); y += 6;
  bilgiTablosu([
    ['Belge No', str(by.belgeNo || tesvik.belgeNo || tesvik.gmId)],
    ['Belge Tarihi', tarih(by.belgeTarihi || kunye.kararTarihi)],
    ['Dayandığı Kanun', str(by.dayandigiKanun || kunye.kararSayisi)],
    ['Müracaat No', str(by.belgeMuracaatNo || kunye.dosyaNo)],
    ['Müracaat Tarihi', tarih(by.belgeMuracaatTarihi || kunye.basvuruTarihi)],
    ['Belge Başlama / Bitiş', `${tarih(by.belgeBaslamaTarihi || kunye.baslamaTarihi)} — ${tarih(by.belgeBitisTarihi || kunye.bitisTarihi)}`],
    ['Süre Uzatım Tarihi', tarih(by.uzatimTarihi)],
    ['Öncelikli Yatırım', str(by.oncelikliYatirim)]
  ]);

  // ── 4. Ürünler ──────────────────────────────────────────────────────────
  // Tamamen boş satırlar atlanır: müşterinin ilk çıktısında "-" dolu satırlar vardı
  const urunler = (tesvik.urunler || []).filter((u) => {
    const kod = u.u97Kodu || u.us97Kodu || u.naceKodu || u.kodu;
    const ad = u.urunAdi || u.cinsi || u.adi || u.urunCinsi;
    return kod || ad || u.mevcutKapasite || u.ilaveKapasite;
  });
  bolum('4. Ürün Bilgileri'); y += 6;
  if (urunler.length) {
    tablo(
      ['Kod', 'Ürün Adı / Cinsi', 'Mevcut', 'İlave', 'Toplam', 'Birim'],
      urunler.map((u) => {
        const mevcut = u.mevcutKapasite; const ilave = u.ilaveKapasite;
        const toplamDb = u.toplamKapasite;
        const toplam = (toplamDb !== undefined && toplamDb !== null && toplamDb !== '')
          ? toplamDb : (Number(mevcut) || 0) + (Number(ilave) || 0);
        return [
          str(u.u97Kodu || u.us97Kodu || u.naceKodu || u.kodu),
          str(u.urunAdi || u.cinsi || u.adi || u.urunCinsi),
          num(mevcut), num(ilave), num(toplam),
          str(u.kapasiteBirimi || u.birim)
        ];
      }),
      { columnStyles: { 1: { cellWidth: 200 } } }
    );
  } else {
    bosSatir('Ürün bilgisi girilmemiş.');
  }

  // ── 5. Finansal ─────────────────────────────────────────────────────────
  const sayi = (v) => Number(v || 0);
  const araziArsa = sayi(mali.araciArsaBedeli || mali.araziArsaBedeli || mali.maliyetlenen?.sn);
  const binaInsaat = sayi(mali.binaInsaatGideri?.toplamBinaGideri);
  const toplamMak = sayi(mali.makinaTechizat?.toplamMakina);
  const digerToplam = ['ev', 'ew', 'et', 'ex', 'ey'].reduce((t, k) => t + sayi(mali.yatirimHesaplamalari?.[k]), 0);
  const topSabit = sayi(mali.toplamSabitYatirim) || (araziArsa + binaInsaat + toplamMak + digerToplam);
  const yabanci = sayi(mali.finansman?.yabanciKaynak);
  const ozkaynak = sayi(mali.finansman?.ozKaynak);

  bolum('5. Finansal Bilgiler'); y += 6;
  bilgiTablosu([
    ['Arazi-Arsa Gideri', tl(araziArsa)],
    ['Bina-İnşaat Gideri', tl(binaInsaat)],
    ['Makine Teçhizat (İthal)', tl(mali.makinaTechizat?.ithalMakina)],
    ['Makine Teçhizat (Yerli)', tl(mali.makinaTechizat?.yerliMakina)],
    ['Makine Teçhizat (Toplam)', tl(toplamMak)],
    ['Diğer Yatırım Harcamaları', tl(digerToplam)],
    ['TOPLAM SABİT YATIRIM', tl(topSabit)],
    ['Finansman (Yabancı / Öz kaynak)', `${tl(yabanci)} / ${tl(ozkaynak)}`]
  ]);

  // ── 6. Özel şartlar ─────────────────────────────────────────────────────
  const sartlar = (tesvik.ozelSartlar || []).filter((sa) =>
    (sa?.koşulMetni || sa?.kisaltma || '').trim() || (sa?.aciklamaNotu || sa?.sart || sa?.metin || sa?.aciklama || '').trim());
  bolum('6. Özel Şartlar'); y += 6;
  if (sartlar.length) {
    tablo(
      ['Şart', 'Açıklama'],
      sartlar.map((sa, i) => [
        str(sa?.koşulMetni || sa?.kisaltma || `Şart ${i + 1}`),
        str(sa?.aciklamaNotu || sa?.sart || sa?.metin || sa?.aciklama)
      ]),
      { columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 'auto' } } }
    );
  } else {
    bosSatir('Özel şart bulunmuyor.');
  }

  // ── 7. Destek unsurları ─────────────────────────────────────────────────
  const destekler = (tesvik.destekUnsurlari || []).filter((d) =>
    (d.destekUnsuru || d.adi || d.destekAdi || '').trim());
  bolum('7. Destek Unsurları'); y += 6;
  if (destekler.length) {
    tablo(
      ['Destek Adı', 'Şartı', 'Açıklama'],
      destekler.map((d) => [
        str(d.destekUnsuru || d.adi || d.destekAdi),
        str(d.sarti || d.sart),
        str(d.aciklama || (d.orani ? `${d.orani} %` : d.tutari ? `${d.tutari} TL` : ''))
      ]),
      { columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 110 } } }
    );
  } else {
    bosSatir('Destek unsuru bulunmuyor.');
  }

  // ── Makine listeleri: HER BİRİ YENİ SAYFADA, BAŞLIKLI ───────────────────
  // Müşterinin asıl şikayeti buydu: Excel'den PDF'e çevirince listelerin
  // hangisi yerli hangisi ithal olduğu anlaşılmıyordu.
  const yerli = tesvik.makineListeleri?.yerli || [];
  if (yerli.length) {
    doc.addPage('a4', 'landscape');
    y = 44;
    baslik(`YERLİ MAKİNE LİSTESİ${tesvik.belgeNo ? ` — Belge No: ${tesvik.belgeNo}` : ''}`, 14);
    // Müşteri: "yerli makinelerde GTİP sütununa gerek yok, gizleyebiliriz."
    // Yerine onay tarihi geldi; sütun sayısı değişmediği için sayfa düzeni bozulmuyor.
    tablo(
      ['Sıra', 'Makine ID', 'Adı ve Özelliği', 'Miktar', 'Birim', 'Birim Fiyatı (TL)', 'Toplam (TL)', 'KDV İstisnası', 'Onay Tarihi'],
      yerli.map((m) => [
        str(m.siraNo), str(m.makineId), str(m.adiVeOzelligi),
        num(m.miktar), birimEtiketi(m.birim, m.birimAciklamasi) || '-',
        tl(m.birimFiyatiTl), tl(m.toplamTutariTl || m.toplamTl), str(m.kdvIstisnasi),
        onayTarihi(m)
      ]),
      { columnStyles: { 2: { cellWidth: 220 } } }
    );
  }

  const ithal = tesvik.makineListeleri?.ithal || [];
  if (ithal.length) {
    doc.addPage('a4', 'landscape');
    y = 44;
    baslik(`İTHAL MAKİNE LİSTESİ${tesvik.belgeNo ? ` — Belge No: ${tesvik.belgeNo}` : ''}`, 14);
    tablo(
      ['Sıra', 'GTİP', 'Adı ve Özelliği', 'Miktar', 'Birim', 'Birim Fiyatı', 'Döviz', 'Toplam ($)', 'Toplam (TL)', 'Kullanılmış', 'Gümrük İstisnası', 'KDV İstisnası', 'Onay Tarihi'],
      ithal.map((m) => [
        str(m.siraNo), str(m.gtipKodu), str(m.adiVeOzelligi), num(m.miktar),
        birimEtiketi(m.birim, m.birimAciklamasi) || '-', num(m.birimFiyatiFob), str(m.gumrukDovizKodu),
        usd(m.toplamTutarFobUsd || m.toplamUsd), tl(m.toplamTutarFobTl || m.toplamTl),
        kullanilmisEtiketi(m.kullanilmisMakine, m.kullanilmisMakineAciklama),
        evetHayir(m.gumrukVergisiMuafiyeti), evetHayir(m.kdvMuafiyeti),
        onayTarihi(m)
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
