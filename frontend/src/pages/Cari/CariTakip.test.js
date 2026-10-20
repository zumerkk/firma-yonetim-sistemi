import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CariTakip from './CariTakip';
import TalepCariPaneli from '../../components/Cari/TalepCariPaneli';
import cariService from '../../services/cariService';

jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => children);
jest.mock('../../services/cariService', () => ({
    firmaOzetleri: jest.fn(), firmaDefteri: jest.fn(), firmaTalepleri: jest.fn(), talepDefteri: jest.fn(), firmaDurumuGuncelle: jest.fn()
}));

beforeEach(() => { jest.clearAllMocks(); });

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

function Konum() {
    const konum = useLocation();
    const git = useNavigate();
    return <><output data-testid="konum">{konum.pathname}{konum.search}</output>
        <output data-testid="donus">{JSON.stringify(konum.state)}</output>
        <button onClick={() => git(-1)}>Tarayıcı geri</button></>;
}

function cariAc() {
    cariService.firmaOzetleri.mockResolvedValue({ data: [{ firma: 'firma-1', firmaUnvan: 'TEST FİRMA', bakiye: 0 }] });
    cariService.firmaDefteri.mockResolvedValue({ data: { firma: { _id: 'firma-1', tamUnvan: 'TEST FİRMA' }, hareketler: [], talepler: [], ozet: {} } });
    return render(<MemoryRouter initialEntries={['/cari-takip']}><Konum /><Routes>
        <Route path="/cari-takip" element={<CariTakip />} />
        <Route path="/dosya-takip/:id" element={<div>Talep ekranı</div>} />
    </Routes></MemoryRouter>);
}

test('tek talep firma adından doğrudan Ödemeler sekmesine açılır, tarayıcı geri liste filtresini ve sırayı korur', async () => {
    cariService.firmaTalepleri.mockResolvedValue({ data: { talepler: [{ _id: 'talep-1', takipId: 'DT1' }] } });
    cariAc();
    await screen.findByRole('button', { name: 'TEST FİRMA' });
    fireEvent.change(screen.getByPlaceholderText('Listede ara...'), { target: { value: 'TEST' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bakiye' }));
    fireEvent.click(screen.getByRole('button', { name: 'TEST FİRMA' }));
    expect(await screen.findByText('Talep ekranı')).toBeInTheDocument();
    expect(screen.getByTestId('konum')).toHaveTextContent('/dosya-takip/talep-1?sekme=odemeler');
    expect(cariService.firmaTalepleri).toHaveBeenCalledWith('firma-1');
    expect(cariService.firmaDefteri).not.toHaveBeenCalled();
    expect(JSON.parse(screen.getByTestId('donus').textContent).geriDon).toMatchObject({
        yol: '/cari-takip', state: { cariListe: { filtre: 'TEST', siralama: { alan: 'bakiye' } } }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tarayıcı geri' }));
    expect(await screen.findByPlaceholderText('Listede ara...')).toHaveValue('TEST');
    await screen.findByRole('button', { name: 'TEST FİRMA' });
    expect(screen.getByRole('button', { name: 'Bakiye' }).closest('th')).toHaveAttribute('aria-sort', 'descending');
});

test('çoklu taleplerde aktif ve arşiv seçenekleri belge numarasıyla görünür ve seçilenin Ödemeler sekmesi açılır', async () => {
    cariService.firmaTalepleri.mockResolvedValue({ data: { talepler: [
        { _id: 'talep-1', takipId: 'DT1', ytbNo: '123', talepTuru: 'Başvuru', anaAsama: 'MURACAAT_ONCESI' },
        { _id: 'talep-2', takipId: 'DT2', ytbNo: '456', talepTuru: 'Revize', anaAsama: 'TAMAMLANDI' }
    ] } });
    cariAc();
    fireEvent.click(await screen.findByRole('button', { name: 'TEST FİRMA' }));
    expect(await screen.findByText('Aktif · —')).toBeInTheDocument();
    expect(screen.getByText('Arşiv · —')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /DT2 · Belge 456 · Revize/ }));
    expect(await screen.findByText('Talep ekranı')).toBeInTheDocument();
    expect(screen.getByTestId('konum')).toHaveTextContent('/dosya-takip/talep-2?sekme=odemeler');
});

test('talebi olmayan firmanın cari defteri hem liste düğmesinden hem seçim penceresinden erişilebilir', async () => {
    cariService.firmaTalepleri.mockResolvedValue({ data: { talepler: [] } });
    cariAc();
    fireEvent.click(await screen.findByRole('button', { name: 'TEST FİRMA' }));
    expect(await screen.findByText(/Bu firmanın Belge Takip talebi bulunmuyor/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Firmanın Cari Hesabı' }));
    expect(await screen.findByRole('button', { name: 'Tüm Firmalar' })).toBeInTheDocument();
    expect(cariService.firmaDefteri).toHaveBeenCalledWith('firma-1');
    fireEvent.click(screen.getByRole('button', { name: 'Tüm Firmalar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cari Hesabı' }));
    expect(await screen.findByRole('button', { name: 'Tüm Firmalar' })).toBeInTheDocument();
});
