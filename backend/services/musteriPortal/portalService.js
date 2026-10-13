// 🔗 MÜŞTERİ BELGE LİNKİ — firma kendi teşvik belgesini görür, makinelerine fatura kalemi girer.
//
// Müşteri (13.10.2026), üç istek tek linkte:
//  • genel: "Müşterinin sadece burayı görebileceği bir link üretmemiz mümkün mü acaba? - Evrak listesi
//    hariç. Sadece bu fotoğraftaki belge bilgilerini görebilsin - alttaki ve üstteki bilgiler hariç."
//  • ekipman takip: "Yükleme linki … 'Yerli liste' ve 'İthal Liste' kısmını açsın, müşteri buradan
//    istediği makinaya istediği kalemi girebilsin, bir kere kalemi kaydedince silemesin veya
//    düzenleyemesin - 'onaylandı' olsun, biz manuel olarak onaylandıyı silip-düzenleyebilelim."
//  • "teşvik görüntüleme linki ve … yerli-ithal liste-teşvik belgesi kısmının üçünün bir arada
//    görülebildiği bir link olursa çok iyi olur"
//
// Güvenlik: belge alanları BEYAZ LİSTE ile çıkar (evrak listesi, notlar, revizyonlar, kullanıcılar,
// diğer linklerin token'ları hiç gönderilmez). Firma yalnız kalem EKLER; düzeltme/silme personelde.

const crypto = require('crypto');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const resolver = require('../tesvikMakine/certificateResolver');
const mps = require('../tesvikMakine/machineProcessService');
const { buildUploadLink } = require('../tesvikMakine/uploadTokenService');

const MODELLER = { Tesvik, YeniTesvik };
const TOKEN_BICIMI = /^[A-Za-z0-9_-]{20,64}$/;
const SAYFA_YOLU = '/belge';

function hata(mesaj, code, status) {
  const e = new Error(mesaj); e.code = code; e.status = status; return e;
}

function modelAl(tesvikModel) {
  const M = MODELLER[tesvikModel];
  if (!M) throw hata('Geçersiz belge türü.', 'BAD_MODEL', 400);
  return M;
}

const linkYaz = (token) => buildUploadLink(token, SAYFA_YOLU);

function linkBilgisi(belge) {
  const mp = belge && belge.musteriPortal;
  if (!mp || !mp.token) return null;
  return { link: linkYaz(mp.token), olusturmaTarihi: mp.olusturmaTarihi || null, olusturanAdi: mp.olusturanAdi || '' };
}

// ───────── Personel tarafı: link üret / göster / kapat ─────────

async function linkGetir(tesvikModel, tesvikId) {
  const belge = await modelAl(tesvikModel).findById(tesvikId).select('musteriPortal').lean();
  if (!belge) throw hata('Belge bulunamadı.', 'CERT_NOT_FOUND', 404);
  return linkBilgisi(belge);
}

/** Varsa mevcut link döner (firmaya gitmiş link bozulmasın); yenile=true eskisini geçersiz kılar. */
async function linkUret(tesvikModel, tesvikId, { user = null, yenile = false } = {}) {
  const M = modelAl(tesvikModel);
  const belge = await M.findById(tesvikId).select('musteriPortal').lean();
  if (!belge) throw hata('Belge bulunamadı.', 'CERT_NOT_FOUND', 404);
  if (!yenile && belge.musteriPortal && belge.musteriPortal.token) return linkBilgisi(belge);

  const musteriPortal = {
    token: crypto.randomBytes(18).toString('base64url'), // 24 karakter, tahmin edilemez
    olusturmaTarihi: new Date(),
    olusturanAdi: (user && user.adSoyad) || ''
  };
  // $set: pre-save kancaları (mali hesaplama vb.) bu alan için çalışmasın
  await M.updateOne({ _id: tesvikId }, { $set: { musteriPortal } });
  return linkBilgisi({ musteriPortal });
}

async function linkKapat(tesvikModel, tesvikId) {
  const r = await modelAl(tesvikModel).updateOne({ _id: tesvikId }, { $unset: { musteriPortal: 1 } });
  if (!r.matchedCount) throw hata('Belge bulunamadı.', 'CERT_NOT_FOUND', 404);
  return true;
}

