// 🧪 DIŞA AKTARIM DOSYA ADI + ETİKET
//
// Müşteri (Yiğit, revize listesi):
//   "dosya şu anda Tesvik_musterigorunumu_a00123 adıyla iniyor —
//    'İSMİ-BELGE NO-SON REVİZE TARİHİ' olarak iner mi"
//   "pdf çıktısında bazı isimler 'BÖLGESEL_ALT_BÖLGE' olarak '_' ile görünüyor"
//
// Neden hep gmId iniyordu: dosya adı `tesvik.belgeNo` okuyordu ama o alan
// ÜRETİMDEKİ 865 BELGENİN 865'İNDE UNDEFINED. Gerçek yer: belgeYonetimi.belgeNo.

import { disaAktarimAdi, adParcasi, sonRevizeTarihi, etiketNormalle } from './disaAktarimAdi';

// Üretimdeki gerçek belgenin sadeleştirilmiş hali (578589 / ST TURKUAZ)
const GERCEK = {
  gmId: 'A001014',
  yatirimciUnvan: 'ST TURKUAZ TURİZM YATIRIMLARI ANONİM ŞİRKETİ',
  belgeYonetimi: { belgeNo: '578589' },
  revizyonGecmisi: [
    { revizyonNo: 1, revizyonTarihi: '2026-08-11T09:43:00.000Z' },
    { revizyonNo: 2, revizyonTarihi: '2026-09-01T12:58:04.000Z' }
  ]
};

describe('disaAktarimAdi', () => {
  test('FİRMA-BELGENO-REVİZETARİHİ üretir — ASIL DÜZELTME', () => {
    expect(disaAktarimAdi(GERCEK)).toBe('ST TURKUAZ TURİZM YATIRIMLARI ANONİM ŞİRKETİ-578589-01.09.2026');
  });

  test('belge no üst düzeyde OLMASA da bulunur (belgeYonetimi.belgeNo)', () => {
    expect(GERCEK.belgeNo).toBeUndefined();          // üretimdeki durum
    expect(disaAktarimAdi(GERCEK)).toContain('578589');
  });

  test('gmId artık dosya adına GİRMEZ — eski davranış buydu', () => {
    expect(disaAktarimAdi(GERCEK)).not.toContain('A001014');
  });

  test('SON revizyon tarihi alınır, ilki değil', () => {
    expect(disaAktarimAdi(GERCEK)).toContain('01.09.2026');
    expect(disaAktarimAdi(GERCEK)).not.toContain('11.08.2026');
  });

  test('revizyon yoksa updatedAt kullanılır', () => {
    const t = { yatirimciUnvan: 'X', belgeYonetimi: { belgeNo: '1' }, updatedAt: '2026-03-05T00:00:00.000Z' };
    expect(disaAktarimAdi(t)).toBe('X-1-05.03.2026');
  });

  test('eksik parçalar sessizce atlanır', () => {
    expect(disaAktarimAdi({ yatirimciUnvan: 'ABC', belgeYonetimi: { belgeNo: '9' } })).toBe('ABC-9');
    expect(disaAktarimAdi({ belgeYonetimi: { belgeNo: '9' } })).toBe('9');
  });

  test('hiçbir parça yoksa gmId/_id yedeğine düşer', () => {
    expect(disaAktarimAdi({ gmId: 'A000001' })).toBe('A000001');
  });
});

describe('sonRevizeTarihi', () => {
  test('revizyon geçmişinin SONUNCUSUNU alır', () => {
    expect(sonRevizeTarihi(GERCEK)).toBe('01.09.2026');
  });

  test('geçmiş yoksa updatedAt kullanılır', () => {
    expect(sonRevizeTarihi({ updatedAt: '2026-01-02T00:00:00.000Z' })).toBe('02.01.2026');
  });

  test('hiç tarih yoksa boş döner — dosya adında boşluk bırakmaz', () => {
    expect(sonRevizeTarihi({})).toBe('');
    expect(sonRevizeTarihi(null)).toBe('');
  });

  test('geçersiz tarih boş döner — "Invalid Date" dosya adına sızmaz', () => {
    expect(sonRevizeTarihi({ updatedAt: 'saçma' })).toBe('');
  });

  test('gün ve ay iki haneli — 05.03.2026 gibi', () => {
    expect(sonRevizeTarihi({ updatedAt: '2026-03-05T00:00:00.000Z' })).toBe('05.03.2026');
  });
});

