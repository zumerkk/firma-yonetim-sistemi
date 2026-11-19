// Firma bağlantısı kendi belgesinin harcama ve gerçekleşen makine kalemlerini yönetir.
// Belge alanları ve ekler beyaz listeyle çıkar; özel notlar, personel kimlikleri,
// depo bilgileri ve başka belgelerin bağlantıları yanıtın dışında tutulur.

const crypto = require('crypto');
const mongoose = require('mongoose');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const resolver = require('../tesvikMakine/certificateResolver');
const mps = require('../tesvikMakine/machineProcessService');
const faturaEvrakService = require('../tesvikMakine/faturaEvrakService');
const evrakDeposu = require('../tesvikMakine/faturaEvrakDeposu');
const harcama = require('../tesvikMakine/harcamaService');
const { HARCAMA_KATEGORILERI } = require('../../constants/harcama');
const gerceklesmeService = require('../tesvikMakine/gerceklesmeService');
const { buildUploadLink } = require('../tesvikMakine/uploadTokenService');
const { bugunBaslangici } = require('../../utils/belgeSureFiltresi');

const MODELLER = { Tesvik, YeniTesvik };
const TOKEN_BICIMI = /^[A-Za-z0-9_-]{20,64}$/;
const SAYFA_YOLU = '/belge';

function hata(mesaj, code, status) {
  const e = new Error(mesaj); e.code = code; e.status = status; return e;
}

function modelAl(tesvikModel) {
  if (!Object.prototype.hasOwnProperty.call(MODELLER, tesvikModel)) {
    throw hata('Geçersiz belge türü. Sayfayı yenileyip belgeyi yeniden açın.', 'BAD_MODEL', 400);
  }
  return MODELLER[tesvikModel];
}

function belgeKimliginiDogrula(tesvikId) {
  if (!mongoose.isObjectIdOrHexString(tesvikId)) {
    throw hata('Belge kimliği geçersiz. Sayfayı yenileyip belgeyi yeniden açın.', 'BAD_CERT_ID', 400);
  }
}

// Bu okuma makine listelerini ve büyüyen revizyon geçmişini belleğe almaz.
const portalOku = (M, tesvikId) => M.findById(tesvikId).select('musteriPortal').lean();

const linkYaz = (token) => buildUploadLink(token, SAYFA_YOLU);

function gunTarihiniOku(deger) {
  if (typeof deger !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(deger)) return null;
  const tarih = new Date(`${deger}T00:00:00.000Z`);
  return Number.isFinite(tarih.getTime()) && tarih.toISOString().slice(0, 10) === deger ? tarih : null;
}

function tarihGecerliligi(baslangic, bitis) {
  return baslangic instanceof Date && bitis instanceof Date && Number.isFinite(baslangic.getTime())
    && Number.isFinite(bitis.getTime()) && baslangic <= bitis;
}

function linkBilgisi(belge) {
  const mp = belge && belge.musteriPortal;
  if (!mp || !mp.token) return null;
  const { baslangicTarihi, bitisTarihi } = mp;
  const bugun = bugunBaslangici();
  const tarihsiz = baslangicTarihi == null && bitisTarihi == null;
  const tarihli = tarihGecerliligi(baslangicTarihi, bitisTarihi);
  const durum = tarihsiz ? 'aktif'
    : !tarihli || bitisTarihi < bugun ? 'suresi_doldu'
    : baslangicTarihi > bugun ? 'planlandi' : 'aktif';
  return {
    link: linkYaz(mp.token), olusturmaTarihi: mp.olusturmaTarihi || null, olusturanAdi: mp.olusturanAdi || '',
    baslangicTarihi: tarihli ? baslangicTarihi.toISOString().slice(0, 10) : null,
    bitisTarihi: tarihli ? bitisTarihi.toISOString().slice(0, 10) : null,
    durum,
    // Yenileme, kullanıcının gördüğü sürümü değiştirir; eski bir tekrar yeni linki ezmez.
    surum: crypto.createHash('sha256').update(mp.token).digest('hex')
  };
}

