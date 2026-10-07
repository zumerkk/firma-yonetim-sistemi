// Eski sistem (US-97) ana faaliyet konusu listesi — müşteri (07.10.2026): "eski sistem için sadece
// 175 kod çıkıyor ... Mesela 2924 gibi kodlar yok". Liste artık E-TUYS US-97 dosyasındaki 292 sınıfın tamamı.
import { YATIRIM_DATA } from './yatirimData';

const liste = YATIRIM_DATA.YATIRIM_KONULARI;
const kod = (s) => Number(s.split(' / ')[0]);

test('292 sınıfın tamamı, tekrarsız', () => {
  expect(liste).toHaveLength(292);
  expect(new Set(liste.map(kod)).size).toBe(292);
});

test('müşterinin örneği 2924 listede', () => {
  expect(liste).toContain('2924 / MADEN, TAŞOCAĞI VE İNŞAAT MAKİNELERİ İMALATI');
});

test('eski kayıtların metni değişmedi (firmalarda kayıtlı değer seçenekle eşleşsin)', () => {
  ['1010 / TAŞKÖMÜRÜ MADENCİLİĞİ', '122 / DİĞER HAYVANLARIN YETİŞTIRİLMESİ; BAŞKA YERDE SINIFLANDIRILMAMIŞ HAYVANSAL ÜRÜNLERİN ÜRETİMİ',
    '9500 / EVLERDE YAPTIRILAN HİZMET İŞLERİ'].forEach((s) => expect(liste).toContain(s));
});

test('kod sırasına göre dizili', () => {
  const kodlar = liste.map(kod);
  expect(kodlar).toEqual([...kodlar].sort((a, b) => a - b));
});
