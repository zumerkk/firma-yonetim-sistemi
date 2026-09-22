// 🧪 Kayıtlı değerin seçeneklerde bulunması — canlıdaki gerçek yazımlarla
import { esleAnahtari, eslesenSecenek, eslesenIlce } from './secenekEsle';

describe('esleAnahtari', () => {
  test('Türkçe harfleri ve noktalamayı sadeleştirir', () => {
    expect(esleAnahtari('Niğde Merkez')).toBe('NIGDEMERKEZ');
    expect(esleAnahtari('BÖLGESEL - ALT BÖLGE')).toBe('BOLGESELALTBOLGE');
    expect(esleAnahtari('1. Bölge')).toBe('1BOLGE');
    expect(esleAnahtari('1. Bolge')).toBe('1BOLGE'); // canlıda 'o' ile yazılı
    expect(esleAnahtari(null)).toBe('');
  });
});

describe('eslesenSecenek', () => {
  const destek = [
    { value: 'BOLGESEL', label: 'Bölgesel' },
    { value: 'BÖLGESEL-Alt Bölge', label: 'Bölgesel - Alt Bölge' },
    { value: 'GENEL', label: 'Genel' }
  ];

  test('yazım farkını yok sayar', () => {
    expect(eslesenSecenek('BÖLGESEL', destek)).toBe(0);
    expect(eslesenSecenek('Genel', destek)).toBe(2);
  });

  test('kısa kayıtlı değer, uzun seçeneğe kaymaz', () => {
    // "BÖLGESEL" (canlıda 459 belge) "BÖLGESEL-Alt Bölge" sanılmamalı
    expect(eslesenSecenek('BÖLGESEL', destek)).not.toBe(1);
    expect(eslesenSecenek('BÖLGESEL - ALT BÖLGE', destek)).toBe(1);
  });

  test('uzun kayıtlı değer, önek seçeneğiyle eşleşir', () => {
    const cins = [{ value: 'Komple Yeni' }, { value: 'Tevsi' }, { value: 'Modernizasyon' }];
    expect(eslesenSecenek('KOMPLE YENİ YATIRIM', cins)).toBe(0);
    expect(eslesenSecenek('TEVSİ', cins)).toBe(1);
    const nace = [{ value: '2929', label: '2929 - DİĞER ÖZEL AMAÇLI MAKİNELERİN İMALATI' }];
    expect(eslesenSecenek('2929 - DİĞER ÖZEL AMAÇLI MAKİNELERİN İMALATI', nace)).toBe(0);
  });

  test('en uzun önek kazanır', () => {
    const l = [{ value: 'Komple' }, { value: 'Komple Yeni' }];
    expect(eslesenSecenek('KOMPLE YENİ YATIRIM', l)).toBe(1);
  });

  test('üç harflik önek yeterli değil, eşleşme yok sayılır', () => {
    expect(eslesenSecenek('TEVSİ', [{ value: 'TEV' }])).toBe(-1);
    expect(eslesenSecenek('', destek)).toBe(-1);
    expect(eslesenSecenek('YOK', destek)).toBe(-1);
    expect(eslesenSecenek('BÖLGESEL', null)).toBe(-1);
  });

  test('pasif seçenek listesi düz dizi de olabilir', () => {
    expect(eslesenSecenek('ADET', ['Adet', 'Kg'])).toBe(0);
  });
});

describe('eslesenIlce', () => {
  const nigde = [{ ad: 'Altunhisar' }, { ad: 'Niğde Merkez' }, { ad: 'Bor' }];
  test('E-TUYS "MERKEZ" değerini il merkeziyle eşler', () => {
    expect(eslesenIlce('MERKEZ', nigde, 'NİĞDE')).toBe(1);
    expect(eslesenIlce('Merkez', nigde, 'Niğde')).toBe(1);
  });
  test('il adı tutmasa bile merkez ilçeye düşer', () => {
    expect(eslesenIlce('MERKEZ', nigde, 'YANLIŞ')).toBe(1);
  });
  test('normal ilçe adı yazım farkıyla eşleşir', () => {
    expect(eslesenIlce('BOR', nigde, 'NİĞDE')).toBe(2);
    expect(eslesenIlce('NILÜFER', [{ ad: 'Nilüfer' }], 'BURSA')).toBe(0);
  });
  test('merkezi olmayan ilde eşleşme yok', () => {
    expect(eslesenIlce('MERKEZ', [{ ad: 'Bor' }], 'NİĞDE')).toBe(-1);
    expect(eslesenIlce('YOK', nigde, 'NİĞDE')).toBe(-1);
  });
});
