const Firma = require('../models/Firma');
const Tesvik = require('../models/Tesvik');
const YeniTesvik = require('../models/YeniTesvik');
const { ANKARA, KAZAN, KAHRAMANKAZAN } = require('../utils/ilceAdi');

async function eskiIlceKayitlariniGuncelle() {
  const alanlar = [
    [Firma, 'firmaIl', 'firmaIlce'],
    [Tesvik, 'yatirimBilgileri.yerinIl', 'yatirimBilgileri.yerinIlce'],
    [YeniTesvik, 'yatirimBilgileri.yerinIl', 'yatirimBilgileri.yerinIlce']
  ];
  const sonuclar = await Promise.all(alanlar.map(([model, il, ilce]) =>
    model.updateMany({ [il]: ANKARA, [ilce]: KAZAN }, { $set: { [ilce]: KAHRAMANKAZAN } }, { timestamps: false })
  ));
  return sonuclar.reduce((toplam, sonuc) => toplam + sonuc.modifiedCount, 0);
}

module.exports = { eskiIlceKayitlariniGuncelle };
