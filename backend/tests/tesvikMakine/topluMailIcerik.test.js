// 🧪 Toplu mail içeriği - birden fazla makineyi tek mailde birleştirme
//
// Müşteri: "toplu işlemi kullanma amacımız birden fazla kalem makinayı TEK
// mailde göndermek sadece makine id leri ve sıra numalarını alacağız."
//
// Eski davranış her makine için ayrı mail atıyordu; tedarikçi 10 kalemlik
// teslimat için 10 mail alıyordu.

const { makineListeleri, topluPlaceholderVerisi } = require('../../services/tesvikMakine/topluMailIcerik');

const mp = (siraNo, makineId) => ({ siraNo, makineId });

describe('makineListeleri', () => {
  // Müşterinin verdiği gerçek örnek: ST TURKUAZ
  test('müşterinin örneğindeki liste üretilir', () => {
    const secilen = [
      mp(913, '4743905'), mp(917, '4743906'), mp(1156, '4917338'), mp(1157, '4917337')
    ];
    const { makineIdListesi, siraNoListesi, adet } = makineListeleri(secilen);
    expect(makineIdListesi).toBe('4743905, 4743906, 4917338, 4917337');
    expect(siraNoListesi).toBe('913, 917, 1156, 1157');
    expect(adet).toBe(4);
  });

  // Müşterinin örneğindeki liste sıra numarası düzeninde ilerliyor
  test('sıra numarasına göre sıralanır', () => {
    const { siraNoListesi } = makineListeleri([mp(1160, 'C'), mp(913, 'A'), mp(1157, 'B')]);
    expect(siraNoListesi).toBe('913, 1157, 1160');
  });

  test('makine ID listesi de aynı sırayı izler', () => {
    const { makineIdListesi } = makineListeleri([mp(1160, 'C'), mp(913, 'A'), mp(1157, 'B')]);
    expect(makineIdListesi).toBe('A, B, C');
  });

  test('boş makine ID\'leri listeye girmez', () => {
    const { makineIdListesi } = makineListeleri([mp(1, 'A'), mp(2, ''), mp(3, '  '), mp(4, 'D')]);
    expect(makineIdListesi).toBe('A, D');
  });

  test('sıra numarası olmayan kalem listeyi bozmaz', () => {
    const { siraNoListesi } = makineListeleri([mp(0, 'A'), mp(5, 'B')]);
    expect(siraNoListesi).toBe('5');
  });

  test('boş girdi çökmez', () => {
    expect(makineListeleri([])).toEqual({ makineIdListesi: '', siraNoListesi: '', adet: 0 });
    expect(makineListeleri(undefined).adet).toBe(0);
  });

  test('tek makine de çalışır (toplu mod tekil gönderimi bozmasın)', () => {
    const { makineIdListesi, siraNoListesi } = makineListeleri([mp(913, '4743905')]);
    expect(makineIdListesi).toBe('4743905');
    expect(siraNoListesi).toBe('913');
  });
});

describe('topluPlaceholderVerisi', () => {
  const secilen = [mp(913, '4743905'), mp(917, '4743906')];

  // Mevcut şablonlar TEKİL {makineId} kullanıyor. Toplu modda üzerine listeyi
  // yazmazsak tedarikçiye yalnız ilk makinenin ID'si gider — sessiz ve tehlikeli.
  test('tekil makineId anahtarı listeyle değiştirilir', () => {
    const v = topluPlaceholderVerisi({ makineId: '4743905', siraNo: '913' }, secilen);
    expect(v.makineId).toBe('4743905, 4743906');
    expect(v.siraNo).toBe('913, 917');
  });

  test('yeni liste anahtarları da eklenir', () => {
    const v = topluPlaceholderVerisi({}, secilen);
    expect(v.makineIdListesi).toBe('4743905, 4743906');
    expect(v.siraNoListesi).toBe('913, 917');
    expect(v.makineAdedi).toBe('2');
  });

  test('diğer şablon alanları korunur', () => {
    const v = topluPlaceholderVerisi({ firmaAdi: 'ST TURKUAZ', belgeNo: '578589' }, secilen);
    expect(v.firmaAdi).toBe('ST TURKUAZ');
    expect(v.belgeNo).toBe('578589');
  });

  // Makine ID'si hiç yoksa tekil değeri silip boş bırakmak metni bozardı
  test('liste boşsa tekil değer korunur', () => {
    const v = topluPlaceholderVerisi({ makineId: 'TEKIL' }, [mp(1, '')]);
    expect(v.makineId).toBe('TEKIL');
  });
});
