// 🧩 İŞLEM VE EVRAK YÖNETİMİ CONTROLLER
// Admin/danışman tarafı: işlem türü tanımları + firma bazlı evrak talepleri.

const IslemTuru = require('../models/IslemTuru');
const IslemTalebi = require('../models/IslemTalebi');
const Firma = require('../models/Firma');
const svc = require('../services/islemEvrak/islemEvrakService');
const storageService = require('../services/tesvikMakine/storageService');
const mailService = require('../services/tesvikMakine/mailService');

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((err) => {
  const kod = err.code || '';
  const durum = ['FIRMA_NOT_FOUND', 'TUR_NOT_FOUND', 'TALEP_NOT_FOUND'].includes(kod) ? 404
    : ['NO_RECIPIENT', 'EMPTY_CONTENT', 'BAD_INPUT'].includes(kod) ? 400 : 500;
  if (durum === 500) console.error('🚨 [islemEvrak]', err && (err.stack || err.message));
  res.status(durum).json({ success: false, message: err.message || 'İşlem başarısız', code: kod });
});

async function talepBul(id) {
  const talep = await IslemTalebi.findById(id);
  if (!talep || !talep.aktif) { const e = new Error('Talep bulunamadı.'); e.code = 'TALEP_NOT_FOUND'; throw e; }
  return talep;
}

// ───────── İŞLEM TÜRLERİ ─────────

exports.turListe = wrap(async (req, res) => {
  const filtre = req.query.hepsi === '1' ? {} : { aktif: true };
  const data = await IslemTuru.find(filtre).sort({ siraNo: 1, ad: 1 }).lean();
  res.json({ success: true, data });
});

exports.turDetay = wrap(async (req, res) => {
  const tur = await IslemTuru.findById(req.params.id).lean();
  if (!tur) { const e = new Error('İşlem türü bulunamadı.'); e.code = 'TUR_NOT_FOUND'; throw e; }
  res.json({ success: true, data: tur });
});

exports.turKaydet = wrap(async (req, res) => {
  const { kod, ad, aciklama, mailKonusu, mailGovdesi, googleFormUrl, googleFormAlanlari,
    istenenEvraklar, sorular, varyantlar, aktif, siraNo } = req.body || {};
  if (!ad || !String(ad).trim()) { const e = new Error('İşlem adı zorunludur.'); e.code = 'BAD_INPUT'; throw e; }

  const govde = {
    ad: String(ad).trim(),
    aciklama: aciklama || '',
    mailKonusu: mailKonusu || '',
    mailGovdesi: mailGovdesi || '',
    // Google Form ön-dolgusu: anahtarı boş kalan eşleme link üretiminde işe yaramaz, elenir
    googleFormUrl: String(googleFormUrl || '').trim(),
    googleFormAlanlari: Array.isArray(googleFormAlanlari)
      ? googleFormAlanlari.filter((a) => a && String(a.entryId || '').trim())
      : [],
    istenenEvraklar: Array.isArray(istenenEvraklar) ? istenenEvraklar : [],
    // Metni boş bırakılmış soru koşulları bozar (evrak hiç görünmez hale gelir) → elenir
    sorular: Array.isArray(sorular)
      ? sorular.filter((x) => x && x.id && String(x.metin || '').trim())
      : [],
    varyantlar: Array.isArray(varyantlar) ? varyantlar : [],
    aktif: aktif !== false,
    siraNo: Number(siraNo) || 0
  };

  if (req.params.id) {
    const tur = await IslemTuru.findByIdAndUpdate(req.params.id, { $set: govde }, { new: true });
    if (!tur) { const e = new Error('İşlem türü bulunamadı.'); e.code = 'TUR_NOT_FOUND'; throw e; }
    return res.json({ success: true, data: tur, message: 'İşlem türü güncellendi' });
  }

  // Kod verilmediyse addan türet (benzersizlik için zaman eki)
  const slug = String(kod || ad).toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'islem';
  const tur = await IslemTuru.create({
    ...govde,
    kod: kod ? slug : `${slug}_${Date.now().toString(36)}`,
    olusturanKullanici: req.user?._id
  });
  res.json({ success: true, data: tur, message: 'İşlem türü oluşturuldu' });
});

