const DosyaTakip = require('../models/DosyaTakip');
const Activity = require('../models/Activity');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ============================================================================
// ☁️ CLOUDINARY AYARLARI
// ============================================================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'drweumniy',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Dosya adından güvenli public_id tabanı üret (Türkçe/özel karakter → ASCII)
const guvenliTaban = (ad) =>
    (path.parse(ad || '').name || 'dosya')
        .normalize('NFKD')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .slice(0, 80) || 'dosya';

const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        const isImage = /^image\//.test(file.mimetype || '');
        const ext = (path.extname(file.originalname || '') || '').toLowerCase();
        const taban = `${Date.now()}-${guvenliTaban(file.originalname)}`;
        return {
            folder: 'dosya-takip',
            // PDF/Office/zip vb. 'raw' olarak saklanır → indirme/önizleme sorunsuz.
            // ('auto', PDF'i image gibi saklayıp teslimatı 401 ile engelliyordu.)
            resource_type: isImage ? 'image' : 'raw',
            // raw dosyalarda uzantı public_id'de korunur (doğru içerik tipi + indirme adı)
            public_id: isImage ? taban : `${taban}${ext}`
        };
    }
});

// İzin verilen uzantılar (Cloudinary allowed_formats yerine güvenli sunucu kontrolü)
const IZINLI_UZANTILAR = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip', '.rar', '.ppt', '.pptx'];

const upload = multer({
    storage: cloudinaryStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const ext = (path.extname(file.originalname || '') || '').toLowerCase();
        if (IZINLI_UZANTILAR.includes(ext)) return cb(null, true);
        cb(new Error(`Bu dosya türü desteklenmiyor (${ext || 'bilinmiyor'}). İzin verilenler: PDF, Word, Excel, resim, txt, zip.`));
    }
});

// multer/cloudinary hatalarını temiz JSON olarak döndüren sarmalayıcı
const tekDosyaYukle = (req, res, next) => {
    upload.single('dosya')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message || 'Dosya yüklenemedi' });
        }
        next();
    });
};

// ============================================================================
// 🔗 ORTAK POPULATE YAPISI
// Detay ve tüm mutasyon dönüşlerinde aynı populate kullanılır; böylece
// kaydetme sonrası firma.yetkiliKisiler / personel adları kaybolmaz.
// ============================================================================
const TALEP_POPULATE = [
    { path: 'firma', select: 'tamUnvan firmaId vergiNoTC yetkiliKisiler ilkIrtibatKisi' }, // Firma Yetkili listesi için
    { path: 'olusturanKullanici', select: 'adSoyad email' },
    { path: 'sonGuncelleyen', select: 'adSoyad email' },
    { path: 'muraacatOncesi.gorusmeYapan', select: 'adSoyad' },
    { path: 'muraacatOncesi.muraacatHazirlayanPersonel', select: 'adSoyad' },
    { path: 'muraacatSonrasi.takibiYapanPersonel', select: 'adSoyad' },
    { path: 'muraacatSonrasi.kurumEksik.bizdenBeklenen.personel', select: 'adSoyad' },
    { path: 'muraacatSonrasi.kurumEksik.herIkisindenBeklenen.personel', select: 'adSoyad' },
    { path: 'kurumSonuclanma.personel', select: 'adSoyad' }
];

// Kaydedilmiş bir doc'u ortak populate ile yeniden yükle (frontend her zaman dolu veri alsın)
const populateTalep = (id) => DosyaTakip.findById(id).populate(TALEP_POPULATE);

