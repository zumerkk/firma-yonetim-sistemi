/**
 * 📸 Screenshot Import Controller
 * 
 * Ekran görüntülerinden teşvik belgesi verisi çıkarıp DB'ye kaydeder.
 */

const { analyzeMultipleScreenshots } = require('../services/screenshotAnalyzer');
const Tesvik = require('../models/Tesvik');
const YeniTesvik = require('../models/YeniTesvik');
const Firma = require('../models/Firma');

/**
 * POST /api/screenshot-import/analyze
 * Çoklu ekran görüntüsünü Gemini Vision ile analiz et
 */
exports.analyze = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'En az bir ekran görüntüsü yükleyin.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY tanımlı değil. Lütfen backend .env dosyasına GEMINI_API_KEY ekleyin.',
      });
    }

    console.log(`📸 Screenshot Import: ${req.files.length} dosya analiz ediliyor...`);

    const images = req.files.map((f) => ({
      buffer: f.buffer,
      mimeType: f.mimetype || 'image/png',
      originalName: f.originalname,
    }));

    const result = await analyzeMultipleScreenshots(images);

    console.log(`✅ Screenshot analizi tamamlandı: ${result.totalAnalyzed} başarılı, ${result.totalErrors} hatalı`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Screenshot analiz hatası:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Ekran görüntüsü analiz edilemedi.',
    });
  }
};

/**
 * POST /api/screenshot-import/commit
 * Analiz edilen veriyi Tesvik/YeniTesvik olarak DB'ye kaydet
 */
