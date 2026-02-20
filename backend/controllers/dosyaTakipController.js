// 📋 Dosya İş Akış Takip Sistemi - Controller
// CRUD + İş Akış Yönetimi + Dashboard İstatistikleri

const DosyaTakip = require('../models/DosyaTakip');
const Activity = require('../models/Activity');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// 📁 DOSYA YÜKLEME AYARLARI
// ============================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'uploads', 'dosya-takip');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        cb(null, true); // Tüm dosya tipleri kabul
    }
});

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
        const talep = await DosyaTakip.findById(req.params.id)
            .populate('firma', 'tamUnvan firmaId vergiNoTC')
            .populate('olusturanKullanici', 'adSoyad email')
            .populate('sonGuncelleyen', 'adSoyad email')
            .populate('muraacatOncesi.gorusmeYapan', 'adSoyad')
            .populate('muraacatOncesi.muraacatHazirlayanPersonel', 'adSoyad')
            .populate('muraacatSonrasi.takibiYapanPersonel', 'adSoyad')
            .populate('kurumSonuclanma.personel', 'adSoyad');

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

        // Güncelle
        Object.assign(talep, req.body, {
            sonGuncelleyen: req.user._id,
            sonGuncelleyenAdi: req.user.adSoyad
        });

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

        res.json({ success: true, data: talep, message: 'Talep başarıyla güncellendi' });
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
            data: talep,
            message: `Durum başarıyla güncellendi: ${getDurumEtiketi(yeniDurum)}`
        });
    } catch (error) {
        console.error('Durum değiştirme hatası:', error);
        res.status(500).json({ success: false, message: 'Durum değiştirilirken hata oluştu', error: error.message });
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

        res.json({ success: true, data: talep, message: 'Not başarıyla eklendi' });
    } catch (error) {
        console.error('Not ekleme hatası:', error);
        res.status(500).json({ success: false, message: 'Not eklenirken hata oluştu', error: error.message });
    }
};

// ============================================================================
// 📁 DOSYA EKLE
// ============================================================================
exports.dosyaEkle = [
    upload.single('dosya'),
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

            const dosyaBilgi = {
                dosyaAdi: req.file.originalname,
                dosyaYolu: `/uploads/dosya-takip/${req.file.filename}`,
                dosyaTipi: req.file.mimetype,
                dosyaBoyutu: req.file.size,
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

            res.json({ success: true, data: talep, message: 'Dosya başarıyla yüklendi' });
        } catch (error) {
            console.error('Dosya yükleme hatası:', error);
            res.status(500).json({ success: false, message: 'Dosya yüklenirken hata oluştu', error: error.message });
        }
    }
];

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
exports.getEnumDegerleri = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                talepTurleri: DosyaTakip.TALEP_TURLERI,
                durumKodlari: DosyaTakip.DURUM_KODLARI,
                anaAsamalar: DosyaTakip.ANA_ASAMALAR,
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
