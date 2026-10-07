// Eski gömülü revizyonları, geçmişi silmeden ayrı depoya taşır.
// İşlem belge başına transaction içindedir; tekrar çalıştırmak güvenlidir.
const crypto = require('crypto');
const mongoose = require('mongoose');

const { EJSON, calculateObjectSize } = mongoose.mongo.BSON;
const DEPO_KOLEKSIYONU = 'makinerevizyonkaydis';
const BELGE_KOLEKSIYONLARI = { Tesvik: 'tesviks', YeniTesvik: 'yenitesvik' };
const AYRI_DEPO = 'ayri';

function anahtarSirala(deger) {
  if (Array.isArray(deger)) return deger.map(anahtarSirala);
  if (deger && typeof deger === 'object') {
    return Object.fromEntries(Object.keys(deger).sort().map((k) => [k, anahtarSirala(deger[k])]));
  }
  return deger;
}

// Relaxed:false Date/ObjectId/Decimal128 gibi BSON tiplerinin anlamını korur.
function veriHash(deger) {
  const kanonik = anahtarSirala(EJSON.serialize(deger, { relaxed: false }));
  return crypto.createHash('sha256').update(JSON.stringify(kanonik)).digest('hex');
}

function revizyonlariDogrula(snapshotlar) {
  if (!Array.isArray(snapshotlar)) throw new Error('Revizyon geçmişi bir dizi olmalı.');
  const kimlikler = new Set();
  for (const snapshot of snapshotlar) {
    if (typeof snapshot?.revizeId !== 'string' || !snapshot.revizeId.trim()) {
      throw new Error('Revize kimliği olmayan geçmiş taşınamaz; kaynak kayıt korunuyor.');
    }
    if (kimlikler.has(snapshot.revizeId)) {
      throw new Error('Mükerrer revize kimliği var; kaynak kayıt korunuyor.');
    }
    kimlikler.add(snapshot.revizeId);
  }
}

function kayitlariDogrula(kayitlar, snapshotlar) {
  if (kayitlar.length !== snapshotlar.length) throw new Error('Ayrı depoda revizyon adedi uyuşmuyor.');
  const sirali = [...kayitlar].sort((a, b) => a.sira - b.sira);
  for (let sira = 0; sira < snapshotlar.length; sira++) {
    if (Number(sirali[sira].sira) !== sira || veriHash(sirali[sira].snapshot) !== veriHash(snapshotlar[sira])) {
      throw new Error('Ayrı depoda revizyon sırası/içeriği uyuşmuyor.');
    }
  }
  return sirali;
}

function belgeFiltre({ ids = [] } = {}) {
  const filtre = { makineRevizyonDeposu: { $ne: AYRI_DEPO } };
  if (ids.length) filtre._id = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
  return filtre;
}

function ozet({ model, parent }) {
  const snapshotlar = parent.makineRevizyonlari || [];
  revizyonlariDogrula(snapshotlar);
  const historyBytes = calculateObjectSize({ makineRevizyonlari: snapshotlar });
  return {
    model, id: parent._id.toString(),
    unvan: parent.firmaBilgileri?.unvan || parent.firmaBilgileri?.tamUnvan || parent.tamUnvan || '',
    revizyonAdedi: snapshotlar.length,
    belgeByte: calculateObjectSize(parent), gecmisByte: historyBytes,
    gecmisHash: veriHash(snapshotlar)
  };
}

async function* kaynaklariOku(db, { ids = [], modeller = Object.keys(BELGE_KOLEKSIYONLARI) } = {}) {
  for (const model of modeller) {
    if (!BELGE_KOLEKSIYONLARI[model]) throw new Error('Geçersiz belge modeli.');
    const cursor = db.collection(BELGE_KOLEKSIYONLARI[model]).find(belgeFiltre({ ids }), { batchSize: 1, promoteValues: false });
    try {
      for await (const parent of cursor) {
        const externalRecords = await db.collection(DEPO_KOLEKSIYONU)
          .find({ tesvikModeli: model, tesvik: parent._id }, { batchSize: 1, promoteValues: false }).sort({ sira: 1 }).toArray();
        yield { model, parent, externalRecords };
      }
    } finally { await cursor.close(); }
  }
}

async function indeksleriSagla(db) {
  await db.collection(DEPO_KOLEKSIYONU).createIndex(
    { tesvikModeli: 1, tesvik: 1, 'snapshot.revizeId': 1 }, { unique: true }
  );
  await db.collection(DEPO_KOLEKSIYONU).createIndex(
    { tesvikModeli: 1, tesvik: 1, sira: 1 }, { unique: true }
  );
}