exports.commit = async (req, res) => {
  try {
    const { mergedData, belgeFormati } = req.body;

    if (!mergedData) {
      return res.status(400).json({
        success: false,
        message: 'Kaydedilecek veri bulunamadı.',
      });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi gerekli.' });
    }

    // Firma eşleştirmesi: firmaAdi ile ara
    let firmaDoc = null;
    if (mergedData.firmaAdi) {
      // Case-insensitive Turkish search
      firmaDoc = await Firma.findOne({
        $or: [
          { tamUnvan: { $regex: new RegExp(escapeRegex(mergedData.firmaAdi), 'i') } },
          { kisaUnvan: { $regex: new RegExp(escapeRegex(mergedData.firmaAdi), 'i') } },
        ],
      });
    }

    if (!firmaDoc) {
      return res.status(400).json({
        success: false,
        message: `Firma bulunamadı: "${mergedData.firmaAdi}". Önce firmayı sisteme kaydedin veya firma adını düzeltin.`,
        firmaAdi: mergedData.firmaAdi,
      });
    }

    // Tarih dönüşümü (DD/MM/YYYY → Date)
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      }
      // ISO format dene
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    // Eski vs Yeni belge — Akıllı tespit
    // ÖNCELIK SIRASI:
    // 1) Kullanıcının UI'dan seçtiği format (belgeFormati parametresi) → EN YÜKSEK
    // 2) Yatırım konusu kodundan otomatik tespit
    // 3) Ürün kodlarından çapraz kontrol
    // 4) Varsayılan: 'eski'
    
    // Frontend'den gelen belgeFormati — kullanıcı manuel seçtiyse bu geçerli
    const userExplicitFormat = belgeFormati; // commit body'den gelen
    
    // Otomatik tespit (sadece log amaçlı veya user seçimi yoksa kullanılır)
    let autoDetectedFormat = 'eski'; // varsayılan
    
    // Yatırım konusu kodundan tespit
    // US97: 2930, 2930 - ... (4 haneli başlangıç)
    // NACE: 22.26, 22.26 - ... (2 haneli + nokta + 2 haneli başlangıç)
    const yatirimKonusu = mergedData.yatirimKonusu || '';
    const nacePat = /^(\d{2}\.\d{2})/; // 22.26 formatı
    const us97Pat = /^(\d{4})/;        // 2930 formatı
    
    if (nacePat.test(yatirimKonusu)) {
      autoDetectedFormat = 'yeni';
      console.log(`  📋 Oto-tespit: YENİ (NACE kodu: ${yatirimKonusu.match(nacePat)[1]})`);
    } else if (us97Pat.test(yatirimKonusu)) {
      autoDetectedFormat = 'eski';
      console.log(`  📋 Oto-tespit: ESKİ (US97 kodu: ${yatirimKonusu.match(us97Pat)[1]})`);
    }
    
    // Ürün kodlarından çapraz kontrol
    // US97 ürün: 2930.1.15 (4haneli.1haneli.2haneli)
    // NACE ürün: 22.26.01 (2haneli.2haneli.2haneli)
    const urunler = mergedData.urunler || [];
    if (urunler.length > 0) {
      const firstCode = urunler[0].urunKodu || '';
      if (/^\d{2}\.\d{2}/.test(firstCode)) {
        autoDetectedFormat = 'yeni';
      } else if (/^\d{4}/.test(firstCode)) {
        autoDetectedFormat = 'eski';
      }
    }
    
    // kodTipi bilgisinden kontrol (AI'ın söylediği)
    if (mergedData.kodTipi === 'NACE6') autoDetectedFormat = 'yeni';
    if (mergedData.kodTipi === 'US97') autoDetectedFormat = 'eski';
    
    // FINAL: Kullanıcı seçimi > Otomatik tespit
    const finalFormat = userExplicitFormat || mergedData.belgeFormati || autoDetectedFormat;
    const isYeni = finalFormat === 'yeni';
    console.log(`  📋 Kullanıcı seçimi: ${userExplicitFormat || '(yok)'} | Oto-tespit: ${autoDetectedFormat} | FINAL: ${isYeni ? 'YENİ TEŞVİK (NACE)' : 'ESKİ TEŞVİK (US97)'}`);

    // Belge verisi hazırla
    const belgeData = buildBelgeData(mergedData, firmaDoc, userId, parseDate);

    let savedDoc;

    if (isYeni) {
      // YeniTesvik modeli
      savedDoc = await YeniTesvik.create(belgeData);
      console.log(`✅ Yeni Teşvik oluşturuldu: ${savedDoc._id}`);
    } else {
      // Eski Tesvik modeli
      savedDoc = await Tesvik.create(belgeData);
      console.log(`✅ Eski Teşvik oluşturuldu: ${savedDoc._id}`);
    }

    res.json({
      success: true,
      data: {
        id: savedDoc._id,
        tesvikId: savedDoc.tesvikId,
        belgeFormati: isYeni ? 'yeni' : 'eski',
        firmaAdi: mergedData.firmaAdi,
        belgeNo: mergedData.belgeNo,
        message: `Teşvik belgesi başarıyla oluşturuldu.`,
      },
    });
  } catch (error) {
    console.error('❌ Screenshot commit hatası:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Veri kaydedilemedi.',
    });
  }
};

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildBelgeData(merged, firmaDoc, userId, parseDate) {
  // Yatırım cinsleri (max 4 slot)
  const cinsleri = merged.yatirimCinsleri || [];

  return {
    firma: firmaDoc._id,
    firmaId: firmaDoc.firmaId || firmaDoc._id.toString(),
    gmId: firmaDoc.firmaId || `GM-${Date.now()}`,
    yatirimciUnvan: merged.firmaAdi || firmaDoc.tamUnvan || firmaDoc.kisaUnvan,

    // Belge yönetimi
    belgeYonetimi: {
      belgeId: merged.belgeId || '',
      belgeNo: merged.belgeNo || '',
      belgeTarihi: parseDate(merged.belgeTarihi) || new Date(),
      belgeMuracaatNo: merged.muracaatSayisi || '',
      belgeMuracaatTalepTipi: merged.belgeMuracaatTalepTipi || '',
      belgeMuracaatTarihi: parseDate(merged.muracaatTarihi),
      belgeBaslamaTarihi: parseDate(merged.belgeBaslamaTarihi),
      belgeBitisTarihi: parseDate(merged.belgeBitisTarihi),
      uzatimTarihi: parseDate(merged.sureUzatimTarihi),
    },

    // Künye bilgileri
    kunyeBilgileri: {
      yatirimci: merged.firmaAdi,
      yatirimciUnvan: merged.firmaAdi,
      sgkSicilNo: merged.sgkSicilNo || '',
      kararSayisi: merged.kararnameNo || '',
    },

    // Yatırım bilgileri — TÜM alanlar dahil
    yatirimBilgileri: {
      yatirimKonusu: merged.yatirimKonusu || '',
      destekSinifi: merged.destekSinifi || '',
      yerinIl: (merged.il || '').toUpperCase(),
      yerinIlce: (merged.ilce || '').toUpperCase(),
      yatirimAdresi1: merged.adres || '',
      osbIseMudurluk: merged.osbAdi || '',
      ilBazliBolge: merged.ilBazliBolge || '',
      ilceBazliBolge: merged.ilceBazliBolge || '',
      ada: merged.ada || '',
      parsel: merged.parsel || '',
      cazibeMerkeziMi: normalizeEvetHayir(merged.cazibeMerkezliMi),
      savunmaSanayiProjesi: normalizeEvetHayir(merged.savunmaSanayiProjesi),
      hamleMi: normalizeEvetHayir(merged.hamleMi),
      vergiIndirimsizDestek: normalizeEvetHayir(merged.vergiIndirimsizDestek),
      cazibeMerkezi2018: normalizeEvetHayir(merged.cazibeMerkezi2018),
      cazibeMerkeziDeprem: normalizeEvetHayir(merged.cazibeMerkeziDeprem),
      enerjiUretimKaynagi: merged.enerjiUretimKaynagi || '',
      oecdKategori: merged.oecdKategori || '',
      // Yatırım cinsleri (4 slot)
      sCinsi1: cinsleri[0] || '',
      tCinsi2: cinsleri[1] || '',
      uCinsi3: cinsleri[2] || '',
      vCinsi4: cinsleri[3] || '',
    },

    // Sermaye türü (künye'den)
    sermayeTuru: merged.sermayeTuru || '',

    // Öncelikli / Büyük Ölçekli yatırım
    oncelikliYatirim: {
      durumu: merged.oncelikliYatirim ? 'evet' : 'hayir',
      turu: merged.oncelikliYatirim || '',
    },

    // İstihdam
    istihdam: {
      mevcutKisi: merged.mevcutIstihdam || 0,
      ilaveKisi: merged.ilaveIstihdam || 0,
      toplamKisi: (merged.mevcutIstihdam || 0) + (merged.ilaveIstihdam || 0),
    },

    // Ürünler
    urunler: (merged.urunler || []).map((u) => ({
      u97Kodu: u.urunKodu || '',
      urunAdi: u.urunAdi || '',
      mevcutKapasite: u.mevcutKapasite || 0,
      ilaveKapasite: u.ilaveKapasite || 0,
      toplamKapasite: u.toplamKapasite || 0,
      kapasiteBirimi: u.birim || '',
    })),

    // Makine Listeleri (Yerli + İthal)
    makineListeleri: {
      yerli: (merged.yerliMakineler || []).map((m, i) => ({
        siraNo: m.siraNo || (i + 1),
        makineCinsi: m.makineCinsi || '',
        adedi: m.adedi || 0,
        tutarTL: m.tutarTL || 0,
        aciklama: m.aciklama || '',
      })),
      ithal: (merged.ithalMakineler || []).map((m, i) => ({
        siraNo: m.siraNo || (i + 1),
        makineCinsi: m.makineCinsi || '',
        adedi: m.adedi || 0,
        tutarDolar: m.tutarDolar || 0,
        tutarTL: m.tutarTL || 0,
        menseUlke: m.menseUlke || '',
        yeniKullanilmis: m.yeniKullanilmis || '',
        aciklama: m.aciklama || '',
      })),
    },

    // Destek Unsurları
    destekUnsurlari: (merged.destekUnsurlari || []).map((d) => ({
      destekUnsuru: d.destekUnsuru || '',
      sarti: d.destekOrani || '',
    })),

    // Özel Şartlar
    ozelSartlar: (merged.ozelSartlar || []).map((s, i) => ({
      koşulNo: i + 1,
      koşulMetni: s.sartAdi || '',
      aciklamaNotu: s.sartAciklamasi || '',
    })),

    // Mali Hesaplamalar
    maliHesaplamalar: buildFinansalData(merged.finansal),

    // Durum
    durumBilgileri: {
      genelDurum: 'taslak',
      durumRengi: 'gri',
      durumAciklamasi: 'Ekran görüntüsünden otomatik oluşturuldu',
    },

    // Sistem
    olusturanKullanici: userId,
    aktif: true,
    notlar: {
      dahiliNotlar: `📸 Ekran görüntüsünden otomatik oluşturuldu (${new Date().toLocaleString('tr-TR')})${merged.projeTanitimi ? '\n\n📋 Proje Tanıtımı: ' + merged.projeTanitimi : ''}`,
    },
  };
}

