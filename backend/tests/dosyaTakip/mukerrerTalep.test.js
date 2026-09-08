// 🧪 MÜKERRER AÇIK TALEP KONTROLÜ
// DB'siz: model statiğinin ürettiği sorgu doğrulanır (this.findOne yakalanır).
//
// Müşteri (Yiğit, revize listesi): "Belge Takipde aynı talep ve aynı belge
// no'su olan işlemden 1 tane açabilelim, halihazırda açık olan talebi unutup
// yeni sıfırdan açabiliyoruz bazen."
//
// Ölçüldü (8 Eylül 2026, üretim): 241 talebin 19 grubu mükerrer → 20 gereksiz
// açık talep (%8,3). Örnek: A001014 / "Yerli Makine Revize Talebi" / belge
// 578589 için DT20260031 ve DT20260161 aynı anda açık.
//
// ⚠️ SERT KİLİT DEĞİL: ölçümde bazı çiftler farklı aşamalardaydı
// (MURACAAT_ONCESI ↔ KURUM_SONUCLANMA), yani meşru ikinci talep olabiliyor.
// Kural "uyar ve mevcudu göster"; kullanıcı bilerek devam edebiliyor.

const mongoose = require('mongoose');
const DosyaTakip = require('../../models/DosyaTakip');

const yakala = (girdi) => {
  let sorgu = null;
  const sahte = {
    findOne(q) {
      sorgu = q;
      return { select: () => ({ sort: () => ({ lean: () => null }) }) };
    }
  };
  const sonuc = DosyaTakip.acikMukerrerBul.call(sahte, girdi);
  return { sorgu, sonuc };
};

const FIRMA = new mongoose.Types.ObjectId();

describe('acikMukerrerBul — sorgu sözleşmesi', () => {
  test('firma + talepTürü + belgeNo ile arar', () => {
    const { sorgu } = yakala({ firma: FIRMA, talepTuru: 'Süre Revize Talebi', ytbNo: '578589' });
    expect(sorgu.firma).toBe(FIRMA);
    expect(sorgu.talepTuru).toBe('Süre Revize Talebi');
    expect(sorgu.$or).toEqual([{ ytbNo: '578589' }, { belgeId: '578589' }]);
  });

  test('YALNIZ açık talepler — TAMAMLANDI hariç', () => {
    const { sorgu } = yakala({ firma: FIRMA, talepTuru: 'X', ytbNo: '1' });
    expect(sorgu.anaAsama).toEqual({ $ne: 'TAMAMLANDI' });
  });

  test('belgeId de belge no olarak kabul edilir', () => {
    const { sorgu } = yakala({ firma: FIRMA, talepTuru: 'X', belgeId: '999' });
    expect(sorgu.$or).toEqual([{ ytbNo: '999' }, { belgeId: '999' }]);
  });

  test('belge no BOŞSA kural uygulanmaz — null döner, sorgu yok', () => {
    // Üretimde 28 açık talebin belge no'su yok; onlarda mükerrer tanımlanamaz.
    for (const girdi of [
      { firma: FIRMA, talepTuru: 'X' },
      { firma: FIRMA, talepTuru: 'X', ytbNo: '   ' },
      { firma: FIRMA, talepTuru: 'X', ytbNo: '', belgeId: '' }
    ]) {
      const { sorgu, sonuc } = yakala(girdi);
      expect(sonuc).toBeNull();
      expect(sorgu).toBeNull();
    }
  });

  test('firma veya talepTürü eksikse kural uygulanmaz', () => {
    expect(yakala({ talepTuru: 'X', ytbNo: '1' }).sonuc).toBeNull();
    expect(yakala({ firma: FIRMA, ytbNo: '1' }).sonuc).toBeNull();
  });

  test('güncellemede kayıt kendini mükerrer saymaz', () => {
    const kendi = new mongoose.Types.ObjectId();
    const { sorgu } = yakala({ firma: FIRMA, talepTuru: 'X', ytbNo: '1', haricId: kendi });
    expect(sorgu._id).toEqual({ $ne: kendi });
  });

  test('haricId yoksa _id kısıtı da yok', () => {
    const { sorgu } = yakala({ firma: FIRMA, talepTuru: 'X', ytbNo: '1' });
    expect(sorgu._id).toBeUndefined();
  });

  test('belge no baştaki/sondaki boşluktan arındırılır', () => {
    const { sorgu } = yakala({ firma: FIRMA, talepTuru: 'X', ytbNo: '  578589  ' });
    expect(sorgu.$or).toEqual([{ ytbNo: '578589' }, { belgeId: '578589' }]);
  });
});
