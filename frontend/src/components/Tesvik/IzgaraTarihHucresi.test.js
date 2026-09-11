// 🧪 Izgara tarih hücresi - "başa atıyor" ve "yapıştırılmıyor" hatalarının testi
//
// Müşteri (11 Eylül 2026):
//   "Tarih girerken sürekli başa atıyor yazamıyoruz niyeyse"
//   "talep ve karar tarihine kopyala yapıştır yapılmıyor"
//
// Eski hâlde hücre bileşeni DataGrid'in renderCell'i İÇİNDE tanımlıydı (her render'da
// yeni bileşen tipi → React söküp yeniden kuruyor → odak ve imleç gidiyor) ve onChange
// HER TUŞ VURUŞUNDA sunucuya yazıyordu. Aşağıdaki testler yeni davranışı sabitler.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IzgaraTarihHucresi from './IzgaraTarihHucresi';

const girdi = () => screen.getByDisplayValue((_, el) => el?.type === 'date');

describe('IzgaraTarihHucresi - yazarken sunucuya gitmez', () => {
  test('onChange sırasında onKaydet ÇAĞRILMAZ', () => {
    const onKaydet = jest.fn();
    render(<IzgaraTarihHucresi deger="" onKaydet={onKaydet} />);
    fireEvent.change(girdi(), { target: { value: '2027-05-31' } });
    // Eski kod burada her tuşta istek atıyordu; yanıtlar yeniden render tetikleyip
    // imleci başa atıyordu.
    expect(onKaydet).not.toHaveBeenCalled();
  });

  test('alandan çıkınca bir kez kaydeder', () => {
    const onKaydet = jest.fn();
    render(<IzgaraTarihHucresi deger="" onKaydet={onKaydet} />);
    fireEvent.change(girdi(), { target: { value: '2027-05-31' } });
    fireEvent.blur(girdi());
    expect(onKaydet).toHaveBeenCalledTimes(1);
    expect(onKaydet).toHaveBeenCalledWith('2027-05-31');
  });

  test('değer değişmediyse boşuna kaydetmez', () => {
    const onKaydet = jest.fn();
    render(<IzgaraTarihHucresi deger="2027-05-31" onKaydet={onKaydet} />);
    fireEvent.blur(girdi());
    expect(onKaydet).not.toHaveBeenCalled();
  });

  test('aynı değere iki kez çıkış yapılırsa tek kayıt gider', () => {
    const onKaydet = jest.fn();
    render(<IzgaraTarihHucresi deger="" onKaydet={onKaydet} />);
    fireEvent.change(girdi(), { target: { value: '2027-01-02' } });
    fireEvent.blur(girdi());
    fireEvent.blur(girdi());
    expect(onKaydet).toHaveBeenCalledTimes(1);
  });
});

describe('IzgaraTarihHucresi - yapıştırma', () => {
  test('TR biçimli metin (31.05.2027) ISO\'ya çevrilip kaydedilir', () => {
    const onKaydet = jest.fn();
    render(<IzgaraTarihHucresi deger="" onKaydet={onKaydet} />);
    fireEvent.paste(girdi(), { clipboardData: { getData: () => '31.05.2027' } });
    expect(onKaydet).toHaveBeenCalledWith('2027-05-31');
  });

  test('tarih olmayan metin yok sayılır', () => {
    const onKaydet = jest.fn();
    render(<IzgaraTarihHucresi deger="" onKaydet={onKaydet} />);
    fireEvent.paste(girdi(), { clipboardData: { getData: () => 'merhaba' } });
    expect(onKaydet).not.toHaveBeenCalled();
  });
});

describe('IzgaraTarihHucresi - Escape yazılanı geri alır', () => {
  test('Esc sonrası kaydetme yapılmaz', () => {
    const onKaydet = jest.fn();
    render(<IzgaraTarihHucresi deger="2027-05-31" onKaydet={onKaydet} />);
    fireEvent.change(girdi(), { target: { value: '2020-01-01' } });
    fireEvent.keyDown(girdi(), { key: 'Escape' });
    fireEvent.blur(girdi());
    expect(onKaydet).not.toHaveBeenCalled();
  });
});
