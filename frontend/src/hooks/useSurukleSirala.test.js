// 🧪 Sürükle-bırak sıralama kancası
//
// İşlem & Evrak satırları React.memo ile sarıldı (35 satırda tuş başına ~120 ms ölçülmüştü; bkz. kanca
// başlığı). Bunun işe yaraması için `satirProps(i)` aynı satıra aynı nesneyi döndürmeli; işleyiciler de
// liste değişince eski listeyle çalışmamalı.

import { renderHook, act } from '@testing-library/react';
import useSurukleSirala from './useSurukleSirala';
import { tasiKonuma } from '../utils/dizi';

const olay = () => ({
  preventDefault: jest.fn(),
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

  act(() => { result.current.satirProps(1).onDragEnd(); });
  expect(result.current.satirProps(1).style.opacity).toBe(1);
  expect(result.current.satirProps(2).style.borderTop).toBe('2px solid transparent');
});
