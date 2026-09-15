// 💳 CARİ HESAP / ÖDEME TAKİP
//
// Belge Takip › Ödemeler sekmesindeki mini cari tablo ile "Cari hesaplar / ödeme takip"
// modülünün API'si. Neden tek defter olduğu: models/CariHareket.js
// Hesap kuralları: services/cari/cariHesap.js

const CariHareket = require('../models/CariHareket');
const DosyaTakip = require('../models/DosyaTakip');
const Firma = require('../models/Firma');
const {
    tutarCoz, tarihCoz, ozetHesapla, defterOlustur, firmaOzetleriniKatla
} = require('../services/cari/cariHesap');
const {
    tekDosyaYukleyici, dosyaBilgisi, dosyaSil, dosyaCek, dosyaGonder
} = require('../utils/cloudinaryYukleme');

const dosyaYukle = tekDosyaYukleyici('cari');

class IstekHatasi extends Error {
    constructor(durum, mesaj) {
        super(mesaj);
        this.durum = durum;
    }
}

const dogrulamaMesaji = (err) =>
    Object.values(err?.errors || {}).map((e) => e.message).filter(Boolean).join(' · ') || 'Geçersiz veri';

// Tüm uçlar aynı hata sözleşmesini kullanır. Yüklenmiş ama kaydedilemeyen dosya
// Cloudinary'de yetim kalmasın diye temizlenir (kayda girdiyse dokunulmaz).
const sar = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (err) {
        if (req.file && !req.dosyaKaydedildi) await dosyaSil(dosyaBilgisi(req.file));
        if (err instanceof IstekHatasi) return res.status(err.durum).json({ success: false, message: err.message });
        if (err?.name === 'ValidationError') return res.status(400).json({ success: false, message: dogrulamaMesaji(err) });
        if (err?.name === 'CastError') return res.status(400).json({ success: false, message: 'Geçersiz kimlik veya değer' });
        console.error('Cari hesap hatası:', err);
        return res.status(500).json({ success: false, message: 'İşlem sırasında hata oluştu', error: err.message });
    }
};

const bosMu = (v) => v === undefined || v === null || String(v).trim() === '';
const kirp = (v) => (v === undefined || v === null ? undefined : String(v).trim());
// Mongoose'a açıkça undefined verilen alan varsayılanını kaybedebilir → hiç gönderme
const tanimli = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// Tutar/tarih kullanıcı yazımıyla gelebilir ("24.000,50", "15.09.2026"). Boşsa undefined
// (model "zorunludur" der); anlaşılamıyorsa sessizce 0'a/bugüne çevirmek yerine reddedilir.
function tutarAl(ham) {
    if (bosMu(ham)) return undefined;
    const t = tutarCoz(ham);
    if (t === null) throw new IstekHatasi(400, `Tutar anlaşılamadı: "${String(ham).slice(0, 30)}"`);
    return t;
}

function tarihAl(ham) {
    if (bosMu(ham)) return undefined;
    const t = tarihCoz(ham);
    if (!t) throw new IstekHatasi(400, `Tarih anlaşılamadı: "${String(ham).slice(0, 30)}"`);
    return t;
}

// Talep verildiyse firma TALEPTEN alınır; istemcinin gönderdiği firmaya güvenilmez.
async function baglamCoz({ firma, dosyaTakip }) {
    if (!bosMu(dosyaTakip)) {
        const talep = await DosyaTakip.findById(dosyaTakip).select('firma firmaUnvan').lean();
        if (!talep) throw new IstekHatasi(404, 'Talep bulunamadı');
        if (!bosMu(firma) && String(firma) !== String(talep.firma)) {
            throw new IstekHatasi(400, 'Seçilen talep bu firmaya ait değil');
        }
        const f = await Firma.findById(talep.firma).select('tamUnvan').lean();
        return { firma: talep.firma, firmaUnvan: f?.tamUnvan || talep.firmaUnvan || '', dosyaTakip: talep._id };
    }
    if (bosMu(firma)) throw new IstekHatasi(400, 'Firma seçimi zorunludur');
    const f = await Firma.findById(firma).select('tamUnvan').lean();
    if (!f) throw new IstekHatasi(404, 'Firma bulunamadı');
    return { firma: f._id, firmaUnvan: f.tamUnvan || '', dosyaTakip: null };
}

// ============================================================================
// 📋 GET /api/cari/talep/:talepId — Ödemeler sekmesindeki mini cari tablo
// ============================================================================
exports.talepDefteri = sar(async (req, res) => {
    const talep = await DosyaTakip.findById(req.params.talepId).select('_id').lean();
    if (!talep) throw new IstekHatasi(404, 'Talep bulunamadı');

    const hareketler = await CariHareket.find({ dosyaTakip: talep._id }).lean();
    res.json({ success: true, data: { hareketler: defterOlustur(hareketler), ozet: ozetHesapla(hareketler) } });
});

// ============================================================================
// 🏢 GET /api/cari/firma/:firmaId — firmanın tüm carisi
// Hareket bağlanabilsin diye firmanın aktif talepleri de döner.
// ============================================================================
exports.firmaDefteri = sar(async (req, res) => {
    const firma = await Firma.findById(req.params.firmaId).select('tamUnvan firmaId vergiNoTC').lean();
    if (!firma) throw new IstekHatasi(404, 'Firma bulunamadı');

    const [hareketler, talepler] = await Promise.all([
        CariHareket.find({ firma: firma._id }).populate('dosyaTakip', 'takipId belgeId ytbNo talepTuru').lean(),
        DosyaTakip.find({ firma: firma._id, aktif: { $ne: false } })
            .select('takipId belgeId ytbNo talepTuru createdAt')
            .sort({ createdAt: -1 })
            .limit(300)
            .lean()
    ]);

    res.json({
        success: true,
        data: { firma, hareketler: defterOlustur(hareketler), ozet: ozetHesapla(hareketler), talepler }
    });
});

