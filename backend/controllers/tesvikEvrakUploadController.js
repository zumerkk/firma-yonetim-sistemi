// 🌐 TEŞVİK EVRAK UPLOAD CONTROLLER - Public (token tabanlı, AUTH YOK)
// Müşteri/tedarikçi yalnızca kendi makine klasörüne dosya yükler. Hassas veri (mail, vergi no) sızdırılmaz.

const crypto = require('crypto');
const MachineProcess = require('../models/MachineProcess');
const MailLog = require('../models/MailLog');
const tokenService = require('../services/tesvikMakine/uploadTokenService');
const storageService = require('../services/tesvikMakine/storageService');
const mps = require('../services/tesvikMakine/machineProcessService');
const araKontrol = require('../services/tesvikMakine/araKontrolService');
const resolver = require('../services/tesvikMakine/certificateResolver');
const kdvMuafiyetService = require('../services/tesvikMakine/kdvMuafiyetService');
const { publicDocumentTypes, DOCUMENT_TYPE_KEYS, getDocumentTypeFolder, MAIL_TEMPLATE_CODE } = require('../constants/tesvikMakineMail');
const { ALLOWED_EXT } = require('../middleware/tesvikUpload');

// fetchBuffer artık sebep döndürüyor; mesajı ona göre seç.
// Kullanıcıya "tekrar deneyin" demek DISKTE_YOK durumunda yanıltıcı: dosya
// gerçekten yok, tekrar denemek hiçbir şeyi değiştirmez.
const KDV_INDIRME_MESAJI = {
  KAYIT_YOK: 'KDV muafiyet yazısı yüklenmemiş.',
  DISKTE_YOK: 'Dosya sunucuda bulunamadı. Yazının yeniden yüklenmesi gerekiyor — lütfen yetkiliyle iletişime geçin.',
  ERISILEMEDI: 'Dosya kaynaktan alınamadı. Lütfen birazdan tekrar deneyin.'
};

function fail(res, code, message) {
  return res.status(code).json({ success: false, message });
}

async function resolveByToken(token) {
  if (!token) return { error: [400, 'Geçersiz bağlantı.'] };
  const proc = await MachineProcess.findOne({ uploadToken: token });
  if (proc) {
    if (tokenService.isExpired(proc.uploadTokenExpiresAt)) return { error: [410, 'Bağlantının süresi dolmuş. Lütfen yetkiliyle iletişime geçin.'] };
    return { proc };
  }
  // Makine sürecinde yoksa: Ara Kontrol (belge geneli) linki — token teşvik dokümanında yaşar
  const belge = await araKontrol.resolveBelgeByToken(token);
  if (belge && belge.expired) return { error: [410, 'Bağlantının süresi dolmuş. Lütfen yetkiliyle iletişime geçin.'] };
  if (belge) return { belgeCtx: belge };
  // Toplu mail linki: birden fazla makineyi kapsar (bkz. models/TopluYuklemeBaglantisi.js)
  const topluYukleme = require('../services/tesvikMakine/topluYuklemeService');
  const grup = await topluYukleme.resolveTopluByToken(token);
  if (grup && grup.expired) return { error: [410, 'Bağlantının süresi dolmuş. Lütfen yetkiliyle iletişime geçin.'] };
  if (grup) return { grupCtx: grup };
  return { error: [404, 'Bağlantı bulunamadı veya geçersiz.'] };
}

// Makineye daha önce kaydedilmiş fatura kalemlerinin özeti — müşteri (13.10.2026): "Buradaki makinelere
// daha önceden fatura kaydedildiyse görünsün (miktar-tutar)". Fatura no/tarih/içerik paylaşılmaz.
const faturaOzeti = (p) => {
  const kalemler = mps.faturaKalemleriniOku(p);
  if (!kalemler.length) return null;
  return {
    kalemSayisi: kalemler.length,
    toplamTutar: kalemler.reduce((toplam, k) => toplam + (Number(k.tutar) || 0), 0),
    toplamAdet: kalemler.reduce((toplam, k) => toplam + (Number(k.adet) || 0), 0),
    paraBirimi: p.currency || (p.listType === 'import' ? 'USD' : 'TRY')
  };
};

