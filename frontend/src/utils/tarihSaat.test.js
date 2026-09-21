import { tarihSaatGirdisi, tarihSaatIso, tarihSaatYapistir } from './tarihSaat';

describe('tarihSaat', () => {
    test('girdi ↔ ISO gidiş-dönüş yerel saati korur', () => {
        const iso = tarihSaatIso('2026-09-09T09:29');
        expect(tarihSaatGirdisi(iso)).toBe('2026-09-09T09:29');
    });

    test('geçersiz değerler boş/null döner', () => {
        expect(tarihSaatGirdisi('')).toBe('');
        expect(tarihSaatGirdisi('olmaz')).toBe('');
        expect(tarihSaatIso('')).toBeNull();
        expect(tarihSaatIso('09.09.2026')).toBeNull();
    });

    // Müşteri tarihleri ETUYS/Excel'den "09.09.2026 09:29:05" biçiminde kopyalıyor
    test.each([
        ['09.09.2026 09:29:05', '2026-09-09T09:29'],
        ['9/9/2026 9:05', '2026-09-09T09:05'],
        ['2026-09-09 14:30', '2026-09-09T14:30'],
        ['2026-09-09T14:30', '2026-09-09T14:30']
    ])('"%s" yapıştırılınca %s', (metin, beklenen) => {
        expect(tarihSaatYapistir(metin)).toBe(beklenen);
    });

    test('saatsiz yapıştırmada mevcut saat korunur', () => {
        expect(tarihSaatYapistir('01.08.2026', '2026-09-09T09:29')).toBe('2026-08-01T09:29');
        expect(tarihSaatYapistir('01.08.2026')).toBe('2026-08-01T00:00');
    });

    test.each(['32.01.2026', '01.13.2026', '01.01.2026 25:00', 'dün', ''])('"%s" anlaşılmaz', (metin) => {
        expect(tarihSaatYapistir(metin)).toBeNull();
    });
});