/**
 * EVET/HAYIR string normalizasyonu
 */
function normalizeEvetHayir(val) {
  if (!val) return 'hayir';
  return val.toString().toLowerCase().trim() === 'evet' ? 'evet' : 'hayir';
}

function buildFinansalData(finansal) {
  if (!finansal) {
    return {
      maliyetlenen: { aciklama: '', sl: 0, sm: 0, sn: 0 },
      binaInsaatGideri: { aciklama: '', so: 0, anaBinaGideri: 0, yardimciBinaGideri: 0, toplamBinaGideri: 0 },
      yatirimHesaplamalari: { et: 0, eu: 0, ev: 0, ew: 0, ex: 0, ey: 0, ez: 0 },
      makinaTechizat: { ithalMakina: 0, yerliMakina: 0, toplamMakina: 0, yeniMakina: 0, kullanimisMakina: 0, toplamYeniMakina: 0 },
      finansman: { yabanciKaynak: 0, ozKaynak: 0, toplamFinansman: 0 },
      toplamSabitYatirim: 0,
    };
  }

  return {
    maliyetlenen: {
      aciklama: finansal.araziArsaBedeli?.aciklama || '',
      sl: finansal.araziArsaBedeli?.metrekare || 0,
      sm: finansal.araziArsaBedeli?.birimFiyat || 0,
      sn: finansal.araziArsaBedeli?.toplam || 0,
    },
    binaInsaatGideri: {
      aciklama: '',
      so: 0,
      anaBinaGideri: finansal.binaInsaatGiderleri?.anaBina || 0,
      yardimciBinaGideri: finansal.binaInsaatGiderleri?.yardimciBina || 0,
      toplamBinaGideri: finansal.binaInsaatGiderleri?.toplam || 0,
    },
    yatirimHesaplamalari: {
      et: finansal.digerYatirimHarcamalari?.yardimciIsletmeMakine || 0,
      eu: finansal.digerYatirimHarcamalari?.ithalatGumrukleme || 0,
      ev: finansal.digerYatirimHarcamalari?.tasimaSigorta || 0,
      ew: finansal.digerYatirimHarcamalari?.montaj || 0,
      ex: finansal.digerYatirimHarcamalari?.etudProje || 0,
      ey: finansal.digerYatirimHarcamalari?.digerGiderler || 0,
      ez: finansal.digerYatirimHarcamalari?.toplam || 0,
    },
    makinaTechizat: {
      ithalMakina: finansal.makinaTechizatGiderleri?.ithal || 0,
      yerliMakina: finansal.makinaTechizatGiderleri?.yerli || 0,
      toplamMakina: finansal.makinaTechizatGiderleri?.toplamMakine || 0,
      yeniMakina: finansal.ithalMakineDolar?.yeniMakine || 0,
      kullanimisMakina: finansal.ithalMakineDolar?.kullanilmisMakine || 0,
      toplamYeniMakina: finansal.ithalMakineDolar?.toplam || 0,
    },
    finansman: {
      yabanciKaynak: finansal.yabanciKaynaklar?.toplamYabanciKaynak || 0,
      ozKaynak: finansal.ozkaynaklar?.ozkaynakToplam || 0,
      toplamFinansman: finansal.toplamFinansman || 0,
    },
    toplamSabitYatirim: finansal.toplamSabitYatirimTutari || 0,
  };
}