// Linkle gelen evrakın ön seçili türü — müşteri (13.10.2026): "onaylı faturayı seçince evrak türü onaylı
// fatura açılsın, taslak maili ise fatura taslağı olarak açılsın". Link aynı kaldığı için karar,
// makineye giden SON mailin şablonuna göre verilir.
async function varsayilanEvrakTuru(surecler, turler, linkTuru) {
  const kodlar = (turler || []).map((t) => t.key);
  if (kodlar.includes(linkTuru)) return linkTuru;
  const ids = surecler.map((p) => p._id).filter(Boolean);
  // Sorgu parametresiz eski linkler de çalışır. Hatırlatma son mail olmuşsa en son fatura talebinin
  // amacı kaybolmaz; toplu kayıtta ilk satırın değil son gönderimin şablonu esas alınır.
  const sonTalep = await MailLog.findOne({
    $or: [{ machineProcessId: { $in: ids } }, { kapsananSurecIds: { $in: ids } }],
    templateCode: { $in: [MAIL_TEMPLATE_CODE.INVOICE_DRAFT_APPROVED, MAIL_TEMPLATE_CODE.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION] },
    status: 'sent'
  }).sort({ sentAt: -1, createdAt: -1 }).select('templateCode').lean();
  const sonSablon = sonTalep?.templateCode || (surecler.find((p) => p && p.lastMailTemplateCode) || {}).lastMailTemplateCode || '';
  const istenen = sonSablon === MAIL_TEMPLATE_CODE.INVOICE_DRAFT_APPROVED ? 'fatura_onayli'
    : sonSablon === MAIL_TEMPLATE_CODE.SUPPLIER_VERIFICATION_INVOICE_INSTRUCTION ? 'fatura_taslak'
      : '';
  return kodlar.includes(istenen) ? istenen : (kodlar[0] || 'diger');
}

// GET /api/tesvik-evrak/:token → yükleme ekranı için sade bilgi
exports.getInfo = async (req, res) => {
  try {
    const { proc, belgeCtx, grupCtx, error } = await resolveByToken(req.params.token);
    if (error) return fail(res, error[0], error[1]);
    const ortak = {
      // Firmaya yalnızca ilgili türler gösterilir; yükleme doğrulaması (DOCUMENT_TYPE_KEYS)
      // tüm türleri kabul etmeye devam eder, böylece eski linkler/kayıtlar bozulmaz.
      //
      // İthal makinede fatura değil GÜMRÜK BEYANNAMESİ isteniyor (müşteri talebi).
      // Belge geneli linkte makine yok, o durumda yerli varsayılıyor.
      documentTypes: publicDocumentTypes(proc && proc.listType),
      allowedExtensions: ALLOWED_EXT,
      maxUploadMB: Number(process.env.MAX_UPLOAD_MB) || 100
    };
    if (belgeCtx) {
      // Belge geneli (Ara Kontrol) linki: makine yerine belge kimliği gösterilir
      const identity = resolver.extractCertIdentity(belgeCtx.doc);
      return res.json({
        success: true,
        data: {
          firmaAdi: identity.firmaName || '',
          belgeNo: identity.documentNo || '',
          makineAdi: 'Belge Geneli (Fatura / Evrak)',
          siraNo: 0,
          listType: 'local',
          ...ortak
        }
      });
    }
    if (grupCtx) {
      // Toplu mail linki: kapsanan makineler listelenir; evrak türleri liste tiplerinin birleşimi
      // (yerli + ithal karışık seçimde hem fatura türleri hem beyanname)
      const { topluBelgeTurleri } = require('../services/tesvikMakine/topluYuklemeService');
      const ilk = grupCtx.processes[0];
      const turler = topluBelgeTurleri(grupCtx.processes.map((p) => p.listType));
      return res.json({
        success: true,
        data: {
          firmaAdi: ilk.firmaName || '',
          belgeNo: ilk.documentNo || '',
          makineAdi: `${grupCtx.processes.length} makine kalemi`,
          siraNo: 0,
          listType: ilk.listType,
          makineler: grupCtx.processes.map((p) => ({
            siraNo: p.siraNo || 0, makineAdi: p.machineName || '', makineId: p.makineId || '',
            fatura: faturaOzeti(p)
          })),
          ...ortak,
          documentTypes: turler,
          varsayilanEvrakTuru: await varsayilanEvrakTuru(grupCtx.processes, turler, req.query.evrakTuru)
        }
      });
    }
    return res.json({
      success: true,
      data: {
        firmaAdi: proc.firmaName || '',
        belgeNo: proc.documentNo || '',
        makineAdi: proc.machineName || '',
        siraNo: proc.siraNo || 0,
        listType: proc.listType,
        fatura: faturaOzeti(proc),
        ...ortak,
        varsayilanEvrakTuru: await varsayilanEvrakTuru([proc], ortak.documentTypes, req.query.evrakTuru)
      }
    });
  } catch (err) {
    console.error('🚨 [tesvikEvrak] getInfo:', err && err.message);
    return fail(res, 500, 'Bilgi alınamadı.');
  }
};

