// 🧪 Müşteri görünümü PDF/Excel — Finansal Kiralama sütunu
// Müşteri (21.09.2026): "Sistemdeki F.K. verisini çeksin; karşılığı 'Evet' ise 'Yapıldı', 'Hayır' ise
// 'Yapılmadı' olarak yazsın."
import { finansalKiralamaEtiketi } from './makineFormat';

test.each([
    ['EVET', 'Yapıldı'],
    ['evet', 'Yapıldı'],
    ['HAYIR', 'Yapılmadı'],
    ['Hayır', 'Yapılmadı'],
    ['', '-'],
    [undefined, '-']
])('%s → %s', (deger, beklenen) => {
    expect(finansalKiralamaEtiketi(deger)).toBe(beklenen);
});
