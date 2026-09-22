// 🧪 Boş makine şablonu: indir → doldur → içe aktar zinciri
//
// Müşteri (21.09.2026): "Listeleri içe aktarmak için standart boş bir Excel şablonu oluşturabilir miyiz?
// Arkadaşlar bilgileri doğrudan o şablona doldurup Plansis'e aktarırsa çok daha pratik olur."
// Şablon gerçekten üretilip SheetJS ile (ekrandaki içe aktarmanın kullandığı kütüphane) geri okunuyor.

import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { makineSablonuKitabi, SABLON_LISTELERI } from './makineSablonuExcel';
import { SABLON_BASLIKLARI, excelSatirlariniOku, makineSatiriCoz, iceAktarimBirlestir } from './makineSablonu';

const yaz = async (wb) => new Uint8Array(await wb.xlsx.writeBuffer());

describe('makine listesi boş şablonu', () => {
  test('müşterinin düzeninde: YERLİ / İTHAL sayfaları ve başlıklar', async () => {
    const wb = makineSablonuKitabi();
    expect(wb.worksheets.map((ws) => ws.name)).toEqual(['YERLİ', 'İTHAL', 'Nasıl Kullanılır', 'Listeler']);
    expect(wb.getWorksheet('YERLİ').getRow(1).values.slice(1)).toEqual(SABLON_BASLIKLARI.yerli);
    expect(wb.getWorksheet('İTHAL').getRow(1).values.slice(1)).toEqual(SABLON_BASLIKLARI.ithal);
    expect(SABLON_BASLIKLARI.yerli.slice(0, 4)).toEqual(['SIRA NO', 'MAKİNE ID', 'GTIP NO', 'ADI VE ÖZELLİĞİ']);
    // Boş şablon içe aktarılırsa hiçbir şey eklenmez
    expect(excelSatirlariniOku(await yaz(wb))).toEqual({ yerli: [], ithal: [] });
  });

  test('açılır listeler ve başlık notları dosyaya yazılıyor', async () => {
    const wb = makineSablonuKitabi();
    const ws = wb.getWorksheet('YERLİ');
    const harf = (baslik) => String.fromCharCode(64 + SABLON_BASLIKLARI.yerli.indexOf(baslik) + 1);
    expect(ws.dataValidations.model[`${harf('KDV İSTİSNASI')}2:${harf('KDV İSTİSNASI')}1001`]).toMatchObject({ type: 'list', errorStyle: 'stop' });
    expect(ws.dataValidations.model[`${harf('BİRİM')}2:${harf('BİRİM')}1001`]).toMatchObject({ type: 'list', errorStyle: 'warning' });
    expect(String(ws.getRow(1).getCell(SABLON_BASLIKLARI.yerli.indexOf('BİRİM') + 1).note)).toMatch(/ZORUNLU/);

    // Yazılan dosyada aralık olarak duruyor mu (Excel'in gördüğü)
    const zip = await JSZip.loadAsync(await yaz(wb));
    const xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
    expect(xml).toContain(`sqref="${harf('BİRİM')}2:${harf('BİRİM')}1001"`);
    expect(xml).toContain('Listeler!$A$2:$A$');
    expect(Object.keys(zip.files).some((ad) => /comments/.test(ad))).toBe(true);

    expect(SABLON_LISTELERI.birim).toContain('ADET(UNIT)');
    expect(SABLON_LISTELERI.birim).not.toContain('-');
  });

  test('doldurulan şablon içe aktarılınca bütün alanlar gelir', async () => {
    const wb = makineSablonuKitabi();
    const yerli = wb.getWorksheet('YERLİ');
    const hucre = (ws, tur, baslik, deger) => { ws.getRow(2).getCell(SABLON_BASLIKLARI[tur].indexOf(baslik) + 1).value = deger; };
    hucre(yerli, 'yerli', 'SIRA NO', 1);
    hucre(yerli, 'yerli', 'MAKİNE ID', '2339380');
    hucre(yerli, 'yerli', 'ADI VE ÖZELLİĞİ', 'ISITMA FIRINI');
    hucre(yerli, 'yerli', 'MİKTARI', 2);
    hucre(yerli, 'yerli', 'BİRİM', 'ADET(UNIT)');
    hucre(yerli, 'yerli', 'BİRİM FİYATI', 20000);
    hucre(yerli, 'yerli', 'KDV İSTİSNASI', 'EVET');
    hucre(yerli, 'yerli', 'TALEP TARİH', new Date(Date.UTC(2026, 8, 1)));

    const ithal = wb.getWorksheet('İTHAL');
    hucre(ithal, 'ithal', 'ADI VE ÖZELLİĞİ', 'AEROSOL DOLUM MAKİNASI');
    hucre(ithal, 'ithal', 'MİKTARI', 1);
    hucre(ithal, 'ithal', 'BİRİM', 'ADET(UNIT)');
    hucre(ithal, 'ithal', 'MENŞEİ ÜLKE DÖVİZ BİRİM FİYATI', 21000);
    hucre(ithal, 'ithal', 'DÖVİZ CİNSİ', 'USD');
    hucre(ithal, 'ithal', 'TOPLAM TUTAR TL', 727272);
    hucre(ithal, 'ithal', 'KULLANILMIŞ MI', 'KULLANILMIŞ KOMPLE');

    const okunan = excelSatirlariniOku(await yaz(wb));
    expect(okunan.yerli).toHaveLength(1);
    expect(okunan.ithal).toHaveLength(1);

    const y = makineSatiriCoz(okunan.yerli[0], 'yerli');
    expect(y.kalem).toMatchObject({
      siraNo: 1, makineId: '2339380', adi: 'ISITMA FIRINI', miktar: 2, birim: '142', birimFiyatiTl: 20000, kdvIstisnasi: 'EVET'
    });
    expect(y.kalem.talep).toEqual({ talepTarihi: '2026-09-01', durum: 'bakanliga_gonderildi' });

    const i = makineSatiriCoz(okunan.ithal[0], 'ithal');
    expect(i.kalem).toMatchObject({ birimFiyatiFob: 21000, doviz: 'USD', toplamTl: 727272, tlManuel: true, kullanilmisKod: '1' });

    // Boş listeye aktarım: satır eklenir, sıra no dosyadan
    const { list, added } = iceAktarimBirlestir([], [y]);
    expect(added).toBe(1);
    expect(list[0].siraNo).toBe(1);
  });

  test('müşterinin gönderdiği şablon (YERLİ/İTHAL + E-TUYS görüntü sayfaları) okunur', async () => {
    // mak_list_sablon.xlsx'in birebir başlıkları, yazım hataları ve sondaki boşluk dahil
    const wb = new ExcelJS.Workbook();
    const yerli = wb.addWorksheet('YERLİ');
    yerli.addRow(['SIRA NO', 'MAKINE ID ', 'ADI VE ÖZELLİİĞİ', 'MİKTARI', 'BİRİM', 'BİRİM FİYATI', 'TOPLAM TUTARI', 'KDV İSTİNASI',
      'FİNANSAL KİRALAMA', 'F.K. MİKTAR', 'F.K. ŞİRKETİ', 'G. ADET', 'G. TUTAR', 'TALEP TARİH', 'SONUÇ TARİH']);
    yerli.addRow([24, 2339399, 'OTOMATİK LİNEER VOLÜMETRİK DOLUM', 2, 'ADET(UNIT)', 200000, 400000, 'EVET', 'HAYIR']);
    const ithal = wb.addWorksheet('İTHAL');
    ithal.addRow(['SIRA NO', 'GTIP NO', 'ADI VE ÖZELLİĞİ', 'MİKTARI', 'BİRİM', 'MENŞEİ ÜLKE DÖVİZ BİRİM FİYATI', 'DÖVİZ CİNSİ',
      'TOPLAM TUTAR $', 'TOPLAM TUTAR TL', 'GÜMRÜK VERGİSİ İSTİNASI', 'KDV İSTİNASI', 'KULLANILMIŞ MI', 'CKD Mİ?', 'ARAÇ MI?']);
    ithal.addRow([2, '842240000019', 'KUTULAMA MAKİNASI', 1, 'ADET(UNIT)', 110000, 'EUR', 127000, 4763957, 'Hayır', 'Evet', 'Yeni Makine', 'HAYIR', 'HAYIR']);
    wb.addWorksheet('ETUYS Y. MAK. ÖRN. GÖRÜNTÜ');
    wb.addWorksheet('ETUYS İTL. MAK. ÖRN. GÖRÜNTÜ');

    const okunan = excelSatirlariniOku(await yaz(wb));
    const y = makineSatiriCoz(okunan.yerli[0], 'yerli').kalem;
    expect(y).toMatchObject({ siraNo: 24, makineId: '2339399', adi: 'OTOMATİK LİNEER VOLÜMETRİK DOLUM', miktar: 2, birim: '142', birimFiyatiTl: 200000, toplamTl: 400000, kdvIstisnasi: 'EVET' });
    const i = makineSatiriCoz(okunan.ithal[0], 'ithal').kalem;
    expect(i).toMatchObject({
      siraNo: 2, gtipKodu: '842240000019', adi: 'KUTULAMA MAKİNASI', birimFiyatiFob: 110000, doviz: 'EUR', toplamUsd: 127000,
      toplamTl: 4763957, gumrukVergisiMuafiyeti: 'HAYIR', kdvMuafiyeti: 'EVET', kullanilmisKod: '2', usdManuel: true, tlManuel: true
    });
  });

  test('tek sayfalı dosyada tür başlıklardan anlaşılır', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['Sıra No', 'Adı ve Özelliği', 'Miktarı', 'Birim', 'Menşei Ülke Döviz Birim Fiyatı(FOB)', 'Gümrük Döviz Kodu']);
    ws.addRow([1, 'Pres', 1, 'SET', 5000, 'EUR']);
    const okunan = excelSatirlariniOku(await yaz(wb));
    expect(okunan.yerli).toEqual([]);
    expect(makineSatiriCoz(okunan.ithal[0], 'ithal').kalem).toMatchObject({ adi: 'Pres', birim: '178', birimFiyatiFob: 5000, doviz: 'EUR' });
  });
});
