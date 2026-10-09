import { talepSatirlari, excelDosyaAdi, BELGE_TAKIP_EXCEL_SUTUNLARI } from './belgeTakipExcel';

const kapama = {
    takipId: 'DT2026101', firmaUnvan: 'GLOBTEKS A.Ş.', talepTuru: 'Belge Kapama Talebi',
    anaAsama: 'KURUM_DEGERLENDIRME', anaAsamaEtiketi: '2. Kurum Değerlendirme',
    durum: '2.2.1_INCELEMEDE', durumEtiketi: 'İncelemede', ytbNo: '568289',
    firma: { tamUnvan: 'GLOBTEKS A.Ş.', firmaIl: 'GAZİANTEP', firmaIlce: 'ŞEHİTKAMİL' },
    muraacatOncesi: { muraacatHazirlayanPersonel: { adSoyad: 'Berk Acar' } },
    muraacatSonrasi: { takibiYapanAdi: 'Seda Durak' },
    createdAt: '2026-10-01T09:00:00.000Z',
    zamanlama: { resmiMuracaatEksikSonGun: '2026-10-20T00:00:00.000Z' },
    sonucaAlinmaTarihi: '2026-10-05T12:00:00.000Z',
    odeme: { faturaDurumu: 'avans' }
};

test('sütunlar listedeki sırada, değerler okunur metinle', () => {
    const [satir] = talepSatirlari([kapama]);
    expect(Object.keys(satir)).toEqual(BELGE_TAKIP_EXCEL_SUTUNLARI.map(([b]) => b));
    expect(satir).toMatchObject({
        Firma: 'GLOBTEKS A.Ş.', 'Talep Türü': 'Belge Kapama Talebi', 'Aşama': '2. Kurum Değerlendirme',
        Durum: 'İncelemede', 'Belge No': '568289', 'İl / İlçe': 'GAZİANTEP / ŞEHİTKAMİL',
        'Müracaat Hazırlayan': 'Berk Acar', 'Takibi Yapan': 'Seda Durak', 'Fatura Durumu': 'Avans', 'Takip No': 'DT2026101'
    });
});

test('tarihler gerçek tarih hücresi; sonuç tarihi yoksa Sonuçlandı\'ya alınma tarihi', () => {
    const [satir] = talepSatirlari([kapama]);
    expect(satir['Oluşturma Tarihi']).toBeInstanceOf(Date);
    expect(satir['Sonuçlanma'].toISOString()).toBe('2026-10-05T12:00:00.000Z');
    const [ikinci] = talepSatirlari([{ ...kapama, sonuclanmaTarihi: '2026-10-04T00:00:00.000Z' }]);
    expect(ikinci['Sonuçlanma'].toISOString()).toBe('2026-10-04T00:00:00.000Z');
});

test('boş alanlar boş hücre olur (— ya da undefined değil)', () => {
    const [satir] = talepSatirlari([{ _id: 'x' }]);
    Object.values(satir).forEach((v) => expect(v).toBe(''));
});

test('dosya adı görünümü söyler', () => {
    expect(excelDosyaAdi('kapama', new Date(2026, 9, 7))).toBe('Belge Takip - Kapama Talepleri - 07-10-2026.xlsx');
    expect(excelDosyaAdi('arsiv', new Date(2026, 9, 7))).toBe('Belge Takip - Arşiv - 07-10-2026.xlsx');
});
