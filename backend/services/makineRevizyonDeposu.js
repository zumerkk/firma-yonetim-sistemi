const MakineRevizyonKaydi = require('../models/MakineRevizyonKaydi');

const anahtar = (Model, id) => ({ tesvik: id, tesvikModeli: Model.modelName });
const durum = (message) => Object.assign(new Error(message), { statusCode: 404 });
const AYRI = 'ayri';
const yeniBelgeAlanlari = () => ({ makineRevizyonDeposu: AYRI, makineRevizyonSayaci: 0, makineRevizyonlari: [] });

function snapshotDogrula(Model, snapshot) {
  const Snapshot = Model.schema.path('makineRevizyonlari').casterConstructor;
  const belge = new Snapshot(snapshot);
  const error = belge.validateSync();
  if (error) throw error;
  return belge.toObject({ depopulate: true });
}

async function transaction(Model, islem) {
  const session = await Model.startSession();
  try {
    return await session.withTransaction(() => islem(session), {
      readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }
    });
  } finally {
    await session.endSession();
  }
}

// Marker olmayan belgeler standalone Mongo dahil mevcut gömülü depoyu kullanır.
// Marker kontrolü yazma filtresinde de bulunur: göç aynı anda gerçekleşirse
// snapshot tekrar gömülü alana eklenmez; yeni depoda transaction ile kaydedilir.
async function revizyonKaydet(Model, id, snapshot, updateSet = {}) {
  const current = await Model.findById(id)
    .select('makineRevizyonDeposu makineListeleri').lean();
  if (!current) throw durum('Teşvik bulunamadı');
  if (current.makineRevizyonDeposu !== AYRI) {
    const complete = { ...snapshot };
    for (const liste of ['yerli', 'ithal']) {
      if (snapshot.revizeTuru !== 'final' || updateSet[`makineListeleri.${liste}`] === undefined) {
        complete[liste] = current.makineListeleri?.[liste] || [];
      }
    }
    const result = await Model.findOneAndUpdate({
      _id: id, makineRevizyonDeposu: { $ne: AYRI }
    }, { $push: { makineRevizyonlari: complete }, $set: updateSet }, { projection: { _id: 1 } }).lean();
    if (result) return complete;
    // Migration won the write race; repeat on the new storage instead.
    return revizyonKaydet(Model, id, snapshot, updateSet);
  }

  return transaction(Model, async (session) => {
    const belge = await Model.findById(id)
      .select('makineRevizyonDeposu makineRevizyonSayaci makineListeleri').session(session).lean();
    if (!belge) throw durum('Teşvik bulunamadı');
    if (belge.makineRevizyonDeposu !== AYRI) throw new Error('Makine revizyon deposu değişti');
    // Retry başarılı yazma sırasına uygun yeni tarih üretir; isteğin ilk
    // denemesinde atanmış eski tarih UI/Excel revizyon sırasını bozmaz.
    const data = { ...snapshot, revizeTarihi: new Date() };
    for (const liste of ['yerli', 'ithal']) {
      data[liste] = updateSet[`makineListeleri.${liste}`] ?? belge.makineListeleri?.[liste] ?? [];
    }
    const cast = snapshotDogrula(Model, data);
    const castSet = { ...updateSet };
    for (const liste of ['yerli', 'ithal']) {
      const field = `makineListeleri.${liste}`;
      // rowId defaults sadece bir defa üretilir. Snapshot ile güncel listeyi
      // ayrı cast etmek yeni satıra iki farklı kimlik atayabilir.
      if (updateSet[field] !== undefined) castSet[field] = cast[liste];
    }
    const sira = belge.makineRevizyonSayaci;
    if (!Number.isSafeInteger(sira) || sira < 0) throw new Error('Makine revizyon sayacı geçersiz');
    // Belge yazısı transaction'ın çatışma noktasıdır. Eşzamanlı finalize/start
    // retry edilir ve yeni güncel listeyle snapshot tekrar hazırlanır.
    const updated = await Model.updateOne({ _id: id, makineRevizyonDeposu: AYRI }, {
      $set: castSet, $inc: { makineRevizyonSayaci: 1 }
    }, { session, runValidators: true });
    if (updated.matchedCount !== 1) throw new Error('Makine revizyon belgesi değişti');
    await MakineRevizyonKaydi.create([{
      ...anahtar(Model, id), sira, snapshot: cast
    }], { session });
    return cast;
  });
}