// ============================================================================
// 📊 DASHBOARD İSTATİSTİKLERİ
// ============================================================================
exports.getDashboardIstatistikleri = async (req, res) => {
    try {
        const [
            toplamTalep,
            aktifTalep,
            muraacatOncesi,
            muraacatSonrasi,
            kurumSonuclanma,
            tamamlanan,
            sonTalepler,
            talepTuruDagilimi,
            durumDagilimi
        ] = await Promise.all([
            DosyaTakip.countDocuments({ aktif: true }),
            DosyaTakip.countDocuments({ aktif: true, anaAsama: { $ne: 'TAMAMLANDI' } }),
            DosyaTakip.countDocuments({ aktif: true, anaAsama: 'MURACAAT_ONCESI' }),
            DosyaTakip.countDocuments({ aktif: true, anaAsama: 'MURACAAT_SONRASI' }),
            DosyaTakip.countDocuments({ aktif: true, anaAsama: 'KURUM_SONUCLANMA' }),
            DosyaTakip.countDocuments({ aktif: true, anaAsama: 'TAMAMLANDI' }),
            DosyaTakip.find({ aktif: true })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('takipId firmaUnvan talepTuru durum anaAsama durumRengi createdAt')
                .lean(),
            DosyaTakip.aggregate([
                { $match: { aktif: true } },
                { $group: { _id: '$talepTuru', sayi: { $sum: 1 } } },
                { $sort: { sayi: -1 } },
                { $limit: 10 }
            ]),
            DosyaTakip.aggregate([
                { $match: { aktif: true } },
                { $group: { _id: '$durum', sayi: { $sum: 1 } } },
                { $sort: { sayi: -1 } }
            ])
        ]);

        res.json({
            success: true,
            data: {
                ozet: {
                    toplamTalep,
                    aktifTalep,
                    muraacatOncesi,
                    muraacatSonrasi,
                    kurumSonuclanma,
                    tamamlanan
                },
                sonTalepler,
                talepTuruDagilimi,
                durumDagilimi
            }
        });
    } catch (error) {
        console.error('Dashboard istatistik hatası:', error);
        res.status(500).json({ success: false, message: 'İstatistikler yüklenirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 📋 TÜM TALEPLERİ LİSTELE
// ============================================================================
exports.getTumTalepler = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            sort = '-createdAt',
            search = '',
            durum = '',
            anaAsama = '',
            talepTuru = '',
            firma = '',
            baslangicTarihi = '',
            bitisTarihi = ''
        } = req.query;

        const filter = { aktif: true };

        // Filtreler
        if (search) {
            filter.$or = [
                { firmaUnvan: { $regex: search, $options: 'i' } },
                { takipId: { $regex: search, $options: 'i' } },
                { ytbNo: { $regex: search, $options: 'i' } },
                { belgeId: { $regex: search, $options: 'i' } }
            ];
        }
        if (durum) filter.durum = durum;
        if (anaAsama) filter.anaAsama = anaAsama;
        if (talepTuru) filter.talepTuru = talepTuru;
        if (firma) filter.firma = firma;
        if (baslangicTarihi || bitisTarihi) {
            filter.createdAt = {};
            if (baslangicTarihi) filter.createdAt.$gte = new Date(baslangicTarihi);
            if (bitisTarihi) filter.createdAt.$lte = new Date(bitisTarihi);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [talepler, toplam] = await Promise.all([
            DosyaTakip.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('firma', 'tamUnvan firmaId')
                .populate('olusturanKullanici', 'adSoyad')
                .lean(),
            DosyaTakip.countDocuments(filter)
        ]);

        // Virtual alanları elle ekle (lean() virtual döndürmez)
        const enriched = talepler.map(t => ({
            ...t,
            durumEtiketi: getDurumEtiketi(t.durum),
            anaAsamaEtiketi: getAnaAsamaEtiketi(t.anaAsama)
        }));

        res.json({
            success: true,
            data: enriched,
            pagination: {
                toplam,
                sayfa: parseInt(page),
                limit: parseInt(limit),
                toplamSayfa: Math.ceil(toplam / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Talep listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Talepler yüklenirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 🔍 TEKİL TALEP DETAYI
// ============================================================================
exports.getTalepById = async (req, res) => {
    try {
        const talep = await populateTalep(req.params.id);

        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        res.json({ success: true, data: talep });
    } catch (error) {
        console.error('Talep detay hatası:', error);
        res.status(500).json({ success: false, message: 'Talep detayı yüklenirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// ➕ YENİ TALEP OLUŞTUR
// ============================================================================
exports.yeniTalepOlustur = async (req, res) => {
    try {
        const data = {
            ...req.body,
            olusturanKullanici: req.user._id,
            olusturanAdi: req.user.adSoyad,
            durum: '2.1.1_GORUSULUYOR',
            anaAsama: 'MURACAAT_ONCESI',
            durumRengi: 'mavi'
        };

        const talep = new DosyaTakip(data);
        await talep.save();

        // Activity log
        try {
            await Activity.create({
                user: req.user._id,
                action: 'create',
                entityType: 'dosyaTakip',
                entityId: talep._id,
                description: `${req.user.adSoyad} yeni talep oluşturdu: ${talep.takipId} - ${talep.talepTuru}`,
                details: { takipId: talep.takipId, talepTuru: talep.talepTuru, firma: talep.firmaUnvan }
            });
        } catch (actErr) {
            console.error('Activity log hatası:', actErr);
        }

        res.status(201).json({ success: true, data: talep, message: 'Talep başarıyla oluşturuldu' });
    } catch (error) {
        console.error('Talep oluşturma hatası:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', '), error: error.message });
        }
        res.status(500).json({ success: false, message: 'Talep oluşturulurken hata oluştu', error: error.message });
    }
};

// ============================================================================
// ✏️ TALEP GÜNCELLE
// ============================================================================
exports.talepGuncelle = async (req, res) => {
    try {
        const talep = await DosyaTakip.findById(req.params.id);
        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        // Dot-notation anahtarlarını Mongoose set() ile güncelle
        // Örn: 'muraacatOncesi.gorusmeYapan' → talep.set('muraacatOncesi.gorusmeYapan', value)
        const body = { ...req.body };
        delete body.sonGuncelleyen;
        delete body.sonGuncelleyenAdi;

        for (const [key, value] of Object.entries(body)) {
            if (key.includes('.')) {
                // Dot-notation key → use Mongoose set for nested path
                talep.set(key, value === '' ? undefined : value);
            } else {
                talep[key] = value;
            }
        }

        talep.sonGuncelleyen = req.user._id;
        talep.sonGuncelleyenAdi = req.user.adSoyad;

        await talep.save();

        // Activity log
        try {
            await Activity.create({
                user: req.user._id,
                action: 'update',
                entityType: 'dosyaTakip',
                entityId: talep._id,
                description: `${req.user.adSoyad} talebi güncelledi: ${talep.takipId}`,
                details: { takipId: talep.takipId }
            });
        } catch (actErr) {
            console.error('Activity log hatası:', actErr);
        }

        res.json({ success: true, data: await populateTalep(talep._id), message: 'Talep başarıyla güncellendi' });
    } catch (error) {
        console.error('Talep güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Talep güncellenirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 🔄 DURUM DEĞİŞTİR (State Machine Geçişi)
// ============================================================================
exports.durumDegistir = async (req, res) => {
    try {
        const { yeniDurum, aciklama } = req.body;
        const talep = await DosyaTakip.findById(req.params.id);

        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        if (!DosyaTakip.DURUM_KODLARI.includes(yeniDurum)) {
            return res.status(400).json({ success: false, message: 'Geçersiz durum kodu' });
        }

        const oncekiDurum = talep.durum;
        const oncekiAnaAsama = talep.anaAsama;
        const yeniAnaAsama = DosyaTakip.durumToAnaAsama(yeniDurum);
        const yeniRenk = DosyaTakip.durumRengiBelirle(yeniDurum);

        // Durum geçmişine ekle
        talep.durumGecmisi.push({
            oncekiDurum,
            yeniDurum,
            oncekiAnaAsama,
            yeniAnaAsama,
            degistiren: req.user._id,
            degistirenAdi: req.user.adSoyad,
            aciklama: aciklama || '',
            tarih: new Date()
        });

        talep.durum = yeniDurum;
        talep.anaAsama = yeniAnaAsama;
        talep.durumRengi = yeniRenk;
        talep.durumAciklamasi = aciklama || '';
        talep.sonGuncelleyen = req.user._id;
        talep.sonGuncelleyenAdi = req.user.adSoyad;

        await talep.save();

        // Activity log
        try {
            await Activity.create({
                user: req.user._id,
                action: 'update',
                entityType: 'dosyaTakip',
                entityId: talep._id,
                description: `${req.user.adSoyad} talep durumunu değiştirdi: ${talep.takipId} → ${getDurumEtiketi(yeniDurum)}`,
                details: {
                    takipId: talep.takipId,
                    oncekiDurum: getDurumEtiketi(oncekiDurum),
                    yeniDurum: getDurumEtiketi(yeniDurum)
                }
            });
        } catch (actErr) {
            console.error('Activity log hatası:', actErr);
        }

        res.json({
            success: true,
            data: await populateTalep(talep._id),
            message: `Durum başarıyla güncellendi: ${getDurumEtiketi(yeniDurum)}`
        });
    } catch (error) {
        console.error('Durum değiştirme hatası:', error);
        res.status(500).json({ success: false, message: 'Durum değiştirilirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 🔄 EKSİK TAMAMLA → KURUM DEĞERLENDİRME'YE AKTAR
// Müşteri: "2.2.3 Tamamlandığından 2.2.1'e aktarılacak. Dosyalar ve Notlar Belgenin ekine kaydedilecek."
// Kurum Eksik (2.2.3.x) aşamasındaki gelen belgeler + beklenen eksik notları, talebin
// ana Dosyalar/Notlar bölümüne (belge dossierine) kopyalanır ve durum 2.2.1'e taşınır.
// ============================================================================
exports.eksikTamamla = async (req, res) => {
    try {
        const talep = await DosyaTakip.findById(req.params.id);
        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }
        if (!String(talep.durum || '').startsWith('2.2.3')) {
            return res.status(400).json({ success: false, message: "Bu işlem yalnızca 'Kurum Eksik' (2.2.3) aşamasındaki taleplerde yapılabilir." });
        }

        const ke = (talep.muraacatSonrasi && talep.muraacatSonrasi.kurumEksik) || {};
        const altlar = [ke.firmadanBeklenen, ke.bizdenBeklenen, ke.herIkisindenBeklenen];
        if (!Array.isArray(talep.dosyalar)) talep.dosyalar = [];
        if (!Array.isArray(talep.genelNotlar)) talep.genelNotlar = [];

        let aktarilanDosya = 0;
        let aktarilanNot = 0;
        for (const sub of altlar) {
            if (!sub) continue;
            (sub.gelenBelgeler || []).forEach((d) => {
                talep.dosyalar.push({
                    dosyaAdi: d.dosyaAdi,
                    dosyaYolu: d.dosyaYolu,
                    dosyaTipi: d.dosyaTipi,
                    kategori: 'Eksik Bildirimleri',
                    dosyaBoyutu: d.dosyaBoyutu,
                    cloudinaryPublicId: d.cloudinaryPublicId,
                    yukleyenKisi: d.yukleyenKisi,
                    yukleyenAdi: d.yukleyenAdi,
                    yuklemeTarihi: d.yuklemeTarihi || new Date()
                });
                aktarilanDosya += 1;
            });
            (sub.beklenenEksikler || []).forEach((n) => {
                talep.genelNotlar.push({
                    metin: `[Eksik → aktarıldı] ${n.metin}`,
                    tarih: n.tarih || new Date(),
                    yazan: n.yazan,
                    yazanAdi: n.yazanAdi
                });
                aktarilanNot += 1;
            });
        }

        const oncekiDurum = talep.durum;
        const oncekiAnaAsama = talep.anaAsama;
        talep.durum = '2.2.1_KURUM_DEGERLENDIRME';
        talep.anaAsama = 'MURACAAT_SONRASI';
        talep.durumRengi = DosyaTakip.durumRengiBelirle(talep.durum);
        talep.durumGecmisi.push({
            oncekiDurum,
            yeniDurum: talep.durum,
            oncekiAnaAsama,
            yeniAnaAsama: talep.anaAsama,
            degistiren: req.user._id,
            degistirenAdi: req.user.adSoyad,
            aciklama: `Eksik tamamlandı → Kurum Değerlendirme'ye aktarıldı. ${aktarilanDosya} dosya + ${aktarilanNot} not belge ekine kaydedildi.`,
            tarih: new Date()
        });
        talep.sonGuncelleyen = req.user._id;
        talep.sonGuncelleyenAdi = req.user.adSoyad;
        await talep.save();

        res.json({
            success: true,
            data: await populateTalep(talep._id),
            message: `Eksik tamamlandı. ${aktarilanDosya} dosya + ${aktarilanNot} not belge ekine kaydedildi, Kurum Değerlendirme'ye aktarıldı.`
        });
    } catch (error) {
        console.error('Eksik tamamlama hatası:', error);
        res.status(500).json({ success: false, message: 'Eksik tamamlanırken hata oluştu', error: error.message });
    }
};

// ============================================================================
// ✉️ 2.3 KURUM SONUÇLANMA — PERSONELE BİLGİLENDİRME MAİLİ DÜŞÜR
// Müşteri: "Personel Mail düşürme (mail script) Bitti tiki"
// Sorumlu personele (kurumSonuclanma.personel) otomatik bilgilendirme maili gönderir,
// mailDusuruldu bayrağını işaretler. Çalışan SMTP servisi (tesvikMakine/mailService) kullanılır.
// ============================================================================
exports.personelMailDusur = async (req, res) => {
    try {
        const mailService = require('../services/tesvikMakine/mailService');
        const talep = await DosyaTakip.findById(req.params.id)
            .populate('kurumSonuclanma.personel', 'adSoyad email');
        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }
        const personel = talep.kurumSonuclanma && talep.kurumSonuclanma.personel;
        const aliciMail = personel && personel.email;
        if (!aliciMail) {
            return res.status(400).json({ success: false, message: 'Önce e-postası olan bir Sonuçlama Personeli atayın.' });
        }
        if (!mailService.isConfigured()) {
            return res.status(503).json({ success: false, message: 'SMTP yapılandırılmamış. Lütfen sunucu ayarlarını kontrol edin.' });
        }

        const sonucEtiket = {
            firmaIletildi: 'Sonuç Firmaya İletildi',
            bekletilecek: 'Sonuç Bekletilecek',
            firmaIptal: 'Talep Firma Tarafından İptal',
            gmIptal: 'Talep GM Tarafımızdan İptal'
        }[talep.kurumSonuclanma.sonuc] || 'Belirtilmedi';

        const imza = (process.env.MAIL_SIGNATURE && process.env.MAIL_SIGNATURE.replace(/\\n/g, '\n'))
            || 'Genel Müşavirlik ve İşletmecilik Ltd. Şti.\nGM Planlama Yatırım Danışmanlık San. ve Tic. Ltd. Şti.';
        const sonNot = (talep.kurumSonuclanma.sonucNotlari || []).slice(-1)[0]?.metin || '';
        const subject = `${talep.firmaUnvan || 'Firma'} - ${talep.talepTuru || 'Talep'} - Kurum Sonuçlanma Bilgilendirmesi`;
        const text = [
            'Merhabalar,',
            '',
            `${talep.firmaUnvan || 'İlgili firma'}${talep.ytbNo ? ` (YTB ${talep.ytbNo})` : ''} kapsamındaki "${talep.talepTuru || '-'}" talebi kurum sonuçlanma aşamasına gelmiştir.`,
            '',
            `Sonuç: ${sonucEtiket}`,
            sonNot ? `Not: ${sonNot}` : '',
            `Takip No: ${talep.takipId || '-'}`,
            '',
            'Bilgilerinize sunarız.',
            '',
            imza
        ].filter((l) => l !== '').join('\n');

        try {
            await mailService.sendMail({ to: aliciMail, subject, text });
        } catch (mailErr) {
            return res.status(502).json({ success: false, message: mailErr.message || 'Mail gönderilemedi.' });
        }

        talep.kurumSonuclanma.mailDusuruldu = true;
        if (!Array.isArray(talep.kurumSonuclanma.sonucNotlari)) talep.kurumSonuclanma.sonucNotlari = [];
        talep.kurumSonuclanma.sonucNotlari.push({
            metin: `[Mail] Sorumlu personele bilgilendirme maili gönderildi: ${aliciMail}`,
            tarih: new Date(),
            yazan: req.user._id,
            yazanAdi: req.user.adSoyad
        });
        talep.sonGuncelleyen = req.user._id;
        talep.sonGuncelleyenAdi = req.user.adSoyad;
        await talep.save();

        res.json({ success: true, data: await populateTalep(talep._id), message: `Bilgilendirme maili gönderildi: ${aliciMail}` });
    } catch (error) {
        console.error('Personel mail düşürme hatası:', error);
        res.status(500).json({ success: false, message: 'Mail gönderilirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 📝 NOT EKLE
// ============================================================================
exports.notEkle = async (req, res) => {
    try {
        const { metin, alan = 'genelNotlar' } = req.body;
        const talep = await DosyaTakip.findById(req.params.id);

        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        const yeniNot = {
            metin,
            tarih: new Date(),
            yazan: req.user._id,
            yazanAdi: req.user.adSoyad
        };

        // Nested alanlar için güvenli erişim
        const alanParts = alan.split('.');
        let target = talep;
        for (let i = 0; i < alanParts.length; i++) {
            if (!target[alanParts[i]]) {
                if (i === alanParts.length - 1) {
                    target[alanParts[i]] = [];
                } else {
                    target[alanParts[i]] = {};
                }
            }
            if (i < alanParts.length - 1) {
                target = target[alanParts[i]];
            }
        }

        const lastPart = alanParts[alanParts.length - 1];
        if (Array.isArray(target[lastPart])) {
            target[lastPart].push(yeniNot);
        } else {
            target[lastPart] = [yeniNot];
        }

        talep.sonGuncelleyen = req.user._id;
        talep.sonGuncelleyenAdi = req.user.adSoyad;
        await talep.save();

        res.json({ success: true, data: await populateTalep(talep._id), message: 'Not başarıyla eklendi' });
    } catch (error) {
        console.error('Not ekleme hatası:', error);
        res.status(500).json({ success: false, message: 'Not eklenirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 📁 DOSYA EKLE
// ============================================================================
exports.dosyaEkle = [
    tekDosyaYukle,
    async (req, res) => {
        try {
            const talep = await DosyaTakip.findById(req.params.id);
            if (!talep) {
                return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Dosya yüklenmedi' });
            }

            const alan = req.body.alan || 'dosyalar';

            // multer dosya adını latin1 olarak çözüyor → Türkçe karakterler için utf8'e çevir
            let orijinalAd = req.file.originalname || 'dosya';
            try { orijinalAd = Buffer.from(orijinalAd, 'latin1').toString('utf8'); } catch (_) { /* yoksay */ }

            const dosyaBilgi = {
                dosyaAdi: orijinalAd,
                dosyaYolu: req.file.path, // Cloudinary URL
                dosyaTipi: req.file.mimetype,
                kategori: (req.body.kategori && DosyaTakip.DOSYA_TURLERI.includes(req.body.kategori)) ? req.body.kategori : '', // müşteri: önce tür seç
                dosyaBoyutu: req.file.size,
                cloudinaryPublicId: req.file.filename, // Cloudinary public_id (silme için)
                yukleyenKisi: req.user._id,
                yukleyenAdi: req.user.adSoyad,
                yuklemeTarihi: new Date()
            };

            // Doğru alana ekle
            const alanParts = alan.split('.');
            let target = talep;
            for (let i = 0; i < alanParts.length - 1; i++) {
                if (!target[alanParts[i]]) target[alanParts[i]] = {};
                target = target[alanParts[i]];
            }
            const lastPart = alanParts[alanParts.length - 1];
            if (Array.isArray(target[lastPart])) {
                target[lastPart].push(dosyaBilgi);
            } else {
                target[lastPart] = [dosyaBilgi];
            }

            talep.sonGuncelleyen = req.user._id;
            talep.sonGuncelleyenAdi = req.user.adSoyad;
            await talep.save();

            res.json({ success: true, data: await populateTalep(talep._id), message: 'Dosya başarıyla yüklendi' });
        } catch (error) {
            console.error('Dosya yükleme hatası:', error);
            res.status(500).json({ success: false, message: 'Dosya yüklenirken hata oluştu', error: error.message });
        }
    }
];

// ============================================================================
// 🔑 DOSYA İNDİRME/AÇMA URL'i (imzalı)
// Cloudinary'de PDF/ZIP teslimatı hesap ayarıyla kısıtlı olabildiğinden, dosya
// her açılışta taze bir imzalı (signed) URL ile sunulur — imzalı URL kısıtı aşar.
// ============================================================================
exports.dosyaUrl = async (req, res) => {
    try {
        const { id, dosyaId } = req.params;
        const alan = req.query.alan || 'dosyalar';

        const talep = await DosyaTakip.findById(id);
        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        // Nested alana eriş ve dosyayı bul
        const alanParts = alan.split('.');
        let target = talep;
        for (let i = 0; i < alanParts.length - 1; i++) {
            target = target?.[alanParts[i]];
            if (!target) return res.status(404).json({ success: false, message: 'Alan bulunamadı' });
        }
        const arr = target?.[alanParts[alanParts.length - 1]];
        const dosya = Array.isArray(arr) ? arr.find(d => d._id?.toString() === dosyaId) : null;
        if (!dosya || !dosya.dosyaYolu) {
            return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
        }

        // Eski/yerel dosyalar (Cloudinary public_id yok) → mevcut yolu döndür
        if (!dosya.cloudinaryPublicId) {
            return res.json({ success: true, url: dosya.dosyaYolu });
        }

        const rt = /^image\//.test(dosya.dosyaTipi || '') ? 'image' : 'raw';
        const url = cloudinary.url(dosya.cloudinaryPublicId, {
            resource_type: rt,
            type: 'upload',
            secure: true,
            sign_url: true // PDF/ZIP teslimat kısıtını aşar
        });

        res.json({ success: true, url });
    } catch (error) {
        console.error('Dosya URL hatası:', error);
        res.status(500).json({ success: false, message: 'Dosya bağlantısı oluşturulamadı', error: error.message });
    }
};

// ============================================================================
// 🗑️ NOT SİL
// ============================================================================
exports.notSil = async (req, res) => {
    try {
        const { alan, notId } = req.body;
        const talep = await DosyaTakip.findById(req.params.id);

        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        // Nested alana eriş
        const alanParts = (alan || 'genelNotlar').split('.');
        let target = talep;
        for (let i = 0; i < alanParts.length - 1; i++) {
            if (!target[alanParts[i]]) {
                return res.status(404).json({ success: false, message: 'Alan bulunamadı' });
            }
            target = target[alanParts[i]];
        }

        const lastPart = alanParts[alanParts.length - 1];
        if (!Array.isArray(target[lastPart])) {
            return res.status(400).json({ success: false, message: 'Geçersiz alan' });
        }

        const beforeLen = target[lastPart].length;
        target[lastPart] = target[lastPart].filter(n => n._id?.toString() !== notId);
        if (target[lastPart].length === beforeLen) {
            return res.status(404).json({ success: false, message: 'Not bulunamadı' });
        }

        talep.sonGuncelleyen = req.user._id;
        talep.sonGuncelleyenAdi = req.user.adSoyad;
        await talep.save();

        res.json({ success: true, data: await populateTalep(talep._id), message: 'Not silindi' });
    } catch (error) {
        console.error('Not silme hatası:', error);
        res.status(500).json({ success: false, message: 'Not silinirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 🗑️ DOSYA SİL
// ============================================================================
exports.dosyaSil = async (req, res) => {
    try {
        const { alan, dosyaId } = req.body;
        const talep = await DosyaTakip.findById(req.params.id);

        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        // Nested alana eriş
        const alanParts = (alan || 'dosyalar').split('.');
        let target = talep;
        for (let i = 0; i < alanParts.length - 1; i++) {
            if (!target[alanParts[i]]) {
                return res.status(404).json({ success: false, message: 'Alan bulunamadı' });
            }
            target = target[alanParts[i]];
        }

        const lastPart = alanParts[alanParts.length - 1];
        if (!Array.isArray(target[lastPart])) {
            return res.status(400).json({ success: false, message: 'Geçersiz alan' });
        }

        // Silinecek dosyayı bul
        const silinecek = target[lastPart].find(d => d._id?.toString() === dosyaId);
        if (!silinecek) {
            return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
        }

        // Cloudinary'den sil (varsa public_id). resource_type, dosya tipinden çıkarılır
        // (destroy 'auto' desteklemez; resim → image, diğerleri → raw)
        if (silinecek.cloudinaryPublicId) {
            const rt = /^image\//.test(silinecek.dosyaTipi || '') ? 'image' : 'raw';
            try {
                await cloudinary.uploader.destroy(silinecek.cloudinaryPublicId, { resource_type: rt });
            } catch (cloudErr) {
                console.error('Cloudinary silme hatası (devam ediliyor):', cloudErr.message);
            }
        }

        target[lastPart] = target[lastPart].filter(d => d._id?.toString() !== dosyaId);

        talep.sonGuncelleyen = req.user._id;
        talep.sonGuncelleyenAdi = req.user.adSoyad;
        await talep.save();

        res.json({ success: true, data: await populateTalep(talep._id), message: 'Dosya silindi' });
    } catch (error) {
        console.error('Dosya silme hatası:', error);
        res.status(500).json({ success: false, message: 'Dosya silinirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 🗑️ TALEP SİL (Soft Delete)
// ============================================================================
exports.talepSil = async (req, res) => {
    try {
        const talep = await DosyaTakip.findByIdAndUpdate(
            req.params.id,
            { aktif: false, sonGuncelleyen: req.user._id, sonGuncelleyenAdi: req.user.adSoyad },
            { new: true }
        );

        if (!talep) {
            return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
        }

        // Activity log
        try {
            await Activity.create({
                user: req.user._id,
                action: 'delete',
                entityType: 'dosyaTakip',
                entityId: talep._id,
                description: `${req.user.adSoyad} talebi sildi: ${talep.takipId}`,
                details: { takipId: talep.takipId }
            });
        } catch (actErr) {
            console.error('Activity log hatası:', actErr);
        }

        res.json({ success: true, message: 'Talep başarıyla silindi' });
    } catch (error) {
        console.error('Talep silme hatası:', error);
        res.status(500).json({ success: false, message: 'Talep silinirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 📦 ENUM DEĞERLERİNİ AL (Frontend için)
// ============================================================================
// ============================================================================
// 💡 ÖNERİLER — daire/uzman seçim listesi (mevcut kayıtlardan distinct)
// Müşteri: 'Daire Seçme List' / 'Uzman Seçme list'. Sabit master liste yerine,
// daha önce girilmiş değerlerden öneri sunan freeSolo liste.
// ============================================================================
exports.getOneriler = async (req, res) => {
    try {
        const [daireler, uzmanlar] = await Promise.all([
            DosyaTakip.distinct('muraacatSonrasi.kurumDegerlendirme.kurumDaire'),
            DosyaTakip.distinct('muraacatSonrasi.kurumDegerlendirme.daireUzman')
        ]);
        res.json({
            success: true,
            data: {
                daireler: (daireler || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr')),
                uzmanlar: (uzmanlar || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Öneriler alınamadı', error: error.message });
    }
};

exports.getEnumDegerleri = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                talepTurleri: DosyaTakip.TALEP_TURLERI,
                durumKodlari: DosyaTakip.DURUM_KODLARI,
                anaAsamalar: DosyaTakip.ANA_ASAMALAR,
                dosyaTurleri: DosyaTakip.DOSYA_TURLERI,
                belgeDurumlari: DosyaTakip.BELGE_DURUMLARI,
                durumEtiketleri: DosyaTakip.DURUM_KODLARI.map(d => ({
                    kod: d,
                    etiket: getDurumEtiketi(d),
                    renk: DosyaTakip.durumRengiBelirle(d),
                    anaAsama: DosyaTakip.durumToAnaAsama(d)
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Enum değerleri alınamadı', error: error.message });
    }
};

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================
function getDurumEtiketi(durum) {
    const etiketler = {
        '2.1.1_GORUSULUYOR': 'Görüşülüyor',
        '2.1.2_BEKLE_EVRAK_TAMAM_FIYAT': 'Bekle - Evrak Tamam, Fiyat Bekleniyor',
        '2.1.3_FIYAT_TAMAM_EVRAK_BEKLE': 'Fiyat Tamam - Evrak Bekleniyor',
        '2.1.4_MURACAAT_HAZIRLANIYOR': 'Müracaat Hazırlanıyor',
        '2.2.1_KURUM_DEGERLENDIRME': 'Kurum Değerlendirme',
        '2.2.1.1_KURUM_BEKLENIYOR': 'Kurum Bekleniyor',
        '2.2.1.1.1_KURUM_IRTIBAT_SAGLANDI': 'Kurum İrtibat Sağlandı',
        '2.2.1.1.2_KURUM_IRTIBAT_SAGLANAMADI': 'Kurum İrtibat Sağlanamadı',
        '2.2.1.1.3_KURUM_KENDI_HALINDE': 'Kurum Kendi Halinde Kalacak',
        '2.2.3_KURUM_EKSIK': 'Kurum Eksik',
        '2.2.3.1_EKSIK_FIRMADAN_BEKLENIYOR': 'Eksik Firmadan Bekleniyor',
        '2.2.3.2_EKSIK_BIZDEN_BEKLENIYOR': 'Eksik Bizden Bekleniyor',
        '2.2.3.3_EKSIK_HEM_FIRMA_HEM_BIZDEN': 'Eksik Hem Firma Hem Bizden',
        '2.3.1_SONUC_FIRMAYA_ILETILDI': 'Sonuç Firmaya İletildi',
        '2.3.2_SONUC_BEKLETILECEK': 'Sonuç Bekletilecek',
        '2.3.3_TALEP_FIRMA_IPTAL': 'Talep Firma Tarafından İptal',
        '2.3.4_TALEP_GM_IPTAL': 'Talep GM Tarafından İptal'
    };
    return etiketler[durum] || durum;
}

function getAnaAsamaEtiketi(asama) {
    const etiketler = {
        'MURACAAT_ONCESI': '2.1 Müracaat Öncesi',
        'MURACAAT_SONRASI': '2.2 Müracaat Sonrası',
        'KURUM_SONUCLANMA': '2.3 Kurum Sonuçlanma',
        'TAMAMLANDI': 'Tamamlandı'
    };
    return etiketler[asama] || asama;
}