// ───────── Firma tarafı (token) ─────────

async function belgeBul(token) {
  if (!TOKEN_BICIMI.test(String(token || ''))) return null;
  for (const [tesvikModel, M] of Object.entries(MODELLER)) {
    const belge = await M.findOne({ 'musteriPortal.token': token })
      .select('-makineRevizyonlari -revizyonlar -evrakListesi')
      .populate('firma', 'tamUnvan yabanciSermayeli')
      .lean();
    if (belge) return { tesvikModel, belge };
  }
  return null;
}

async function belgeBulVeyaHata(token) {
  const sonuc = await belgeBul(token);
  if (!sonuc) throw hata('Bağlantı bulunamadı veya geçersiz. Lütfen danışmanınızla iletişime geçin.', 'LINK_YOK', 404);
  return sonuc;
}

// Belge ekranındaki sekmelerin (künye, cins, ürün, finansal, şartlar, destek) okuduğu alanlar —
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

// Firmaya giden kalem: kim girdi bilgisinde personelin adı yer almaz
const kalemGorunumu = (k) => ({
  _id: k._id, tarih: k.tarih || null, no: k.no || '', icerik: k.icerik || '',
  tutar: Number(k.tutar) || 0, adet: Number(k.adet) || 0,
  kaynak: k.kaynak === 'firma' ? 'firma' : 'personel',
  girenAdi: k.kaynak === 'firma' ? (k.girenAdi || '') : '',
  girisTarihi: k.girisTarihi || null
});

function makineGorunumu(satir, listType, surec) {
  const m = resolver.extractMachineFields(satir, listType);
  const kalemler = ((surec && surec.faturalar) || []).map(kalemGorunumu);
  return {
    rowId: String(m.rowId), listType, siraNo: m.siraNo, makineId: m.makineId, gtipNo: m.gtipNo,
    adi: m.machineName, miktar: m.quantity, birim: m.unit, birimFiyat: m.unitPrice, toplam: m.totalPrice,
    paraBirimi: listType === 'import' ? 'USD' : 'TRY',
    kalemler,
    faturaToplami: kalemler.reduce((t, k) => t + k.tutar, 0),
    faturaAdedi: kalemler.reduce((t, k) => t + k.adet, 0)
  };
}

async function portalVerisi(token) {
  let { tesvikModel, belge } = await belgeBulVeyaHata(token);
  // rowId'siz eski satırlar kalem alamaz — Ekipman Takip'teki tamamlamanın aynısı
  if (await resolver.ensureRowIds(tesvikModel, belge._id)) ({ tesvikModel, belge } = await belgeBulVeyaHata(token));

  const surecler = await MachineProcess.find({ tesvikModel, tesvikId: belge._id })
    .select('rowId listType faturalar').lean();
  const surecAl = (listType, rowId) => surecler.find((p) => p.listType === listType && String(p.rowId) === String(rowId));
  const liste = (listType) => resolver.listFor(belge, listType)
    .filter((r) => r && r.rowId)
    .map((r) => makineGorunumu(r, listType, surecAl(listType, r.rowId)))
    .sort((a, b) => a.siraNo - b.siraNo);

  return {
    tur: tesvikModel === 'YeniTesvik' ? 'yeni' : 'eski',
    belge: belgeGorunumu(belge),
    etiketler: await etiketleriCoz(belge, tesvikModel),
    makineler: { yerli: liste('local'), ithal: liste('import') }
  };
}

/**
 * Firma bir makineye fatura (ithalde beyanname) kalemi girer. Kayıt firmaya kilitlidir.
 * Firmanın düzeltme şansı olmadığı için alanlar personel girişinden SIKI doğrulanır.
 */
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
  await mps.faturaKalemiEkle(proc, { tarih, no, icerik: govde.icerik, tutar, adet }, { kaynak: 'firma', girenAdi: giren });
  return makineGorunumu(satir, listType, proc.toObject());
}

module.exports = {
  SAYFA_YOLU, linkGetir, linkUret, linkKapat, belgeBul, portalVerisi, firmaKalemiEkle,
  // test için
  belgeGorunumu, kalemGorunumu
};
