// 🧪 Sürükle-bırak sıralama kancası
//
// İşlem & Evrak satırları React.memo ile sarıldı (35 satırda tuş başına ~120 ms ölçülmüştü; bkz. kanca
// başlığı). Bunun işe yaraması için `satirProps(i)` aynı satıra aynı nesneyi döndürmeli; işleyiciler de
// liste değişince eski listeyle çalışmamalı.

import { renderHook, act } from '@testing-library/react';
import useSurukleSirala from './useSurukleSirala';
import { tasiKonuma } from '../utils/dizi';

// Tutamaktan başlamış bir sürüklemede satırın draggable'ı açıktır (bkz. surukleyiAc)
const olay = (draggable = true) => ({
  preventDefault: jest.fn(),
  currentTarget: { draggable },
  dataTransfer: { setData: jest.fn(), getData: jest.fn(() => ''), effectAllowed: '', dropEffect: '' }
});

test('liste değişse de satırın props nesnesi aynı kalır (memo bozulmaz)', () => {
  const onChange = jest.fn();
  const { result, rerender } = renderHook(({ liste }) => useSurukleSirala(liste, onChange), {
    initialProps: { liste: ['a', 'b', 'c'] }
  });
  const ilk = result.current.satirProps(1);
  rerender({ liste: ['a', 'B', 'c'] });
  expect(result.current.satirProps(1)).toBe(ilk);
});

test('eski render\'dan kalan işleyici bırakınca GÜNCEL listeyi taşır', () => {
  const onChange = jest.fn();
  const { result, rerender } = renderHook(({ liste }) => useSurukleSirala(liste, onChange), {
    initialProps: { liste: ['a', 'b', 'c'] }
  });
  const ucuncuSatir = result.current.satirProps(2);
  rerender({ liste: ['x', 'y', 'z'] });
  act(() => { result.current.satirProps(0).onDragStart(olay()); });
  act(() => { ucuncuSatir.onDrop(olay()); });
  expect(onChange).toHaveBeenCalledWith(tasiKonuma(['x', 'y', 'z'], 0, 2));
});

test('sürükleme görünümü yalnız ilgili satırlarda değişir', () => {
  const liste = ['a', 'b', 'c'];
  const onChange = jest.fn();
  const { result } = renderHook(() => useSurukleSirala(liste, onChange));
  const satir0 = result.current.satirProps(0);

  act(() => { result.current.satirProps(1).onDragStart(olay()); });
  expect(result.current.satirProps(1).style.opacity).toBe(0.4);
  expect(result.current.satirProps(0)).toBe(satir0);

  act(() => { result.current.satirProps(2).onDragOver(olay()); });
  expect(result.current.satirProps(2).style.borderTop).toBe('2px solid #2563eb');
  expect(result.current.satirProps(0)).toBe(satir0);

  act(() => { result.current.satirProps(1).onDragEnd(olay()); });
  expect(result.current.satirProps(1).style.opacity).toBe(1);
  expect(result.current.satirProps(2).style.borderTop).toBe('2px solid transparent');
});

// Müşteri (21.09.2026): "Açıklama alanının içine tıklayıp metni seçmek istediğimizde metnin içinde
// tıklama yapıp/seçip kaydıramıyoruz" — satırın tamamı draggable'dı, metin seçimi sürüklemeye dönüyordu
describe('yalnız tutamaktan sürüklenir', () => {
  const kur = () => renderHook(() => useSurukleSirala(['a', 'b', 'c'], jest.fn())).result;
  const bas = (props, tutamak) => {
    const satir = { draggable: false };
    const hedef = { closest: (secici) => (tutamak && secici === '[data-surukle-tutamak]' ? {} : null) };
    props.onMouseDown({ currentTarget: satir, target: hedef });
    return satir;
  };

  test('satır varsayılan olarak sürüklenemez', () => {
    expect(kur().current.satirProps(0).draggable).toBe(false);
  });

  test('tutamağa basınca sürüklenebilir, metin kutusuna basınca sürüklenemez', () => {
    const props = kur().current.satirProps(0);
    expect(bas(props, true).draggable).toBe(true);
    expect(bas(props, false).draggable).toBe(false);
  });

  test('bırakınca sürüklenebilirlik kapanır', () => {
    const props = kur().current.satirProps(0);
    const satir = bas(props, true);
    props.onMouseUp({ currentTarget: satir });
    expect(satir.draggable).toBe(false);
  });

  test('tutamak dışından başlayan sürükleme sıralama başlatmaz', () => {
    const result = kur();
    act(() => { result.current.satirProps(1).onDragStart(olay(false)); });
    expect(result.current.satirProps(1).style.opacity).toBe(1);
  });

  // Seçili metni bir kutudan diğerine sürüklemek tarayıcının işi: bırakma engellenmemeli
  test('satır sürüklenmiyorken üzerine gelme/bırakma tarayıcıya kalır', () => {
    const result = kur();
    const ustunde = olay();
    act(() => { result.current.satirProps(2).onDragOver(ustunde); });
    expect(ustunde.preventDefault).not.toHaveBeenCalled();
    expect(result.current.satirProps(2).style.borderTop).toBe('2px solid transparent');
    const birak = olay();
    act(() => { result.current.satirProps(2).onDrop(birak); });
    expect(birak.preventDefault).not.toHaveBeenCalled();
  });
});
