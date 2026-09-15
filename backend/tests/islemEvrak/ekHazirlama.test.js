// 🧪 İşlem & Evrak — mail ekleri
//
// Müşteri (15.09.2026): "SMTP ile gönderirken 'Mail gönderilemedi. Lütfen SMTP ayarlarını ve internet
// bağlantısını kontrol edin.' hatası alıyoruz mail gönderemiyoruz." Sebep SMTP değildi: Cloudinary'deki
// örnek dosyanın adresi nodemailer'a veriliyor, PDF teslimat kısıtı yüzünden indirme 401 dönüyor ve
// gönderimin tamamı düşüyordu.

const storage = require('../../services/tesvikMakine/storageService');
const { ekleriHazirla } = require('../../services/islemEvrak/islemEvrakService');

describe('cloudinaryUrlCoz', () => {
  test("'auto' ile yüklenmiş PDF (image türü): uzantı biçim olur", () => {
    expect(storage.cloudinaryUrlCoz('https://res.cloudinary.com/drweumniy/image/upload/v1757000000/tesvik-evrak/Islem_Evrak/Ornek_Sablonlar/taahhutname_1757.pdf'))
      .toEqual({
        resourceType: 'image',
        deliveryType: 'upload',
        publicId: 'tesvik-evrak/Islem_Evrak/Ornek_Sablonlar/taahhutname_1757',
        format: 'pdf'
      });
  });

  test('raw dosyada uzantı public_id içinde kalır', () => {
    expect(storage.cloudinaryUrlCoz('https://res.cloudinary.com/x/raw/upload/v12/dosya-takip/171-belge.docx'))
      .toEqual({ resourceType: 'raw', deliveryType: 'upload', publicId: 'dosya-takip/171-belge.docx', format: '' });
  });

  test('imzalı ve Türkçe karakteri kodlanmış adres', () => {
    expect(storage.cloudinaryUrlCoz('https://res.cloudinary.com/x/image/upload/s--AbC--/v9/klas%C3%B6r/%C3%B6rnek.png'))
      .toMatchObject({ publicId: 'klasör/örnek', format: 'png' });
  });

  test.each([[''], [null], ['https://example.com/a.pdf'], ['/uploads/a.pdf']])('%p Cloudinary değil → null', (url) => {
    expect(storage.cloudinaryUrlCoz(url)).toBeNull();
  });
});

describe('ekleriHazirla', () => {
  const bulut = { dosyaAdi: 'Taahhütname.pdf', fileUrl: 'https://res.cloudinary.com/x/image/upload/v1/a.pdf', mimeType: 'application/pdf' };
  const yerel = { dosyaAdi: 'Yetki.docx', filePath: 'Islem_Evrak/Ornek/yetki.docx' };

  test('bulut dosyası indirilip içerik olarak eklenir; adres nodemailer\'a verilmez', async () => {
    const { attachments, atlananEkler } = await ekleriHazirla([bulut], {
      buluttanIndir: async () => ({ buffer: Buffer.from('%PDF'), contentType: 'application/pdf' }),
      dosyaVarMi: () => true
    });
    expect(atlananEkler).toEqual([]);
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({ filename: 'Taahhütname.pdf', contentType: 'application/pdf' });
    expect(attachments[0].path).toBeUndefined();
    expect(Buffer.isBuffer(attachments[0].content)).toBe(true);
  });

  // Tek bir erişilemeyen dosya yüzünden mailin tamamı gitmemeliydi
  test('alınamayan bulut dosyası ve diskte olmayan dosya atlanır, gönderim sürer', async () => {
    const { attachments, atlananEkler } = await ekleriHazirla([bulut, yerel], {
      buluttanIndir: async () => null,
      dosyaVarMi: () => false
    });
    expect(attachments).toEqual([]);
    expect(atlananEkler).toEqual(['Taahhütname.pdf', 'Yetki.docx']);
  });

  test('diskteki dosya yol olarak eklenir', async () => {
    const { attachments } = await ekleriHazirla([yerel], { buluttanIndir: async () => null, dosyaVarMi: () => true });
    expect(attachments[0].filename).toBe('Yetki.docx');
    expect(attachments[0].path).toMatch(/Islem_Evrak\/Ornek\/yetki\.docx$/);
  });

  test('boş / tanımsız liste', async () => {
    expect(await ekleriHazirla(undefined)).toEqual({ attachments: [], atlananEkler: [] });
  });
});
