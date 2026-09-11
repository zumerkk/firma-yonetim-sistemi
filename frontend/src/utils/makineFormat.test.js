// 🧪 Kullanılmışlık kodu - içe aktarma davranışı
//
// Müşteri (11 Eylül 2026): "İçe aktarınca kullanılmış kısmı boş geliyor HAYIR gelsin."
//
// İçe aktarma, Excel'deki METNİ ("HAYIR", "KULLANILMIŞ KOMPLE") doğrudan
// `kullanilmisKod` alanına yazıyordu. Izgaradaki Select ise bakanlık KODU
// ('1'|'2'|'3') bekliyor — eşleşmeyen değerde MUI Select boş görünür. Yani Excel'de
// sütun dolu olsa bile ekranda boş çıkıyordu; sütun yoksa yazılan 'HAYIR' de kod
// değil etiket olduğu için yine boştu.

import { kullanilmisKoduNormalle, kullanilmisKoduIceAktar, kullanilmisMi } from './makineFormat';

describe('kullanilmisKoduIceAktar - içe aktarmada boş kalmamalı', () => {
  test('boş değer HAYIR koduna düşer', () => {
    expect(kullanilmisKoduIceAktar('')).toBe('2');
    expect(kullanilmisKoduIceAktar(undefined)).toBe('2');
    expect(kullanilmisKoduIceAktar(null)).toBe('2');
  });

  // Asıl kırılma: Excel "HAYIR" yazıyordu, ekrana ham metin gidiyordu
  test('Excel metni koda çevrilir', () => {
    expect(kullanilmisKoduIceAktar('HAYIR')).toBe('2');
    expect(kullanilmisKoduIceAktar('KULLANILMIŞ KOMPLE')).toBe('1');
    expect(kullanilmisKoduIceAktar('KULLANILMIŞ MÜNFERİT')).toBe('3');
  });

  test('zaten kod ise olduğu gibi kalır', () => {
    expect(kullanilmisKoduIceAktar('1')).toBe('1');
    expect(kullanilmisKoduIceAktar('2')).toBe('2');
    expect(kullanilmisKoduIceAktar('3')).toBe('3');
  });

  test('eski kısa kodlar da çözülür (KM/KK/H)', () => {
    expect(kullanilmisKoduIceAktar('KM')).toBe('3');
    expect(kullanilmisKoduIceAktar('KK')).toBe('1');
    expect(kullanilmisKoduIceAktar('H')).toBe('2');
  });

  test('tanınmayan değer sessizce HAYIR olur (ekran boş kalmasın)', () => {
    expect(kullanilmisKoduIceAktar('ne olduğu belirsiz')).toBe('2');
  });

  test('çıktı her zaman geçerli bir Select değeridir', () => {
    const girdiler = ['', 'HAYIR', 'KM', '3', 'saçma', null, 0, 'evet'];
    for (const g of girdiler) {
      expect(['1', '2', '3']).toContain(kullanilmisKoduIceAktar(g));
    }
  });
});

describe('kullanilmisKoduNormalle - KAYIT OKUMA yolu değişmemeli', () => {
  // İçe aktarma varsayılanı buraya sızarsa, veride gerçekten boş olan alanlar
  // sessizce "HAYIR" görünür ve veri çarpıtılmış olur.
  test('boş değer boş kalır', () => {
    expect(kullanilmisKoduNormalle('')).toBe('');
    expect(kullanilmisKoduNormalle(undefined)).toBe('');
  });

  test('tanınmayan değer boş kalır', () => {
    expect(kullanilmisKoduNormalle('zzz')).toBe('');
  });
});

describe('kullanilmisMi - HAYIR kullanılmış sayılmamalı', () => {
  test('HAYIR ve kodu (2) yeni makinedir', () => {
    expect(kullanilmisMi('2')).toBe(false);
    expect(kullanilmisMi('HAYIR')).toBe(false);
    expect(kullanilmisMi('')).toBe(false);
  });

  test('komple ve münferit kullanılmıştır', () => {
    expect(kullanilmisMi('1')).toBe(true);
    expect(kullanilmisMi('3')).toBe(true);
    expect(kullanilmisMi('KM')).toBe(true);
  });
});
