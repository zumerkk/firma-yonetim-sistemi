// 🧪 Dizi sıralama yardımcıları
//
// Müşteri: "Birde bu sıralamada tutup sürükleyemez miyiz mesela yeni evrak
// ekleyince en alta ekliyor 30 kere yukarı oka tıklamamız gerekiyor."
//
// `tasi` komşu takas (ok düğmeleri), `tasiKonuma` serbest yerleştirme
// (sürükle-bırak). İkisi de diziyi DEĞİŞTİRMEZ, yenisini döner.

import { tasi, tasiKonuma } from './dizi';

const L = () => ['a', 'b', 'c', 'd'];

describe('tasi - komşu takas', () => {
  test('yukarı taşır', () => {
    expect(tasi(L(), 2, -1)).toEqual(['a', 'c', 'b', 'd']);
  });

  test('aşağı taşır', () => {
    expect(tasi(L(), 1, 1)).toEqual(['a', 'c', 'b', 'd']);
  });

  test('sınır dışına taşımaz', () => {
    expect(tasi(L(), 0, -1)).toEqual(L());
    expect(tasi(L(), 3, 1)).toEqual(L());
  });

  test('kaynağı değiştirmez', () => {
    const kaynak = L();
    tasi(kaynak, 1, 1);
    expect(kaynak).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('tasiKonuma - serbest yerleştirme', () => {
  // Asıl kazanç: 35 kalemlik listede son satırı başa çekmek tek hareket
  test('sondan başa taşır', () => {
    expect(tasiKonuma(L(), 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  test('baştan sona taşır', () => {
    expect(tasiKonuma(L(), 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  // Aradaki elemanların GÖRELİ sırası korunmalı — takas olsaydı bozulurdu
  test('aradakilerin sırası korunur', () => {
    expect(tasiKonuma(['a', 'b', 'c', 'd', 'e'], 4, 1)).toEqual(['a', 'e', 'b', 'c', 'd']);
  });

  test('aynı konuma bırakmak değiştirmez', () => {
    expect(tasiKonuma(L(), 2, 2)).toEqual(L());
  });

  test('geçersiz indeksler diziyi bozmaz', () => {
    expect(tasiKonuma(L(), -1, 2)).toEqual(L());
    expect(tasiKonuma(L(), 1, 9)).toEqual(L());
    expect(tasiKonuma(L(), 9, 1)).toEqual(L());
  });

  test('dizi olmayan girdi boş dizi döner', () => {
    expect(tasiKonuma(null, 0, 1)).toEqual([]);
    expect(tasiKonuma(undefined, 0, 1)).toEqual([]);
  });

  test('kaynağı değiştirmez', () => {
    const kaynak = L();
    tasiKonuma(kaynak, 3, 0);
    expect(kaynak).toEqual(['a', 'b', 'c', 'd']);
  });
});
