// 🧪 Makine listesi hafif hücreleri
//
// Müşteri (21.09.2026): "Makine listesi biraz yavaş çalışıyor". MUI Select/TextField/Tooltip yerine yerel
// öğeler kullanıldı; bu testler davranışın (değer, kaydetme anı, klavye) korunduğunu sınıyor.

import { render, screen, fireEvent } from '@testing-library/react';
import { BirimHucresi, GirdiHucresi, SecimHucresi } from './HafifHucreler';

jest.mock('../UnitCurrencySearch', () => {
    const Sahte = ({ yalnizPencere, acikBasla, onKapat, onChange }) => (
        <div data-testid="birim-penceresi" data-yalniz={String(!!yalnizPencere)} data-acik={String(!!acikBasla)}>
            <button type="button" onClick={() => { onChange('142', 'ADET(UNIT)'); onKapat(); }}>ADET seç</button>
        </div>
    );
    return { __esModule: true, default: Sahte, etiketCoz: (tip, kod, aciklama) => aciklama || kod };
});

const EVET_HAYIR = [{ deger: '', etiket: '-' }, { deger: 'EVET', etiket: 'E', uzun: 'EVET' }, { deger: 'HAYIR', etiket: 'H', uzun: 'HAYIR' }];

describe('SecimHucresi', () => {
    test('düzenleme kapalıyken düz etiket, açıklaması başlıkta', () => {
        render(<SecimHucresi deger="EVET" secenekler={EVET_HAYIR} duzenlenebilir={false} onDegis={jest.fn()} />);
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.getByText('E')).toHaveAttribute('title', 'EVET');
    });

    test('düzenlenebilirken yerel seçim; değişiklik yeni değerle bildirilir', () => {
        const onDegis = jest.fn();
        render(<SecimHucresi deger="EVET" secenekler={EVET_HAYIR} duzenlenebilir onDegis={onDegis} />);
        const kutu = screen.getByRole('combobox');
        expect(kutu).toHaveValue('EVET');
        fireEvent.change(kutu, { target: { value: 'HAYIR' } });
        expect(onDegis).toHaveBeenCalledWith('HAYIR');
    });

    // Eski veride listede olmayan değer sessizce "-" görünüp kaybolmasın
    test('listede olmayan eski değer korunur', () => {
        render(<SecimHucresi deger="KM" secenekler={EVET_HAYIR} duzenlenebilir onDegis={jest.fn()} />);
        expect(screen.getByRole('combobox')).toHaveValue('KM');
    });

    // Boşluk/oklar DataGrid'e gitmesin (satır seçme / hücre değiştirme)
    test('tuşlar ızgaraya taşmaz', () => {
        const ust = jest.fn();
        render(<div onKeyDown={ust}><SecimHucresi deger="" secenekler={EVET_HAYIR} duzenlenebilir onDegis={jest.fn()} /></div>);
        fireEvent.keyDown(screen.getByRole('combobox'), { key: ' ' });
        expect(ust).not.toHaveBeenCalled();
    });
});

describe('GirdiHucresi', () => {
    test('düzenleme kapalıyken düz metin', () => {
        render(<GirdiHucresi deger="4350371" duzenlenebilir={false} onKaydet={jest.fn()} />);
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByText('4350371')).toBeInTheDocument();
    });

    // Her tuşta satıra yazılsaydı bütün ızgara her tuşta yeniden çizilirdi
    test('yazarken kaydetmez; alandan çıkınca BİR KEZ kaydeder', () => {
        const onKaydet = jest.fn();
        render(<GirdiHucresi deger="" duzenlenebilir onKaydet={onKaydet} />);
        const kutu = screen.getByRole('textbox');
        fireEvent.change(kutu, { target: { value: '47' } });
        fireEvent.change(kutu, { target: { value: '4700999' } });
        expect(onKaydet).not.toHaveBeenCalled();
        fireEvent.blur(kutu);
        expect(onKaydet).toHaveBeenCalledTimes(1);
        expect(onKaydet).toHaveBeenCalledWith('4700999');
    });

    test('değişmeyen değer için kaydetmez', () => {
        const onKaydet = jest.fn();
        render(<GirdiHucresi deger="12" duzenlenebilir onKaydet={onKaydet} />);
        fireEvent.blur(screen.getByRole('textbox'));
        expect(onKaydet).not.toHaveBeenCalled();
    });

    test('Escape yazılanı geri alır', () => {
        render(<GirdiHucresi deger="12" duzenlenebilir onKaydet={jest.fn()} />);
        const kutu = screen.getByRole('textbox');
        fireEvent.change(kutu, { target: { value: '99' } });
        fireEvent.keyDown(kutu, { key: 'Escape' });
        expect(kutu).toHaveValue('12');
    });
});

describe('BirimHucresi', () => {
    test('arama penceresi hazırda beklemez; tıklanınca yalnız pencere olarak açılır ve seçimi iletir', () => {
        const onSec = jest.fn();
        render(<BirimHucresi tip="unit" kod="SET" duzenlenebilir onSec={onSec} />);
        expect(screen.queryByTestId('birim-penceresi')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'SET' }));
        const pencere = screen.getByTestId('birim-penceresi');
        expect(pencere).toHaveAttribute('data-yalniz', 'true');
        expect(pencere).toHaveAttribute('data-acik', 'true');
        fireEvent.click(screen.getByText('ADET seç'));
        expect(onSec).toHaveBeenCalledWith('142', 'ADET(UNIT)');
        expect(screen.queryByTestId('birim-penceresi')).toBeNull();
    });

    test('düzenleme kapalıyken tıklanamaz', () => {
        render(<BirimHucresi tip="unit" kod="SET" duzenlenebilir={false} onSec={jest.fn()} />);
        expect(screen.queryByRole('button')).toBeNull();
        fireEvent.click(screen.getByText('SET'));
        expect(screen.queryByTestId('birim-penceresi')).toBeNull();
    });
});
