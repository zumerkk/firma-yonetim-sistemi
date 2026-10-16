import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DosyaTakipForm from './DosyaTakipForm';
import api from '../../utils/axios';

jest.mock('../../utils/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../components/Layout/LayoutWrapper', () => ({ children }) => <div>{children}</div>);
const mockFetchEnums = jest.fn();
jest.mock('../../contexts/DosyaTakipContext', () => ({ useDosyaTakip: () => ({
    fetchEnums: mockFetchEnums, enumDegerleri: {}, loading: false, error: '', clearError: jest.fn()
}) }));

const hedef = { _id: 'hedef', firmaId: 'A000001', tamUnvan: 'AHMET ÖLMEZ' };
const cokFirma = [...Array.from({ length: 101 }, (_, i) => ({ _id: `f${i}`, firmaId: `A${i + 2}`, tamUnvan: `AHMET TEST ${i}` })), hedef];
const cevap = (firmalar, toplamSayfa = 1) => ({ data: { success: true, data: { firmalar, pagination: { toplamSayfa } } } });

beforeEach(() => { jest.clearAllMocks(); });

const ac = () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><DosyaTakipForm /></MemoryRouter>);
    const input = screen.getByRole('combobox', { name: /Firma Seçimi/ });
    fireEvent.focus(input);
    return input;
};

test('Ahmet araması 100 eşleşmeden sonraki AHMET ÖLMEZ firmasını da seçtirir', async () => {
    api.get.mockImplementation((url, config) => {
        if (url === '/firma') {
            const { sayfa, limit } = config.params;
            return Promise.resolve(cevap(cokFirma.slice((sayfa - 1) * limit, sayfa * limit), 2));
        }
        return Promise.resolve({ data: { data: [] } });
    });
    const input = ac();
    fireEvent.change(input, { target: { value: 'Ahmet' } });
    const secenek = await screen.findByText('AHMET ÖLMEZ');
    expect(secenek.closest('li')).toHaveAttribute('role', 'option');
    const aramalar = api.get.mock.calls.filter(([url]) => url === '/firma');
    expect(aramalar.map(([, config]) => config.params.sayfa)).toEqual([1, 2]);
    fireEvent.click(secenek);
    expect(input).toHaveValue('AHMET ÖLMEZ');
    await screen.findByText('Bu firmaya ait kayıtlı teşvik belgesi bulunamadı.');
});

test('firma ID ile bulunan sunucu sonucu ikinci bir etiket filtresinde kaybolmaz', async () => {
    api.get.mockImplementation((url) => Promise.resolve(url === '/firma' ? cevap([hedef]) : { data: { data: [] } }));
    const input = ac();
    fireEvent.change(input, { target: { value: 'A000001' } });
    expect(await screen.findByText('AHMET ÖLMEZ')).toBeInTheDocument();
});

test('geç dönen Ahmet yanıtı daha yeni Ölmez aramasını ezmez', async () => {
    let ilkAramayiBitir;
    api.get.mockImplementation((url, config) => {
        if (url !== '/firma') return Promise.resolve({ data: { data: [] } });
        if (config.params.arama === 'Ahmet') return new Promise((resolve) => { ilkAramayiBitir = resolve; });
        return Promise.resolve(cevap([hedef]));
    });
    const input = ac();
    fireEvent.change(input, { target: { value: 'Ahmet' } });
    await waitFor(() => expect(ilkAramayiBitir).toBeDefined());
    fireEvent.change(input, { target: { value: 'Ölmez' } });
    expect(await screen.findByText('AHMET ÖLMEZ')).toBeInTheDocument();
    await act(async () => { ilkAramayiBitir(cevap([{ _id: 'diger', tamUnvan: 'AHMET BAŞKA' }])); });
    expect(input).toHaveValue('Ölmez');
    expect(screen.queryByText('AHMET BAŞKA')).not.toBeInTheDocument();
    expect(screen.getByText('AHMET ÖLMEZ')).toBeInTheDocument();
});