async function belgeyiTasi({ db, client, kaynak }) {
  const { model, parent: yedekteki } = kaynak;
  const parentCollection = db.collection(BELGE_KOLEKSIYONLARI[model]);
  const depo = db.collection(DEPO_KOLEKSIYONU);
  const session = client.startSession();
  let sonuc;
  try {
    await session.withTransaction(async () => {
      const parent = await parentCollection.findOne({ _id: yedekteki._id }, { session, promoteValues: false });
      if (!parent) throw new Error('Belge bulunamadı; taşıma yapılmadı.');
      const filtre = { tesvikModeli: model, tesvik: parent._id };
      if (parent.makineRevizyonDeposu === AYRI_DEPO) {
        // Önceki çalışma tamamlandıysa eksiksiz aynı geçmişi doğrula ve çık.
        const kayitlar = await depo.find(filtre, { session, promoteValues: false }).toArray();
        kayitlariDogrula(kayitlar, yedekteki.makineRevizyonlari || []);
        sonuc = { ...ozet(kaynak), durum: 'zaten_tasinmis' };
        return;
      }
      const snapshotlar = parent.makineRevizyonlari || [];
      revizyonlariDogrula(snapshotlar);
      if (veriHash(snapshotlar) !== veriHash(yedekteki.makineRevizyonlari || [])) {
        throw new Error('Yedekten sonra revizyon geçmişi değişmiş; yeniden yedek alarak çalıştırın.');
      }
      // Native BSON yazımı: strict schema eski/özel alanları düşürmesin.
      for (let sira = 0; sira < snapshotlar.length; sira++) {
        const snapshot = snapshotlar[sira];
        const kayitFiltre = { ...filtre, 'snapshot.revizeId': snapshot.revizeId };
        const mevcut = await depo.findOne(kayitFiltre, { session, promoteValues: false });
        if (mevcut) {
          if (Number(mevcut.sira) !== sira || veriHash(mevcut.snapshot) !== veriHash(snapshot)) {
            throw new Error('Ayrı depoda çelişen geçmiş var; kaynak kayıt korunuyor.');
          }
        } else {
          await depo.updateOne(kayitFiltre, { $setOnInsert: { ...filtre, sira, snapshot } }, { upsert: true, session });
        }
      }
      const kayitlar = await depo.find(filtre, { session, promoteValues: false }).toArray();
      kayitlariDogrula(kayitlar, snapshotlar);
      const guncelleme = await parentCollection.updateOne(
        { _id: parent._id, makineRevizyonDeposu: { $ne: AYRI_DEPO } },
        { $unset: { makineRevizyonlari: '' }, $set: { makineRevizyonDeposu: AYRI_DEPO, makineRevizyonSayaci: snapshotlar.length } }, { session }
      );
      if (guncelleme.modifiedCount !== 1) throw new Error('Kaynak belge güncellenmedi; transaction iptal edildi.');
      sonuc = { ...ozet(kaynak), durum: 'tasindi' };
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return sonuc;
  } finally { await session.endSession(); }
}

async function belgeyiGeriAl({ db, client, kaynak, apply = false }) {
  const { model, parent: yedekteki, externalRecords = [] } = kaynak;
  const parentCollection = db.collection(BELGE_KOLEKSIYONLARI[model]);
  const depo = db.collection(DEPO_KOLEKSIYONU);
  const session = client.startSession();
  let sonuc;
  try {
    await session.withTransaction(async () => {
      const parent = await parentCollection.findOne({ _id: yedekteki._id }, { session, promoteValues: false });
      if (!parent) throw new Error('Geri alınacak belge bulunamadı.');
      const filtre = { tesvikModeli: model, tesvik: parent._id };
      if (parent.makineRevizyonDeposu !== AYRI_DEPO) {
        if (veriHash(parent.makineRevizyonlari || []) !== veriHash(yedekteki.makineRevizyonlari || [])) {
          throw new Error('Gömülü geçmiş değişmiş; geri alma güvenli değil.');
        }
        sonuc = { ...ozet(kaynak), durum: 'zaten_gomulu' };
        return;
      }
      const kayitlar = await depo.find(filtre, { session, promoteValues: false }).toArray();
      // Taşıma sonrasında yeni revizyon varsa eski yedekle üzerine yazma.
      kayitlariDogrula(kayitlar, yedekteki.makineRevizyonlari || []);
      if (apply) {
        const update = { $set: {}, $unset: {} };
        if (Object.hasOwn(yedekteki, 'makineRevizyonlari')) update.$set.makineRevizyonlari = yedekteki.makineRevizyonlari;
        else update.$unset.makineRevizyonlari = '';
        if (Object.hasOwn(yedekteki, 'makineRevizyonDeposu')) update.$set.makineRevizyonDeposu = yedekteki.makineRevizyonDeposu;
        else update.$unset.makineRevizyonDeposu = '';
        if (Object.hasOwn(yedekteki, 'makineRevizyonSayaci')) update.$set.makineRevizyonSayaci = yedekteki.makineRevizyonSayaci;
        else update.$unset.makineRevizyonSayaci = '';
        if (!Object.keys(update.$unset).length) delete update.$unset;
        if (!Object.keys(update.$set).length) delete update.$set;
        await parentCollection.updateOne({ _id: parent._id }, update, { session });
        await depo.deleteMany(filtre, { session });
        if (externalRecords.length) await depo.insertMany(externalRecords, { session });
      }
      sonuc = { ...ozet(kaynak), durum: apply ? 'geri_alindi' : 'geri_alma_dogrulandi' };
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return sonuc;
  } finally { await session.endSession(); }
}

module.exports = {
  DEPO_KOLEKSIYONU, BELGE_KOLEKSIYONLARI, AYRI_DEPO,
  veriHash, revizyonlariDogrula, kayitlariDogrula, belgeFiltre, ozet,
  kaynaklariOku, indeksleriSagla, belgeyiTasi, belgeyiGeriAl
};