exports.turSil = wrap(async (req, res) => {
  // Kullanımdaki türü silmek yerine pasifleştir (geçmiş talepler bozulmasın)
  const kullanim = await IslemTalebi.countDocuments({ islemTuru: req.params.id });
  if (kullanim > 0) {
    await IslemTuru.findByIdAndUpdate(req.params.id, { $set: { aktif: false } });
    return res.json({ success: true, message: `Bu tür ${kullanim} talepte kullanıldığı için pasifleştirildi.` });
  }
  await IslemTuru.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'İşlem türü silindi' });
});

// ───────── TALEPLER ─────────

exports.talepListe = wrap(async (req, res) => {
  const { q, durum, islemTuru, firma, sayfa = 1, limit = 50 } = req.query;
  const filtre = { aktif: true };
  if (durum) filtre.durum = durum;
  if (islemTuru) filtre.islemTuru = islemTuru;
  if (firma) filtre.firma = firma;
  if (q && q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtre.$or = [{ firmaAdi: rx }, { islemTuruAdi: rx }];
  }

  const sayfaNo = Math.max(1, parseInt(sayfa) || 1);
  const adet = Math.min(200, Math.max(1, parseInt(limit) || 50));
  const [kayitlar, toplam] = await Promise.all([
    IslemTalebi.find(filtre).sort({ createdAt: -1 }).skip((sayfaNo - 1) * adet).limit(adet).lean(),
    IslemTalebi.countDocuments(filtre)
  ]);

  // Liste için özet: kaç evrak istendi / kaçı geldi
  const data = kayitlar.map((t) => ({
    ...t,
    istenenSayisi: (t.istenenEvraklar || []).length,
    gelenSayisi: (t.istenenEvraklar || []).filter((e) => e.geldiMi).length,
    yuklenenSayisi: (t.yuklenenEvraklar || []).length
  }));
  res.json({ success: true, data, pagination: { sayfa: sayfaNo, limit: adet, toplam } });
});

exports.talepDetay = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const uploadLink = talep.uploadToken ? require('../services/tesvikMakine/uploadTokenService').buildUploadLink(talep.uploadToken) : '';
  res.json({ success: true, data: { ...talep.toObject(), uploadLink, smtpConfigured: mailService.isConfigured() } });
});

exports.talepOlustur = wrap(async (req, res) => {
  const { firmaId, islemTuruId, varyantKod, cevaplar } = req.body || {};
  const talep = await svc.talepOlustur({ firmaId, islemTuruId, varyantKod, cevaplar, user: req.user });
  res.json({ success: true, data: talep, message: 'Talep oluşturuldu' });
});

// İstenen evrak listesi + notlar + varyant güncelleme (serbest düzenleme)
exports.talepGuncelle = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const { istenenEvraklar, notlar, mailAlicilar, mailCc, varyantKod, varyantAd,
    mailKonusu, mailGovdesi } = req.body || {};

  if (Array.isArray(istenenEvraklar)) {
    // Yeni eklenen satırlara "kim istedi" damgası vur
    talep.istenenEvraklar = istenenEvraklar.map((e) => ({
      ...e,
      isteyenKullanici: e.isteyenKullanici || req.user?._id,
      isteyenAdi: e.isteyenAdi || req.user?.adSoyad || '',
      istenmeTarihi: e.istenmeTarihi || new Date()
    }));
  }
  if (typeof notlar === 'string') talep.notlar = notlar;
  if (Array.isArray(mailAlicilar)) talep.mailAlicilar = mailAlicilar;
  if (Array.isArray(mailCc)) talep.mailCc = mailCc;
  // Müşteri (gm modüller): "Maili istediğimiz gibi düzenleyip/kaydedip/silebilelim"
  // Boş string = taslağı sil → mail önizlemesi tekrar şablondan üretilir (talepMailOnizle
  // `talep.mailKonusu || konu` mantığıyla çalışır).
  if (typeof mailKonusu === 'string') talep.mailKonusu = mailKonusu;
  if (typeof mailGovdesi === 'string') talep.mailGovdesi = mailGovdesi;
  if (typeof varyantKod === 'string') talep.varyantKod = varyantKod;
  if (typeof varyantAd === 'string') talep.varyantAd = varyantAd;

  talep.sonGuncelleyen = req.user?._id;
  talep.durumTazele();
  await talep.save();
  res.json({ success: true, data: talep, message: 'Talep güncellendi' });
});

