// 🪪 BELGE KÜNYE BİLGİLERİ — E-TUYS "Belge Künye Bilgileri" ekranının birebir alan listesi
//
// Müşteri (01.10.2026): "Genel belge görünümünü bu şekilde 1-1 aynı bilgiler görünecek şekilde
// düzenleyebilir miyiz? Mesela destekleme sınıfı, cazibe merkezi vs görünmüyor. Aynı şekilde PDF
// Müşteri görünümü çıktısını da bütün bilgiler görünecek şekilde düzenleyelim."
//
// Belge görünümü (eski + yeni) ve müşteri PDF'i bu tek tanımı kullanır; ekran ile çıktı bir daha
// ayrışamaz. Sıra ve etiketler E-TUYS'ten (etuys/ ekran görüntüleri, ST TURKUAZ 578589) ve
// müşterinin gönderdiği DİSTİLE 578574 görüntüsünden alındı; formlar da aynı sırayı izliyor
// (bkz. etuys/README.md). E-TUYS'te olmayan iki alanımız (Kapanma / Ekspertiz Tarihi) formdaki
// yerinde, süre uzatımın hemen altında durur.
//
// Değer boşsa '-' yazılır ama satır HİÇBİR ZAMAN atlanmaz: "bütün bilgiler görünsün".

import { kararnameGoster } from './belgeGosterim';
import { destekSinifiGoster, etiketNormalle } from './disaAktarimAdi';
import { muracaatTalepTipi } from './muracaatTalepTipi';
import { oncelikliYatirimTuruEtiketi } from '../data/oncelikliYatirimData';

const bos = (v) => v === undefined || v === null || String(v).trim() === '';
const metin = (v) => (bos(v) ? '-' : String(v).trim());

export const tarihYaz = (v) => {
  if (bos(v)) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('tr-TR');
};

// Kayıtlarda 'evet' / 'hayir' / 'hayır' karışık; E-TUYS büyük harfle "EVET" / "HAYIR" yazar.
export const evetHayirYaz = (v) => {
  const s = String(v ?? '').trim().toLocaleUpperCase('tr-TR');
  if (s === 'EVET') return 'EVET';
  if (s === 'HAYIR' || s === 'HAYİR') return 'HAYIR';
  return bos(v) ? '-' : String(v).trim();
};

const sayiYaz = (v) => {
  if (bos(v)) return '0';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('tr-TR') : String(v);
};

// Sermaye türü: formun yazdığı değer; yoksa firma kaydındaki yabancı sermaye bayrağı.
const sermayeTuruYaz = (t) => {
  const kayitli = t?.kunyeBilgileri?.sermayeTuru;
  if (!bos(kayitli)) return etiketNormalle(kayitli);
  return t?.firma?.yabanciSermayeli ? 'Yabancı Sermayeli' : 'Tamamı Yerli Firma';
};

const adresYaz = (yb = {}) =>
  metin([yb.yatirimAdresi1, yb.yatirimAdresi2, yb.yatirimAdresi3]
    .map((a) => String(a ?? '').trim()).filter(Boolean).join(' '));

const mucbirYaz = (by = {}) => {
  const tarih = bos(by.mucbirUzumaTarihi) ? '' : tarihYaz(by.mucbirUzumaTarihi);
  const evet = by.mucbirUzatma === 'evet' || (!by.mucbirUzatma && !!tarih);
  if (!evet) return 'HAYIR';
  return tarih ? `EVET — ${tarih}` : 'EVET';
};

/**
 * @param {object} t Teşvik kaydı (eski veya yeni)
 * @param {object} secenek
 *   tur:        'eski' | 'yeni' — yatırım konusu etiketi ve mücbir uzatma satırı buna göre
 *   konuGoster: (kod) => metin   — yeni belgede NACE açıklaması (verilmezse ham kod)
 *   oecdGoster: (kod) => metin   — OECD kodu → açıklama (verilmezse ham değer)
 * @returns {{ yatirimci, yatirim, belge }} her biri [{ etiket, deger, uzun? }]
 */
