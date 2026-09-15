// 🧪 Cari defter tablosu — tutar doğru sütuna düşüyor mu
//
// Müşteri: "gelen(banka tutar)-gideni(ödenen tutar)". Gelen bir ödemenin "Giden"
// sütununda görünmesi bakiyeyi ters okutur; sütun yerleşimi burada korunuyor.

import { render, screen, within, fireEvent } from '@testing-library/react';
import CariDefterTablosu from './CariDefterTablosu';

const hareketler = [
    { _id: '1', tur: 'odenen', belgeAdi: 'Belge harcı', tarih: '2026-09-01T00:00:00.000Z', tutar: 2500, bakiye: 2500 },
    { _id: '2', tur: 'gelen', banka: 'Ziraat', tarih: '2026-09-10T00:00:00.000Z', tutar: 10000, bakiye: -7500 }
];
const ozet = { toplamFatura: 0, toplamOdenen: 2500, toplamGelen: 10000, bakiye: -7500, fark: 7500, adet: 2 };

const satir = (metin) => screen.getByText(metin).closest('tr');
const hucreler = (tr) => within(tr).getAllByRole('cell').map((c) => c.textContent);

describe('CariDefterTablosu', () => {
    test('talep görünümü: gelen "Gelen", ödenen "Giden" sütununda, fark altta', () => {
        render(<CariDefterTablosu hareketler={hareketler} ozet={ozet} gorunum="talep" />);

        const odenen = hucreler(satir('Belge harcı'));
        expect(odenen[0]).toBe('01.09.2026');
        expect(odenen[3]).toBe('');
        expect(odenen[4]).toBe('2.500,00 ₺');

        const gelen = hucreler(satir('Ziraat'));
        expect(gelen[3]).toBe('10.000,00 ₺');
        expect(gelen[4]).toBe('');

        expect(hucreler(satir('Fark (Gelen − Giden)'))[1]).toBe('7.500,00 ₺');
    });

    test('firma görünümü: borç/alacak, satır bakiyesi, talep ve not', () => {
        const h = [{
            _id: '3', tur: 'fatura', faturaNo: 'GM-15', tarih: '2026-01-12T00:00:00.000Z', tutar: 24000, bakiye: 24000,
            dosyaTakip: { takipId: 'DT2026999', talepTuru: 'Belge Başvuru Talebi' }, aciklama: '24.000 fatura iptal'
        }];
        render(
            <CariDefterTablosu
                hareketler={h}
                ozet={{ toplamFatura: 24000, toplamOdenen: 0, toplamGelen: 0, bakiye: 24000, fark: 0 }}
                gorunum="firma"
            />
        );
        const c = hucreler(satir('Fatura No: GM-15'));
        expect(c[3]).toBe('DT2026999 · Belge Başvuru Talebi');
        expect(c[4]).toBe('24.000,00 ₺'); // Borç
        expect(c[5]).toBe('');            // Alacak
        expect(c[6]).toBe('24.000,00 ₺'); // Bakiye
        expect(c[7]).toBe('24.000 fatura iptal');
    });

    test('boş defterde yönlendirici mesaj', () => {
        render(<CariDefterTablosu hareketler={[]} gorunum="talep" />);
        expect(screen.getByText(/Henüz hareket yok/)).toBeInTheDocument();
    });

    test('belgesi olan satırda indir düğmesi doğru hareketle çağırır', () => {
        const onDosya = jest.fn();
        const h = [{ ...hareketler[0], dosya: { dosyaAdi: 'dekont.pdf' } }];
        render(<CariDefterTablosu hareketler={h} ozet={ozet} gorunum="talep" onDosya={onDosya} />);
        fireEvent.click(screen.getByRole('button', { name: 'Belgeyi indir' }));
        expect(onDosya).toHaveBeenCalledWith(h[0], true);
        // belgesi olmayan satırda düğme yok
        expect(screen.getAllByRole('button', { name: 'Belgeyi aç' })).toHaveLength(1);
    });
});
