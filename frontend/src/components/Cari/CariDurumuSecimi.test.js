import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CariDurumuSecimi from './CariDurumuSecimi';
import cariService from '../../services/cariService';

jest.mock('../../services/cariService', () => ({ firmaDurumuGuncelle: jest.fn(), talepCariDurumuGuncelle: jest.fn() }));

const Sar = ({ baslangic, talepId }) => {
    const [durum, setDurum] = React.useState(baslangic);
    return <CariDurumuSecimi firmaId="firma-1" talepId={talepId} value={durum} onDegis={setDurum} />;
};
// Menü kapanırken liste de aynı etiketi taşır; seçim kutusunun kendisi alınır
const kutu = () => screen.getAllByLabelText('Cari durumu').find((el) => el.getAttribute('role') === 'combobox');
const sec = (etiket) => {
    fireEvent.mouseDown(kutu());
    fireEvent.click(screen.getByRole('option', { name: etiket }));
};

beforeEach(() => jest.clearAllMocks());

test('eski firma cari açık başlar; seçim firma alanına kaydedilir, yeniden açılabilir', async () => {
    cariService.firmaDurumuGuncelle.mockImplementation(async (id, cariDurumu) => ({ data: { cariDurumu } }));
    render(<Sar />);
    expect(kutu()).toHaveTextContent('Cari açık');
    sec('Cari kapandı');
    await waitFor(() => expect(cariService.firmaDurumuGuncelle).toHaveBeenLastCalledWith('firma-1', 'kapandi'));
    await waitFor(() => expect(kutu()).toHaveTextContent('Cari kapandı'));
    sec('Cari açık');
    await waitFor(() => expect(kutu()).toHaveTextContent('Cari açık'));
    expect(cariService.firmaDurumuGuncelle).toHaveBeenLastCalledWith('firma-1', 'acik');
});

test('sunucu kaydetmezse eski durum korunur ve hata görünür', async () => {
    cariService.firmaDurumuGuncelle.mockRejectedValue({ response: { data: { message: 'Kaydedilemedi' } } });
    render(<Sar baslangic="acik" />);
    sec('Cari kapandı');
    expect(await screen.findByText('Kaydedilemedi')).toBeInTheDocument();
    expect(kutu()).toHaveTextContent('Cari açık');
});

// Müşteri (03.11.2026, acil): "Belge takip ekranında cari kapandı seçince o firmanın tüm işlemlerini kapatıyor"
test('talep verilince seçim yalnız talebe yazılır, firma alanına dokunulmaz', async () => {
    cariService.talepCariDurumuGuncelle.mockImplementation(async (id, cariDurumu) => ({ data: { _id: id, cariDurumu } }));
    render(<Sar talepId="talep-1" />);
    expect(kutu()).toHaveTextContent('Cari açık');
    sec('Cari kapandı');
    await waitFor(() => expect(kutu()).toHaveTextContent('Cari kapandı'));
    expect(cariService.talepCariDurumuGuncelle).toHaveBeenLastCalledWith('talep-1', 'kapandi');
    expect(cariService.firmaDurumuGuncelle).not.toHaveBeenCalled();
});
