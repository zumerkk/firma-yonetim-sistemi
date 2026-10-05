// ↕️ Belge Takip listesi — sunucu tarafı sıralama
//
// Müşteri (05.10.2026): "Belge takip sütunlarına Fatura Durumunu da ekleyebilir miyiz sıralayabilelim
// yine durumuna göre." Liste sayfalı (varsayılan 50; canlıda ana liste ~125, arşiv ~160 talep) ve
// DataGrid sıralaması tarayıcıda yalnız EKRANDAKİ sayfayı diziyordu — "durumuna göre sırala" diğer
// sayfalardaki talepleri hiç öne getirmiyordu. Sıralama artık süzülmüş kümenin tamamında yapılıyor.
//
// Neden Mongo .sort() değil: firma adları Türkçe alfabeyle dizilmeli (Mongo ikili sırada Ç/Ş/İ'yi
// Z'nin arkasına atar), kişi sütunları kişinin ADINA göre (kayıtta yalnız kimlik var), "Sonuçlanma"
// sütunu iki kaynaktan geliyor ve boş değerler (284 talepte fatura durumu boş) her iki yönde de en
// sonda kalmalı. Süzülmüş küme küçük (birkaç yüz kayıt) olduğundan yalnız gereken alanlar okunup
// burada dizilir; sayfadaki kayıtlar sonra tam haliyle çekilir. Bu dosyada DB/HTTP yok.

const tarih = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? null : t;
};
const metin = (v) => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' ? null : s;
};
const sira = (liste) => (v) => {
  const i = liste.indexOf(v);
  return i === -1 ? null : i;
};

const ANA_ASAMA_SIRASI = ['MURACAAT_ONCESI', 'KURUM_DEGERLENDIRME', 'MURACAAT_SONRASI', 'KURUM_EKSIK', 'KURUM_SONUCLANMA', 'TAMAMLANDI'];
const FATURA_DURUMU_SIRASI = ['kesildi', 'kesilmedi', 'avans'];

/**
 * Grid alanı → { secim: okunacak alanlar, deger: (talep, baglam) => karşılaştırılacak değer, tur }
 * tur: 'metin' (Türkçe alfabe, sayıları sayı gibi) · 'sayi' (tarih/sıra numarası)
 * Listede olmayan alanla sıralama isteği yok sayılır (varsayılan: en yeni talep üstte).
 */
const SIRALANABILIR = {
  firmaUnvan: { secim: 'firmaUnvan', tur: 'metin', deger: (t) => metin(t.firmaUnvan) },
  talepTuru: { secim: 'talepTuru', tur: 'metin', deger: (t) => metin(t.talepTuru) },
  anaAsama: { secim: 'anaAsama', tur: 'sayi', deger: (t) => sira(ANA_ASAMA_SIRASI)(t.anaAsama) },
  // Durum kodları iş akışı sırasında numaralı ("2.1.1_…", "2.3.6_…") — koda göre dizmek akış sırası
  durum: { secim: 'durum', tur: 'metin', deger: (t) => metin(t.durum) },
  ytbNo: { secim: 'ytbNo', tur: 'metin', deger: (t) => metin(t.ytbNo) },
  muraacatHazirlayan: {
    secim: 'muraacatOncesi.muraacatHazirlayanPersonel muraacatOncesi.muraacatHazirlayanAdi',
    tur: 'metin',
    deger: (t, b) => metin(b.kisiAdi(t.muraacatOncesi?.muraacatHazirlayanPersonel) || t.muraacatOncesi?.muraacatHazirlayanAdi)
  },
  takibiYapan: {
    secim: 'muraacatSonrasi.takibiYapanPersonel muraacatSonrasi.takibiYapanAdi',
    tur: 'metin',
    deger: (t, b) => metin(b.kisiAdi(t.muraacatSonrasi?.takibiYapanPersonel) || t.muraacatSonrasi?.takibiYapanAdi)
  },
  createdAt: { secim: 'createdAt', tur: 'sayi', deger: (t) => tarih(t.createdAt) },
  resmiMuracaatEksikSonGun: {
    secim: 'zamanlama.resmiMuracaatEksikSonGun', tur: 'sayi', deger: (t) => tarih(t.zamanlama?.resmiMuracaatEksikSonGun)
  },
  // Listede görünen değerle aynı: Sonuç Tarihi yoksa Sonuçlandı'ya alındığı gün (durum geçmişi)
  sonuclanmaTarihi: {
    secim: 'sonuclanmaTarihi durumGecmisi.yeniDurum durumGecmisi.tarih',
    tur: 'sayi',
    deger: (t, b) => tarih(t.sonuclanmaTarihi) ?? tarih(b.sonucaAlinmaTarihi(t))
  },
  faturaDurumu: { secim: 'odeme.faturaDurumu', tur: 'sayi', deger: (t) => sira(FATURA_DURUMU_SIRASI)(t.odeme?.faturaDurumu) }
};

/** "faturaDurumu:asc" → { alan, yon: 1 | -1 }; tanınmayan istek → null */
function siralamaCoz(ham) {
  const [alan, yonHam] = String(ham || '').split(':');
  if (!Object.prototype.hasOwnProperty.call(SIRALANABILIR, alan)) return null;
  return { alan, yon: yonHam === 'desc' ? -1 : 1 };
}

const harfSirasi = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });

/**
 * Talepleri seçilen sütuna göre dizer. Boş değerler hangi yönde olursa olsun en sonda; eşitlikte
 * en yeni talep üstte. Girdiyi değiştirmez.
 * @param baglam { kisiAdi(id) → ad, sonucaAlinmaTarihi(talep) → Date|null }
 */
function talepleriSirala(talepler, { alan, yon }, baglam = {}) {
  const tanim = SIRALANABILIR[alan];
  const b = { kisiAdi: () => '', sonucaAlinmaTarihi: () => null, ...baglam };
  const karsilastir = tanim.tur === 'metin' ? (x, y) => harfSirasi.compare(x, y) : (x, y) => x - y;
  return talepler
    .map((t) => ({ t, d: tanim.deger(t, b), yeni: tarih(t.createdAt) || 0 }))
    .sort((p, q) => {
      if (p.d === null && q.d !== null) return 1;
      if (q.d === null && p.d !== null) return -1;
      if (p.d !== null && q.d !== null) {
        const fark = karsilastir(p.d, q.d) * yon;
        if (fark !== 0) return fark;
      }
      return (q.yeni - p.yeni) || String(q.t._id).localeCompare(String(p.t._id));
    })
    .map((x) => x.t);
}

module.exports = { SIRALANABILIR, siralamaCoz, talepleriSirala };
