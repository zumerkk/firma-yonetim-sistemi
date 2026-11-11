import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CariTakip from './CariTakip';
import TalepCariPaneli from '../../components/Cari/TalepCariPaneli';
import cariService from '../../services/cariService';

jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => children);
jest.mock('../../services/cariService', () => ({
    firmaOzetleri: jest.fn(), firmaDefteri: jest.fn(), firmaTalepleri: jest.fn(), talepDefteri: jest.fn(),
    firmaDurumuGuncelle: jest.fn(), talepCariDurumuGuncelle: jest.fn(), hareketEkle: jest.fn()
}));

beforeEach(() => { jest.clearAllMocks(); });

// Müşteri (03.11.2026, acil): "Belge takip ekranında cari kapandı seçince o firmanın tüm işlemlerini kapatıyor".
// Cari Takip'teki firma seçimi firmada kalır; Belge Takip › Ödemeler yalnız kendi talebini değiştirir.
test('firma listesindeki cari seçimi satırı açmaz; Belge Takip talebi firma durumundan bağımsız', async () => {
    let cariDurumu = 'acik';
    cariService.firmaOzetleri.mockImplementation(async () => ({ data: [{
        firma: 'firma-1', firmaUnvan: 'TEST FİRMA', cariDurumu, bakiye: 0
    }] }));
    cariService.firmaDurumuGuncelle.mockImplementation(async (id, durum) => {
        cariDurumu = durum;
        return { data: { cariDurumu } };
    });
    cariService.talepDefteri.mockImplementation(async () => ({
        data: { firma: { _id: 'firma-1', cariDurumu }, talep: { _id: 'talep-1', cariDurumu: 'acik' }, hareketler: [], ozet: {} }
    }));
    cariService.talepCariDurumuGuncelle.mockImplementation(async (id, durum) => ({ data: { _id: id, cariDurumu: durum } }));

    const liste = render(<MemoryRouter><CariTakip /></MemoryRouter>);
    expect(await screen.findByText('TEST FİRMA')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Cari durumu'));
    fireEvent.click(screen.getByRole('option', { name: 'Cari kapandı' }));
    await waitFor(() => expect(screen.getByLabelText('Cari durumu')).toHaveTextContent('Cari kapandı'));
    expect(cariService.firmaDurumuGuncelle).toHaveBeenCalledWith('firma-1', 'kapandi');
    expect(cariService.firmaDefteri).not.toHaveBeenCalled();
    liste.unmount();

    // Firma "kapandı" olsa da talep kendi seçimini gösterir ve yalnız kendini değiştirir
    render(<MemoryRouter><TalepCariPaneli talepId="talep-1" firmaId="firma-1" /></MemoryRouter>);
    await waitFor(() => expect(cariService.talepDefteri).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText('Cari durumu')).not.toHaveAttribute('aria-disabled'));
    expect(screen.getByLabelText('Cari durumu')).toHaveTextContent('Cari açık');
    fireEvent.mouseDown(screen.getByLabelText('Cari durumu'));
    fireEvent.click(screen.getByRole('option', { name: 'Cari kapandı' }));
    await waitFor(() => expect(screen.getByLabelText('Cari durumu')).toHaveTextContent('Cari kapandı'));
    expect(cariService.talepCariDurumuGuncelle).toHaveBeenLastCalledWith('talep-1', 'kapandi');
    expect(cariService.firmaDurumuGuncelle).toHaveBeenCalledTimes(1);
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

function DigerFirmayaGit() {
    const git = useNavigate();
    return <button onClick={() => git('/cari-takip?firma=firma-b')}>Diğer firmaya geç</button>;
}

const defterYaniti = (id, unvan) => ({ data: {
    firma: { _id: id, tamUnvan: unvan }, hareketler: [], talepler: [], ozet: {}
} });

function firmaDegistirmeEkrani() {
    cariService.firmaOzetleri.mockResolvedValue({ data: [] });
    render(<MemoryRouter initialEntries={['/cari-takip?firma=firma-a']}>
        <DigerFirmayaGit /><CariTakip />
    </MemoryRouter>);
}

test('firma değişirken eski defter ve form gösterilmez, ödeme görünen firmaya gönderilir', async () => {
    let bDon;
    cariService.firmaDefteri.mockImplementation((id) => id === 'firma-a'
        ? Promise.resolve(defterYaniti(id, 'ÖRNEK FİRMA A'))
        : new Promise((resolve) => { bDon = () => resolve(defterYaniti(id, 'ÖRNEK FİRMA B')); }));
    cariService.hareketEkle.mockImplementation(() => new Promise(() => {}));
    firmaDegistirmeEkrani();
    await screen.findByRole('heading', { name: 'ÖRNEK FİRMA A' });
    fireEvent.click(screen.getByRole('button', { name: 'Diğer firmaya geç' }));
    expect(screen.queryByRole('heading', { name: 'ÖRNEK FİRMA A' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ekle', exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Firma hesabı yükleniyor' })).toBeInTheDocument();
    await act(async () => { bDon(); });

    await screen.findByRole('heading', { name: 'ÖRNEK FİRMA B' });
    fireEvent.change(screen.getByLabelText('Hizmet ve Yatırım Ödemeleri'), { target: { value: 'Örnek harç' } });
    fireEvent.change(screen.getAllByLabelText('Tutar')[0], { target: { value: '100' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Ekle', exact: true })[0]);
    await waitFor(() => expect(cariService.hareketEkle).toHaveBeenCalledWith(
        expect.objectContaining({ firma: 'firma-b', tutar: 100 }), null
    ));
});

test('ilk firmanın geciken cevabı sonraki firmanın defterini değiştirmez', async () => {
    let aDon;
    cariService.firmaDefteri.mockImplementation((id) => id === 'firma-a'
        ? new Promise((resolve) => { aDon = () => resolve(defterYaniti(id, 'ÖRNEK FİRMA A')); })
        : Promise.resolve(defterYaniti(id, 'ÖRNEK FİRMA B')));
    firmaDegistirmeEkrani();
    fireEvent.click(screen.getByRole('button', { name: 'Diğer firmaya geç' }));
    await screen.findByRole('heading', { name: 'ÖRNEK FİRMA B' });
    await act(async () => { aDon(); });
    expect(screen.getByRole('heading', { name: 'ÖRNEK FİRMA B' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ÖRNEK FİRMA A' })).not.toBeInTheDocument();
});
