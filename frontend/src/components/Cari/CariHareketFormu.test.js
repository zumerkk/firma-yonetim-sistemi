// 🧪 Cari hareket giriş formu
//
// Para girişi: yanlış anlaşılan tutarın KAYDEDİLMEDEN yakalandığını ve başarılı
// kayıttan sonra formun sıradaki girişe hazırlandığını sınıyoruz.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CariHareketFormu from './CariHareketFormu';

const ekleDugmesi = () => screen.getByRole('button', { name: 'Ekle' });

describe('CariHareketFormu', () => {
    test('boş gönderimde okunur hata verir, kaydetmez', async () => {
        const onKaydet = jest.fn();
        render(<CariHareketFormu tur="odenen" onKaydet={onKaydet} />);
        fireEvent.click(ekleDugmesi());
        expect(await screen.findByText('Ödemenin adını yazın')).toBeInTheDocument();
        expect(screen.getByText('Tutar girin')).toBeInTheDocument();
        expect(onKaydet).not.toHaveBeenCalled();
    });

    test('tutar alandan çıkınca Türkçe biçimlenir', () => {
        render(<CariHareketFormu tur="gelen" onKaydet={jest.fn()} />);
        const kutu = screen.getByLabelText('Tutar');
        fireEvent.change(kutu, { target: { value: '24000,5' } });
        fireEvent.blur(kutu);
        expect(kutu).toHaveValue('24.000,50');
    });

    // "1234.567" binlik mi ondalık mı belli değil — tahmin edip bin kat yanlış kaydetmemeli
    test('anlaşılamayan tutar kaydedilmez', async () => {
        const onKaydet = jest.fn();
        render(<CariHareketFormu tur="odenen" onKaydet={onKaydet} />);
        fireEvent.change(screen.getByLabelText('Hizmet ve Yatırım Ödemeleri'), { target: { value: 'Harç' } });
        fireEvent.change(screen.getByLabelText('Tutar'), { target: { value: '1234.567' } });
        fireEvent.click(ekleDugmesi());
        expect(await screen.findByText('Tutar anlaşılamadı (örn. 24.000,50)')).toBeInTheDocument();
        expect(onKaydet).not.toHaveBeenCalled();
    });

    test('geçerli kayıt sayı tutarla gönderilir, form sıradakine hazırlanır', async () => {
        const onKaydet = jest.fn().mockResolvedValue(true);
        render(<CariHareketFormu tur="odenen" onKaydet={onKaydet} />);
        fireEvent.change(screen.getByLabelText('Hizmet ve Yatırım Ödemeleri'), { target: { value: 'Belge harcı makbuzu' } });
        fireEvent.change(screen.getByLabelText('Tarih'), { target: { value: '2026-09-15' } });
        fireEvent.change(screen.getByLabelText('Tutar'), { target: { value: '1.500' } });
        fireEvent.click(ekleDugmesi());

        await waitFor(() => expect(onKaydet).toHaveBeenCalledWith(
            // Müşteri (21.09.2026): elle yazılan ad büyük harfe çevrilerek kaydedilir
            { tur: 'odenen', tarih: '2026-09-15', tutar: 1500, belgeAdi: 'BELGE HARCI MAKBUZU' },
            null
        ));
        await waitFor(() => expect(screen.getByLabelText('Hizmet ve Yatırım Ödemeleri')).toHaveValue(''));
        expect(screen.getByLabelText('Tutar')).toHaveValue('');
        // Aynı gün art arda giriş yapılabilsin diye tarih korunur
        expect(screen.getByLabelText('Tarih')).toHaveValue('2026-09-15');
    });

    test('kayıt başarısızsa girilenler silinmez', async () => {
        const onKaydet = jest.fn().mockResolvedValue(false);
        render(<CariHareketFormu tur="odenen" onKaydet={onKaydet} />);
        fireEvent.change(screen.getByLabelText('Hizmet ve Yatırım Ödemeleri'), { target: { value: 'Harç' } });
        fireEvent.change(screen.getByLabelText('Tutar'), { target: { value: '100' } });
        fireEvent.click(ekleDugmesi());
        await waitFor(() => expect(onKaydet).toHaveBeenCalled());
        await waitFor(() => expect(ekleDugmesi()).not.toBeDisabled());
        expect(screen.getByLabelText('Hizmet ve Yatırım Ödemeleri')).toHaveValue('Harç');
    });

    test('gelen ödemede banka zorunlu, belge yükleme yok', async () => {
        const onKaydet = jest.fn();
        render(<CariHareketFormu tur="gelen" onKaydet={onKaydet} />);
        expect(screen.queryByRole('button', { name: /Belge Yükle/ })).toBeNull();
        fireEvent.change(screen.getByLabelText('Tutar'), { target: { value: '100' } });
        fireEvent.click(ekleDugmesi());
        expect(await screen.findByText('Banka seçin')).toBeInTheDocument();
        expect(onKaydet).not.toHaveBeenCalled();
    });

    test('düzenlemede mevcut değerler dolu gelir', () => {
        render(
            <CariHareketFormu
                tur="odenen"
                cerceve={false}
                onKaydet={jest.fn()}
                baslangic={{
                    _id: '1', tur: 'odenen', belgeAdi: 'Harç', tarih: '2026-09-01T00:00:00.000Z',
                    tutar: 2500, dosya: { dosyaAdi: 'dekont.pdf' }
                }}
            />
        );
        expect(screen.getByLabelText('Hizmet ve Yatırım Ödemeleri')).toHaveValue('Harç');
        expect(screen.getByLabelText('Tarih')).toHaveValue('2026-09-01');
        expect(screen.getByLabelText('Tutar')).toHaveValue('2.500,00');
        expect(screen.getByText('dekont.pdf')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
    });
});