// ───────── Personel tarafı: link üret / göster / kapat ─────────

async function linkGetir(tesvikModel, tesvikId) {
  const M = modelAl(tesvikModel);
  belgeKimliginiDogrula(tesvikId);
  const belge = await portalOku(M, tesvikId);
  if (!belge) throw hata('Belge bulunamadı.', 'CERT_NOT_FOUND', 404);
  return linkBilgisi(belge);
}

/** Varsa mevcut link döner (firmaya gitmiş link bozulmasın); yenile=true eskisini geçersiz kılar. */
async function linkUret(tesvikModel, tesvikId, {
  user = null, yenile = false, istekId, beklenenSurum, baslangicTarihi, bitisTarihi
} = {}) {
  const M = modelAl(tesvikModel);
  belgeKimliginiDogrula(tesvikId);
  if (istekId !== undefined && (typeof istekId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(istekId))) {
    throw hata('Link isteği geçersiz. Pencereyi kapatıp tekrar açın.', 'BAD_REQUEST_ID', 400);
  }
  if (beklenenSurum !== undefined && (typeof beklenenSurum !== 'string' || !/^[a-f0-9]{64}$/.test(beklenenSurum))) {
    throw hata('Link sürümü geçersiz. Pencereyi kapatıp tekrar açın.', 'BAD_LINK_VERSION', 400);
  }
  const belge = await portalOku(M, tesvikId);
  if (!belge) throw hata('Belge bulunamadı.', 'CERT_NOT_FOUND', 404);
  const mevcut = linkBilgisi(belge);
  if (!yenile && mevcut) return mevcut;
  // Yanıt yolda kaybolmuşsa aynı işlemin tekrarı ikinci bir link üretmesin.
  if (istekId && belge.musteriPortal?.istekId === istekId) return mevcut;
  if (yenile && beklenenSurum !== undefined && mevcut?.surum !== beklenenSurum) return mevcut;

  const onceki = belge.musteriPortal || {};
  const mevcutTakvimiKoru = mevcut && baslangicTarihi === undefined && bitisTarihi === undefined;
  const baslangic = mevcutTakvimiKoru ? onceki.baslangicTarihi : gunTarihiniOku(baslangicTarihi);
  const bitis = mevcutTakvimiKoru ? onceki.bitisTarihi : gunTarihiniOku(bitisTarihi);
  if (!tarihGecerliligi(baslangic, bitis)) {
    throw hata('Geçerli başlangıç ve bitiş tarihlerini girin. Bitiş, başlangıçtan önce olamaz.', 'BAD_LINK_DATES', 400);
  }
  if (bitis < bugunBaslangici()) {
    throw hata('Bitiş tarihi bugünden önce olamaz.', 'BAD_LINK_DATES', 400);
  }
  const musteriPortal = {
    token: crypto.randomBytes(18).toString('base64url'), // 24 karakter, tahmin edilemez
    olusturmaTarihi: new Date(),
    olusturanAdi: (user && user.adSoyad) || '',
    ...(istekId ? { istekId } : {}),
    baslangicTarihi: baslangic,
    bitisTarihi: bitis
  };
  // Oku → yaz arasında başka bir istek link ürettiyse onun token'ını koru.
  const filtre = mevcut
    ? { _id: tesvikId, 'musteriPortal.token': belge.musteriPortal.token }
    : { _id: tesvikId, 'musteriPortal.olusturmaTarihi': onceki.olusturmaTarihi || null, $or: [
      { 'musteriPortal.token': { $exists: false } },
      { 'musteriPortal.token': null },
      { 'musteriPortal.token': '' }
    ] };
  // Yalnız metadata güncellenir; pre-save hesaplamaları ve geçmiş yükleme çalışmaz.
  const sonuc = await M.updateOne(filtre, { $set: { musteriPortal } });
  if (sonuc.matchedCount) return linkBilgisi({ musteriPortal });
  const kazanan = await portalOku(M, tesvikId);
  if (!kazanan) throw hata('Belge bulunamadı.', 'CERT_NOT_FOUND', 404);
  return linkBilgisi(kazanan);
}

