// 🧪 CariHareket modeli — türe bağlı zorunluluklar
//
// DB'siz: validate() bellekte çalışır ve pre('validate') kancasını da işletir.

const CariHareket = require('../../models/CariHareket');

const kur = (yama = {}) => new CariHareket({
  firma: '000000000000000000000001',
  firmaUnvan: 'TEST FİRMA A.Ş.',
  tur: 'gelen',
  banka: 'Garanti',
  tarih: new Date('2026-09-15'),
  tutar: 1000,
  ...yama
});

const hatalar = async (doc) => {
  try {
    await doc.validate();
    return {};
  } catch (e) {
    return e.errors || { _: e };
  }
};

describe('CariHareket - geçerli kayıtlar', () => {
  test('gelen: banka + tarih + tutar yeterli', async () => {
    expect(await hatalar(kur())).toEqual({});
  });

  test('ödenen: belge adıyla geçerli, dosya opsiyonel', async () => {
    expect(await hatalar(kur({ tur: 'odenen', banka: '', belgeAdi: 'Belge harcı makbuzu' }))).toEqual({});
  });

  // Müşterinin Excel'inde fatura numarası çoğu satırda boş
  test('fatura: fatura numarası opsiyonel', async () => {
    expect(await hatalar(kur({ tur: 'fatura', banka: '' }))).toEqual({});
  });
});

describe('CariHareket - reddedilenler (okunur mesajla)', () => {
  test('gelen hareket bankasız olamaz', async () => {
    expect((await hatalar(kur({ banka: '' }))).banka.message).toBe('Banka seçimi zorunludur');
  });

  test('ödenen hareket belge adısız olamaz', async () => {
    expect((await hatalar(kur({ tur: 'odenen', belgeAdi: '   ' }))).belgeAdi.message).toBe('Hizmet ve yatırım ödemesinin adı zorunludur');
  });

  test.each([0, -5])('tutar %p reddedilir', async (tutar) => {
    expect((await hatalar(kur({ tutar }))).tutar.message).toBe('Tutar sıfırdan büyük olmalıdır');
  });

  test('tutarsız ve tarihsiz kayıt', async () => {
    const e = await hatalar(kur({ tutar: undefined, tarih: undefined }));
    expect(e.tutar.message).toBe('Tutar zorunludur');
    expect(e.tarih.message).toBe('Tarih zorunludur');
  });

  test('listede olmayan banka', async () => {
    expect((await hatalar(kur({ banka: 'Akbank' }))).banka.message).toBe('Geçersiz banka');
  });

  test('bilinmeyen tür', async () => {
    expect((await hatalar(kur({ tur: 'iade' }))).tur.message).toBe('Geçersiz hareket türü');
  });

  test('firmasız kayıt', async () => {
    expect((await hatalar(kur({ firma: undefined }))).firma.message).toBe('Firma seçimi zorunludur');
  });
});

describe('CariHareket - normalleştirme', () => {
  test('tutar kuruşa yuvarlanır', () => {
    expect(kur({ tutar: 10.456 }).tutar).toBe(10.46);
  });

  test('başka türe ait alan temizlenir', async () => {
    const d = kur({ tur: 'odenen', belgeAdi: 'Makbuz', banka: 'Garanti', faturaNo: 'F-1' });
    await d.validate();
    expect(d.banka).toBe('');
    expect(d.faturaNo).toBe('');
  });

  // Müşteri (21.09.2026): elle yazılan ödeme adları tamamen büyük harfe çevrilsin
  test('ödeme adı Türkçe kuralla büyük harfe çevrilir', async () => {
    const d = kur({ tur: 'odenen', belgeAdi: 'yatırım indirimi hizmet bedeli' });
    await d.validate();
    expect(d.belgeAdi).toBe('YATIRIM İNDİRİMİ HİZMET BEDELİ');
  });

  test('yeni kayıtta talep bağı ve dosya boş', () => {
    const d = kur();
    expect(d.dosyaTakip).toBeNull();
    expect(d.dosya).toBeNull();
  });
});