// ───────── 🧾 KDV MUAFİYET YAZISI — public indirme (AUTH YOK, token tabanlı) ─────────
// Tedarikçiye giden mailde ek yerine bu bağlantı yer alır: "bu linkten indirebilirsiniz".
// Yalnızca yazının kendisi ve geçerlilik tarihleri paylaşılır; belge/firma detayı sızdırılmaz.

// GET /api/tesvik-evrak/kdv-muafiyet/:token → indirme sayfası bilgisi
exports.kdvMuafiyetInfo = async (req, res) => {
  try {
    const bulunan = await kdvMuafiyetService.resolveByToken(req.params.token);
    if (!bulunan) return fail(res, 404, 'Bağlantı bulunamadı veya geçersiz.');
    const identity = resolver.extractCertIdentity(bulunan.doc);
    const ozet = kdvMuafiyetService.ozet(bulunan.kdv);
    return res.json({
      success: true,
      data: {
        firmaAdi: identity.firmaName || '',
        belgeNo: identity.documentNo || '',
        dosyaAdi: ozet.dosyaAdi,
        boyut: ozet.boyut,
        gecerlilikBaslangic: ozet.gecerlilikBaslangic,
        gecerlilikBitis: ozet.gecerlilikBitis,
        gecerliMi: ozet.gecerliMi,
        henuzBaslamadi: ozet.henuzBaslamadi,
        suresiDoldu: ozet.suresiDoldu
      }
    });
  } catch (err) {
    console.error('🚨 [tesvikEvrak] kdvMuafiyetInfo:', err && err.message);
    return fail(res, 500, 'Bilgi alınamadı.');
  }
};