async function linkKapat(tesvikModel, tesvikId) {
  const M = modelAl(tesvikModel);
  belgeKimliginiDogrula(tesvikId);
  // Son üretim kimliği kalsın: yanıtı kaybolan aynı isteğin tekrarı kapatılmış
  // linki yeniden açmasın. Bilinçli yeni üretim farklı bir istekId kullanır.
  const r = await M.updateOne({ _id: tesvikId }, { $unset: { 'musteriPortal.token': 1 } });
  if (!r.matchedCount) throw hata('Belge bulunamadı.', 'CERT_NOT_FOUND', 404);
  return true;
}

// ───────── Firma tarafı (token) ─────────

function aktifTokenFiltresi(token) {
  const bugun = bugunBaslangici();
  return {
    'musteriPortal.token': token,
    $or: [
      { 'musteriPortal.baslangicTarihi': null, 'musteriPortal.bitisTarihi': null },
      { 'musteriPortal.baslangicTarihi': { $lte: bugun }, 'musteriPortal.bitisTarihi': { $gte: bugun } }
    ]
  };
}

async function belgeBul(token, { yalnizMakineListeleri = false, yalnizKimlik = false } = {}) {
  if (typeof token !== 'string' || !TOKEN_BICIMI.test(token)) return null;
  for (const [tesvikModel, M] of Object.entries(MODELLER)) {
    const sorgu = M.findOne(aktifTokenFiltresi(token));
    if (yalnizKimlik) sorgu.select('_id');
    else if (yalnizMakineListeleri) sorgu.select('makineListeleri.yerli makineListeleri.ithal');
    else sorgu.select('-makineRevizyonlari -revizyonlar -evrakListesi').populate('firma', 'tamUnvan yabanciSermayeli');
    const belge = await sorgu.lean();
    if (belge) return { tesvikModel, belge };
  }
  return null;
}

const gecersizBaglanti = () => hata('Bağlantı bulunamadı veya geçersiz. Lütfen danışmanınızla iletişime geçin.', 'LINK_YOK', 404);

async function belgeBulVeyaHata(token, secenekler) {
  const sonuc = await belgeBul(token, secenekler);
  if (!sonuc) throw gecersizBaglanti();
  return sonuc;
}

async function firmaBaglantisiniDogrula({ tesvikModel, tesvikId }, token) {
  const gecerli = await modelAl(tesvikModel).exists({ _id: tesvikId, ...aktifTokenFiltresi(token) });
  if (!gecerli) throw gecersizBaglanti();
}

const MAKINE_BELGE_ORTAK_ALANLARI = ['rowId', 'siraNo', 'makineId', 'adiVeOzelligi', 'miktar', 'birim', 'birimAciklamasi'];
const MAKINE_BELGE_ALANLARI = {
  local: [...MAKINE_BELGE_ORTAK_ALANLARI, 'birimFiyatiTl', 'toplamTutariTl'],
  import: [...MAKINE_BELGE_ORTAK_ALANLARI, 'gtipKodu', 'birimFiyatiFob', 'gumrukDovizKodu', 'toplamTutarFobUsd', 'kullanilmisMakine']
};

// Salt okunur onaylı liste, belge tablosuyla aynı alan adlarını kullanır.
// Gerçekleşen tutar, iç not, süreç ve belge depolama alanlarını bu tablodan göndermeyin.
const onayliMakineListesi = (belge, listType) => resolver.listFor(belge, listType).filter(Boolean)
  .map((satir) => Object.fromEntries(MAKINE_BELGE_ALANLARI[listType]
    .filter((alan) => ['string', 'number', 'boolean'].includes(typeof satir[alan]))
    .map((alan) => [alan, satir[alan]])));

