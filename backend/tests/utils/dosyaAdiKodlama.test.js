// 🧪 Dosya adı kodlaması
//
// Müşteri (16.09.2026, İşlem & Evrak → Firmadan Gelen Evraklar): dosya adları listede
// "GÃ¼ncel Ä°mza SirkÃ¼leri.pdf" gibi görünüyor. multer adı latin1 çözdüğü için UTF-8 baytları
// tek tek karaktere dönüşmüş; onarım aynı baytları geri yazıp UTF-8 okumaktan ibaret.
//
// Testlerde bozuk adlar KAÇIŞ DİZİLERİYLE yazıldı: kayıttaki metin "Ã" + U+0087 gibi görünmez
// denetim karakterleri içeriyor, editörde okunan "Ã‡" ile aynı şey değil.

const { dosyaAdiDuzelt, dosyaAdiBozukMu } = require('../../utils/dosyaAdiKodlama');

describe('dosyaAdiDuzelt', () => {
  test('latin1 okunmuş UTF-8 adı onarır', () => {
    expect(dosyaAdiDuzelt('GÃ¼ncel Ä°mza SirkÃ¼leri.pdf'))
      .toBe('Güncel İmza Sirküleri.pdf');
    expect(dosyaAdiDuzelt('2025 Vergi LevhasÄ±.pdf')).toBe('2025 Vergi Levhası.pdf');
    expect(dosyaAdiDuzelt('Ãevre Ä°zni Kapsam DÄ±ÅÄ± 2019.pdf'))
      .toBe('Çevre İzni Kapsam Dışı 2019.pdf');
  });

  test('zaten doğru yazılmış adlara dokunmaz', () => {
    expect(dosyaAdiDuzelt('Güncel İmza Sirküleri.pdf')).toBe('Güncel İmza Sirküleri.pdf');
    expect(dosyaAdiDuzelt('SGK BorcuYoktur_15092026_120316.pdf')).toBe('SGK BorcuYoktur_15092026_120316.pdf');
    expect(dosyaAdiDuzelt('WhatsApp Image 2026-09-15 at 12.00.43.jpeg')).toBe('WhatsApp Image 2026-09-15 at 12.00.43.jpeg');
  });

  test('boş ve tanımsız değerler', () => {
    expect(dosyaAdiDuzelt('')).toBe('');
    expect(dosyaAdiDuzelt(undefined)).toBe('');
    expect(dosyaAdiDuzelt(null)).toBe('');
  });

  // Çevrim geçersiz bayt üretiyorsa ada dokunulmaz: yanlış onarım, bozuk addan daha kötü
  test('geçersiz dizi onarılmaya çalışılmaz', () => {
    const ad = 'Ã¿Ã dosya.pdf';
    const sonuc = dosyaAdiDuzelt(ad);
    expect(sonuc === ad || !sonuc.includes('�')).toBe(true);
  });

  test('dosyaAdiBozukMu', () => {
    expect(dosyaAdiBozukMu('GÃ¼ncel.pdf')).toBe(true);
    expect(dosyaAdiBozukMu('Güncel.pdf')).toBe(false);
    expect(dosyaAdiBozukMu('')).toBe(false);
  });
});
