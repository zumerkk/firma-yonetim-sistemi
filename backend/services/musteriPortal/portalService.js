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
const path = require('path');
const mongoose = require('mongoose');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const MachineProcess = require('../../models/MachineProcess');
const resolver = require('../tesvikMakine/certificateResolver');
const mps = require('../tesvikMakine/machineProcessService');
const faturaEvrakDeposu = require('../tesvikMakine/faturaEvrakDeposu');
const { buildUploadLink } = require('../tesvikMakine/uploadTokenService');
const { dosyaAdiDuzelt } = require('../../utils/dosyaAdiKodlama');

const MODELLER = { Tesvik, YeniTesvik };
const TOKEN_BICIMI = /^[A-Za-z0-9_-]{20,64}$/;
const SAYFA_YOLU = '/belge';
const FATURA_EVRAK_BOYUTU = 10 * 1024 * 1024;
const FATURA_EVRAK_ALANLARI = {
  faturaPdf: { tur: 'fatura_pdf', uzanti: '.pdf', mimeType: 'application/pdf' },
  faturaXml: { tur: 'fatura_xml', uzanti: '.xml', mimeType: 'application/xml' },
  yevmiyePdf: { tur: 'yevmiye_pdf', uzanti: '.pdf', mimeType: 'application/pdf' }
};

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

