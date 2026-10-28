import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CariKaydiSecimi from './CariKaydiSecimi';
import cariService from '../../services/cariService';

jest.mock('../../services/cariService', () => ({ talepCariKaydiGuncelle: jest.fn() }));

const Sar = ({ baslangic, kompakt }) => {
    const [deger, setDeger] = React.useState(baslangic);
    return <CariKaydiSecimi talepId="talep-1" value={deger} onDegis={setDeger} kompakt={kompakt} />;
};
// Menü kapanırken liste de aynı etiketi taşır; seçim kutusunun kendisi alınır
const kutu = () => screen.getAllByLabelText('Cari kaydı').find((el) => el.getAttribute('role') === 'combobox');
const sec = (etiket) => {
    fireEvent.mouseDown(kutu());
    fireEvent.click(screen.getByRole('option', { name: etiket }));
};

beforeEach(() => jest.clearAllMocks());

test.each([false, true])('eski talep "Seçilmedi" başlar; yazıldı/kesildi talebe kaydedilir, geri alınabilir (kompakt: %s)', async (kompakt) => {
    cariService.talepCariKaydiGuncelle.mockImplementation(async (id, cariKaydi) => ({ data: { cariKaydi } }));
    render(<Sar kompakt={kompakt} />);
    expect(kutu()).toHaveTextContent('Seçilmedi');
    fireEvent.mouseDown(kutu());
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Seçilmedi', 'Cari yazıldı', 'Cari kesildi']);
    fireEvent.click(screen.getByRole('option', { name: 'Cari yazıldı' }));
    await waitFor(() => expect(kutu()).toHaveTextContent('Cari yazıldı'));
    expect(cariService.talepCariKaydiGuncelle).toHaveBeenLastCalledWith('talep-1', 'yazildi');
    sec('Cari kesildi');
    await waitFor(() => expect(kutu()).toHaveTextContent('Cari kesildi'));
    sec('Seçilmedi');
    await waitFor(() => expect(kutu()).toHaveTextContent('Seçilmedi'));
    expect(cariService.talepCariKaydiGuncelle).toHaveBeenLastCalledWith('talep-1', '');
});

test('sunucu kaydetmezse eski değer kalır ve hata görünür', async () => {
    cariService.talepCariKaydiGuncelle.mockRejectedValue({ response: { data: { message: 'Yetkiniz yok' } } });
    render(<Sar baslangic="yazildi" />);
    sec('Cari kesildi');
    expect(await screen.findByText('Yetkiniz yok')).toBeInTheDocument();
    expect(kutu()).toHaveTextContent('Cari yazıldı');
});

test('kutu ve menüsü üstteki satıra tıklama / fare basışı / odak iletmez (arşiv tablosu)', () => {
    const satir = { onClick: jest.fn(), onMouseDown: jest.fn(), onFocus: jest.fn() };
    render(<div {...satir}><Sar kompakt /></div>);
    fireEvent.click(kutu());
    fireEvent.mouseDown(kutu());
    const secenek = screen.getByRole('option', { name: 'Seçilmedi' });
    fireEvent.mouseDown(secenek);
    fireEvent.focus(secenek);
    fireEvent.click(secenek);
    // Tablo fare basışında hücreye odak verip açık menüyle çekişiyordu (önizlemede tıklama satıra düştü)
    Object.values(satir).forEach((f) => expect(f).not.toHaveBeenCalled());
});