// Belge ekranındaki sekmelerin (künye, cins, ürün, onaylı listeler, finansal, şartlar, destek) okuduğu alanlar —
// frontend utils/belgeKunye + belgeFinansal. Burada olmayan hiçbir alan firmaya gitmez.
function belgeGorunumu(b) {
  const firma = b.firma && typeof b.firma === 'object'
    ? { tamUnvan: b.firma.tamUnvan || '', yabanciSermayeli: !!b.firma.yabanciSermayeli }
    : null;
  return {
    yatirimciUnvan: b.yatirimciUnvan || '',
    firmaBilgileri: { unvan: (b.firmaBilgileri && b.firmaBilgileri.unvan) || '' },
    firma,
    belgeNo: b.belgeNo || '',
    kunyeBilgileri: b.kunyeBilgileri || {},
    yatirimBilgileri: b.yatirimBilgileri || {},
    belgeYonetimi: b.belgeYonetimi || {},
    istihdam: b.istihdam || {},
    maliHesaplamalar: b.maliHesaplamalar || {},
    makineListeleri: { yerli: onayliMakineListesi(b, 'local'), ithal: onayliMakineListesi(b, 'import') },
    urunler: b.urunler || [],
    ozelSartlar: b.ozelSartlar || [],
    destekUnsurlari: b.destekUnsurlari || []
  };
}

// OECD ve NACE açıklamaları sunucuda çözülür: belge ekranı bunları oturumlu uçlardan çekiyor
async function etiketleriCoz(b, tesvikModel) {
  const yb = b.yatirimBilgileri || {};
  const etiketler = { oecd: '', konu: '' };
  try {
    if (yb.oecdKategori) {
      const OecdKategori = require('../../models/OecdKategori');
      const k = await OecdKategori.findOne({ kod: String(yb.oecdKategori) }).select('aciklama').lean();
      etiketler.oecd = (k && k.aciklama) || '';
    }
    if (tesvikModel === 'YeniTesvik' && yb.yatirimKonusu) {
      const OecdKod4Haneli = require('../../models/OecdKod4Haneli');
      const k = await OecdKod4Haneli.findOne({ kod: String(yb.yatirimKonusu) }).select('tanim').lean();
      etiketler.konu = (k && k.tanim) || '';
    }
  } catch (_) { /* açıklama yoksa ham kod gösterilir */ }
  return etiketler;
}

const firmaEvraklari = (evraklar = []) => evraklar.map(({ _id, tur, dosyaAdi, mimeType, fileSize, yuklemeTarihi }) => ({
  _id, tur, dosyaAdi, mimeType, fileSize, yuklemeTarihi
}));

// Firmaya giden kalem: kim girdi bilgisinde personelin adı yer almaz
const kalemGorunumu = (k, surec = {}) => ({
  _id: k._id, tarih: k.tarih || null, no: k.no || '', icerik: k.icerik || '',
  yevmiyeNo: k.yevmiyeNo, yevmiyeTarihi: k.yevmiyeTarihi,
  tutar: Number(k.tutar) || 0, adet: Number(k.adet) || 0,
  tutarParaBirimi: mps.faturaKalemiParaBirimi(k, surec),
  malBedeliTl: k.malBedeliTl,
  kaynak: k.kaynak === 'firma' ? 'firma' : 'personel',
  girenAdi: k.kaynak === 'firma' ? (k.girenAdi || '') : '',
  girisTarihi: k.girisTarihi || null,
  evraklar: firmaEvraklari(k.evraklar || [])
});

function makineGorunumu(satir, listType, surec) {
  const m = resolver.extractMachineFields(satir, listType);
  const kalemler = surec ? mps.faturaKalemleriniOku(surec).map((k) => kalemGorunumu(k, surec)) : [];
  const faturaTutarToplamlari = surec ? mps.faturaTutarToplamlari(surec, kalemler) : {};
  return {
    rowId: String(m.rowId), listType, siraNo: m.siraNo, makineId: m.makineId, gtipNo: m.gtipNo,
    adi: m.machineName, miktar: m.quantity, birim: m.unit, birimAciklamasi: m.unitDescription,
    birimFiyat: m.unitPrice, toplam: m.totalPrice,
    paraBirimi: listType === 'import' ? 'USD' : 'TRY',
    birimParaBirimi: listType === 'import' ? (satir.gumrukDovizKodu || 'USD') : 'TRY',
    kalemler,
    faturaTutarToplamlari,
    faturaToplami: faturaTutarToplamlari.TRY || 0,
    faturaAdedi: kalemler.reduce((t, k) => t + k.adet, 0)
  };
}