// Varyant değişince şablonu yeniden uygula (evrak listesi + mail metni tazelensin)
exports.talepVaryantUygula = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const { varyantKod } = req.body || {};
  const tur = await IslemTuru.findById(talep.islemTuru);
  if (!tur) { const e = new Error('İşlem türü bulunamadı.'); e.code = 'TUR_NOT_FOUND'; throw e; }

  const sablon = tur.varyantCoz(varyantKod);
  talep.varyantKod = sablon.kod || '';
  talep.varyantAd = sablon.ad || '';
  // Varyant değişince liste yeniden kurulur; talepteki cevaplarla AYNI süzgeçten geçer,
  // yoksa sihirbazda elenen 55 kalem varyant değiştirir değiştirmez geri gelirdi.
  talep.istenenEvraklar = svc.kosullaSuz(sablon.istenenEvraklar, talep.cevaplar).map((e) => ({
    ad: e.ad, aciklama: e.aciklama || '', zorunlu: e.zorunlu !== false,
    ornekDosya: e.ornekDosya || undefined,
    isteyenKullanici: req.user?._id, isteyenAdi: req.user?.adSoyad || '', istenmeTarihi: new Date()
  }));
  talep.durumTazele();
  await talep.save();
  res.json({ success: true, data: talep, message: `${sablon.ad || 'Varsayılan'} şablonu uygulandı` });
});

// Mail önizleme: şablondan konu/gövde üret (link gerekiyorsa üretilir)
exports.talepMailOnizle = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const tur = await IslemTuru.findById(talep.islemTuru);
  const sablon = tur ? tur.varyantCoz(talep.varyantKod) : { mailKonusu: '', mailGovdesi: '' };
  const uploadLink = await svc.ensureUploadLink(talep);
  // Google Form bağlantısı firmaya göre ön-doldurulacağı için firma kaydı da lazım
  // (talep yalnızca ad/e-posta snapshot'ı taşıyor; vergi no firmadan geliyor).
  const firma = await Firma.findById(talep.firma).select('tamUnvan vergiNoTC firmaEmail').lean();
  const { konu, govde } = svc.mailOlustur({ talep, sablon, uploadLink, firma });
  res.json({
    success: true,
    data: {
      subject: talep.mailKonusu || konu,
      body: talep.mailGovdesi || govde,
      to: talep.mailAlicilar || [],
      cc: talep.mailCc || [],
      uploadLink,
      smtpConfigured: mailService.isConfigured(),
      // Maile eklenebilecek örnek dosyalar
      ornekDosyalar: (talep.istenenEvraklar || [])
        .filter((e) => e.ornekDosya && (e.ornekDosya.fileUrl || e.ornekDosya.filePath))
        .map((e) => ({ evrakId: e._id, ...e.ornekDosya.toObject?.() || e.ornekDosya }))
    }
  });
});

exports.talepMailGonder = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const { to, cc, subject, body, ekEvrakIdler } = req.body || {};
  const parseList = (v) => (Array.isArray(v) ? v : String(v || '').split(/[;,\s]+/))
    .map((s) => String(s).trim()).filter((s) => s.includes('@'));

  // Ekler: yalnızca seçilen istenen-evrakların örnek dosyaları (yollar kayıttan okunur)
  const secilen = Array.isArray(ekEvrakIdler) ? ekEvrakIdler.map(String) : null;
  const ekler = (talep.istenenEvraklar || [])
    .filter((e) => e.ornekDosya && (e.ornekDosya.fileUrl || e.ornekDosya.filePath))
    .filter((e) => !secilen || secilen.includes(String(e._id)))
    .map((e) => e.ornekDosya);

  const sonuc = await svc.mailGonder(talep, {
    to: parseList(to), cc: parseList(cc), subject, body, ekler, user: req.user
  });
  res.json({ success: true, data: { ...sonuc, talep }, message: 'Mail gönderildi' });
});

