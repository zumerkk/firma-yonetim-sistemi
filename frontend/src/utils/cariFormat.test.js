// 🧪 Cari hesap — arayüz yardımcıları
//
// tutarCoz örnekleri backend/tests/cari/cariHesap.test.js ile BİREBİR aynı:
// arayüzün kabul ettiğini sunucu reddederse kullanıcı kaydın neden olmadığını anlamaz.

import {
    BANKALAR, tutarCoz, tutarYaz, paraYaz, tarihYaz, isoGun,
    hareketBasligi, talepEtiketi, bakiyeRengi, farkRengi
} from './cariFormat';

describe('tutarCoz — sunucuyla aynı kural', () => {
    test.each([
        ['24000', 24000],
        ['24.000', 24000],
        ['24.000,50', 24000.5],
        ['1.234.567,89', 1234567.89],
        ['1,234.56', 1234.56],
        ['24,000', 24000],
        ['12,5', 12.5],
        ['12,50', 12.5],
        ['12.5', 12.5],
        ['1.500 TL', 1500],
        ['₺ 750,25', 750.25],
        [' 99 ', 99],
        [1250.456, 1250.46],
        [300, 300]
    ])('%p → %p', (girdi, beklenen) => {
        expect(tutarCoz(girdi)).toBe(beklenen);
    });

    test.each([
        [''], ['   '], [null], [undefined], ['abc'], ['1.23.4'], ['12,3,4'],
        ['1234.567'], ['12.34,56'], ['12,'], ['--5'], [NaN], [Infinity]
    ])('%p anlaşılamaz → null', (girdi) => {
        expect(tutarCoz(girdi)).toBeNull();
    });

    // Form tutarı alandan çıkınca biçimliyor; biçimlenmiş hali yine aynı sayıya dönmeli
    test.each([24000, 1500.25, 0.5, 1234567.89])('tutarYaz(%p) geri çözülünce aynı sayı', (n) => {
        expect(tutarCoz(tutarYaz(n))).toBe(n);
    });
});

describe('gösterim', () => {
    test('bankalar müşterinin saydığı sırayla', () => {
        expect(BANKALAR).toEqual(['Enpara', 'Garanti', 'Vakıf', 'Ziraat', 'Diğer']);
    });

    test('Türkçe para biçimi', () => {
        expect(tutarYaz(24000.5)).toBe('24.000,50');
        expect(paraYaz(1500)).toBe('1.500,00 ₺');
        expect(tutarYaz(undefined)).toBe('0,00');
    });

    test('UTC gece yarısı saklanan tarih gün kaymadan gösterilir', () => {
        expect(tarihYaz('2026-09-15T00:00:00.000Z')).toBe('15.09.2026');
        expect(tarihYaz(null)).toBe('—');
        expect(tarihYaz('bozuk')).toBe('—');
    });

    test('isoGun düzenleme formu için', () => {
        expect(isoGun('2026-09-15T00:00:00.000Z')).toBe('2026-09-15');
        expect(isoGun('bozuk')).toBe('');
        expect(isoGun(null)).toBe('');
    });

    test('hareket başlığı türe göre', () => {
        expect(hareketBasligi({ tur: 'gelen', banka: 'Ziraat' })).toBe('Ziraat');
        expect(hareketBasligi({ tur: 'odenen', belgeAdi: 'Belge harcı' })).toBe('Belge harcı');
        expect(hareketBasligi({ tur: 'fatura', faturaNo: 'GM-15' })).toBe('Fatura No: GM-15');
        expect(hareketBasligi({ tur: 'fatura' })).toBe('Fatura');
    });

    test('talep etiketi', () => {
        expect(talepEtiketi({ takipId: 'DT2026253', ytbNo: '568825', talepTuru: 'Revize Talebi' }))
            .toBe('DT2026253 · Belge 568825 · Revize Talebi');
        expect(talepEtiketi(null)).toBe('');
        expect(talepEtiketi('64f0c0ffee')).toBe(''); // populate edilmemiş kimlik
    });

    test('renkler: firma bakiyesi ve talep farkı ters yönlü', () => {
        expect(bakiyeRengi(100)).toBe('#dc2626'); // firmadan alacak
        expect(farkRengi(100)).toBe('#16a34a');   // gelen giden'den fazla
        expect(bakiyeRengi(0)).toBe(farkRengi(0));
    });
});