async function portalVerisi(token) {
  let { tesvikModel, belge } = await belgeBulVeyaHata(token);
  // rowId'siz eski satırlar kalem alamaz — Ekipman Takip'teki tamamlamanın aynısı
  if (await resolver.ensureRowIds(tesvikModel, belge._id)) ({ tesvikModel, belge } = await belgeBulVeyaHata(token));

  const surecler = await MachineProcess.find({ tesvikModel, tesvikId: belge._id })
    .select('rowId listType currency faturalar invoiceRealizedValue invoiceRealizedQty invoiceNo invoiceDate updatedAt createdAt').lean();
  const surecAl = (listType, rowId) => surecler.find((p) => p.listType === listType && String(p.rowId) === String(rowId));
  const liste = (listType) => resolver.listFor(belge, listType)
    .filter((r) => r && r.rowId)
    .map((r) => makineGorunumu(r, listType, surecAl(listType, r.rowId)))
    .sort((a, b) => a.siraNo - b.siraNo);

  const etiketler = await etiketleriCoz(belge, tesvikModel);
  await firmaBaglantisiniDogrula({ tesvikModel, tesvikId: belge._id }, token);
  return {
    tur: tesvikModel === 'YeniTesvik' ? 'yeni' : 'eski',
    belge: belgeGorunumu(belge),
    etiketler,
    makineler: { yerli: liste('local'), ithal: liste('import') }
  };
}

async function firmaGerceklesmesi(token) {
  const { tesvikModel, belge } = await belgeBulVeyaHata(token, { yalnizKimlik: true });
  const sonuc = await gerceklesmeService.belgeGerceklesmesi(tesvikModel, belge._id, { musteri: true }).catch((error) => {
    if (error.code === 'CERT_NOT_FOUND') throw gecersizBaglanti();
    throw error;
  });
  await firmaBaglantisiniDogrula({ tesvikModel, tesvikId: belge._id }, token);
  return sonuc;
}

/** Firma bir makineye fatura veya ithal beyanname kalemi girer. */
async function firmaKalemiEkle(token, govde = {}) {
  const { tesvikModel, belge } = await belgeBulVeyaHata(token);
  const listType = govde.listType === 'import' ? 'import' : 'local';
  const satir = resolver.findMachineRow(belge, listType, govde.rowId);
  if (!satir) throw hata('Makine bu belgede bulunamadı. Sayfayı yenileyip tekrar deneyin.', 'ROW_NOT_FOUND', 404);

  const tarih = govde.tarih ? new Date(govde.tarih) : null;
  const no = String(govde.no || '').trim();
  const tutar = Number(govde.tutar);
  const adet = govde.adet === undefined || govde.adet === '' ? 0 : Number(govde.adet);
  const giren = String(govde.giren || '').trim();
  const etiket = listType === 'import' ? 'Beyanname' : 'Fatura';
  if (!tarih || Number.isNaN(tarih.getTime())) throw hata(`${etiket} tarihini girin.`, 'FATURA_GECERSIZ', 400);
  if (tarih > new Date(Date.now() + 864e5)) throw hata(`${etiket} tarihi ileri bir tarih olamaz.`, 'FATURA_GECERSIZ', 400);
  if (!no) throw hata(`${etiket} ${listType === 'import' ? 'numarasını' : 'sayısını'} girin.`, 'FATURA_GECERSIZ', 400);
  if (!Number.isFinite(tutar) || tutar <= 0) throw hata('Kalem tutarını girin.', 'FATURA_GECERSIZ', 400);
  if (!Number.isFinite(adet) || adet < 0) throw hata('Adet geçersiz.', 'FATURA_GECERSIZ', 400);
  if (!giren) throw hata('Adınızı yazın — kaydı kimin girdiği görünsün.', 'FATURA_GECERSIZ', 400);

  const proc = await mps.ensureProcess({ tesvikModel, tesvikId: belge._id, listType, rowId: satir.rowId });
  await firmaBaglantisiniDogrula({ tesvikModel, tesvikId: belge._id }, token);
  const kalemId = new mongoose.Types.ObjectId();
  await mps.faturaKalemiEkle(proc, {
    tarih, no, icerik: govde.icerik, tutar, adet,
    ...(Object.hasOwn(govde, 'yevmiyeNo') && { yevmiyeNo: govde.yevmiyeNo }),
    ...(Object.hasOwn(govde, 'yevmiyeTarihi') && { yevmiyeTarihi: govde.yevmiyeTarihi })
  }, {
    kaynak: 'firma', girenAdi: giren, kalemId, eskiIstemci: govde.tutarParaBirimi !== 'TRY'
  });
  return { ...makineGorunumu(satir, listType, proc), yeniKalemId: String(kalemId) };
}

