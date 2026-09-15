// 🧪 Özel şart / destek unsuru şeması — boş alanlar belge kaydını düşürmemeli
//
// Müşteri (15.09.2026): "özel şart ve destek unsurları kısmına yazı yazdığımızda kaydetmiyor"
// ve "destek unsurunun şartını boş bırakamıyoruz". Kısaltması boş (yalnız açıklaması yazılmış)
// özel şart, zorunlu alan hatasıyla belgenin TAMAMININ kaydını düşürüyordu.

const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');

const hatalar = (belge) => belge.validateSync()?.errors || {};

describe.each([['Tesvik', Tesvik], ['YeniTesvik', YeniTesvik]])('%s modeli', (_ad, Model) => {
  test('kısaltması boş, açıklaması dolu özel şart geçerli', () => {
    const b = new Model({ ozelSartlar: [{ koşulNo: 1, koşulMetni: '', aciklamaNotu: 'Nakil halinde bakanlık izni alınır' }] });
    expect(hatalar(b)['ozelSartlar.0.koşulMetni']).toBeUndefined();
    expect(b.ozelSartlar[0].koşulMetni).toBe('');
  });

  test('kısaltma hiç verilmezse boş metin olarak saklanır', () => {
    const b = new Model({ ozelSartlar: [{ koşulNo: 1, aciklamaNotu: 'Açıklama' }] });
    expect(hatalar(b)['ozelSartlar.0.koşulMetni']).toBeUndefined();
    expect(b.ozelSartlar[0].koşulMetni).toBe('');
  });

  test('şartı boş destek unsuru geçerli ve boş kalır', () => {
    const b = new Model({ destekUnsurlari: [{ destekUnsuru: 'KDV İstisnası', sarti: '' }] });
    expect(hatalar(b)['destekUnsurlari.0.sarti']).toBeUndefined();
    expect(b.destekUnsurlari[0].sarti).toBe('');
  });

  test('destek unsurunun adı hâlâ zorunlu', () => {
    const b = new Model({ destekUnsurlari: [{ destekUnsuru: '', sarti: 'X' }] });
    expect(hatalar(b)['destekUnsurlari.0.destekUnsuru']).toBeDefined();
  });
});
