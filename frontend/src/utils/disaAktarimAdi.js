// 📄 DIŞA AKTARIM DOSYA ADI + ETİKET NORMALLEŞTİRME
//
// Müşteri (Yiğit, revize listesi):
//   "sistemden musteri excel ve pdf gorunum ındırırken firmanın adının ve belge
//    numarası yazması mumkun mu hatta mumkunse son revize tarihini de alabilir
//    mi — dosya şu anda Tesvik_musterigorunumu_a00123 adıyla iniyor
//    'İSMİ-BELGE NO-SON REVİZE TARİHİ' olarak iner mi"
//
// ⚠️ Neden hep "a00123" iniyordu: dosya adı `tesvik.belgeNo` okuyordu ama o alan
// ÜRETİMDEKİ 865 BELGENİN 865'İNDE UNDEFINED — belge no `belgeYonetimi.belgeNo`
// içinde duruyor. Değer bulunamayınca `gmId`ye (A001014) düşüyordu.
// Aynı hata Excel/DOCX dışa aktarımında da vardı (docxExcelExport.js).

// Dosya adında sorun çıkaran karakterler (yol ayıracı, Windows yasakları, tire)
const GUVENSIZ = /[\\/:*?"<>|-]/g;

/** Dosya adı parçasını güvenli hale getirir; Türkçe harfler KORUNUR. */
export const adParcasi = (deger, enFazla = 60) => {
  const s = String(deger ?? '')
    .replace(GUVENSIZ, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.slice(0, enFazla).trim();
};

/** Son revizyon tarihi → GG.AA.YYYY; yoksa '' döner. */
export const sonRevizeTarihi = (tesvik) => {
  const gecmis = tesvik?.revizyonGecmisi || tesvik?.revizyonlar || [];
  const son = Array.isArray(gecmis) && gecmis.length ? gecmis[gecmis.length - 1] : null;
  const ham = son?.revizyonTarihi || tesvik?.sonRevizeTarihi || tesvik?.updatedAt;
  if (!ham) return '';
  const d = new Date(ham);
  if (Number.isNaN(d.getTime())) return '';
  const iki = (n) => String(n).padStart(2, '0');
  return `${iki(d.getDate())}.${iki(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/**
 * "FİRMA-BELGENO-REVİZETARİHİ" biçiminde dosya adı üretir (uzantısız).
 * Eksik parçalar sessizce atlanır; hiçbiri yoksa gmId/_id'ye düşer.
 */
export const disaAktarimAdi = (tesvik, yedek = 'Tesvik') => {
  const firma = adParcasi(
    tesvik?.firmaBilgileri?.unvan || tesvik?.yatirimciUnvan || tesvik?.firma?.tamUnvan
  );
  // ⚠️ belgeYonetimi.belgeNo — üst düzey tesvik.belgeNo YOK (bkz. yukarıdaki not)
  const belge = adParcasi(tesvik?.belgeYonetimi?.belgeNo || tesvik?.belgeNo, 30);
  const tarih = sonRevizeTarihi(tesvik);

  const parcalar = [firma, belge, tarih].filter(Boolean);
  return parcalar.length ? parcalar.join('-') : adParcasi(tesvik?.gmId || tesvik?._id || yedek);
};

// ── Etiket normalleştirme ────────────────────────────────────────────────
// Müşteri: "pdf çıktısında bazı isimler 'BÖLGESEL_ALT_BÖLGE' olarak '_' ile
// görünüyor."
//
// Ölçüldü: destekSinifi'nda aynı kavramın DÖRT yazımı var —
//   "BÖLGESEL - ALT BÖLGE" 59 · "BOLGESEL_ALT_BOLGE" 8 · "BOLGESEL - ALT BOLGE" 4
// 14 kayıt kod biçiminde saklanmış. Veriye dokunmuyoruz; GÖRÜNTÜLEMEDE
// tekilleştiriyoruz (aynı yaklaşım: makineFormat.kullanilmisKoduNormalle).
const TURKCELESTIR = {
  BOLGESEL: 'BÖLGESEL',
  BOLGE: 'BÖLGE',
  ONCELIKLI: 'ÖNCELİKLİ',
  MUNFERIT: 'MÜNFERİT',
  KOMPLE: 'KOMPLE',
  STRATEJIK: 'STRATEJİK'
};

/**
 * "BOLGESEL_ALT_BOLGE" → "BÖLGESEL - ALT BÖLGE"
 *
 * ⚠️ Çıktı verideki KANONİK biçimle birebir aynı olmalı. İlk yazımda her
 * parçanın arasına " - " koyuyordum ve "BÖLGESEL - ALT - BÖLGE" çıkıyordu —
 * bu, 59 kayıttaki "BÖLGESEL - ALT BÖLGE" biçiminden farklı ÜÇÜNCÜ bir yazım
 * yaratıyordu. Amaç tekilleştirmekken çeşitlendirmek olurdu. Test yakaladı.
 *
 * Doğrusu: ilk parçadan sonra " - ", kalanlar boşlukla birleşir.
 */
export const etiketNormalle = (deger) => {
  const ham = String(deger ?? '').trim();
  if (!ham) return '';
  if (!ham.includes('_')) return ham;          // zaten okunur biçimde

  const parcalar = ham
    .split('_')
    .filter(Boolean)
    .map((p) => TURKCELESTIR[p.toLocaleUpperCase('tr')] || p);

  if (parcalar.length <= 1) return parcalar.join('');
  return `${parcalar[0]} - ${parcalar.slice(1).join(' ')}`;
};

export default disaAktarimAdi;