async function firmaFaturaEvrakBaglami(token, kalemId, rowId, listType) {
  const { tesvikModel, belge } = await belgeBulVeyaHata(token, { yalnizMakineListeleri: true });
  const bulunamadi = () => hata('Fatura veya beyanname kalemi bu belgede bulunamadı. Sayfayı yenileyip tekrar deneyin.', 'FATURA_YOK', 404);
  if (!mongoose.isObjectIdOrHexString(kalemId)) throw bulunamadi();
  if (rowId !== undefined && (typeof rowId !== 'string' || !rowId || rowId.length > 200)) throw bulunamadi();
  if (listType !== undefined && !['local', 'import'].includes(listType)) throw bulunamadi();
  const proc = await MachineProcess.findOne({
    tesvikModel, tesvikId: belge._id, listType: listType || { $in: ['local', 'import'] },
    ...(rowId !== undefined ? { rowId } : {}),
    $or: [{ 'faturalar._id': kalemId }, { _id: kalemId, 'faturalar.0': { $exists: false } }]
  }).select(mps.FATURA_EVRAK_OZEL_ALANLARI);
  const satir = proc && resolver.findMachineRow(belge, proc.listType, proc.rowId);
  const kalem = proc && mps.faturaKalemleriniOku(proc).find((k) => String(k._id) === String(kalemId));
  if (!satir || !kalem) throw bulunamadi();
  return { proc, satir, kalem, yetkiyiDogrula: () => firmaBaglantisiniDogrula({ tesvikModel, tesvikId: belge._id }, token) };
}

async function firmaFaturaKalemBaglami(token, kalemId, { rowId, listType } = {}) {
  const baglam = await firmaFaturaEvrakBaglami(token, kalemId, rowId, listType);
  if (rowId === undefined) throw hata('Makine satırı zorunludur.', 'ROW_NOT_FOUND', 400);
  return baglam;
}

