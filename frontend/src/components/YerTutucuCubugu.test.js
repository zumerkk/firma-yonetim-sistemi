// 🧪 YER TUTUCU ÇUBUĞU
//
// Müşteri: "mail düzenlerken bunları manuel eklememiz gerekiyor ama arkadaşlara
// biraz kafa karıştırıcı geldi, daha kolay ekleme yolu bulabilir miyiz acaba?"
//
// Çubuk 1 Eylül 2026'da gövde alanına eklendi; KONU alanına eklenmemişti —
// oysa konu şablonu da yer tutucu çözüyor (islemEvrakService.mailOlustur →
// engine.render(sablon.mailKonusu, data)). Bu testler ekleme davranışını
// sabitliyor.
//
// ⚠️ Bu çubuk YALNIZ ŞABLON alanlarına konur. İşlem detayındaki "İçerik" alanı
// ÇÖZÜLMÜŞ nihai metindir (talepMailGonder gövdeyi olduğu gibi iletir, yeniden
// render ETMEZ) — oraya yer tutucu eklemek müşteriye ham "{firmaAdi}" yazan
// mail gönderirdi.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import YerTutucuCubugu, { YER_TUTUCU_ACIKLAMA } from './YerTutucuCubugu';

const KONU = ['{firmaAdi}', '{islemAdi}', '{varyant}'];

// İmleci taklit eden sahte input
const sahteInput = (deger, bas, son = bas) => ({
  current: {
    selectionStart: bas,
    selectionEnd: son,
    value: deger,
    focus: () => {},
    setSelectionRange: () => {}
  }
});

describe('YerTutucuCubugu', () => {
  test('verilen yer tutucuları rozet olarak basar', () => {
    render(<YerTutucuCubugu placeholders={KONU} deger="" onChange={() => {}} />);
    for (const p of KONU) expect(screen.getByText(p)).toBeInTheDocument();
  });

  test('rozete tıklayınca İMLECİN BULUNDUĞU yere ekler', () => {
    const degisim = jest.fn();
    render(
      <YerTutucuCubugu
        placeholders={KONU}
        inputRef={sahteInput('Sayin  ilgili', 6)}
        deger="Sayin  ilgili"
        onChange={degisim}
      />
    );
    fireEvent.click(screen.getByText('{firmaAdi}'));
    expect(degisim).toHaveBeenCalledWith('Sayin {firmaAdi} ilgili');
  });

  test('seçili metnin ÜZERİNE yazar', () => {
    const degisim = jest.fn();
    render(
      <YerTutucuCubugu
        placeholders={KONU}
        inputRef={sahteInput('Sayin XXX ilgili', 6, 9)}
        deger="Sayin XXX ilgili"
        onChange={degisim}
      />
    );
    fireEvent.click(screen.getByText('{firmaAdi}'));
    expect(degisim).toHaveBeenCalledWith('Sayin {firmaAdi} ilgili');
  });

  test('imleç bilinmiyorsa SONA ekler — sessizce başa koymaz', () => {
    const degisim = jest.fn();
    render(<YerTutucuCubugu placeholders={KONU} deger="Konu:" onChange={degisim} />);
    fireEvent.click(screen.getByText('{islemAdi}'));
    expect(degisim).toHaveBeenCalledWith('Konu:{islemAdi}');
  });

  test('boş alanda çalışır', () => {
    const degisim = jest.fn();
    render(<YerTutucuCubugu placeholders={KONU} deger="" onChange={degisim} />);
    fireEvent.click(screen.getByText('{varyant}'));
    expect(degisim).toHaveBeenCalledWith('{varyant}');
  });

  test('her yer tutucunun insan okunur açıklaması var', () => {
    // Açıklamasız rozet, "kafa karıştırıcı" şikayetini çözmez.
    for (const p of KONU) {
      expect(YER_TUTUCU_ACIKLAMA[p]).toBeTruthy();
    }
  });

  test('konu alt kümesi gövdeye özgü olanları İÇERMEZ', () => {
    // {evrakListesi} çok satırlı liste, {imza} kurum imzası, {uploadLink} uzun
    // URL — hiçbiri konu satırında iş görmez.
    for (const disarida of ['{evrakListesi}', '{imza}', '{uploadLink}', '{formLink}']) {
      expect(KONU).not.toContain(disarida);
    }
  });
});