export const kunyeBolumleri = (t = {}, secenek = {}) => {
  const { tur = 'eski', konuGoster, oecdGoster } = secenek;
  const yb = t.yatirimBilgileri || {};
  const by = t.belgeYonetimi || {};
  const kunye = t.kunyeBilgileri || {};
  const ist = t.istihdam || {};

  const konuHam = String(yb.yatirimKonusu ?? '').trim();
  const konu = bos(konuHam) ? '-' : (konuGoster ? konuGoster(konuHam) : konuHam);
  const oecd = bos(yb.oecdKategori) ? '-' : (oecdGoster ? oecdGoster(yb.oecdKategori) : metin(yb.oecdKategori));
  const oncelikliEvet = evetHayirYaz(by.oncelikliYatirim) === 'EVET';

  const yatirimci = [
    { etiket: 'Firma Adı', deger: metin(t.yatirimciUnvan || t.firmaBilgileri?.unvan || t.firma?.tamUnvan), uzun: true },
    { etiket: 'SGK Sicil No', deger: metin(kunye.sgkSicilNo) }
  ];

  const yatirim = [
    { etiket: 'Sermaye Türü', deger: sermayeTuruYaz(t) },
    { etiket: tur === 'yeni' ? 'Yatırımın Konusu(NACE)' : 'Yatırımın Konusu(US97)', deger: konu },
    { etiket: 'Kararname Tarih/Sayı', deger: metin(kararnameGoster(t)) },
    { etiket: 'İli', deger: metin(yb.yerinIl) },
    { etiket: 'İlçesi', deger: metin(yb.yerinIlce) },
    { etiket: 'Adres', deger: adresYaz(yb), uzun: true },
    { etiket: 'Osb Adı', deger: metin(yb.osbIseMudurluk) },
    { etiket: 'SB Adı', deger: metin(yb.serbsetBolge || yb.serbestBolge) },
    { etiket: 'İl Bazlı Bölgesi', deger: metin(yb.ilBazliBolge) },
    { etiket: 'İlçe Bazlı Bölgesi(01.01.2021 ve sonrası)', deger: metin(yb.ilceBazliBolge) },
    { etiket: 'Mevcut İstihdam', deger: sayiYaz(ist.mevcutKisi) },
    { etiket: 'İlave İstihdam', deger: sayiYaz(ist.ilaveKisi) }
  ];

  const belge = [
    { etiket: 'Belge Id', deger: metin(by.belgeId) },
    { etiket: 'Belge No', deger: metin(by.belgeNo || t.belgeNo) },
    { etiket: 'Belge Tarihi', deger: tarihYaz(by.belgeTarihi || kunye.kararTarihi) },
    { etiket: 'Müracaat Tarihi', deger: tarihYaz(by.belgeMuracaatTarihi || kunye.basvuruTarihi) },
    { etiket: 'Müracaat Sayısı', deger: metin(by.belgeMuracaatNo || kunye.dosyaNo) },
    { etiket: 'Belge Başlama Tarihi', deger: tarihYaz(by.belgeBaslamaTarihi) },
    { etiket: 'Belge Bitiş Tarihi', deger: tarihYaz(by.belgeBitisTarihi) },
    { etiket: 'Süre Uzatım Tarihi', deger: tarihYaz(by.uzatimTarihi) },
    ...(tur === 'yeni'
      ? [{ etiket: 'Mücbir Uzatma', deger: mucbirYaz(by) }]
      : [{ etiket: 'Mücbir Uzama Tarihi', deger: tarihYaz(by.mucbirUzumaTarihi) }]),
    { etiket: 'Kapanma Tarihi', deger: tarihYaz(by.kapanmaTarihi) },
    { etiket: 'Ekspertiz Tarihi', deger: tarihYaz(by.ekspertizTarihi) },
    { etiket: 'OECD (Orta-Yüksek)', deger: oecd },
    { etiket: 'Destekleme Sınıfı', deger: metin(destekSinifiGoster(yb.destekSinifi)) },
    { etiket: 'Öncelikli Yatırım', deger: evetHayirYaz(by.oncelikliYatirim) },
    // E-TUYS türü ayrı satırda göstermiyor ama "Evet" ise hangi tür olduğu bilgisi bizde var
    ...(oncelikliEvet
      ? [{ etiket: 'Öncelikli Yatırım Türü', deger: metin(oncelikliYatirimTuruEtiketi(by.oncelikliYatirimTuru)) }]
      : []),
    { etiket: 'Büyük Ölçekli', deger: evetHayirYaz(yb.buyukOlcekli) },
    { etiket: 'Cazibe Merkezi Mi', deger: evetHayirYaz(yb.cazibeMerkeziMi) },
    { etiket: 'Savunma Sanayi Projesi Mi', deger: evetHayirYaz(yb.savunmaSanayiProjesi) },
    { etiket: 'Ada', deger: metin(yb.ada) },
    { etiket: 'Parsel', deger: metin(yb.parsel) },
    { etiket: 'Belge Müracaat Talep Tipi', deger: metin(etiketNormalle(muracaatTalepTipi(t))) },
    { etiket: 'Enerji Üretim Kaynağı', deger: metin(etiketNormalle(yb.enerjiUretimKaynagi)) },
    { etiket: 'Cazibe Merkezi Mi? (2018/11201)', deger: evetHayirYaz(yb.cazibeMerkezi2018) },
    { etiket: 'Cazibe Merkezi Deprem Nedeni', deger: evetHayirYaz(yb.cazibeMerkeziDeprem) },
    { etiket: 'HAMLE Mİ?', deger: evetHayirYaz(yb.hamleMi) },
    { etiket: 'Vergi İndirimsiz Destek Talebi', deger: evetHayirYaz(yb.vergiIndirimsizDestek || yb.vergiIndirimsizDestekTalebi) }
  ];

  return { yatirimci, yatirim, belge };
};
