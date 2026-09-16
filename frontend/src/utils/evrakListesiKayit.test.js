// 🧪 İşlem & Evrak — "Mailde iste" otomatik kaydı
//
// Müşteri (15.09.2026): "mailde iste diyince otomatik kaydedebilir yavaşlatmayacaksa çok."
// Kayıt arka planda sürerken kullanıcı yazmaya devam edebilir; yanıt onun yazdığını ezmemeli.

import { anahtarla, listeyiAnahtarla, gonderilecekSatirlar, kayitSonucunuIsle } from './evrakListesiKayit';

describe('anahtarla', () => {
  test('kayıtlı satırın anahtarı _id olur', () => {
    expect(anahtarla({ _id: 'abc', ad: 'X' })._anahtar).toBe('abc');
  });

  test('yeni satırlar benzersiz anahtar alır', () => {
    const [a, b] = listeyiAnahtarla([{ ad: '' }, { ad: '' }]);
    expect(a._anahtar).not.toBe(b._anahtar);
  });

  test('anahtarı olan satır aynı nesne olarak kalır', () => {
    const satir = { _anahtar: 'k1', ad: 'X' };
    expect(anahtarla(satir)).toBe(satir);
  });

  test('liste değilse boş dizi', () => {
    expect(listeyiAnahtarla(undefined)).toEqual([]);
  });
});

test('gonderilecekSatirlar: yerel anahtar ve adı boş satır sunucuya gitmez', () => {
  expect(gonderilecekSatirlar([
    { _anahtar: 'k', _id: '1', ad: 'Vergi levhası', zorunlu: false },
    { _anahtar: 'y', ad: '   ' }
  ])).toEqual([{ _id: '1', ad: 'Vergi levhası', zorunlu: false }]);
});

describe('kayitSonucunuIsle', () => {
  const a = { _anahtar: 'ka', _id: '1', ad: 'Vergi levhası', zorunlu: true };
  const b = { _anahtar: 'yeni-1', ad: 'İmza sirküleri', zorunlu: false };
  const bos = { _anahtar: 'yeni-2', ad: '' };
  const sunucu = [
    { _id: '1', ad: 'Vergi levhası', zorunlu: true, isteyenAdi: 'Ayşe' },
    { _id: '2', ad: 'İmza sirküleri', zorunlu: false, isteyenAdi: 'Ayşe' }
  ];

  test('değişmeyen satırlar sunucu halini alır, anahtar korunur (imleç kaybolmaz)', () => {
    const sonuc = kayitSonucunuIsle([a, b, bos], [a, b], sunucu);
    expect(sonuc[0]).toEqual({ ...sunucu[0], _anahtar: 'ka' });
    expect(sonuc[1]).toEqual({ ...sunucu[1], _anahtar: 'yeni-1' });
    expect(sonuc[2]).toBe(bos); // adı henüz yazılmamış satır kaybolmaz
  });

  test('istek sürerken yazılan satır ezilmez', () => {
    const bYazildi = { ...b, aciklama: 'aslı gibidir' };
    const sonuc = kayitSonucunuIsle([a, bYazildi], [a, b], sunucu);
    expect(sonuc[1]).toBe(bYazildi);
    expect(sonuc[0]._id).toBe('1');
  });

  test('istek sürerken silinen satır geri gelmez, taşınan satır doğru eşleşir', () => {
    expect(kayitSonucunuIsle([b], [a, b], sunucu)).toEqual([{ ...sunucu[1], _anahtar: 'yeni-1' }]);
    expect(kayitSonucunuIsle([b, a], [a, b], sunucu).map((s) => s._id)).toEqual(['2', '1']);
  });

  test('elle kayıtta gönderilen liste kendisiyle işlenince adı boş satırlar düşer', () => {
    expect(kayitSonucunuIsle([a, b], [a, b], sunucu).map((s) => s._anahtar)).toEqual(['ka', 'yeni-1']);
  });
});
