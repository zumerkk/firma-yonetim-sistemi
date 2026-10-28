import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CariDurumuSecimi from './CariDurumuSecimi';
import cariService from '../../services/cariService';

jest.mock('../../services/cariService', () => ({ firmaDurumuGuncelle: jest.fn() }));

const Sar = ({ baslangic }) => {
    const [durum, setDurum] = React.useState(baslangic);
    return <CariDurumuSecimi firmaId="firma-1" value={durum} onDegis={setDurum} />;
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
