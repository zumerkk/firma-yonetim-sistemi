// 🧪 BOZUK TUTAR ONARIMI — KARDEŞ ALAN BÜTÜNLÜĞÜ
// DB'siz çalışır: onarimPlani() saf bir fonksiyon, bellekteki kayıt üzerinde doğrulanır.
//
// Neden var — 3 Eylül 2026 üretim çalışmasında yaşanan gerçek regresyon:
//
// Onarım script'i "hiçbir kalem toplam sabit yatırımı aşamaz" tavanını ALAN ALAN
// uyguluyordu. TES20260106'da makine üçlüsünün iki üyesi tavanı aştığı için korundu:
//     yeniMakina        2.621.083,88   → ×1000 tavanı aşar → atlandı
//     toplamYeniMakina  2.691.475,42   → ×1000 tavanı aşar → atlandı
// ama üçüncüsü tavanın altında kaldığı için geçti:
//     kullanimisMakina     70.391,54   → 70.391.540 olarak YAZILDI
//
// Sonuç: onarımdan ÖNCE tutan bağıntı sonra kırıldı.
//     2.621.083,88 + 70.391,54 = 2.691.475,42   ✓ önce
//     2.621.083,88 + 70.391.540 ≠ 2.691.475,42  ✗ sonra
//
// Aynı imza 4 kayıtta çıktı (TES20260106 / 202 / 214 / 663) ve elle geri alındı.
// Ders: YARIM ONARIM, HİÇ ONARMAMAKTAN KÖTÜDÜR. Artık bir gruptan tek üye bile
// atlanıyorsa grubun tamamı atlanıyor.

const { onarimPlani } = require('../../../scripts/onar-bozuk-tutarlar');

// TES20260106'nın onarım ÖNCESİ gerçek değerleri (yedek dosyasından birebir)
const TES20260106 = () => ({
  toplamSabitYatirim: 107313.797,
  makinaTechizat: {
    ithalMakina: 101713.797,
    yerliMakina: 5600,              // zaten tam sayı — sağlam
    toplamMakina: 107313.797,
    yeniMakina: 2621083.88,         // tavanı aşar
    kullanimisMakina: 70391.54,     // tavanın ALTINDA — tuzak burası
    toplamYeniMakina: 2691475.42    // tavanı aşar
  },
  finansman: {
    yabanciKaynak: 48611.725,
    ozKaynak: 58702.072,
    toplamFinansman: 107313.79699999999
  }
});

const ONARILMIS_TOPLAM = 107313797;

const alanlari = (liste) => liste.map((d) => d.alan);

describe('onarimPlani — kardeş alan grupları', () => {
  test('tavanı aşan kardeşi olan alan onarılmaz', () => {
    const { degisiklikler } = onarimPlani(TES20260106(), ONARILMIS_TOPLAM);
    expect(alanlari(degisiklikler)).not.toContain('makinaTechizat.kullanimisMakina');
  });

  test('geri çekilen alan gerekçesiyle birlikte atlananlara düşer', () => {
    const { atlanan } = onarimPlani(TES20260106(), ONARILMIS_TOPLAM);
    const kayit = atlanan.find((a) => a.alan === 'makinaTechizat.kullanimisMakina');
    expect(kayit).toBeDefined();
    expect(kayit.sebep).toBe('kardeş alan atlandı');
  });

  test('yeni+kullanılmış=toplamYeni bağıntısı onarımdan sonra da tutar', () => {
    const mali = TES20260106();
    const { degisiklikler } = onarimPlani(mali, ONARILMIS_TOPLAM);
    // Planı uygula
    for (const d of degisiklikler) {
      const [ust, alt] = d.alan.split('.');
      if (alt) mali[ust][alt] = d.yeni; else mali[ust] = d.yeni;
    }
    const { yeniMakina: y, kullanimisMakina: k, toplamYeniMakina: ty } = mali.makinaTechizat;
    expect(y + k).toBeCloseTo(ty, 2);
  });

  test('temiz gruplar onarılmaya devam eder — kural fazla geniş davranmıyor', () => {
    const { degisiklikler } = onarimPlani(TES20260106(), ONARILMIS_TOPLAM);
    const adlar = alanlari(degisiklikler);
    expect(adlar).toEqual(expect.arrayContaining([
      'toplamSabitYatirim',
      'makinaTechizat.ithalMakina',
      'makinaTechizat.toplamMakina',
      'finansman.yabanciKaynak',
      'finansman.ozKaynak',
      'finansman.toplamFinansman'
    ]));
  });

  test('tam sayı kardeş grubu kirletmez — yerliMakina sağlamdı, ithal/toplam yine onarıldı', () => {
    const { degisiklikler, atlanan } = onarimPlani(TES20260106(), ONARILMIS_TOPLAM);
    expect(alanlari(degisiklikler)).toContain('makinaTechizat.ithalMakina');
    expect(alanlari(atlanan)).not.toContain('makinaTechizat.yerliMakina');
  });

  test('hiçbir kardeşi atlanmayan kayıtta grup bütünüyle onarılır', () => {
    const saglam = {
      toplamSabitYatirim: 11478.972,
      makinaTechizat: { ithalMakina: 7178.972, toplamMakina: 10978.972 },
      finansman: { yabanciKaynak: 11478.972, toplamFinansman: 11478.972 }
    };
    const { degisiklikler, atlanan } = onarimPlani(saglam, 11478972);
    expect(atlanan).toHaveLength(0);
    expect(degisiklikler).toHaveLength(5);
    expect(degisiklikler.find((d) => d.alan === 'makinaTechizat.toplamMakina').yeni).toBe(10978972);
  });
});