// İstenen evraka örnek/şablon dosya yükle (firmaya bu dosya gönderilir)
exports.talepOrnekDosyaYukle = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const evrak = talep.istenenEvraklar.id(req.params.evrakId);
  if (!evrak) { const e = new Error('Evrak kalemi bulunamadı.'); e.code = 'BAD_INPUT'; throw e; }
  const files = req.uploadedFiles || [];
  if (!files.length) { const e = new Error('Dosya seçilmedi.'); e.code = 'BAD_INPUT'; throw e; }

  const kayit = await svc.dosyaKaydet(talep, files[0], 'Ornek_Sablonlar');
  evrak.ornekDosya = {
    dosyaAdi: kayit.orijinalAd, fileUrl: kayit.fileUrl, filePath: kayit.filePath,
    mimeType: kayit.mimeType, fileSize: kayit.fileSize
  };
  await talep.save();
  res.json({ success: true, data: talep, message: 'Örnek dosya yüklendi' });
});

// Firma yüklemesini sil (yanlış/mükerrer dosya)
// 📥 Yüklenen dosyayı indir
// Müşteri: "Yüklediğimiz belgeler açılmıyor/indirilmiyor".
// Kök neden: kayıttaki fileUrl GÖRELİ bir yol ("/uploads/tesvik-evrak/...") ve arayüz onu
// doğrudan <a href> olarak veriyordu. Tarayıcı göreli yolu FRONTEND origin'ine göre çözüyor,
// backend'e değil; SPA catch-all index.html döndürünce dosya yerine HTML iniyordu.
// Çözüm, kardeş modüldeki (tesvikMakine) desenin aynısı: auth'lu indirme ucu + blob.
exports.talepDosyaIndir = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const { dosyaId } = req.params;

  // Aynı uç hem firmanın yüklediği evrakları hem de örnek/şablon dosyaları verir
  const yuklenen = talep.yuklenenEvraklar.id(dosyaId);
  if (yuklenen) {
    return storageService.serveFile({
      fileUrl: yuklenen.fileUrl,
      filePath: yuklenen.filePath,
      originalName: yuklenen.orijinalAd || yuklenen.dosyaAdi,
      fileName: yuklenen.dosyaAdi
    }, res);
  }

  const istenen = talep.istenenEvraklar.id(dosyaId);
  if (istenen && istenen.ornekDosya && (istenen.ornekDosya.fileUrl || istenen.ornekDosya.filePath)) {
    return storageService.serveFile({
      fileUrl: istenen.ornekDosya.fileUrl,
      filePath: istenen.ornekDosya.filePath,
      originalName: istenen.ornekDosya.dosyaAdi,
      fileName: istenen.ornekDosya.dosyaAdi
    }, res);
  }

  const e = new Error('Dosya bulunamadı.'); e.code = 'BAD_INPUT'; throw e;
});

exports.talepYuklenenSil = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const dosya = talep.yuklenenEvraklar.id(req.params.dosyaId);
  if (!dosya) { const e = new Error('Dosya bulunamadı.'); e.code = 'BAD_INPUT'; throw e; }
  try {
    await storageService.deleteFile({ fileUrl: dosya.fileUrl, filePath: dosya.filePath });
  } catch (err) { console.warn('⚠️ [islemEvrak] dosya silinemedi:', err && err.message); }
  dosya.deleteOne();
  talep.durumTazele();
  await talep.save();
  res.json({ success: true, data: talep, message: 'Dosya silindi' });
});

exports.talepSil = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  talep.aktif = false;
  await talep.save();
  res.json({ success: true, message: 'Talep kaldırıldı' });
});

exports.talepLinkUret = wrap(async (req, res) => {
  const talep = await talepBul(req.params.id);
  const uploadLink = await svc.ensureUploadLink(talep, { days: Number(req.body?.gun) || undefined });
  res.json({ success: true, data: { uploadLink, token: talep.uploadToken } });
});

// ───────── PUBLIC (token ile, AUTH YOK) ─────────