async function revizyonlariOku(Model, id, { ozet = false } = {}) {
  const belge = await Model.findById(id).select('makineRevizyonDeposu').lean();
  if (!belge) return null;
  let snapshots;
  if (belge.makineRevizyonDeposu === AYRI) {
    let query = MakineRevizyonKaydi.find(anahtar(Model, id)).sort({ sira: 1 });
    if (ozet) query = query.select('-snapshot.yerli -snapshot.ithal');
    snapshots = (await query.lean()).map(r => r.snapshot);
  } else {
    let query = Model.findById(id).select('makineRevizyonlari makineRevizyonDeposu');
    if (ozet) {
      const projection = { makineRevizyonDeposu: 1 };
      for (const key of Object.keys(Model.schema.path('makineRevizyonlari').schema.paths)) {
        if (key !== 'yerli' && key !== 'ithal') projection[`makineRevizyonlari.${key}`] = 1;
      }
      query = Model.findById(id).select(projection);
    }
    const old = await query.lean();
    if (!old) return null;
    if (old.makineRevizyonDeposu === AYRI) return revizyonlariOku(Model, id, { ozet });
    snapshots = old.makineRevizyonlari || [];
  }
  // Mixed alanı Mongoose ref tanımı içermez; explicit model eski populate ile
  // aynı API sonucunu üretir. Değişen snapshot yalnız yanıt nesnesindedir.
  await Model.populate(snapshots, { path: 'yapanKullanici', model: 'User', select: 'adSoyad email' });
  return snapshots.sort((a, b) => new Date(a.revizeTarihi) - new Date(b.revizeTarihi));
}

async function ayriRevizyondanDon(Model, id, { revizeId, aciklama, yapanKullanici }) {
  const belge = await Model.findById(id).select('makineRevizyonDeposu').lean();
  if (!belge) throw durum('Teşvik bulunamadı');
  if (belge.makineRevizyonDeposu !== AYRI) return null;
  return transaction(Model, async (session) => {
    const current = await Model.findById(id)
      .select('makineRevizyonSayaci makineListeleri').session(session).lean();
    if (!current) throw durum('Teşvik bulunamadı');
    const target = await MakineRevizyonKaydi.findOne({
      ...anahtar(Model, id), 'snapshot.revizeId': revizeId
    }).session(session).lean();
    if (!target) throw durum('Revizyon bulunamadı');
    const lists = { yerli: target.snapshot.yerli || [], ithal: target.snapshot.ithal || [] };
    const cast = snapshotDogrula(Model, {
      revizeTuru: 'revert', revizeTarihi: new Date(), aciklama: aciklama || `Revizyon geri dönüş: ${revizeId}`,
      yapanKullanici, kaynakRevizeId: revizeId, ...lists
    });
    const sira = current.makineRevizyonSayaci;
    if (!Number.isSafeInteger(sira) || sira < 0) throw new Error('Makine revizyon sayacı geçersiz');
    const updated = await Model.updateOne({ _id: id, makineRevizyonDeposu: AYRI }, {
      $set: { 'makineListeleri.yerli': cast.yerli, 'makineListeleri.ithal': cast.ithal, sonGuncelleyen: yapanKullanici },
      $inc: { makineRevizyonSayaci: 1 }
    }, { session, runValidators: true });
    if (updated.matchedCount !== 1) throw new Error('Makine revizyon belgesi değişti');
    await MakineRevizyonKaydi.create([{
      ...anahtar(Model, id), sira, snapshot: cast
    }], { session });
    return { snapshot: cast, makineListeleri: { ...current.makineListeleri, yerli: cast.yerli, ithal: cast.ithal } };
  });
}

async function ayriMetaGuncelle(Model, id, revizeId, meta) {
  const belge = await Model.findById(id).select('makineRevizyonDeposu').lean();
  if (!belge) throw durum('Teşvik bulunamadı');
  if (belge.makineRevizyonDeposu !== AYRI) return null;
  const allowed = ['talepNo', 'belgeNo', 'belgeId', 'basvuruTarihi', 'odemeTalebi', 'retSebebi'];
  const update = {};
  for (const key of allowed) {
    if (meta?.[key] === undefined) continue;
    // Mevcut alt şemanın casting/validation kuralları meta için de korunur.
    const path = Model.schema.path('makineRevizyonlari').schema.path(key);
    const cast = path.applySetters(meta[key], null);
    await new Promise((resolve, reject) => path.doValidate(cast, err => err ? reject(err) : resolve(), null));
    update[`snapshot.${key}`] = cast;
  }
  let result;
  if (Object.keys(update).length) {
    result = await MakineRevizyonKaydi.findOneAndUpdate({
      ...anahtar(Model, id), 'snapshot.revizeId': revizeId
    }, { $set: update }, { new: true }).lean();
  } else {
    result = await MakineRevizyonKaydi.findOne({ ...anahtar(Model, id), 'snapshot.revizeId': revizeId }).lean();
  }
  if (!result) throw durum('Revizyon kaydı bulunamadı');
  return result.snapshot;
}

module.exports = { yeniBelgeAlanlari, revizyonKaydet, revizyonlariOku, ayriRevizyondanDon, ayriMetaGuncelle };