function linkBilgisi(belge) {
  const mp = belge && belge.musteriPortal;
  if (!mp || !mp.token) return null;
  return {
    link: linkYaz(mp.token), olusturmaTarihi: mp.olusturmaTarihi || null, olusturanAdi: mp.olusturanAdi || '',
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
async function linkUret(tesvikModel, tesvikId, { user = null, yenile = false, istekId, beklenenSurum } = {}) {
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

  const musteriPortal = {
    token: crypto.randomBytes(18).toString('base64url'), // 24 karakter, tahmin edilemez
    olusturmaTarihi: new Date(),
    olusturanAdi: (user && user.adSoyad) || '',
    ...(istekId ? { istekId } : {})
  };
  // Oku → yaz arasında başka bir istek link ürettiyse onun token'ını koru.
  const filtre = mevcut
    ? { _id: tesvikId, 'musteriPortal.token': belge.musteriPortal.token }
    : { _id: tesvikId, $or: [
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

async function belgeBul(token, { yalnizYerliSatirlar = false } = {}) {
  if (typeof token !== 'string' || !TOKEN_BICIMI.test(token)) return null;
  for (const [tesvikModel, M] of Object.entries(MODELLER)) {
    const sorgu = M.findOne({ 'musteriPortal.token': token });
    if (yalnizYerliSatirlar) sorgu.select('makineListeleri.yerli');
    else sorgu.select('-makineRevizyonlari -revizyonlar -evrakListesi').populate('firma', 'tamUnvan yabanciSermayeli');
    const belge = await sorgu.lean();
    if (belge) return { tesvikModel, belge };
  }
  return null;
}

async function belgeBulVeyaHata(token, secenekler) {
  const sonuc = await belgeBul(token, secenekler);
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
  girisTarihi: k.girisTarihi || null,
  evraklar: (k.evraklar || []).map(({ _id, tur, dosyaAdi, mimeType, fileSize, yuklemeTarihi }) => ({
    _id, tur, dosyaAdi, mimeType, fileSize, yuklemeTarihi
  }))
});

function makineGorunumu(satir, listType, surec) {
  const m = resolver.extractMachineFields(satir, listType);
  const kalemler = (surec ? mps.faturaKalemleriniOku(surec) : []).map(kalemGorunumu);
  return {
    rowId: String(m.rowId), listType, siraNo: m.siraNo, makineId: m.makineId, gtipNo: m.gtipNo,
    adi: m.machineName, miktar: m.quantity, birim: m.unit, birimFiyat: m.unitPrice, toplam: m.totalPrice,
    paraBirimi: listType === 'import' ? 'USD' : 'TRY',
    birimParaBirimi: listType === 'import' ? (satir.gumrukDovizKodu || 'USD') : 'TRY',
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
    .select('rowId listType faturalar invoiceRealizedValue invoiceRealizedQty invoiceNo invoiceDate updatedAt createdAt').lean();
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
  const kalemId = new mongoose.Types.ObjectId();
  await mps.faturaKalemiEkle(proc, { tarih, no, icerik: govde.icerik, tutar, adet }, { kaynak: 'firma', girenAdi: giren, kalemId });
  return { ...makineGorunumu(satir, listType, proc), yeniKalemId: String(kalemId) };
}

async function firmaFaturaEvrakBaglami(token, kalemId, rowId) {
  const { tesvikModel, belge } = await belgeBulVeyaHata(token, { yalnizYerliSatirlar: true });
  const bulunamadi = () => hata('Yerli fatura kalemi bu belgede bulunamadı. Sayfayı yenileyip tekrar deneyin.', 'FATURA_YOK', 404);
  if (!mongoose.isObjectIdOrHexString(kalemId)) throw bulunamadi();
  if (rowId !== undefined && (typeof rowId !== 'string' || !rowId || rowId.length > 200)) throw bulunamadi();
  const proc = await MachineProcess.findOne({
    tesvikModel, tesvikId: belge._id, listType: 'local',
    ...(rowId !== undefined ? { rowId } : {}),
    faturalar: { $elemMatch: { _id: kalemId, kaynak: 'firma' } }
  }).select(mps.FATURA_EVRAK_OZEL_ALANLARI);
  const satir = proc && resolver.findMachineRow(belge, 'local', proc.rowId);
  if (!satir) throw bulunamadi();
  return { proc, satir, kalem: proc.faturalar.id(kalemId) };
}

function xmlBaslangici(buffer) {
  const ilkBaytlar = buffer.subarray(0, 4096);
  let kodlama = 'utf-8';
  if ((ilkBaytlar[0] === 0xff && ilkBaytlar[1] === 0xfe) || (ilkBaytlar[0] === 0x3c && ilkBaytlar[1] === 0)) kodlama = 'utf-16le';
  if ((ilkBaytlar[0] === 0xfe && ilkBaytlar[1] === 0xff) || (ilkBaytlar[0] === 0 && ilkBaytlar[1] === 0x3c)) kodlama = 'utf-16be';
  const baslangic = new TextDecoder(kodlama).decode(ilkBaytlar)
    .replace(/^(?:\s|<\?[a-z_:][\w.:-]*(?:\s[\s\S]*?)?\?>|<!--[\s\S]*?-->)+/i, '');
  // İmza kontrolü: XML ayrıştırılmaz ve dış varlıklar çözümlenmez.
  return /^<[\p{L}_][\p{L}\p{N}_.:-]*(?:[\s/>])/u.test(baslangic)
    && !/^<(?:html|head|body|script)(?=[\s/>])/i.test(baslangic);
}

function faturaEvrakDosyasi(dosya, ayarlar) {
  const ad = path.posix.basename(dosyaAdiDuzelt(dosya.originalname).replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const uzanti = path.extname(ad);
  const { buffer } = dosya;
  const mime = String(dosya.mimetype || '').toLowerCase();
  const pdf = ayarlar.uzanti === '.pdf';
  const mimeUygun = mime === ayarlar.mimeType || mime === 'application/octet-stream'
    || (!pdf && (mime === 'text/xml' || /^application\/[a-z0-9.+-]+\+xml$/.test(mime)));
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > FATURA_EVRAK_BOYUTU) {
    throw hata('Fatura eki boş olamaz ve 10 MB sınırını aşamaz.', 'FATURA_EVRAK_BOYUTU', 400);
  }
  const imzaUygun = pdf ? /^%PDF-[12]\.\d/.test(buffer.subarray(0, 8).toString('ascii')) : xmlBaslangici(buffer);
  if (uzanti.toLowerCase() !== ayarlar.uzanti || !mimeUygun || !imzaUygun) {
    throw hata(`Geçerli bir ${pdf ? 'PDF' : 'XML'} dosyası seçin${ad ? ` (${ad})` : ''}.`, 'FATURA_EVRAK_TURU', 400);
  }
  return {
    _id: new mongoose.Types.ObjectId(), tur: ayarlar.tur, mimeType: ayarlar.mimeType,
    dosyaAdi: `${ad.slice(0, -uzanti.length).slice(0, 180 - uzanti.length)}${uzanti}`,
    fileSize: buffer.length, yuklemeTarihi: new Date(), buffer
  };
}

const dosyaOzeti = (ekler) => crypto.createHash('sha256').update(JSON.stringify(ekler.map((e) => [
  e.tur, e.dosyaAdi, crypto.createHash('sha256').update(e.buffer).digest('hex')
]).sort())).digest('hex');

function tekrarEvrakIstegi(kalem, istekId, istekOzeti) {
  const kayitli = istekId && kalem.evraklar.find((e) => e.istekId === istekId);
  if (kayitli && kayitli.istekOzeti !== istekOzeti) {
    throw hata('Bu yükleme kimliği farklı dosyalarla kullanılmış. Dosyaları yeniden seçin.', 'FATURA_EVRAK_ISTEK_CAKISMA', 409);
  }
  return Boolean(kayitli);
}

async function firmaFaturaEvrakiYukle(token, kalemId, { rowId, istekId } = {}, dosyalar = {}) {
  if (rowId === undefined) throw hata('Makine satırı zorunludur.', 'ROW_NOT_FOUND', 400);
  if (istekId !== undefined && (typeof istekId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(istekId))) {
    throw hata('Geçersiz yükleme kimliği.', 'BAD_REQUEST_ID', 400);
  }
  let { proc, satir, kalem } = await firmaFaturaEvrakBaglami(token, kalemId, rowId);
  const ekler = Object.entries(FATURA_EVRAK_ALANLARI).flatMap(([alan, ayarlar]) =>
    (dosyalar[alan] || []).map((dosya) => faturaEvrakDosyasi(dosya, ayarlar)));
  if (!ekler.length || ekler.length > 6) throw hata('Bir seferde 1–6 dosya seçin.', 'FATURA_EVRAK_ADEDI', 400);
  const istekOzeti = istekId ? dosyaOzeti(ekler) : undefined;
  if (tekrarEvrakIstegi(kalem, istekId, istekOzeti)) return makineGorunumu(satir, 'local', proc);

  const evraklar = [];
  let temizle = true;
  try {
    for (const { buffer, ...ek } of ekler) {
      const depo = await faturaEvrakDeposu.kaydet({ buffer, dosyaAdi: ek.dosyaAdi, mimeType: ek.mimeType });
      evraklar.push({ ...ek, depo, ...(istekId ? { istekId, istekOzeti } : {}) });
    }
    ({ proc, satir, kalem } = await firmaFaturaEvrakBaglami(token, kalemId, rowId));
    if (tekrarEvrakIstegi(kalem, istekId, istekOzeti)) return makineGorunumu(satir, 'local', proc);

    let kaydedilen;
    try {
      kaydedilen = await mps.firmaFaturaEvraklariniEkle({
        surecId: proc._id, tesvikModel: proc.tesvikModel, tesvikId: proc.tesvikId, rowId, kalemId, evraklar, istekId
      });
    } catch (error) {
      // Yazımın yanıtı kaybolduysa gerçekten kaydedilen dosyaların depo kopyasına dokunma.
      const sonuc = await MachineProcess.findById(proc._id).catch(() => undefined);
      if (sonuc === undefined) temizle = false;
      const mevcut = sonuc?.faturalar.id(kalemId)?.evraklar;
      if (!mevcut || !evraklar.every((ek) => mevcut.id(ek._id))) throw error;
      kaydedilen = sonuc;
    }
    if (kaydedilen) {
      temizle = false;
      return makineGorunumu(satir, 'local', kaydedilen);
    }
    ({ proc, satir, kalem } = await firmaFaturaEvrakBaglami(token, kalemId, rowId));
    if (tekrarEvrakIstegi(kalem, istekId, istekOzeti)) return makineGorunumu(satir, 'local', proc);
    throw hata('Fatura kalemi değişti. Sayfayı yenileyip tekrar deneyin.', 'FATURA_CAKISMA', 409);
  } finally {
    if (temizle) await mps.faturaEvrakDepolariniSil(evraklar.map((e) => e.depo));
  }
}

module.exports = {
  SAYFA_YOLU, linkGetir, linkUret, linkKapat, belgeBul, portalVerisi, firmaKalemiEkle,
  FATURA_EVRAK_ALANLARI, FATURA_EVRAK_BOYUTU, firmaFaturaEvrakBaglami, firmaFaturaEvrakiYukle,
  // test için
  belgeGorunumu, kalemGorunumu
};
