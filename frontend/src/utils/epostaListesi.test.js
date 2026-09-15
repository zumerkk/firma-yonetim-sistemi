// 🧪 Firma maili alıcı kutusu — kayıtlı adres çipleri
//
// Müşteri (15.09.2026): "Sonrasında bizim yazdığımız mailleri kaydedebilir her seferinde tekrardan
// mail girmek yerine."

import { adresleriAyir, adresEkle, eklenebilirOneriler } from './epostaListesi';

describe('adresEkle', () => {
    test('boş kutuya ekler', () => {
        expect(adresEkle('', 'a@b.com')).toBe('a@b.com');
    });

    test('yazılan metni değiştirmeden sonuna virgülle ekler', () => {
        expect(adresEkle('Ali@Firma.com', 'b@c.com')).toBe('Ali@Firma.com, b@c.com');
    });

    test('sondaki virgül / noktalı virgül çiftlenmez', () => {
        expect(adresEkle('a@b.com, ', 'c@d.com')).toBe('a@b.com, c@d.com');
        expect(adresEkle('a@b.com;', 'c@d.com')).toBe('a@b.com, c@d.com');
    });

    test('adres zaten varsa (büyük/küçük harf fark etmez) tekrar eklenmez', () => {
        expect(adresEkle('A@B.com; x@y.com', 'a@b.com')).toBe('A@B.com; x@y.com');
    });
});

describe('eklenebilirOneriler', () => {
    const oneriler = [
        { adres: 'a@b.com', etiket: 'Ayşe Yılmaz' },
        { adres: 'c@d.com', etiket: 'Firma e-postası' }
    ];

    test('alıcı ya da CC kutusunda olan öneri gizlenir', () => {
        expect(eklenebilirOneriler(oneriler, 'A@b.com', '')).toEqual([oneriler[1]]);
        expect(eklenebilirOneriler(oneriler, '', 'c@d.com')).toEqual([oneriler[0]]);
        expect(eklenebilirOneriler(oneriler, 'a@b.com', 'c@d.com')).toEqual([]);
    });

    test('öneri listesi yoksa boş dizi', () => {
        expect(eklenebilirOneriler(undefined, 'x@y.com')).toEqual([]);
    });
});

test('adresleriAyir boşlukları ve boş parçaları atar', () => {
    expect(adresleriAyir(' A@b.com ;c@d.com,, ')).toEqual(['a@b.com', 'c@d.com']);
});
