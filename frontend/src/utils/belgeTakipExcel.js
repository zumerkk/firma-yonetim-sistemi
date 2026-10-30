// 📊 Belge Takip listesi → Excel
//
// Müşteri (07.10.2026): "Bu talepleri excel çıktısı olarak alabilme imkanımız var mı acaba? Kapama
// talepleri vs olarak." Ekrandaki görünüm (aktif / kapama / arşiv) ve süzgeçlerle AYNI küme, sayfa
// sınırı olmadan iner. Sütunlar listedekilerle aynı sırada; tarihler gerçek tarih hücresi (Excel'de
// sıralanabilsin).

import { FATURA_DURUMU, CARI_DURUMU_SECENEKLERI, CARI_KAYDI_SECENEKLERI, secenekEtiketi } from './cariFormat';
import { takipEdenAdlari } from './takipEdenler';

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
    ['Takibi Yapan', (t) => takipEdenAdlari(t).join(', '), 20],
    ['Uzman', (t) => t.muraacatSonrasi?.kurumDegerlendirme?.daireUzman || '', 20],
    ['Oluşturma Tarihi', (t) => tarihHucresi(t.createdAt), 14],
    ['Resmi Müracaat Eksik Son Gün', (t) => tarihHucresi(t.zamanlama?.resmiMuracaatEksikSonGun), 16],
    ['Sonuçlanma', (t) => tarihHucresi(t.sonuclanmaTarihi || t.sonucaAlinmaTarihi), 14],
    ['Fatura Durumu', (t) => FATURA_DURUMU[t.odeme?.faturaDurumu]?.etiket || '', 14],
    ['Takip No', (t) => t.takipId || '', 14]
];

// Arşivde en başta (listedeki gibi) — müşteri, 27-28.10.2026
const ARSIV_CARI_SUTUNLARI = [
    ['Cari Kaydı', (t) => (t.odeme?.cariKaydi ? secenekEtiketi(CARI_KAYDI_SECENEKLERI, t.odeme.cariKaydi) : ''), 14],
    ['Cari Durumu', (t) => (t.firma ? secenekEtiketi(CARI_DURUMU_SECENEKLERI, t.firma.cariDurumu || 'acik') : ''), 14]
];

export const excelSutunlari = (gorunum) => (
    gorunum === 'arsiv' ? [...ARSIV_CARI_SUTUNLARI, ...BELGE_TAKIP_EXCEL_SUTUNLARI] : BELGE_TAKIP_EXCEL_SUTUNLARI
);

export const talepSatirlari = (talepler = [], gorunum) => talepler.map((t) => Object.fromEntries(
    excelSutunlari(gorunum).map(([baslik, deger]) => [baslik, deger(t)])
));

export const excelDosyaAdi = (gorunum, tarih = new Date()) =>
    `Belge Takip - ${GORUNUM_ADI[gorunum] || 'Talepler'} - ${tarih.toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;

/** xlsx paketi yalnız düğmeye basılınca iner (liste ekranının paketini büyütmesin) */
export async function belgeTakipExcelIndir(talepler, gorunum) {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(talepSatirlari(talepler, gorunum), { cellDates: true, dateNF: 'dd.mm.yyyy' });
    ws['!cols'] = excelSutunlari(gorunum).map(([, , wch]) => ({ wch }));
    ws['!autofilter'] = { ref: ws['!ref'] }; // başlıklarda Excel süzgeci
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (GORUNUM_ADI[gorunum] || 'Talepler').slice(0, 31));
    XLSX.writeFile(wb, excelDosyaAdi(gorunum));
}