describe('adParcasi — dosya adı güvenliği', () => {
  test('yol ayıracı ve Windows yasaklıları temizlenir', () => {
    expect(adParcasi('A/B\\C:D*E?F"G<H>I|J')).not.toMatch(/[\\/:*?"<>|]/);
  });

  test('Türkçe harfler KORUNUR — okunabilirlik için', () => {
    expect(adParcasi('ÇĞİÖŞÜ çğıöşü')).toBe('ÇĞİÖŞÜ çğıöşü');
  });

  test('tire ayıraçla çakışmasın diye temizlenir', () => {
    expect(adParcasi('A-B-C')).toBe('A B C');
  });

  test('uzun ad kırpılır', () => {
    expect(adParcasi('x'.repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe('etiketNormalle — alt çizgili enum değerleri', () => {
  test.each([
    // Beklenen çıktı, verideki KANONİK yazımla birebir aynı olmalı:
    // "BÖLGESEL - ALT BÖLGE" 59 kayıt · "BÖLGESEL - ÖNCELİKLİ YATIRIM" 78 kayıt
    ['BOLGESEL_ALT_BOLGE', 'BÖLGESEL - ALT BÖLGE'],
    ['BOLGESEL_ONCELIKLI_YATIRIM', 'BÖLGESEL - ÖNCELİKLİ YATIRIM']
  ])('%s → %s', (girdi, beklenen) => {
    expect(etiketNormalle(girdi)).toBe(beklenen);
  });

  test('alt çizgi yoksa değer AYNEN kalır — çoğunluk zaten okunur', () => {
    for (const v of ['BÖLGESEL', 'GENEL', 'BÖLGESEL - ÖNCELİKLİ YATIRIM', 'BÖLGESEL - ALT BÖLGE']) {
      expect(etiketNormalle(v)).toBe(v);
    }
  });

  test('boş değer boş döner', () => {
    expect(etiketNormalle('')).toBe('');
    expect(etiketNormalle(null)).toBe('');
    expect(etiketNormalle(undefined)).toBe('');
  });

  test('çıktı, verideki kanonik yazımla ÇAKIŞIR — yeni bir biçim yaratmaz', () => {
    // 8 kayıt kod biçiminde, 59 kayıt kanonik. Amaç ikisini AYNI göstermek.
    expect(etiketNormalle('BOLGESEL_ALT_BOLGE')).toBe(etiketNormalle('BÖLGESEL - ALT BÖLGE'));
  });

  test('çıktıda alt çizgi KALMAZ', () => {
    for (const v of ['BOLGESEL_ALT_BOLGE', 'BOLGESEL_ONCELIKLI_YATIRIM', 'A_B_C']) {
      expect(etiketNormalle(v)).not.toContain('_');
    }
  });
});

// 📄 PDF/Excel çıktısında alt çizgili enum değerleri
//
// Müşteri (11 Eylül 2026): "Birde pdf çıktısında bazı isimler
// 'BÖLGESEL_ALT_BÖLGE' olarak '_' ile görünüyor."
//
// etiketNormalle önce yalnızca Destek Sınıfı'na uygulanıyordu; Yatırım Cinsi ve
// yeni eklenen OECD Kategorisi ham değeri basıyordu. Yardımcı alan adından
// bağımsız çalıştığı için hepsine uygulanabiliyor — aşağıdakiler o kapsamı
// sabitliyor.
describe('etiketNormalle - çıktıdaki diğer enum alanları', () => {
  test('OECD kategorisi alt çizgisiz basılır', () => {
    expect(etiketNormalle('ORTA_YUKSEK')).not.toContain('_');
  });

  test('yatırım cinsi alt çizgisiz basılır', () => {
    expect(etiketNormalle('KOMPLE_YENI_YATIRIM')).not.toContain('_');
  });

  test('zaten okunur değerler değiştirilmez', () => {
    expect(etiketNormalle('BÖLGESEL - ALT BÖLGE')).toBe('BÖLGESEL - ALT BÖLGE');
    expect(etiketNormalle('Komple Yeni Yatırım')).toBe('Komple Yeni Yatırım');
  });

  test('boş değer boş kalır (çıktıda "undefined" yazmasın)', () => {
    expect(etiketNormalle(undefined)).toBe('');
    expect(etiketNormalle(null)).toBe('');
  });
});
