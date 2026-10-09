// Müşteri (07.10.2026): "Makine listesinde silinenleri pdf çıktısından komple kaldırmak yerine kırmızı
// yazıyla 'Silindi' gibi bir şey yazabilir miyiz belli olsun?"
// Müşteri (09.10.2026): "... onları ve silinme tarihlerini göstermesi yeterli."
import ExcelJS from 'exceljs';
import { silinenSatirlariEkle } from './musteriGorunumPdf';
import { silinenSatirlariYaz } from './docxExcelExport';
import { SILINDI, silindiEtiketi } from './silinenMakineler';

jest.mock('jspdf', () => ({ jsPDF: jest.fn() }));
jest.mock('jspdf-autotable', () => jest.fn());

const satir = (m) => [m.siraNo, m.adiVeOzelligi, '01.10.2026'];
const silinen = [{ siraNo: 7, adiVeOzelligi: 'TORNA', silinmeTarihi: '2026-10-09T08:05:00.000Z' }, { siraNo: 9, adiVeOzelligi: 'PRES', silinmeTarihi: null }];

describe('PDF', () => {
  test('güncel satırların altına kırmızı başlık + son sütunu "SİLİNDİ" satırlar', () => {
    const govde = silinenSatirlariEkle([['1', 'CNC', '-']], silinen, 3, satir);
    expect(govde).toHaveLength(4);
    expect(govde[1][0]).toMatchObject({ colSpan: 3, content: expect.stringContaining('SİLİNEN MAKİNELER (2)') });
    expect(govde[2].map((h) => h.content)).toEqual([7, 'TORNA', `${SILINDI} · 09.10.2026`]);
    expect(govde[3][2].content).toBe(SILINDI); // süren revizyonda silinen: tarih yok
    expect(govde[2][2].styles).toMatchObject({ textColor: [220, 38, 38], fontStyle: 'bold' });
    expect(govde[2][0].styles.textColor).toEqual([220, 38, 38]);
  });

  test('silinen yoksa gövde aynen kalır', () => {
    const govde = [['1', 'CNC', '-']];
    expect(silinenSatirlariEkle(govde, [], 3, satir)).toBe(govde);
    expect(silinenSatirlariEkle(govde, undefined, 3, satir)).toBe(govde);
  });
});

describe('Excel', () => {
  test('başlık satırı birleştirilir, satırlar kırmızı, son hücre "SİLİNDİ"', () => {
    const ws = new ExcelJS.Workbook().addWorksheet('Yerli');
    ws.addRow(['1', 'CNC', '-']);
    silinenSatirlariYaz(ws, silinen, 'C', satir, {});
    expect(ws.getRow(2).getCell(1).value).toContain('SİLİNEN MAKİNELER (2)');
    expect(ws.getRow(2).getCell(3).isMerged).toBe(true);
    expect(ws.getRow(3).values.slice(1)).toEqual([7, 'TORNA', `${SILINDI} · 09.10.2026`]);
    expect(ws.getRow(3).getCell(2).font.color.argb).toBe('FFDC2626');
    expect(ws.getRow(4).getCell(3).font.bold).toBe(true);
  });
});

test('etiket: geçersiz tarih "SİLİNDİ"ye düşer', () => {
  expect(silindiEtiketi({ silinmeTarihi: 'bozuk' })).toBe(SILINDI);
  expect(silindiEtiketi({})).toBe(SILINDI);
});