// ============================================================================
// 📊 GET /api/cari/firmalar — hareketi olan firmalar ve bakiyeleri
// ============================================================================
exports.firmaOzetleri = sar(async (req, res) => {
    const gruplar = await CariHareket.aggregate([
        { $sort: { tarih: 1 } },
        {
            $group: {
                _id: { firma: '$firma', tur: '$tur' },
                toplam: { $sum: '$tutar' },
                adet: { $sum: 1 },
                sonTarih: { $max: '$tarih' },
                firmaUnvan: { $last: '$firmaUnvan' }
            }
        }
    ]);
    res.json({ success: true, data: firmaOzetleriniKatla(gruplar) });
});

// ============================================================================
// ➕ POST /api/cari — yeni hareket (multipart; "dosya" isteğe bağlı)
// ============================================================================
exports.hareketEkle = [dosyaYukle, sar(async (req, res) => {
    const g = req.body || {};
    const baglam = await baglamCoz({ firma: g.firma, dosyaTakip: g.dosyaTakip });

    const hareket = new CariHareket(tanimli({
        ...baglam,
        tur: kirp(g.tur),
        tarih: tarihAl(g.tarih),
        tutar: tutarAl(g.tutar),
        belgeAdi: kirp(g.belgeAdi),
        faturaNo: kirp(g.faturaNo),
        banka: kirp(g.banka),
        aciklama: kirp(g.aciklama),
        dosya: req.file ? dosyaBilgisi(req.file) : undefined,
        olusturan: req.user?._id,
        olusturanAdi: req.user?.adSoyad
    }));

    await hareket.save();
    req.dosyaKaydedildi = true;
    res.status(201).json({ success: true, data: hareket.toObject(), message: 'Hareket kaydedildi' });
})];

// ============================================================================
// ✏️ PUT /api/cari/:id — düzeltme
// Tür ve firma değişmez (yanlış türde girilen hareket silinip yeniden girilir);
// yeni dosya yüklenirse eskisinin yerine geçer.
// ============================================================================
exports.hareketGuncelle = [dosyaYukle, sar(async (req, res) => {
    const hareket = await CariHareket.findById(req.params.id);
    if (!hareket) throw new IstekHatasi(404, 'Hareket bulunamadı');

    const g = req.body || {};
    const degisim = tanimli({
        tarih: tarihAl(g.tarih),
        tutar: tutarAl(g.tutar),
        belgeAdi: kirp(g.belgeAdi),
        faturaNo: kirp(g.faturaNo),
        banka: kirp(g.banka),
        aciklama: kirp(g.aciklama)
    });

    // Talep bağı yalnızca açıkça gönderilirse değişir; boş değer bağı kaldırır
    if (g.dosyaTakip !== undefined) {
        if (bosMu(g.dosyaTakip)) {
            degisim.dosyaTakip = null;
        } else {
            const talep = await DosyaTakip.findById(g.dosyaTakip).select('firma').lean();
            if (!talep) throw new IstekHatasi(404, 'Talep bulunamadı');
            if (String(talep.firma) !== String(hareket.firma)) {
                throw new IstekHatasi(400, 'Seçilen talep bu firmaya ait değil');
            }
            degisim.dosyaTakip = talep._id;
        }
    }

    hareket.set(degisim);
    const eskiDosya = req.file && hareket.dosya
        ? { cloudinaryPublicId: hareket.dosya.cloudinaryPublicId, dosyaTipi: hareket.dosya.dosyaTipi }
        : null;
    if (req.file) hareket.dosya = dosyaBilgisi(req.file);
    hareket.sonGuncelleyen = req.user?._id;
    hareket.sonGuncelleyenAdi = req.user?.adSoyad;

    await hareket.save();
    req.dosyaKaydedildi = true;
    if (eskiDosya) await dosyaSil(eskiDosya);

    res.json({ success: true, data: hareket.toObject(), message: 'Hareket güncellendi' });
})];

// ============================================================================
// 🗑️ DELETE /api/cari/:id
// ============================================================================
exports.hareketSil = sar(async (req, res) => {
    const hareket = await CariHareket.findByIdAndDelete(req.params.id).lean();
    if (!hareket) throw new IstekHatasi(404, 'Hareket bulunamadı');
    await dosyaSil(hareket.dosya);
    res.json({ success: true, message: 'Hareket silindi' });
});

// ============================================================================
// 📤 GET /api/cari/:id/dosya?dl=1 — dekont/makbuz (sunucu üzerinden)
// ============================================================================
exports.hareketDosyasi = sar(async (req, res) => {
    const hareket = await CariHareket.findById(req.params.id).select('dosya').lean();
    const dosya = hareket?.dosya;
    if (!dosya || (!dosya.cloudinaryPublicId && !dosya.dosyaYolu)) throw new IstekHatasi(404, 'Dosya bulunamadı');

    const icerik = await dosyaCek(dosya);
    if (!icerik) throw new IstekHatasi(502, 'Dosya kaynaktan alınamadı (Cloudinary teslimat kısıtı olabilir)');
    dosyaGonder(res, dosya, icerik, req.query.dl === '1');
});
