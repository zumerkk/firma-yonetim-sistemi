// 📊 Belge Takip listesi → Excel
//
// Müşteri (07.10.2026): "Bu talepleri excel çıktısı olarak alabilme imkanımız var mı acaba? Kapama
// talepleri vs olarak." Ekrandaki görünüm (aktif / kapama / arşiv) ve süzgeçlerle AYNI küme, sayfa
// sınırı olmadan iner. Sütunlar listedekilerle aynı sırada; tarihler gerçek tarih hücresi (Excel'de
// sıralanabilsin).

import { FATURA_DURUMU } from './cariFormat';

const GORUNUM_ADI = { aktif: 'Aktif Talepler', kapama: 'Kapama Talepleri', arsiv: 'Arşiv' };

const tarihHucresi = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d;
};

const kisi = (personel, ad) => personel?.adSoyad || ad || '';

export const BELGE_TAKIP_EXCEL_SUTUNLARI = [
    ['Firma', (t) => t.firmaUnvan || t.firma?.tamUnvan || '', 45],
    ['Talep Türü', (t) => t.talepTuru || '', 32],
    ['Aşama', (t) => t.anaAsamaEtiketi || t.anaAsama || '', 22],
    ['Durum', (t) => t.durumEtiketi || t.durum || '', 28],
    ['Belge No', (t) => t.ytbNo || '', 12],
    ['İl / İlçe', (t) => [t.firma?.firmaIl, t.firma?.firmaIlce].filter(Boolean).join(' / '), 22],
    ['Müracaat Hazırlayan', (t) => kisi(t.muraacatOncesi?.muraacatHazirlayanPersonel, t.muraacatOncesi?.muraacatHazirlayanAdi), 20],
    ['Takibi Yapan', (t) => kisi(t.muraacatSonrasi?.takibiYapanPersonel, t.muraacatSonrasi?.takibiYapanAdi), 20],
    ['Oluşturma Tarihi', (t) => tarihHucresi(t.createdAt), 14],
    ['Resmi Müracaat Eksik Son Gün', (t) => tarihHucresi(t.zamanlama?.resmiMuracaatEksikSonGun), 16],
    ['Sonuçlanma', (t) => tarihHucresi(t.sonuclanmaTarihi || t.sonucaAlinmaTarihi), 14],
    ['Fatura Durumu', (t) => FATURA_DURUMU[t.odeme?.faturaDurumu]?.etiket || '', 14],
    ['Takip No', (t) => t.takipId || '', 14]
];

export const talepSatirlari = (talepler = []) => talepler.map((t) => Object.fromEntries(
    BELGE_TAKIP_EXCEL_SUTUNLARI.map(([baslik, deger]) => [baslik, deger(t)])
));

export const excelDosyaAdi = (gorunum, tarih = new Date()) =>
    `Belge Takip - ${GORUNUM_ADI[gorunum] || 'Talepler'} - ${tarih.toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;

/** xlsx paketi yalnız düğmeye basılınca iner (liste ekranının paketini büyütmesin) */
export async function belgeTakipExcelIndir(talepler, gorunum) {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(talepSatirlari(talepler), { cellDates: true, dateNF: 'dd.mm.yyyy' });
    ws['!cols'] = BELGE_TAKIP_EXCEL_SUTUNLARI.map(([, , wch]) => ({ wch }));
    ws['!autofilter'] = { ref: ws['!ref'] }; // başlıklarda Excel süzgeci
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (GORUNUM_ADI[gorunum] || 'Talepler').slice(0, 31));
    XLSX.writeFile(wb, excelDosyaAdi(gorunum));
}