async function firmaKalemiGuncelle(token, kalemId, govde) {
  const { proc, satir, yetkiyiDogrula } = await firmaFaturaKalemBaglami(token, kalemId, govde);
  const alanlar = ['tarih', 'no', 'icerik', 'tutar', 'adet', 'yevmiyeNo', 'yevmiyeTarihi', 'malBedeliTl'];
  const girdi = Object.fromEntries(alanlar.filter((alan) => Object.hasOwn(govde, alan)).map((alan) => [alan, govde[alan]]));
  if (!Object.keys(girdi).length) throw hata('Güncellenecek bir kalem bilgisi girin.', 'FATURA_GECERSIZ', 400);
  if (Object.hasOwn(girdi, 'tarih')) {
    const tarih = gunTarihiniOku(girdi.tarih);
    if (!tarih || tarih > new Date(Date.now() + 864e5)) throw hata('Geçerli bir fatura veya beyanname tarihi girin.', 'FATURA_GECERSIZ', 400);
  }
  for (const [alan, uzunluk] of [['no', 100], ['icerik', 500]]) {
    if (Object.hasOwn(girdi, alan) && (typeof girdi[alan] !== 'string' || girdi[alan].trim().length > uzunluk)) {
      throw hata('Fatura veya beyanname bilgisi geçersiz.', 'FATURA_GECERSIZ', 400);
    }
  }
  if (Object.hasOwn(girdi, 'no') && !girdi.no.trim()) throw hata('Fatura veya beyanname numarasını girin.', 'FATURA_GECERSIZ', 400);
  for (const alan of ['tutar', 'adet']) {
    if (!Object.hasOwn(girdi, alan)) continue;
    const deger = girdi[alan];
    if (!['number', 'string'].includes(typeof deger) || !String(deger).trim() || !Number.isFinite(Number(deger))
        || Number(deger) < 0 || (alan === 'tutar' && Number(deger) <= 0)) {
      throw hata('Kalem tutarı veya adet geçersiz.', 'FATURA_GECERSIZ', 400);
    }
  }
  await mps.faturaKalemiGuncelle(proc, kalemId, girdi, { yetkiyiDogrula });
  await yetkiyiDogrula();
  return makineGorunumu(satir, proc.listType, proc);
}

async function firmaKalemiSil(token, kalemId, govde) {
  const { proc, satir, yetkiyiDogrula } = await firmaFaturaKalemBaglami(token, kalemId, govde);
  await mps.faturaKalemiSil(proc, kalemId, { yetkiyiDogrula });
  await yetkiyiDogrula();
  return makineGorunumu(satir, proc.listType, proc);
}

async function firmaFaturaEvrakiYukle(token, kalemId, { rowId, listType, istekId } = {}, dosyalar = {}) {
  if (rowId === undefined) throw hata('Makine satırı zorunludur.', 'ROW_NOT_FOUND', 400);
  const baglam = await firmaFaturaEvrakBaglami(token, kalemId, rowId, listType);
  await baglam.yetkiyiDogrula();
  await mps.eskiFaturaOzetiniKalemeCevir(baglam.proc);
  const { proc, satir } = await faturaEvrakService.evrakYukle({
    baglamiYukle: () => firmaFaturaEvrakBaglami(token, kalemId, rowId, listType),
    kalemId, istekId, dosyalar
  });
  return makineGorunumu(satir, proc.listType, proc);
}

async function firmaFaturaEvrakiIndir(token, kalemId, evrakId, hedef) {
  const { kalem, yetkiyiDogrula } = await firmaFaturaKalemBaglami(token, kalemId, hedef);
  const evrak = kalem.evraklar?.find((e) => String(e._id) === String(evrakId));
  if (!evrak?.depo) throw hata('Fatura evrakı bulunamadı.', 'FATURA_YOK', 404);
  const buffer = await evrakDeposu.oku(evrak.depo);
  await yetkiyiDogrula();
  return { evrak, buffer };
}

async function firmaFaturaEvrakiSil(token, kalemId, evrakId, hedef) {
  const { proc, satir, yetkiyiDogrula } = await firmaFaturaKalemBaglami(token, kalemId, hedef);
  if (!mongoose.isObjectIdOrHexString(evrakId)) throw hata('Fatura evrakı bulunamadı.', 'FATURA_YOK', 404);
  await mps.faturaEvrakiSil(proc, kalemId, evrakId, { yetkiyiDogrula });
  await yetkiyiDogrula();
  return makineGorunumu(satir, proc.listType, proc);
}

function harcamaGorunumu(kalem) {
  const firmaKaydi = kalem.kaynak === 'firma';
  return {
    _id: kalem._id, kategori: kalem.kategori, altKategori: kalem.altKategori,
    tarih: kalem.tarih, no: kalem.no, tutar: kalem.tutar, adet: kalem.adet,
    yevmiyeNo: kalem.yevmiyeNo ?? null, yevmiyeTarihi: kalem.yevmiyeTarihi ?? null,
    icerik: kalem.icerik || '', girenAdi: firmaKaydi ? kalem.girenAdi : '',
    kaynak: firmaKaydi ? 'firma' : 'personel', evrakEklenebilir: true,
    createdAt: kalem.createdAt, updatedAt: kalem.updatedAt,
    evraklar: firmaEvraklari(kalem.evraklar || [])
  };
}

