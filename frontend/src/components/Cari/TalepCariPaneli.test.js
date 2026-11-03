import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TalepCariPaneli from './TalepCariPaneli';
import cariService from '../../services/cariService';

jest.mock('../../services/cariService', () => ({ talepDefteri: jest.fn() }));

test('Ödemeler: "Cari kaydı" (yazıldı/kesildi) cari durumunun SOLUNDA, ikisi de kayıtlı değeri gösterir', async () => {
    // Cari durumu talepten okunur; firmanın "açık" olması talebin seçimini değiştirmez (müşteri, 03.11.2026)
    cariService.talepDefteri.mockResolvedValue({ data: {
        firma: { _id: 'f1', tamUnvan: 'ÇINAR GIDA A.Ş.', cariDurumu: 'acik' },
        talep: { _id: 't1', cariKaydi: 'yazildi', cariDurumu: 'kapandi' },
        hareketler: [], ozet: null
    } });
    render(<MemoryRouter><TalepCariPaneli talepId="t1" firmaId="f1" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('Cari kaydı')).toHaveTextContent('Cari yazıldı'));
    const kayit = screen.getByLabelText('Cari kaydı');
    const durum = screen.getByLabelText('Cari durumu');
    expect(durum).toHaveTextContent('Cari kapandı');
    // Belge sırası = ekrandaki soldan sağa sıra
    expect(kayit.compareDocumentPosition(durum) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
