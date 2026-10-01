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
import { birimEtiketi, finansalKiralamaEtiketi, kullanilmisEtiketi } from './makineFormat';
import { disaAktarimAdi, etiketNormalle } from './disaAktarimAdi';
import { kunyeBolumleri } from './belgeKunye';
import { finansalBolumleri } from './belgeFinansal';

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

// Dolu olmayan alanlar tabloya hiç yazılmaz (bilgiTablosu falsy satırları eler)
const doluysa = (etiket, deger, bicim = str) => {
  const v = bicim(deger);
  return (!v || v === '-') ? null : [etiket, v];
};

const RENK = { baslik: [30, 58, 138], satirBaslik: [241, 245, 249], grupBaslik: [226, 232, 240], cizgi: [203, 213, 225] };

// secenek: { tur: 'eski' | 'yeni', oecdGoster, konuGoster } — belge görünümüyle aynı (utils/belgeKunye.js)
export const exportTesvikToPdf = async (tesvik, secenek = {}) => {
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
  // Müşteri: "pdfin en üstünde 'TEŞVİK BELGESİ — MÜŞTERİ GÖRÜNÜMÜ Oluşturma:
  // ...' yazıyor, bunu çok küçük şekilde en sağ alta vs alabilir miyiz."
  // Başlık ve oluşturma damgası sayfa sonuna taşındı (aşağıdaki dipnot);
  // kapak artık doğrudan yatırımcı bilgileriyle başlıyor.
  y += 4;

  const fb = tesvik.firmaBilgileri || {};
  const yb = tesvik.yatirimBilgileri || {};

  // ── 1-3. Künye ─────────────────────────────────────────────────────────
  // Müşteri (01.10.2026): "PDF Müşteri görünümü çıktısını da bütün bilgiler görünecek şekilde
  // düzenleyelim." Alanlar belge görünümüyle aynı tanımdan (E-TUYS künyesi birebir); boş olan
  // satır da yazılır — önceki sürüm boş alanları atlıyordu, "cazibe merkezi görünmüyor" buydu.
  const kunyeT = kunyeBolumleri(tesvik, secenek);
  const cift = (liste) => liste.map((r) => [r.etiket, r.deger]);

  bolum('1. Yatırımcı ile ilgili bilgiler'); y += 6;
  bilgiTablosu([
    ...cift(kunyeT.yatirimci),
    // E-TUYS künyesinde yok ama firmaya giden çıktıda isteniyordu
    doluysa('Vergi Dairesi', fb.vergiDairesi || tesvik.firma?.vergiDairesi),
    doluysa('Vergi No', fb.vergiNo || tesvik.firma?.vergiNo)
  ]);

  bolum('2. Yatırım ile ilgili bilgiler'); y += 6;
  bilgiTablosu(cift(kunyeT.yatirim));

  bolum('3. Belge ile ilgili bilgiler'); y += 6;
  bilgiTablosu(cift(kunyeT.belge));

  // ── 4. Yatırım Cinsi (E-TUYS'te ayrı sekme) ─────────────────────────────
  const cinsler = [yb.sCinsi1, yb.tCinsi2, yb.uCinsi3, yb.vCinsi4].filter(Boolean);
  if (!cinsler.length && yb.yatirimCinsi) cinsler.push(yb.yatirimCinsi);
  bolum('4. Yatırım Cinsi'); y += 6;
  if (cinsler.length) {
    bilgiTablosu(cinsler.map((c, i) => [`Yatırım Cinsi ${i + 1}`, etiketNormalle(c)]));
  } else {
    bosSatir('Yatırım cinsi tanımlanmamış.');
  }

  // ── 5. Ürünler ──────────────────────────────────────────────────────────
  // Tamamen boş satırlar atlanır: müşterinin ilk çıktısında "-" dolu satırlar vardı
  const urunler = (tesvik.urunler || []).filter((u) => {
    const kod = u.u97Kodu || u.us97Kodu || u.naceKodu || u.kodu;
    const ad = u.urunAdi || u.cinsi || u.adi || u.urunCinsi;
    return kod || ad || u.mevcutKapasite || u.ilaveKapasite;
  });
  bolum('5. Ürün Bilgileri'); y += 6;
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

  // ── 6. Finansal ────────────────────────────────────────────────────────
  // Önceki sürüm yalnız 8 özet satır basıyordu (diğer harcamalar tek toplam, ithal $ hiç yok).
  // Artık belge görünümündeki bütün kalemler, E-TUYS grup sırasıyla.
  const finansalBicim = (r) => {
    if (r.tur === 'metin') return str(String(r.deger ?? '').trim());
    if (r.tur === 'usd') return usd(r.deger || 0);
    if (r.tur === 'adet') return num(r.deger || 0);
    return tl(r.deger || 0);
  };
  const finansalTablo = (gruplar) => {
    const govde = [];
    gruplar.forEach((g) => {
      govde.push([{ content: g.baslik, colSpan: 2, styles: { fontStyle: 'bold', fillColor: RENK.grupBaslik } }]);
      g.satirlar.forEach((r) => govde.push([
        r.etiket,
        { content: finansalBicim(r), styles: { halign: r.tur === 'metin' ? 'left' : 'right', fontStyle: r.hesap ? 'bold' : 'normal' } }
      ]));
    });
    bilgiTablosu(govde);
  };
  const { sol: finSol, sag: finSag } = finansalBolumleri(tesvik);
  bolum('6. Finansal Bilgiler'); y += 6;
  finansalTablo(finSol);
  finansalTablo(finSag);

  // ── 7. Özel şartlar ─────────────────────────────────────────────────────
  const sartlar = (tesvik.ozelSartlar || []).filter((sa) =>
    (sa?.koşulMetni || sa?.kisaltma || '').trim() || (sa?.aciklamaNotu || sa?.sart || sa?.metin || sa?.aciklama || '').trim());
  bolum('7. Özel Şartlar'); y += 6;
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

  // ── 8. Destek unsurları ─────────────────────────────────────────────────
  const destekler = (tesvik.destekUnsurlari || []).filter((d) =>
    (d.destekUnsuru || d.adi || d.destekAdi || '').trim());
  bolum('8. Destek Unsurları'); y += 6;
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
      ['Sıra', 'Makine ID', 'Adı ve Özelliği', 'Miktar', 'Birim', 'Birim Fiyatı (TL)', 'Toplam (TL)', 'KDV İstisnası', 'Finansal Kiralama', 'Onay Tarihi'],
      yerli.map((m) => [
        str(m.siraNo), str(m.makineId), str(m.adiVeOzelligi),
        num(m.miktar), birimEtiketi(m.birim, m.birimAciklamasi) || '-',
        tl(m.birimFiyatiTl), tl(m.toplamTutariTl || m.toplamTl), str(m.kdvIstisnasi),
        finansalKiralamaEtiketi(m.finansalKiralamaMi),
        onayTarihi(m)
      ]),
      { columnStyles: { 2: { cellWidth: 200 } } }
    );
  }

  const ithal = tesvik.makineListeleri?.ithal || [];
  if (ithal.length) {
    doc.addPage('a4', 'landscape');
    y = 44;
    baslik(`İTHAL MAKİNE LİSTESİ${tesvik.belgeNo ? ` — Belge No: ${tesvik.belgeNo}` : ''}`, 14);
    tablo(
      ['Sıra', 'GTİP', 'Adı ve Özelliği', 'Miktar', 'Birim', 'Birim Fiyatı', 'Döviz', 'Toplam ($)', 'Toplam (TL)', 'Kullanılmış', 'Gümrük İstisnası', 'KDV İstisnası', 'Finansal Kiralama', 'Onay Tarihi'],
      ithal.map((m) => [
        str(m.siraNo), str(m.gtipKodu), str(m.adiVeOzelligi), num(m.miktar),
        birimEtiketi(m.birim, m.birimAciklamasi) || '-', num(m.birimFiyatiFob), str(m.gumrukDovizKodu),
        usd(m.toplamTutarFobUsd || m.toplamUsd), tl(m.toplamTutarFobTl || m.toplamTl),
        kullanilmisEtiketi(m.kullanilmisMakine, m.kullanilmisMakineAciklama),
        evetHayir(m.gumrukVergisiMuafiyeti), evetHayir(m.kdvMuafiyeti),
        finansalKiralamaEtiketi(m.finansalKiralamaMi),
        onayTarihi(m)
      ]),
      { columnStyles: { 2: { cellWidth: 165 } }, styles: { font: 'Roboto', fontSize: 6.5, cellPadding: 2.5, overflow: 'linebreak' } }
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

  // Müşteri: dosya "İSMİ-BELGE NO-SON REVİZE TARİHİ" olarak insin.
  // Eskiden `tesvik.belgeNo` okunuyordu ama o alan ÜRETİMDE HİÇ YOK (865/865
  // undefined); belge no belgeYonetimi.belgeNo'da. Değer bulunamayınca gmId'ye
  // düşüyor ve dosya "Tesvik_MusteriGorunumu_A001014.pdf" oluyordu.
  // ── Dipnot: başlık + oluşturma damgası, her sayfanın en sağ altında küçük ──
  const sayfaSayisi = doc.internal.getNumberOfPages();
  const damga = `TEŞVİK BELGESİ — MÜŞTERİ GÖRÜNÜMÜ · Oluşturma: ${new Date().toLocaleString('tr-TR')}`;
  for (let i = 1; i <= sayfaSayisi; i += 1) {
    doc.setPage(i);
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150);
    doc.text(damga, sayfaGenisligi - 28, doc.internal.pageSize.getHeight() - 14, { align: 'right' });
    doc.setTextColor(0);
  }

  doc.save(`${disaAktarimAdi(tesvik)}.pdf`);
};

export default exportTesvikToPdf;
