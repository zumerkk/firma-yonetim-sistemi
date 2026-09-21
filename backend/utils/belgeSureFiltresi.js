// ⏳ TEŞVİK LİSTESİ — "belge bitiş tarihi geçenler" ve süre uzatım hakkı süzgeci
//
// Müşteri (21.09.2026): "Teşvik listesine 'belge bitiş tarihi geçenler' için bir filtreleme yöntemi
// ekleyebilir miyiz? ... Amacımız süresi dolan belgeleri listeleyip, kendi içinde 'süre uzatım hakkı var
// mı, yok mu?' diye filtreleyebilmek. (Süre uzatım tarihi belge bitiş tarihinden sonraysa hakkını zaten
// kullanmıştır, yani hakkı yoktur.)"
//
// Canlı ölçüm (21.09.2026, eski sistem): 855 belgenin 564'ünün bitiş tarihi geçmiş; bunların 376'sında
// uzatım tarihi bitişten sonra (hakkı yok), 188'inde değil (hakkı var). Uzatım tarihi hemen her belgede
// dolu — uzatım yapılmamışsa bitiş tarihine eşit giriliyor; bu yüzden "boş mu" değil "bitişten sonra mı"
// sorulur. Tarihler gün başı UTC saklanıyor.

const SURE_DURUMLARI = ['gecen', 'hakki_var', 'hakki_yok'];

// "Bugün" İstanbul takvimine göre: bitiş tarihi bugün olan belge henüz geçmiş sayılmaz
function bugunBaslangici(simdi = new Date()) {
  const gun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(simdi); // "2026-09-21"
  return new Date(`${gun}T00:00:00.000Z`);
}

/**
 * @param {'gecen'|'hakki_var'|'hakki_yok'|string} sureDurumu  tanımsız değer → süzgeç yok (null)
 * @returns {object|null} Mongo sorgu parçası ({ $and: [...] })
 */
function sureFiltresi(sureDurumu, simdi = new Date()) {
  if (!SURE_DURUMLARI.includes(sureDurumu)) return null;
  const kosullar = [{ 'belgeYonetimi.belgeBitisTarihi': { $lt: bugunBaslangici(simdi) } }];
  if (sureDurumu === 'hakki_var') {
    kosullar.push({
      $or: [
        { 'belgeYonetimi.uzatimTarihi': null },
        { $expr: { $lte: ['$belgeYonetimi.uzatimTarihi', '$belgeYonetimi.belgeBitisTarihi'] } }
      ]
    });
  }
  if (sureDurumu === 'hakki_yok') {
    kosullar.push({ $expr: { $gt: ['$belgeYonetimi.uzatimTarihi', '$belgeYonetimi.belgeBitisTarihi'] } });
  }
  return { $and: kosullar };
}

/** Mevcut sorguya ekler ($or gibi başka koşulları ezmeden) */
function sureFiltresiEkle(sorgu, sureDurumu, simdi) {
  const kosul = sureFiltresi(sureDurumu, simdi);
  if (kosul) sorgu.$and = [...(sorgu.$and || []), kosul];
  return sorgu;
}

module.exports = { sureFiltresi, sureFiltresiEkle, bugunBaslangici, SURE_DURUMLARI };