async function firmaHarcamaBelgesi(token) {
  const { tesvikModel, belge } = await belgeBulVeyaHata(token, { yalnizKimlik: true });
  const filtre = { tesvikModel, tesvikId: belge._id };
  return { filtre, yetkiyiDogrula: () => firmaBaglantisiniDogrula(filtre, token) };
}

async function firmaHarcamalariListele(token) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaBelgesi(token);
  const kalemler = await harcama.listele(filtre);
  await yetkiyiDogrula();
  return { kalemler: kalemler.map(harcamaGorunumu), kategoriler: HARCAMA_KATEGORILERI };
}

async function firmaHarcamaKalemiEkle(token, govde) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaBelgesi(token);
  const kalem = await harcama.firmaKalemiEkle(filtre, govde, yetkiyiDogrula);
  await yetkiyiDogrula();
  return harcamaGorunumu(kalem);
}

async function firmaHarcamaKalemiGuncelle(token, kalemId, govde) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaEvrakYetkisi(token, kalemId);
  const kalem = await harcama.guncelle(filtre, govde, null, { yetkiyiDogrula });
  await yetkiyiDogrula();
  return harcamaGorunumu(kalem);
}

async function firmaHarcamaKalemiSil(token, kalemId) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaEvrakYetkisi(token, kalemId);
  const sonuc = await harcama.sil(filtre, { yetkiyiDogrula });
  await yetkiyiDogrula();
  return sonuc;
}

async function firmaHarcamaEvrakYetkisi(token, kalemId) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaBelgesi(token);
  return { filtre: harcama.kalemFiltresi(filtre, kalemId), yetkiyiDogrula };
}

async function firmaHarcamaEvrakBaglami(token, kalemId) {
  const { filtre } = await firmaHarcamaEvrakYetkisi(token, kalemId);
  return harcama.evrakBaglami(filtre);
}

async function firmaHarcamaEvrakiYukle(token, kalemId, { istekId } = {}, dosyalar = {}) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaEvrakYetkisi(token, kalemId);
  const kalem = await harcama.evrakYukle(filtre, { istekId, dosyalar, yetkiyiDogrula });
  await yetkiyiDogrula();
  return harcamaGorunumu(kalem);
}

async function firmaHarcamaEvrakiIndir(token, kalemId, evrakId) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaEvrakYetkisi(token, kalemId);
  const sonuc = await harcama.evrakIndir(filtre, evrakId);
  await yetkiyiDogrula();
  return sonuc;
}

async function firmaHarcamaEvrakiSil(token, kalemId, evrakId) {
  const { filtre, yetkiyiDogrula } = await firmaHarcamaEvrakYetkisi(token, kalemId);
  const kalem = await harcama.evrakSil(filtre, evrakId, { yetkiyiDogrula });
  await yetkiyiDogrula();
  return harcamaGorunumu(kalem);
}

module.exports = {
  SAYFA_YOLU, linkGetir, linkUret, linkKapat, belgeBul, portalVerisi, firmaGerceklesmesi, firmaKalemiEkle, firmaKalemiGuncelle, firmaKalemiSil,
  firmaFaturaEvrakBaglami, firmaFaturaEvrakiYukle, firmaFaturaEvrakiIndir, firmaFaturaEvrakiSil,
  firmaHarcamalariListele, firmaHarcamaKalemiEkle, firmaHarcamaKalemiGuncelle, firmaHarcamaKalemiSil,
  firmaHarcamaEvrakBaglami, firmaHarcamaEvrakiYukle, firmaHarcamaEvrakiIndir, firmaHarcamaEvrakiSil,
  // test için
  belgeGorunumu, kalemGorunumu
};
