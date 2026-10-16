import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CariTakip from './CariTakip';
import TalepCariPaneli from '../../components/Cari/TalepCariPaneli';
import cariService from '../../services/cariService';

jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => children);
jest.mock('../../services/cariService', () => ({
    firmaOzetleri: jest.fn(), firmaDefteri: jest.fn(), talepDefteri: jest.fn(), firmaDurumuGuncelle: jest.fn()
}));

test('firma listesindeki cari seçimi satırı açmaz; Belge Takip aynı firma durumunu okur ve değiştirir', async () => {
    let cariDurumu = 'acik';
    cariService.firmaOzetleri.mockImplementation(async () => ({ data: [{
        firma: 'firma-1', firmaUnvan: 'TEST FİRMA', cariDurumu, bakiye: 0
    }] }));
    cariService.firmaDurumuGuncelle.mockImplementation(async (id, durum) => {
        cariDurumu = durum;
        return { data: { cariDurumu } };
    });
    cariService.talepDefteri.mockImplementation(async () => ({
        data: { firma: { _id: 'firma-1', cariDurumu }, hareketler: [], ozet: {} }
    }));

    const liste = render(<MemoryRouter><CariTakip /></MemoryRouter>);
    expect(await screen.findByText('TEST FİRMA')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Cari durumu'));
    fireEvent.click(screen.getByRole('option', { name: 'Cari kapandı' }));
    await waitFor(() => expect(screen.getByLabelText('Cari durumu')).toHaveTextContent('Cari kapandı'));
    expect(cariService.firmaDurumuGuncelle).toHaveBeenCalledWith('firma-1', 'kapandi');
    expect(cariService.firmaDefteri).not.toHaveBeenCalled();
    liste.unmount();

    render(<MemoryRouter><TalepCariPaneli talepId="talep-1" firmaId="firma-1" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('Cari durumu')).toHaveTextContent('Cari kapandı'));
    fireEvent.mouseDown(screen.getByLabelText('Cari durumu'));
    fireEvent.click(screen.getByRole('option', { name: 'Cari açık' }));
    await waitFor(() => expect(screen.getByLabelText('Cari durumu')).toHaveTextContent('Cari açık'));
    expect(cariService.firmaDurumuGuncelle).toHaveBeenLastCalledWith('firma-1', 'acik');
});