exports.publicBilgi = async (req, res) => {
  try {
    const sonuc = await svc.resolveByToken(req.params.token);
    if (!sonuc) return res.status(404).json({ success: false, message: 'Bağlantı bulunamadı veya geçersiz.' });
    if (sonuc.expired) return res.status(410).json({ success: false, message: 'Bağlantının süresi dolmuş. Lütfen yetkiliyle iletişime geçin.' });
    const { talep } = sonuc;
    // Hassas veri paylaşılmaz: yalnızca istenen evrak listesi ve firma/işlem adı
    res.json({
      success: true,
      data: {
        firmaAdi: talep.firmaAdi,
        islemAdi: talep.islemTuruAdi,
        varyantAd: talep.varyantAd || '',
        // Maile yazılmayan evrak firmaya da gösterilmez: aksi halde firma, mailde
        // hiç bahsedilmeyen bir belgeyi portalde görüp kafası karışıyordu.
        istenenEvraklar: (talep.istenenEvraklar || []).filter((e) => e.zorunlu !== false).map((e) => ({
          id: e._id, ad: e.ad, aciklama: e.aciklama, zorunlu: e.zorunlu, geldiMi: e.geldiMi,
          ornekDosyaVar: !!(e.ornekDosya && (e.ornekDosya.fileUrl || e.ornekDosya.filePath))
        })),
        maxUploadMB: Number(process.env.MAX_UPLOAD_MB) || 100
      }
    });
  } catch (err) {
    console.error('🚨 [islemEvrak] publicBilgi:', err && err.message);
    res.status(500).json({ success: false, message: 'Bilgi alınamadı.' });
  }
};

exports.publicYukle = async (req, res) => {
  try {
    const sonuc = await svc.resolveByToken(req.params.token);
    if (!sonuc) return res.status(404).json({ success: false, message: 'Bağlantı bulunamadı veya geçersiz.' });
    if (sonuc.expired) return res.status(410).json({ success: false, message: 'Bağlantının süresi dolmuş.' });
    const { talep } = sonuc;

    const files = req.uploadedFiles || (req.file ? [req.file] : []);
    if (!files.length) return res.status(400).json({ success: false, message: 'Lütfen en az bir dosya seçin.' });

    const evrakId = (req.body && req.body.istenenEvrakId) || null;
    const yukleyenAdi = ((req.body && req.body.yukleyenAdi) || '').toString().slice(0, 120);
    const hedefEvrak = evrakId ? talep.istenenEvraklar.id(evrakId) : null;

    for (const file of files) {
      const kayit = await svc.dosyaKaydet(talep, file, 'Gelen');
      talep.yuklenenEvraklar.push({
        istenenEvrakId: hedefEvrak ? hedefEvrak._id : undefined,
        istenenEvrakAdi: hedefEvrak ? hedefEvrak.ad : '',
        ...kayit,
        yukleyenAdi
      });
    }
    talep.durumTazele();
    await talep.save();

    // 🔔 Ekibe bilgilendirme (best-effort)
    try {
      if (mailService.isConfigured()) {
        const to = process.env.UPLOAD_NOTIFY_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
        if (to) {
          await mailService.sendMail({
            to,
            subject: `Yeni evrak yüklendi — ${talep.firmaAdi} (${talep.islemTuruAdi})`,
            text: [
              'İşlem ve Evrak Yönetimi bağlantısı üzerinden yeni evrak yüklendi:',
              '',
              `Firma : ${talep.firmaAdi}`,
              `İşlem : ${talep.islemTuruAdi}${talep.varyantAd ? ` (${talep.varyantAd})` : ''}`,
              `Evrak : ${hedefEvrak ? hedefEvrak.ad : 'Belirtilmedi'}`,
              `Adet  : ${files.length}`,
              yukleyenAdi ? `Yükleyen: ${yukleyenAdi}` : ''
            ].filter(Boolean).join('\n')
          });
        }
      }
    } catch (e) { console.error('🚨 [islemEvrak] yükleme bildirimi:', e && e.message); }

    res.json({
      success: true,
      message: files.length > 1 ? `${files.length} dosyanız yüklendi. Teşekkür ederiz.` : 'Dosyanız yüklendi. Teşekkür ederiz.',
      count: files.length
    });
  } catch (err) {
    if (err && err.code === 'UNSUPPORTED_FILE_TYPE') return res.status(415).json({ success: false, message: err.message });
    console.error('🚨 [islemEvrak] publicYukle:', err && (err.stack || err.message));
    res.status(500).json({ success: false, message: 'Dosya yüklenemedi. Lütfen tekrar deneyin.' });
  }
};