// GET /api/tesvik-evrak/kdv-muafiyet/:token/download → dosyayı stream et
// NOT: Cloudinary'de PDF teslimat kısıtı olabildiğinden doğrudan redirect DEĞİL,
// imzalı/authenticated kaynaktan proxy edilir (kdvMuafiyetService.fetchBuffer).
exports.kdvMuafiyetDownload = async (req, res) => {
  try {
    const bulunan = await kdvMuafiyetService.resolveByToken(req.params.token);
    if (!bulunan) return fail(res, 404, 'Bağlantı bulunamadı veya geçersiz.');
    const file = await kdvMuafiyetService.fetchBuffer(bulunan.kdv);
    if (!file || file.hata) {
      const kod = (file && file.hata) || 'ERISILEMEDI';
      return fail(res, kod === 'DISKTE_YOK' ? 410 : 502,
        KDV_INDIRME_MESAJI[kod] || KDV_INDIRME_MESAJI.ERISILEMEDI);
    }
    const ad = encodeURIComponent(bulunan.kdv.orijinalAd || bulunan.kdv.dosyaAdi || 'kdv-muafiyet-yazisi');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${ad}`);
    return res.send(file.buffer);
  } catch (err) {
    console.error('🚨 [tesvikEvrak] kdvMuafiyetDownload:', err && err.message);
    return fail(res, 500, 'Dosya indirilemedi.');
  }
};

// POST /api/tesvik-evrak/:token → dosya yükle
exports.upload = async (req, res) => {
  try {
    const { proc, belgeCtx, grupCtx, error } = await resolveByToken(req.params.token);
    if (error) return fail(res, error[0], error[1]);
    const files = req.uploadedFiles || (req.file ? [req.file] : []);
    if (!files.length) return fail(res, 400, 'Lütfen en az bir dosya seçin.');

    let documentType = (req.body && req.body.documentType) || 'diger';
    if (!DOCUMENT_TYPE_KEYS.includes(documentType)) documentType = 'diger';

    let uploadedByType = (req.body && req.body.uploaderType) || 'customer';
    if (!['customer', 'supplier'].includes(uploadedByType)) uploadedByType = 'customer';
    const uploaderName = ((req.body && req.body.uploaderName) || '').toString().slice(0, 120);
    const note = ((req.body && req.body.note) || '').toString().slice(0, 1000);

    // 📮 Belge geneli (Ara Kontrol) yüklemesi: dosyalar belgenin "Belge_Geneli" klasörüne,
    // kayıt makine süreci OLMADAN (machineProcessId null) belge bağıyla yazılır
    if (belgeCtx) {
      const identity = resolver.extractCertIdentity(belgeCtx.doc);
      const folderRel = [storageService.certificateFolderRel(identity), 'Belge_Geneli'].join('/');
      await storageService.ensureCertificateStructure(identity);
      for (const file of files) {
        const saved = await storageService.saveBuffer({
          folderRel, documentTypeFolder: getDocumentTypeFolder(documentType),
          originalName: file.originalname, buffer: file.buffer
        });
        await araKontrol.recordBelgeUpload({
          tesvikModel: belgeCtx.tesvikModel, tesvikId: belgeCtx.doc._id,
          documentType, saved, fileSize: file.size, mimeType: file.mimetype,
          uploadedByType, uploaderName, note, originalName: file.originalname
        });
      }
      araKontrol.notifyBelgeUploadReceived({
        identity, count: files.length, documentType, uploaderName, note
      }).catch((e) => console.error('🚨 [tesvikEvrak] ara kontrol bildirimi:', e && e.message));
      const bMsg = files.length > 1
        ? `${files.length} dosyanız başarıyla yüklendi. Teşekkür ederiz.`
        : 'Dosyanız başarıyla yüklendi. Teşekkür ederiz.';
      return res.json({ success: true, message: bMsg, count: files.length });
    }

    // Makine linki tek süreci, toplu mail linki birden fazla süreci kapsar; kayıt akışı her biri için aynı
    const surecler = grupCtx ? grupCtx.processes : [proc];
    // Önce tüm makinelerin bağlamı: bir makinenin belgesi bulunamazsa hiçbirine yazılmadan
    // hata dönsün, yarım yükleme kalmasın
    const hedefler = [];
    for (const p of surecler) {
      const { identity, machineFields } = await mps.buildContext(p);
      hedefler.push({ p, identity, machineFields });
    }

    // Toplu linkte aynı dosyanın makine kopyaları bir kimlik paylaşır: ekranda TEK ortak yükleme görünür
    // (bkz. services/tesvikMakine/ortakYukleme.js). Makine klasörleri yine eksiksiz dolar.
    const ortakKimlikler = files.map(() => (surecler.length > 1 ? crypto.randomUUID() : null));
    for (const { p, identity, machineFields } of hedefler) {
      const folderRel = storageService.machineFolderRel(identity, machineFields, p.listType);
      await storageService.ensureMachineStructure(identity, machineFields, p.listType);
      for (const [i, file] of files.entries()) {
        const saved = await storageService.saveBuffer({
          folderRel, documentTypeFolder: getDocumentTypeFolder(documentType),
          originalName: file.originalname, buffer: file.buffer
        });
        await mps.recordUploadedDocument({
          proc: p, documentType, saved, fileSize: file.size, mimeType: file.mimetype,
          uploadedBy: null, uploadedByType, uploaderName, note, originalName: file.originalname,
          ortakYuklemeId: ortakKimlikler[i]
        });
      }
    }

    // 🔔 Ekibe bilgilendirme maili (best-effort — yüklemeyi bloklamaz/etkilemez).
    // Toplu linkte tek bildirim gider; kapsanan makineler notta yazar.
    const bildirimNotu = grupCtx
      ? [`Toplu bağlantı — ${surecler.length} makine kalemi (sıra no: ${surecler.map((p) => p.siraNo).join(', ')})`, note].filter(Boolean).join('\n')
      : note;
    mps.notifyUploadReceived(surecler[0], {
      count: files.length, documentType, uploaderType: uploadedByType, uploaderName, note: bildirimNotu
    }).catch((e) => console.error('🚨 [tesvikEvrak] upload bildirimi:', e && e.message));

    const msg = files.length > 1
      ? `${files.length} dosyanız başarıyla yüklendi. Teşekkür ederiz.`
      : 'Dosyanız başarıyla yüklendi. Teşekkür ederiz.';
    return res.json({ success: true, message: msg, count: files.length });
  } catch (err) {
    if (err && err.code === 'UNSUPPORTED_FILE_TYPE') return fail(res, 415, err.message);
    console.error('🚨 [tesvikEvrak] upload:', err && (err.stack || err.message));
    return fail(res, 500, 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
  }
};
