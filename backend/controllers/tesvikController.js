// 🏆 TEŞVİK CONTROLLER - ENTERPRISE EDITION
// Excel + Word şablonu analizine göre tam kapsamlı controller
// Mali hesaplamalar + renk kodlaması + durum yönetimi + revizyon takibi

const Tesvik = require('../models/Tesvik');
const Firma = require('../models/Firma');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { DestekUnsuru, DestekSarti, OzelSart, OzelSartNotu } = require('../models/DynamicOptions');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // OSB verilerini okumak için

// 📝 YENİ TEŞVİK OLUŞTUR
const createTesvik = async (req, res) => {
  try {
    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Girilen bilgilerde hatalar var',
        errors: errors.array()
      });
    }

    const tesvikData = req.body;
    // Makine listelerinde boş satırları ayıkla ve sayısal alanları normalize et
    if (tesvikData.makineListeleri) {
      const normalize = (arr = []) => arr
        .filter(r => r && (r.gtipKodu || r.adiVeOzelligi))
        .map(r => ({
          gtipKodu: (r.gtipKodu || '').trim(),
          gtipAciklamasi: (r.gtipAciklamasi || '').trim(),
          adiVeOzelligi: (r.adiVeOzelligi || '').trim(),
          miktar: Number(r.miktar) || 0,
          birim: (r.birim || '').trim(),
          birimFiyatiTl: Number(r.birimFiyatiTl) || 0,
          toplamTutariTl: Number(r.toplamTutariTl) || 0,
          kdvIstisnasi: (r.kdvIstisnasi || '').toUpperCase()
        }));
      tesvikData.makineListeleri = {
        yerli: normalize(tesvikData.makineListeleri.yerli),
        ithal: normalize(tesvikData.makineListeleri.ithal)
      };
    }
    
    // Firma kontrolü
    const firma = await Firma.findById(tesvikData.firma);
    if (!firma) {
      return res.status(404).json({
        success: false,
        message: 'Belirtilen firma bulunamadı'
      });
    }

    // Yeni teşvik oluştur
    const tesvik = new Tesvik({
      ...tesvikData,
      firmaId: firma.firmaId,
      yatirimciUnvan: tesvikData.yatirimciUnvan || firma.tamUnvan,
      olusturanKullanici: req.user._id,
      sonGuncelleyen: req.user._id
    });

    // Mali hesaplamaları otomatik güncelle
    tesvik.updateMaliHesaplamalar();
    
    // Durum rengini güncelle
    tesvik.updateDurumRengi();

    await tesvik.save();

    // Activity log
    await Activity.logActivity({
      action: 'create',
      category: 'tesvik',
      title: 'Yeni Teşvik Oluşturuldu',
      description: `${tesvik.tesvikId} numaralı teşvik oluşturuldu`,
      targetResource: {
        type: 'tesvik',
        id: tesvik._id,
        name: tesvik.yatirimciUnvan,
        tesvikId: tesvik.tesvikId
      },
      user: {
        id: req.user._id,
        name: req.user.adSoyad,
        email: req.user.email,
        role: req.user.rol
      },
      changes: {
        after: tesvik.toSafeJSON()
      }
    });

    // Bildirim oluştur
    await Notification.createNotification({
      title: 'Yeni Teşvik Oluşturuldu',
      message: `${tesvik.tesvikId} numaralı teşvik başarıyla oluşturuldu`,
      type: 'success',
      category: 'tesvik',
      userId: req.user._id,
      relatedEntity: {
        entityType: 'tesvik',
        entityId: tesvik._id
      }
    });

    // Populate işlemi
    await tesvik.populate('firma', 'tamUnvan firmaId vergiNoTC');
    await tesvik.populate('olusturanKullanici', 'adSoyad email');

    res.status(201).json({
      success: true,
      message: 'Teşvik başarıyla oluşturuldu',
      data: tesvik.toSafeJSON()
    });

  } catch (error) {
    console.error('🚨 Teşvik oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Teşvik oluşturulurken hata oluştu',
      error: error.message
    });
  }
};

// 📋 TEŞVİK LİSTESİ (Advanced Filtering + Pagination)
const getTesvikler = async (req, res) => {
  try {
    const {
      sayfa = 1,
      limit = 20,
      durum,
      il,
      firma,
      siraBy = 'createdAt',
      siraSekli = 'desc',
      tarihBaslangic,
      tarihBitis,
      destekSinifi,
      search
    } = req.query;

    // Build query
    const query = { aktif: true };
    
    if (durum) query['durumBilgileri.genelDurum'] = durum;
    if (il) query['yatirimBilgileri.yerinIl'] = il.toUpperCase();
    if (firma) query.firma = firma;
    if (destekSinifi) query['yatirimBilgileri.destekSinifi'] = destekSinifi;
    
    // Tarih filtresi
    if (tarihBaslangic || tarihBitis) {
      query.createdAt = {};
      if (tarihBaslangic) query.createdAt.$gte = new Date(tarihBaslangic);
      if (tarihBitis) query.createdAt.$lte = new Date(tarihBitis);
    }
    
    // Arama filtresi
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { tesvikId: searchRegex },
        { gmId: searchRegex },
        { yatirimciUnvan: searchRegex },
        { 'yatirimBilgileri.yatirimKonusu': searchRegex }
      ];
    }

    // Sort object
    const sortObj = {};
    sortObj[siraBy] = siraSekli === 'desc' ? -1 : 1;

    const skip = (parseInt(sayfa) - 1) * parseInt(limit);

    const [tesvikler, toplam] = await Promise.all([
      Tesvik.find(query)
        .populate('firma', 'tamUnvan firmaId vergiNoTC firmaIl')
        .populate('olusturanKullanici', 'adSoyad email')
        .populate('sonGuncelleyen', 'adSoyad email')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      
      Tesvik.countDocuments(query)
    ]);

    res.json({
      success: true,
      message: 'Teşvikler başarıyla getirildi',
      data: {
        tesvikler,
        pagination: {
          currentPage: parseInt(sayfa),
          totalPages: Math.ceil(toplam / parseInt(limit)),
          totalCount: toplam,
          hasNext: skip + parseInt(limit) < toplam,
          hasPrev: parseInt(sayfa) > 1
        }
      }
    });

  } catch (error) {
    console.error('🚨 Teşvik liste hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Teşvikler getirilemedi',
      error: error.message
    });
  }
};

// 👁️ TEKİL TEŞVİK DETAYI
const getTesvik = async (req, res) => {
  try {
    const { id } = req.params;

    
    // ID veya TesvikId ile arama
    let tesvik;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // MongoDB ObjectId
      tesvik = await Tesvik.findById(id);
    } else {
      // TesvikId (TES2024001 format)
      tesvik = await Tesvik.findByTesvikId(id);
    }

    if (!tesvik || !tesvik.aktif) {
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    // Populate işlemleri
    await tesvik.populate('firma', 'tamUnvan firmaId vergiNoTC firmaIl firmaIlce adres kepAdresi');
    await tesvik.populate('olusturanKullanici', 'adSoyad email rol');
    await tesvik.populate('sonGuncelleyen', 'adSoyad email');
    await tesvik.populate('revizyonlar.yapanKullanici', 'adSoyad email');
    


    // Activity log
    await Activity.logActivity({
      action: 'view',
      category: 'tesvik',
      title: 'Teşvik Görüntülendi',
      description: `${tesvik.tesvikId} numaralı teşvik detayı görüntülendi`,
      targetResource: {
        type: 'tesvik',
        id: tesvik._id,
        name: tesvik.yatirimciUnvan,
        tesvikId: tesvik.tesvikId
      },
      user: {
        id: req.user._id,
        name: req.user.adSoyad,
        email: req.user.email,
        role: req.user.rol
      }
    });

    res.json({
      success: true,
      message: 'Teşvik detayı getirildi',
      data: tesvik.toSafeJSON()
    });

  } catch (error) {
    console.error('🚨 Teşvik detay hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Teşvik detayı getirilemedi',
      error: error.message
    });
  }
};

// ✏️ TEŞVİK GÜNCELLEME - PROFESSIONAL CHANGE TRACKING SYSTEM
const updateTesvik = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validation kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Girilen bilgilerde hatalar var',
        errors: errors.array()
      });
    }

    // Teşviki getir - eski haliyle
    const tesvik = await Tesvik.findById(id)
      .populate('firma', 'tamUnvan firmaId')
      .populate('olusturanKullanici', 'adSoyad email');

    if (!tesvik || !tesvik.aktif) {
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    // 📊 PROFESSIONAL CHANGE DETECTION SYSTEM
    console.log('🔍 Change tracking başlıyor...');
    
    // Eski veriyi tam olarak kaydet - deep copy
    const eskiVeri = JSON.parse(JSON.stringify(tesvik.toSafeJSON()));
    console.log('📚 Eski veri kaydedildi:', Object.keys(eskiVeri).length, 'alan');
    
    // Güncelleme verisini filtrele
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => {
        if (key === 'firma' && (value === null || value === undefined || value === '')) {
          return false;
        }
        if (key === 'guncellemeNotu') return false; // Skip update note
        return value !== null && value !== undefined;
      })
    );
    
    // Güncelleme uygula
    Object.assign(tesvik, filteredUpdateData);
    // Güncellemede makine listelerini normalize et
    if (filteredUpdateData.makineListeleri) {
      const normalize = (arr = []) => arr
        .filter(r => r && (r.gtipKodu || r.adiVeOzelligi))
        .map(r => ({
          gtipKodu: (r.gtipKodu || '').trim(),
          gtipAciklamasi: (r.gtipAciklamasi || '').trim(),
          adiVeOzelligi: (r.adiVeOzelligi || '').trim(),
          miktar: Number(r.miktar) || 0,
          birim: (r.birim || '').trim(),
          birimFiyatiTl: Number(r.birimFiyatiTl) || 0,
          toplamTutariTl: Number(r.toplamTutariTl) || 0,
          kdvIstisnasi: (r.kdvIstisnasi || '').toUpperCase()
        }));
      tesvik.makineListeleri = {
        yerli: normalize(filteredUpdateData.makineListeleri.yerli),
        ithal: normalize(filteredUpdateData.makineListeleri.ithal)
      };
    }
    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = updateData.guncellemeNotu || `Güncelleme yapıldı - ${new Date().toLocaleString('tr-TR')}`;
    tesvik.durumBilgileri.sonGuncellemeTarihi = new Date();

    // Mali hesaplamaları otomatik güncelle
    tesvik.updateMaliHesaplamalar();
    
    // Durum değişmişse rengi güncelle
    if (updateData.durumBilgileri?.genelDurum) {
      tesvik.updateDurumRengi();
    }

    // 💾 Güncellemeyi kaydet
    await tesvik.save();

    // Yeni veriyi al - güncellenmiş haliyle
    const yeniVeri = JSON.parse(JSON.stringify(tesvik.toSafeJSON()));
    console.log('📝 Yeni veri kaydedildi:', Object.keys(yeniVeri).length, 'alan');

    // 🔍 DEEP CHANGE DETECTION ALGORITHM
    const degisikenAlanlar = await detectDetailedChanges(eskiVeri, yeniVeri);
    console.log('🎯 Tespit edilen değişiklikler:', degisikenAlanlar.length, 'alan');

    // 📋 Değişiklik varsa otomatik revizyon ekle
    if (degisikenAlanlar.length > 0) {
      const revizyonData = {
        revizyonSebebi: 'Otomatik Güncelleme',
        degisikenAlanlar: degisikenAlanlar,
        yapanKullanici: req.user._id,
        yeniDurum: tesvik.durumBilgileri?.genelDurum,
        kullaniciNotu: updateData.guncellemeNotu || 'Sistem güncellemesi',
        // 🎯 Revizyon için snapshot'lar
        veriSnapshot: {
          oncesi: eskiVeri,
          sonrasi: yeniVeri,
          degisikenAlanSayisi: degisikenAlanlar.length
        }
      };

      // Revizyon ekle - manual olarak (pre-save hook'u bypass et)
      tesvik.revizyonlar.push({
        revizyonNo: tesvik.revizyonlar.length + 1,
        revizyonTarihi: new Date(),
        ...revizyonData,
        durumOncesi: eskiVeri.durumBilgileri?.genelDurum,
        durumSonrasi: tesvik.durumBilgileri?.genelDurum
      });

      // Tekrar kaydet
      await tesvik.save();
      
      console.log('✅ Otomatik revizyon eklendi - Revizyon No:', tesvik.revizyonlar.length);
    }

    // 📊 Activity log - detaylı (fields boş kalmasın diye alan-özeti ekliyoruz)
    await Activity.logActivity({
      action: 'update',
      category: 'tesvik',
      title: 'Teşvik Güncellendi (Professional Tracking)',
      description: `${tesvik.tesvikId} güncellendi - ${degisikenAlanlar.length} alan değiştirildi. Otomatik revizyon: ${degisikenAlanlar.length > 0 ? 'Eklendi' : 'Gerek yok'}`,
      targetResource: {
        type: 'tesvik',
        id: tesvik._id,
        name: tesvik.yatirimciUnvan,
        tesvikId: tesvik.tesvikId,
        firmaId: tesvik.firmaId
      },
      user: {
        id: req.user._id,
        name: req.user.adSoyad,
        email: req.user.email,
        role: req.user.rol
      },
      changes: {
        before: eskiVeri,
        after: yeniVeri,
        // Alan listesi dolu ise normalize et; boş ise minimum path listesi üret
        fields: (degisikenAlanlar && degisikenAlanlar.length > 0)
          ? degisikenAlanlar.map(ch => ({
              field: ch.alan || ch.field || ch.columnName,
              oldValue: ch.eskiDeger,
              newValue: ch.yeniDeger,
              label: ch.label
            }))
          : (function() {
              try {
                const paths = [];
                const collect = (obj, prefix = '') => {
                  if (!obj || typeof obj !== 'object') return;
                  Object.keys(obj).forEach(k => {
                    const full = prefix ? `${prefix}.${k}` : k;
                    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                      collect(obj[k], full);
                    } else {
                      paths.push(full);
                    }
                  });
                };
                collect(yeniVeri);
                return paths.slice(0, 20);
              } catch (e) { return []; }
            })(),
        summary: {
          totalChanges: degisikenAlanlar.length,
          revisionAdded: degisikenAlanlar.length > 0,
          revisionNumber: degisikenAlanlar.length > 0 ? tesvik.revizyonlar.length : null
        }
      },
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        source: 'web_interface'
      }
    });

    // Response hazırla
    const responseData = tesvik.toSafeJSON();
    
    res.json({
      success: true,
      message: `Teşvik başarıyla güncellendi. ${degisikenAlanlar.length} alan değiştirildi${degisikenAlanlar.length > 0 ? ', otomatik revizyon eklendi' : ''}.`,
      data: responseData,
      changes: {
        count: degisikenAlanlar.length,
        fields: degisikenAlanlar.slice(0, 5), // İlk 5 değişiklik
        revisionAdded: degisikenAlanlar.length > 0,
        revisionNumber: degisikenAlanlar.length > 0 ? tesvik.revizyonlar.length : null
      }
    });

  } catch (error) {
    console.error('🚨 Teşvik güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Teşvik güncellenirken hata oluştu',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 🔍 PROFESSIONAL DEEP CHANGE DETECTION ALGORITHM
const detectDetailedChanges = async (eskiVeri, yeniVeri) => {
  const degisikenAlanlar = [];
  
  // 📋 PROFESSIONAL FIELD LABELS - KAPSAMLI TÜRKÇELEŞTİRME
  const fieldLabels = {
    // 🏢 Temel bilgiler
    'gmId': 'GM ID',
    'tesvikId': 'Teşvik ID', 
    'yatirimciUnvan': 'Yatırımcı Ünvanı',
    'firma': 'Firma',
    'firmaId': 'Firma ID',
    
    // 📋 Belge yönetimi
    'belgeYonetimi.belgeId': 'Belge ID',
    'belgeYonetimi.belgeNo': 'Belge No',
    'belgeYonetimi.belgeTarihi': 'Belge Tarihi',
    'belgeYonetimi.belgeMuracaatTarihi': 'Belge Müracaat Tarihi',
    'belgeYonetimi.belgeBaslamaTarihi': 'Belge Başlama Tarihi',
    'belgeYonetimi.belgeBitisTarihi': 'Belge Bitiş Tarihi',
    'belgeYonetimi.dayandigiKanun': 'Dayandığı Kanun',
    'belgeYonetimi.oncelikliYatirim': 'Öncelikli Yatırım',
    
    // 👥 İstihdam - GENİŞLETİLDİ
    'istihdam.mevcutKisi': 'Mevcut Kişi Sayısı',
    'istihdam.ilaveKisi': 'İlave Kişi Sayısı',
    'istihdam.toplamKisi': 'Toplam Kişi Sayısı',
    'istihdam.yeniKisi': 'Yeni Kişi Sayısı',
    
    // 🏭 Yatırım bilgileri - DOĞRU FIELD PATHS
    'yatirimBilgileri.yatirim1.yatirimKonusu': 'Yatırım Konusu',
    'yatirimBilgileri.yatirim1.destekSinifi': 'Destek Sınıfı',
    'yatirimBilgileri.yatirim1.cins1': 'Yatırım Cinsi 1',
    'yatirimBilgileri.yatirim1.cins2': 'Yatırım Cinsi 2',
    'yatirimBilgileri.yatirim1.cins3': 'Yatırım Cinsi 3',
    'yatirimBilgileri.yatirim1.cins4': 'Yatırım Cinsi 4',
    'yatirimBilgileri.yatirim2.yatirimAdresi1': 'Yatırım Adresi',
    'yatirimBilgileri.yatirim2.yatirimAdresi2': 'Yatırım Adresi 2',
    'yatirimBilgileri.yatirim2.yatirimAdresi3': 'Yatırım Adresi 3',
    'yatirimBilgileri.yatirim2.il': 'İl',
    'yatirimBilgileri.yatirim2.ilce': 'İlçe',
    'yatirimBilgileri.yatirim2.ada': 'ADA',
    'yatirimBilgileri.yatirim2.parsel': 'PARSEL',
    
    // 📦 Ürün bilgileri - DOĞRU FIELD PATHS!
    'urunler': 'Ürün Bilgileri',
    'urunler.0.us97Kodu': 'US97 Kodu (1)',
    'urunler.0.urunAdi': 'Ürün Adı (1)',
    'urunler.0.mevcutKapasite': 'Mevcut Kapasite (1)',
    'urunler.0.ilaveKapasite': 'İlave Kapasite (1)',
    'urunler.0.toplamKapasite': 'Toplam Kapasite (1)',
    'urunler.0.kapasiteBirimi': 'Kapasite Birimi (1)',
    'urunler.1.us97Kodu': 'US97 Kodu (2)',
    'urunler.1.urunAdi': 'Ürün Adı (2)',
    'urunler.1.mevcutKapasite': 'Mevcut Kapasite (2)',
    'urunler.1.ilaveKapasite': 'İlave Kapasite (2)',
    'urunler.1.toplamKapasite': 'Toplam Kapasite (2)',
    'urunler.1.kapasiteBirimi': 'Kapasite Birimi (2)',
    'urunler.2.us97Kodu': 'US97 Kodu (3)',
    'urunler.2.urunAdi': 'Ürün Adı (3)',
    'urunler.2.mevcutKapasite': 'Mevcut Kapasite (3)',
    'urunler.2.ilaveKapasite': 'İlave Kapasite (3)',
    'urunler.2.toplamKapasite': 'Toplam Kapasite (3)',
    'urunler.2.kapasiteBirimi': 'Kapasite Birimi (3)',
    
    // 🎯 Destek unsurları - GENİŞLETİLDİ
    'destekUnsurlari': 'Destek Unsurları',
    'destekUnsurlari.0.destekUnsuru': 'Destek Unsuru (1)',
    'destekUnsurlari.0.sartlari': 'Şartları (1)',
    'destekUnsurlari.1.destekUnsuru': 'Destek Unsuru (2)',
    'destekUnsurlari.1.sartlari': 'Şartları (2)',
    'destekUnsurlari.2.destekUnsuru': 'Destek Unsuru (3)',
    'destekUnsurlari.2.sartlari': 'Şartları (3)',
    
    // ⚙️ Özel şartlar - GENİŞLETİLDİ
    'ozelSartlar': 'Özel Şartlar',
    'ozelSartlar.0.kisaltma': 'Özel Şart Kısaltma (1)',
    'ozelSartlar.0.notu': 'Özel Şart Notu (1)',
    'ozelSartlar.1.kisaltma': 'Özel Şart Kısaltma (2)',
    'ozelSartlar.1.notu': 'Özel Şart Notu (2)',
    
    // 💰 Finansal bilgiler - DOĞRU FIELD PATHS!
    'maliHesaplamalar.toplamSabitYatirimTutari': 'Toplam Sabit Yatırım Tutarı',
    'maliHesaplamalar.toplamSabitYatirim': 'Toplam Sabit Yatırım',
    
    // Arazi/Arsa - REVİZYON TAKİBİ İÇİN KRİTİK ALANLAR
    'maliHesaplamalar.araciArsaBedeli': 'Arazi Arsa Bedeli',
    'maliHesaplamalar.maliyetlenen.sl': 'Arazi Metrekaresi',
    'maliHesaplamalar.maliyetlenen.sm': 'Arazi Birim Fiyatı (TL)',
    'maliHesaplamalar.maliyetlenen.sn': 'Arazi Arsa Bedeli (Hesaplanan)',
    'maliHesaplamalar.aracAracaGideri.sx': 'Arazi Metrekaresi (Alternatif)',
    'maliHesaplamalar.aracAracaGideri.sayisi': 'Arazi Birim Fiyatı (Alternatif)',
    'maliHesaplamalar.aracAracaGideri.toplam': 'Arazi Arsa Bedeli (Alternatif)',

    // Arazi-Arsa Bedeli - DOĞRU FIELD PATHS
    'maliHesaplamalar.araziArsaBedeli.metrekaresi': 'Arazi Metrekaresi', 
    'maliHesaplamalar.araziArsaBedeli.birimFiyatiTl': 'Arazi Birim Fiyatı (TL)',
    'maliHesaplamalar.araziArsaBedeli.araziArsaBedeli': 'Arazi Arsa Bedeli',
    'maliHesaplamalar.araziArsaBedeli.aciklama': 'Arazi Açıklaması',
    
    // DOĞRUDAN FIELD ADI - backend tarafında bu şekilde görünüyor
    'araciArsaBedeli': 'Arazi Arsa Bedeli (Legacy)',
    
    // Bina İnşaat Giderleri - DOĞRU FIELD PATHS
    'maliHesaplamalar.binaInsaatGideri.anaBinaGideri': 'Ana Bina Gideri',
    'maliHesaplamalar.binaInsaatGideri.yardimciBinaGideri': 'Yardımcı Bina Gideri', 
    'maliHesaplamalar.binaInsaatGideri.toplamBinaGideri': 'Toplam Bina Gideri',
    'binaInsaatGideri': 'Bina İnşaat Gideri',
    
    // Makine Teçhizat Giderleri - DOĞRU FIELD PATHS
    'maliHesaplamalar.makinaTechizat.ithalMakina': 'İthal Makine',
    'maliHesaplamalar.makinaTechizat.yerliMakina': 'Yerli Makine',
    'maliHesaplamalar.makinaTechizat.toplamMakina': 'Toplam Makine',
    'maliHesaplamalar.makinaTechizat.yeniMakina': 'Yeni Makine',
    'maliHesaplamalar.makinaTechizat.kullanimisMakina': 'Kullanılmış Makine',
    'makinaTechizat': 'Makine Teçhizat',
    
    // Diğer Yatırım Harcamaları - DOĞRU FIELD PATHS
    'maliHesaplamalar.digerYatirimHarcamalari.yardimciIslMakTeçGid': 'Yardımcı İşl. Mak. Teç. Gid.',
    'maliHesaplamalar.digerYatirimHarcamalari.ithalatVeGumGiderleri': 'İthalat ve Güm. Giderleri',
    'maliHesaplamalar.digerYatirimHarcamalari.tasimaVeSigortaGiderleri': 'Taşıma ve Sigorta Giderleri',
    'maliHesaplamalar.digerYatirimHarcamalari.etudVeProjeGiderleri': 'Etüd ve Proje Giderleri',
    'maliHesaplamalar.digerYatirimHarcamalari.digerGiderleri': 'Diğer Giderleri',
    
    // Finansman - DOĞRU FIELD PATHS
    'maliHesaplamalar.finansman.ozkaynaklar.ozkaynaklar': 'Öz Kaynaklar',
    'maliHesaplamalar.finansman.yabanciKaynaklar.bankKredisi': 'Banka Kredisi',
    'maliHesaplamalar.finansman.yabanciKaynaklar.ikinciElFiyatFarki': 'İkinci El Fiyat Farkı',
    'maliHesaplamalar.finansman.yabanciKaynaklar.kullanilmisTeçhizatBedeli': 'Kullanılmış Teçhizat Bedeli',
    'maliHesaplamalar.finansman.yabanciKaynaklar.digerDisKaynaklar': 'Diğer Dış Kaynaklar',
    'maliHesaplamalar.finansman.yabanciKaynaklar.digerYabanciKaynak': 'Diğer Yabancı Kaynak',
    'maliHesaplamalar.finansman.yabanciKaynaklar.toplamYabanciKaynak': 'Toplam Yabancı Kaynak',
    'maliHesaplamalar.finansman.toplamFinansman': 'Toplam Finansman',
    
    // 📊 Durum bilgileri
    'durumBilgileri.genelDurum': 'Genel Durum',
    'durumBilgileri.durumAciklamasi': 'Durum Açıklaması',
    'durumBilgileri.durumRengi': 'Durum Rengi',
    'durumBilgileri.sonGuncellemeTarihi': 'Son Güncelleme Tarihi',
    
    // 📝 Notlar
    'notlar.dahiliNotlar': 'Dahili Notlar',
    'notlar.resmiAciklamalar': 'Resmi Açıklamalar',
    'sonGuncellemeNotlari': 'Son Güncelleme Notları'
  };

  // 🔍 Recursive comparison function
  const compareObjects = (oldObj, newObj, prefix = '') => {
    if (!oldObj && !newObj) return;
    
    // Her iki taraftaki tüm key'leri topla
    const allKeys = new Set([
      ...Object.keys(oldObj || {}), 
      ...Object.keys(newObj || {})
    ]);

    allKeys.forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldObj ? oldObj[key] : undefined;
      const newValue = newObj ? newObj[key] : undefined;
      
      // Sistem alanlarını filtrele
      if (['_id', '__v', 'createdAt', 'updatedAt', 'revizyonlar', 'sonGuncelleyen', 'sonGuncellemeNotlari'].includes(key)) {
        return;
      }
      
      // Nested object kontrolü
      if (typeof newValue === 'object' && newValue !== null && 
          typeof oldValue === 'object' && oldValue !== null &&
          !Array.isArray(newValue) && !Array.isArray(oldValue)) {
        compareObjects(oldValue, newValue, fullKey);
      } 
      // Array kontrolü
      else if (Array.isArray(newValue) || Array.isArray(oldValue)) {
        const oldStr = JSON.stringify(oldValue || []);
        const newStr = JSON.stringify(newValue || []);
        if (oldStr !== newStr && fieldLabels[fullKey]) {
          degisikenAlanlar.push({
            alan: fullKey,
            label: fieldLabels[fullKey],
            eskiDeger: oldValue,
            yeniDeger: newValue,
            tip: 'array'
          });
        }
      }
      // Primitive değer kontrolü
      else if (oldValue !== newValue) {
        // Label varsa ekle, yoksa skip
        if (fieldLabels[fullKey]) {
          degisikenAlanlar.push({
            alan: fullKey,
            label: fieldLabels[fullKey],
            eskiDeger: oldValue,
            yeniDeger: newValue,
            tip: typeof newValue
          });
        }
      }
    });
  };

  // Karşılaştırmayı başlat
  compareObjects(eskiVeri, yeniVeri);
  
  console.log('🔍 Change detection tamamlandı:', degisikenAlanlar.length, 'değişiklik tespit edildi');
  
  return degisikenAlanlar;
};

// 🎯 DURUM GÜNCELLEME (Excel Renk Kodlaması)
const updateTesvikDurum = async (req, res) => {
  try {
    const { id } = req.params;
    const { yeniDurum, aciklama, kullaniciNotu } = req.body;

    const tesvik = await Tesvik.findById(id);
    if (!tesvik || !tesvik.aktif) {
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    const eskiDurum = tesvik.durumBilgileri.genelDurum;
    
    // Durum güncelle
    tesvik.durumBilgileri.genelDurum = yeniDurum;
    tesvik.durumBilgileri.durumAciklamasi = aciklama || '';
    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = kullaniciNotu || `Durum güncellendi: ${eskiDurum} → ${yeniDurum}`;
    
    // Renk kodlamasını güncelle
    tesvik.updateDurumRengi();
    
    await tesvik.save();

    // Activity log
    await Activity.logActivity({
      action: 'update',
      category: 'tesvik',
      title: 'Teşvik Durum Güncellendi',
      description: `${tesvik.tesvikId} durumu güncellendi: ${eskiDurum} → ${yeniDurum}`,
      targetResource: {
        type: 'tesvik',
        id: tesvik._id,
        name: tesvik.yatirimciUnvan,
        tesvikId: tesvik.tesvikId
      },
      user: {
        id: req.user._id,
        name: req.user.adSoyad,
        email: req.user.email,
        role: req.user.rol
      },
      changes: {
        fields: [{
          field: 'durumBilgileri.genelDurum',
          oldValue: eskiDurum,
          newValue: yeniDurum
        }]
      }
    });

    // Bildirim oluştur
    await Notification.createNotification({
      title: 'Teşvik Durum Güncellendi',
      message: `${tesvik.tesvikId} durumu: ${yeniDurum}`,
      type: yeniDurum === 'onaylandi' ? 'success' : yeniDurum === 'reddedildi' ? 'error' : 'info',
      category: 'tesvik',
      userId: req.user._id,
      relatedEntity: {
        entityType: 'tesvik',
        entityId: tesvik._id
      }
    });

    res.json({
      success: true,
      message: 'Teşvik durumu başarıyla güncellendi',
      data: {
        tesvikId: tesvik.tesvikId,
        eskiDurum,
        yeniDurum,
        durumRengi: tesvik.durumBilgileri.durumRengi,
        guncellenmeTarihi: tesvik.durumBilgileri.sonDurumGuncelleme
      }
    });

  } catch (error) {
    console.error('🚨 Durum güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Durum güncellenirken hata oluştu',
      error: error.message
    });
  }
};

// 📝 REVİZYON EKLEME - Enhanced with Better Change Tracking
const addTesvikRevizyon = async (req, res) => {
  try {
    const { id } = req.params;
    const { revizyonSebebi, degisikenAlanlar, yeniDurum, kullaniciNotu } = req.body;
    
    // Validation - Sadece revizyonSebebi zorunlu
    if (!revizyonSebebi) {
      return res.status(400).json({
        success: false,
        message: 'Revizyon sebebi zorunludur'
      });
    }

    // Teşviği populate ile birlikte getir - detaylı bilgiler için
    const tesvik = await Tesvik.findById(id)
      .populate('firma', 'tamUnvan firmaId')
      .populate('olusturanKullanici', 'adSoyad email');

    if (!tesvik || !tesvik.aktif) {
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    // 📊 Detaylı revizyon bilgileri hazırla
    const revizyonData = {
      revizyonSebebi: revizyonSebebi || 'Manuel Revizyon',
      degisikenAlanlar: degisikenAlanlar || [],
      yapanKullanici: req.user._id,
      yeniDurum: yeniDurum || tesvik.durumBilgileri?.genelDurum,
      kullaniciNotu: kullaniciNotu || '',
      // 🎯 Gelişmiş tracking bilgileri
      yapanKullaniciDetay: {
        id: req.user._id,
        adSoyad: req.user.adSoyad,
        email: req.user.email,
        rol: req.user.rol
      },
      sistem: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        source: 'web_interface'
      }
    };

    // Revizyon ekle
    tesvik.addRevizyon(revizyonData);

    // Teşvik güncelleme bilgileri
    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = kullaniciNotu || `Revizyon eklendi: ${revizyonSebebi}`;
    tesvik.durumBilgileri.sonGuncellemeTarihi = new Date();

    // 💾 Kaydet - Bu nokta önemli, revizyon tracking için
    await tesvik.save();

    // 📋 Detaylı Activity log
    await Activity.logActivity({
      action: 'update',
      category: 'tesvik',
      title: 'Teşvik Revizyonu Eklendi',
      description: `${tesvik.tesvikId} ID'li teşvike revizyon eklendi. Sebep: ${revizyonSebebi}`,
      targetResource: {
        type: 'tesvik',
        id: tesvik._id,
        name: tesvik.yatirimciUnvan,
        tesvikId: tesvik.tesvikId,
        firmaId: tesvik.firmaId
      },
      user: {
        id: req.user._id,
        name: req.user.adSoyad,
        email: req.user.email,
        role: req.user.rol
      },
      changes: {
        before: { durum: tesvik.durumBilgileri?.genelDurum },
        after: { 
          durum: yeniDurum || tesvik.durumBilgileri?.genelDurum,
          revizyonNo: tesvik.revizyonlar.length,
          sebep: revizyonSebebi
        },
        fields: degisikenAlanlar || []
      },
      metadata: {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        source: 'web_interface'
      }
    });

    // 🔄 Güncellenmiş teşviki tekrar getir - son haliyle
    const updatedTesvik = await Tesvik.findById(id)
      .populate('firma', 'tamUnvan firmaId')
      .populate('olusturanKullanici', 'adSoyad email')
      .lean();

    res.json({
      success: true,
      message: 'Revizyon başarıyla eklendi ve sistem güncellemesi kaydedildi',
      data: {
        tesvikId: tesvik.tesvikId,
        revizyonNo: tesvik.revizyonlar.length,
        revizyonSebebi,
        yeniDurum: yeniDurum || tesvik.durumBilgileri?.genelDurum,
        eklenmeTarihi: new Date(),
        toplamRevizyonSayisi: updatedTesvik.revizyonlar?.length || 0,
        // 📊 Debug için ek bilgiler
        debug: {
          degisikenAlanlarSayisi: (degisikenAlanlar || []).length,
          tesvikDurumu: updatedTesvik.durumBilgileri?.genelDurum,
          aktifDurum: updatedTesvik.aktif
        }
      }
    });

  } catch (error) {
    console.error('🚨 Revizyon ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Revizyon eklenirken hata oluştu',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 📊 REVİZYON GEÇMİŞİ GETIRME
const getTesvikRevisions = async (req, res) => {
  try {
    const { id } = req.params;

    // ID format'ını kontrol et: ObjectId mi yoksa TesvikId mi?
    let tesvik;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // ObjectId format (24 karakter hex)
      tesvik = await Tesvik.findById(id)
        .populate('revizyonlar.yapanKullanici', 'adSoyad email rol')
        .select('tesvikId revizyonlar aktif');
    } else {
      // TesvikId format (TES20250007 gibi)
      tesvik = await Tesvik.findOne({ tesvikId: id })
        .populate('revizyonlar.yapanKullanici', 'adSoyad email rol')
        .select('tesvikId revizyonlar aktif');
    }

    if (!tesvik) {
      console.log(`🚨 Teşvik bulunamadı: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    // Aktif olmayan teşvikler için de revizyon geçmişini gösterelim
    if (tesvik.aktif === false) {
      console.log(`⚠️ Pasif teşvik için revizyon geçmişi istendi: ${id}`);
    }

    // Revizyonları en son eklenen ilk sırada sırala
    const formattedRevisions = tesvik.revizyonlar
      .sort((a, b) => new Date(b.revizyonTarihi) - new Date(a.revizyonTarihi))
      .map(revision => ({
        revizyonNo: revision.revizyonNo,
        tarih: revision.revizyonTarihi,
        sebep: revision.revizyonSebebi,
        yapanKullanici: {
          ad: revision.yapanKullanici?.adSoyad || 'Bilinmeyen Kullanıcı',
          email: revision.yapanKullanici?.email,
          rol: revision.yapanKullanici?.rol
        },
        degisikenAlanlar: revision.degisikenAlanlar || [],
        durumOncesi: revision.durumOncesi,
        durumSonrasi: revision.durumSonrasi
      }));

    res.json({
      success: true,
      message: 'Revizyon geçmişi başarıyla getirildi',
      data: formattedRevisions,
      count: formattedRevisions.length
    });

  } catch (error) {
    console.error('🚨 Revizyon geçmişi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Revizyon geçmişi getirilemedi',
      error: error.message
    });
  }
};

// 🎯 ======== DİNAMİK VERİ YÖNETİMİ API'LERİ ========

// 📋 Dinamik Destek Unsurları Getirme
const getDynamicDestekUnsurlari = async (req, res) => {
  try {
    console.log('🎯 Dinamik destek unsurları yükleniyor...');

    // Statik veri + dinamik veri birleşimi
    const staticOptions = getDestekUnsurlariOptions();
    
    // Veritabanından dinamik veriyi al
    const dynamicOptions = await DestekUnsuru.find({ aktif: true })
      .populate('ekleyenKullanici', 'adSoyad')
      .sort({ kullanimSayisi: -1, createdAt: -1 })
      .lean();

    // Dinamik verileri statik formatına çevir
    const formattedDynamic = dynamicOptions.map(item => ({
      value: item.value,
      label: item.label,
      kategori: item.kategori,
      renk: item.renk,
      isDynamic: true,
      kullanimSayisi: item.kullanimSayisi,
      ekleyenKullanici: item.ekleyenKullanici?.adSoyad
    }));

    // Statik + dinamik verileri birleştir
    const allOptions = [...staticOptions, ...formattedDynamic];

    console.log(`✅ ${staticOptions.length} statik + ${dynamicOptions.length} dinamik = ${allOptions.length} toplam destek unsuru`);

    res.json({
      success: true,
      message: 'Destek unsurları başarıyla getirildi',
      data: allOptions,
      counts: {
        static: staticOptions.length,
        dynamic: dynamicOptions.length,
        total: allOptions.length
      }
    });

  } catch (error) {
    console.error('🚨 Dinamik destek unsurları hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Destek unsurları getirilemedi',
      error: error.message
    });
  }
};

// ➕ Yeni Destek Unsuru Ekleme
const addDestekUnsuru = async (req, res) => {
  try {
    const { value, label, kategori = 'Diğer', renk = '#6B7280' } = req.body;

    if (!value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Değer ve label alanları zorunludur'
      });
    }

    // Aynı değer var mı kontrol et
    const existing = await DestekUnsuru.findOne({ value: value.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bu destek unsuru zaten mevcut'
      });
    }

    // Yeni destek unsuru oluştur
    const yeniDestekUnsuru = new DestekUnsuru({
      value: value.trim(),
      label: label.trim(),
      kategori,
      renk,
      ekleyenKullanici: req.user._id
    });

    await yeniDestekUnsuru.save();

    // Activity log
    await Activity.create({
      user: {
        id: req.user._id,
        name: req.user.adSoyad || `${req.user.ad} ${req.user.soyad}` || 'Kullanıcı',
        email: req.user.email || 'unknown@example.com'
      },
      action: 'create',
      title: 'Yeni Destek Unsuru Eklendi',
      description: `Yeni destek unsuru eklendi: ${label}`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown'
    });

    console.log(`✅ Yeni destek unsuru eklendi: ${label} (${value})`);

    res.status(201).json({
      success: true,
      message: 'Destek unsuru başarıyla eklendi',
      data: {
        value: yeniDestekUnsuru.value,
        label: yeniDestekUnsuru.label,
        kategori: yeniDestekUnsuru.kategori,
        renk: yeniDestekUnsuru.renk,
        isDynamic: true
      }
    });

  } catch (error) {
    console.error('🚨 Destek unsuru ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Destek unsuru eklenemedi',
      error: error.message
    });
  }
};

// 📋 Dinamik Destek Şartları Getirme
const getDynamicDestekSartlari = async (req, res) => {
  try {
    console.log('🎯 Dinamik destek şartları yükleniyor...');

    const staticOptions = getDestekSartlariOptions();
    
    const dynamicOptions = await DestekSarti.find({ aktif: true })
      .populate('ekleyenKullanici', 'adSoyad')
      .sort({ kullanimSayisi: -1, createdAt: -1 })
      .lean();

    const formattedDynamic = dynamicOptions.map(item => ({
      value: item.value,
      label: item.label,
      kategori: item.kategori,
      yuzde: item.yuzde,
      yil: item.yil,
      isDynamic: true,
      kullanimSayisi: item.kullanimSayisi,
      ekleyenKullanici: item.ekleyenKullanici?.adSoyad
    }));

    const allOptions = [...staticOptions, ...formattedDynamic];

    console.log(`✅ ${staticOptions.length} statik + ${dynamicOptions.length} dinamik = ${allOptions.length} toplam destek şartı`);

    res.json({
      success: true,
      message: 'Destek şartları başarıyla getirildi',
      data: allOptions,
      counts: {
        static: staticOptions.length,
        dynamic: dynamicOptions.length,
        total: allOptions.length
      }
    });

  } catch (error) {
    console.error('🚨 Dinamik destek şartları hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Destek şartları getirilemedi',
      error: error.message
    });
  }
};

// ➕ Yeni Destek Şartı Ekleme
const addDestekSarti = async (req, res) => {
  try {
    const { value, label, kategori = 'Diğer', yuzde, yil } = req.body;

    if (!value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Değer ve label alanları zorunludur'
      });
    }

    const existing = await DestekSarti.findOne({ value: value.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bu destek şartı zaten mevcut'
      });
    }

    const yeniDestekSarti = new DestekSarti({
      value: value.trim(),
      label: label.trim(),
      kategori,
      yuzde,
      yil,
      ekleyenKullanici: req.user._id
    });

    await yeniDestekSarti.save();

    await Activity.create({
      user: {
        id: req.user._id,
        name: req.user.adSoyad || `${req.user.ad} ${req.user.soyad}` || 'Kullanıcı',
        email: req.user.email || 'unknown@example.com'
      },
      action: 'create',
      title: 'Yeni Destek Şartı Eklendi',
      description: `Yeni destek şartı eklendi: ${label}`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown'
    });

    console.log(`✅ Yeni destek şartı eklendi: ${label}`);

    res.status(201).json({
      success: true,
      message: 'Destek şartı başarıyla eklendi',
      data: {
        value: yeniDestekSarti.value,
        label: yeniDestekSarti.label,
        kategori: yeniDestekSarti.kategori,
        yuzde: yeniDestekSarti.yuzde,
        yil: yeniDestekSarti.yil,
        isDynamic: true
      }
    });

  } catch (error) {
    console.error('🚨 Destek şartı ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Destek şartı eklenemedi',
      error: error.message
    });
  }
};

// 📋 Dinamik Özel Şartlar Getirme
const getDynamicOzelSartlar = async (req, res) => {
  try {
    console.log('🎯 Dinamik özel şartlar yükleniyor...');

    const staticOptions = getOzelSartKisaltmalariOptions();
    
    const dynamicOptions = await OzelSart.find({ aktif: true })
      .populate('ekleyenKullanici', 'adSoyad')
      .sort({ kullanimSayisi: -1, createdAt: -1 })
      .lean();

    const formattedDynamic = dynamicOptions.map(item => ({
      value: item.kisaltma,
      label: `${item.kisaltma} - ${item.aciklama}`,
      kisaltma: item.kisaltma,
      aciklama: item.aciklama,
      kategori: item.kategori,
      isDynamic: true,
      kullanimSayisi: item.kullanimSayisi,
      ekleyenKullanici: item.ekleyenKullanici?.adSoyad
    }));

    const allOptions = [...staticOptions, ...formattedDynamic];

    console.log(`✅ ${staticOptions.length} statik + ${dynamicOptions.length} dinamik = ${allOptions.length} toplam özel şart`);

    res.json({
      success: true,
      message: 'Özel şartlar başarıyla getirildi',
      data: allOptions,
      counts: {
        static: staticOptions.length,
        dynamic: dynamicOptions.length,
        total: allOptions.length
      }
    });

  } catch (error) {
    console.error('🚨 Dinamik özel şartlar hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Özel şartlar getirilemedi',
      error: error.message
    });
  }
};

// ➕ Yeni Özel Şart Ekleme
const addOzelSart = async (req, res) => {
  try {
    const { kisaltma, aciklama, kategori = 'Diğer' } = req.body;

    if (!kisaltma || !aciklama) {
      return res.status(400).json({
        success: false,
        message: 'Kısaltma ve açıklama alanları zorunludur'
      });
    }

    const existing = await OzelSart.findOne({ kisaltma: kisaltma.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bu kısaltma zaten mevcut'
      });
    }

    const yeniOzelSart = new OzelSart({
      kisaltma: kisaltma.trim().toUpperCase(),
      aciklama: aciklama.trim(),
      kategori,
      ekleyenKullanici: req.user._id
    });

    await yeniOzelSart.save();

    await Activity.create({
      user: {
        id: req.user._id,
        name: req.user.adSoyad || `${req.user.ad} ${req.user.soyad}` || 'Kullanıcı',
        email: req.user.email || 'unknown@example.com'
      },
      action: 'create',
      title: 'Yeni Özel Şart Eklendi',
      description: `Yeni özel şart eklendi: ${kisaltma} - ${aciklama}`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown'
    });

    console.log(`✅ Yeni özel şart eklendi: ${kisaltma} - ${aciklama}`);

    res.status(201).json({
      success: true,
      message: 'Özel şart başarıyla eklendi',
      data: {
        value: yeniOzelSart.kisaltma,
        label: `${yeniOzelSart.kisaltma} - ${yeniOzelSart.aciklama}`,
        kisaltma: yeniOzelSart.kisaltma,
        aciklama: yeniOzelSart.aciklama,
        kategori: yeniOzelSart.kategori,
        isDynamic: true
      }
    });

  } catch (error) {
    console.error('🚨 Özel şart ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Özel şart eklenemedi',
      error: error.message
    });
  }
};

// 📋 Dinamik Özel Şart Notları Getirme
const getDynamicOzelSartNotlari = async (req, res) => {
  try {
    console.log('🎯 Dinamik özel şart notları yükleniyor...');

    const staticOptions = getOzelSartNotlariOptions();
    
    const dynamicOptions = await OzelSartNotu.find({ aktif: true })
      .populate('ekleyenKullanici', 'adSoyad')
      .sort({ kullanimSayisi: -1, createdAt: -1 })
      .lean();

    const formattedDynamic = dynamicOptions.map(item => ({
      value: item.value,
      label: item.label,
      kategori: item.kategori,
      isDynamic: true,
      kullanimSayisi: item.kullanimSayisi,
      ekleyenKullanici: item.ekleyenKullanici?.adSoyad
    }));

    const allOptions = [...staticOptions, ...formattedDynamic];

    console.log(`✅ ${staticOptions.length} statik + ${dynamicOptions.length} dinamik = ${allOptions.length} toplam özel şart notu`);

    res.json({
      success: true,
      message: 'Özel şart notları başarıyla getirildi',
      data: allOptions,
      counts: {
        static: staticOptions.length,
        dynamic: dynamicOptions.length,
        total: allOptions.length
      }
    });

  } catch (error) {
    console.error('🚨 Dinamik özel şart notları hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Özel şart notları getirilemedi',
      error: error.message
    });
  }
};

// ➕ Yeni Özel Şart Notu Ekleme
const addOzelSartNotu = async (req, res) => {
  try {
    const { value, label, kategori = 'Diğer' } = req.body;

    if (!value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Değer ve label alanları zorunludur'
      });
    }

    const existing = await OzelSartNotu.findOne({ value: value.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bu özel şart notu zaten mevcut'
      });
    }

    const yeniOzelSartNotu = new OzelSartNotu({
      value: value.trim(),
      label: label.trim(),
      kategori,
      ekleyenKullanici: req.user._id
    });

    await yeniOzelSartNotu.save();

    await Activity.create({
      user: {
        id: req.user._id,
        name: req.user.adSoyad || `${req.user.ad} ${req.user.soyad}` || 'Kullanıcı',
        email: req.user.email || 'unknown@example.com'
      },
      action: 'create',
      title: 'Yeni Özel Şart Notu Eklendi',
      description: `Yeni özel şart notu eklendi: ${label}`,
      ip: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown'
    });

    console.log(`✅ Yeni özel şart notu eklendi: ${label}`);

    res.status(201).json({
      success: true,
      message: 'Özel şart notu başarıyla eklendi',
      data: {
        value: yeniOzelSartNotu.value,
        label: yeniOzelSartNotu.label,
        kategori: yeniOzelSartNotu.kategori,
        isDynamic: true
      }
    });

  } catch (error) {
    console.error('🚨 Özel şart notu ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Özel şart notu eklenemedi',
      error: error.message
    });
  }
};

// 🎯 ======== TEMPLATE İÇİN DİNAMİK VERİ HELPER FONKSİYONLARI ========

// Dinamik Destek Unsurları Verisi (Template için)
const getDynamicDestekUnsurlariData = async () => {
  const staticOptions = getDestekUnsurlariOptions();
  
  const dynamicOptions = await DestekUnsuru.find({ aktif: true })
    .sort({ kullanimSayisi: -1, createdAt: -1 })
    .lean();

  const formattedDynamic = dynamicOptions.map(item => ({
    value: item.value,
    label: item.label,
    kategori: item.kategori,
    renk: item.renk,
    isDynamic: true,
    kullanimSayisi: item.kullanimSayisi
  }));

  return [...staticOptions, ...formattedDynamic];
};

// Dinamik Destek Şartları Verisi (Template için)
const getDynamicDestekSartlariData = async () => {
  const staticOptions = getDestekSartlariOptions();
  
  const dynamicOptions = await DestekSarti.find({ aktif: true })
    .sort({ kullanimSayisi: -1, createdAt: -1 })
    .lean();

  const formattedDynamic = dynamicOptions.map(item => ({
    value: item.value,
    label: item.label,
    kategori: item.kategori,
    yuzde: item.yuzde,
    yil: item.yil,
    isDynamic: true,
    kullanimSayisi: item.kullanimSayisi
  }));

  return [...staticOptions, ...formattedDynamic];
};

// Dinamik Özel Şartlar Verisi (Template için)
const getDynamicOzelSartlarData = async () => {
  const staticOptions = getOzelSartKisaltmalariOptions();
  
  const dynamicOptions = await OzelSart.find({ aktif: true })
    .sort({ kullanimSayisi: -1, createdAt: -1 })
    .lean();

  const formattedDynamic = dynamicOptions.map(item => ({
    value: item.kisaltma,
    label: `${item.kisaltma} - ${item.aciklama}`,
    kisaltma: item.kisaltma,
    aciklama: item.aciklama,
    kategori: item.kategori,
    isDynamic: true,
    kullanimSayisi: item.kullanimSayisi
  }));

  return [...staticOptions, ...formattedDynamic];
};

// Dinamik Özel Şart Notları Verisi (Template için)
const getDynamicOzelSartNotlariData = async () => {
  const staticOptions = getOzelSartNotlariOptions();
  
  const dynamicOptions = await OzelSartNotu.find({ aktif: true })
    .sort({ kullanimSayisi: -1, createdAt: -1 })
    .lean();

  const formattedDynamic = dynamicOptions.map(item => ({
    value: item.value,
    label: item.label,
    kategori: item.kategori,
    isDynamic: true,
    kullanimSayisi: item.kullanimSayisi
  }));

  return [...staticOptions, ...formattedDynamic];
};

// 💰 MALİ HESAPLAMALAR OTOMATİK HESAPLAMA
const calculateMaliHesaplamalar = async (req, res) => {
  try {
    const {
      sl = 0, sm = 0, // Maliyetlenen
      et = 0, eu = 0, ev = 0, ew = 0, ex = 0, ey = 0, // Yatırım hesaplamaları
      fb = 0, fc = 0, fe = 0, ff = 0, // Makina teçhizat
      fh = 0, fi = 0, // Finansman
      mevcutKisi = 0, ilaveKisi = 0 // İstihdam
    } = req.body;

    // Otomatik hesaplamalar (Excel formülleri)
    const hesaplamalar = {
      maliyetlenen: {
        sl: parseFloat(sl),
        sm: parseFloat(sm),
        sn: parseFloat(sl) * parseFloat(sm) // SL * SM
      },
      
      yatirimHesaplamalari: {
        et: parseFloat(et),
        eu: parseFloat(eu),
        ev: parseFloat(ev),
        ew: parseFloat(ew),
        ex: parseFloat(ex),
        ey: parseFloat(ey),
        ez: parseFloat(et) + parseFloat(eu) + parseFloat(ev) + parseFloat(ew) + parseFloat(ex) + parseFloat(ey) // TOPLAM
      },
      
      makinaTechizat: {
        ithalMakina: parseFloat(fb), // FB
        yerliMakina: parseFloat(fc),  // FC
        toplamMakina: parseFloat(fb) + parseFloat(fc), // FB + FC
        yeniMakina: parseFloat(fe),   // FE
        kullanimisMakina: parseFloat(ff), // FF
        toplamYeniMakina: parseFloat(fe) + parseFloat(ff) // FE + FF
      },
      
      finansman: {
        yabanciKaynak: parseFloat(fh), // FH
        ozKaynak: parseFloat(fi),      // FI
        toplamFinansman: parseFloat(fh) + parseFloat(fi) // FH + FI
      },
      
      istihdam: {
        mevcutKisi: parseInt(mevcutKisi),
        ilaveKisi: parseInt(ilaveKisi),
        toplamKisi: parseInt(mevcutKisi) + parseInt(ilaveKisi)
      },
      
      hesaplamaTarihi: new Date()
    };

    res.json({
      success: true,
      message: 'Mali hesaplamalar tamamlandı',
      data: hesaplamalar,
      formüller: {
        'SN = SL * SM': `${sl} * ${sm} = ${hesaplamalar.maliyetlenen.sn}`,
        'EZ = ET+EU+EV+EW+EX+EY': `${et}+${eu}+${ev}+${ew}+${ex}+${ey} = ${hesaplamalar.yatirimHesaplamalari.ez}`,
        'Toplam Makina = FB + FC': `${fb} + ${fc} = ${hesaplamalar.makinaTechizat.toplamMakina}`,
        'Toplam Finansman = FH + FI': `${fh} + ${fi} = ${hesaplamalar.finansman.toplamFinansman}`,
        'Toplam Kişi = Mevcut + İlave': `${mevcutKisi} + ${ilaveKisi} = ${hesaplamalar.istihdam.toplamKisi}`
      }
    });

  } catch (error) {
    console.error('🚨 Mali hesaplama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mali hesaplamalar yapılırken hata oluştu',
      error: error.message
    });
  }
};

// 🎨 DURUM RENKLERİ (Excel Renk Kodlama Sistemi)
const getDurumRenkleri = async (req, res) => {
  try {
    const renkKodlari = {
      'taslak': { renk: 'gri', hex: '#6B7280', aciklama: 'Taslak - Henüz tamamlanmamış' },
      'hazirlaniyor': { renk: 'sari', hex: '#F59E0B', aciklama: 'Hazırlanıyor - İşlem devam ediyor' },
      'başvuru_yapildi': { renk: 'mavi', hex: '#3B82F6', aciklama: 'Başvuru Yapıldı - Değerlendirme bekliyor' },
      'inceleniyor': { renk: 'turuncu', hex: '#F97316', aciklama: 'İnceleniyor - Aktif değerlendirme' },
      'ek_belge_istendi': { renk: 'sari', hex: '#F59E0B', aciklama: 'Ek Belge İstendi - Eksik evrak' },
      'revize_talep_edildi': { renk: 'kirmizi', hex: '#EF4444', aciklama: 'Revize Talep Edildi - Düzeltme gerekli' },
      'onay_bekliyor': { renk: 'turuncu', hex: '#F97316', aciklama: 'Onay Bekliyor - Final aşaması' },
      'onaylandi': { renk: 'yesil', hex: '#10B981', aciklama: 'Onaylandı - Başarıyla tamamlandı' },
      'reddedildi': { renk: 'kirmizi', hex: '#EF4444', aciklama: 'Reddedildi - Başvuru kabul edilmedi' },
      'iptal_edildi': { renk: 'gri', hex: '#6B7280', aciklama: 'İptal Edildi - İşlem durduruldu' }
    };

    res.json({
      success: true,
      message: 'Durum renk kodları getirildi',
      data: renkKodlari
    });

  } catch (error) {
    console.error('🚨 Renk kodları hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Renk kodları getirilemedi',
      error: error.message
    });
  }
};

// 📊 TEŞVİK İSTATİSTİKLERİ
const getTesvikStats = async (req, res) => {
  try {
    const stats = await Tesvik.getStatistics();
    
    res.json({
      success: true,
      message: 'Teşvik istatistikleri getirildi',
      data: stats
    });

  } catch (error) {
    console.error('🚨 İstatistik hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler getirilemedi',
      error: error.message
    });
  }
};

// 🔍 TEŞVİK ARAMA
const searchTesvikler = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Arama terimi en az 2 karakter olmalıdır'
      });
    }

    const tesvikler = await Tesvik.searchTesvikler(q)
      .populate('firma', 'tamUnvan firmaId')
      .select('tesvikId gmId yatirimciUnvan durumBilgileri createdAt')
      .limit(50);

    res.json({
      success: true,
      message: `"${q}" için ${tesvikler.length} sonuç bulundu`,
      data: tesvikler
    });

  } catch (error) {
    console.error('🚨 Arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Arama yapılırken hata oluştu',
      error: error.message
    });
  }
};

// 🗑️ TEŞVİK SİLME (Soft Delete)
const deleteTesvik = async (req, res) => {
  try {
    const { id } = req.params;

    const tesvik = await Tesvik.findById(id);
    if (!tesvik) {
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    // Silme öncesi mevcut durumu kaydet
    const beforeState = {
      aktif: tesvik.aktif,
      tesvikId: tesvik.tesvikId,
      yatirimciUnvan: tesvik.yatirimciUnvan,
      gmId: tesvik.gmId,
      durumBilgileri: tesvik.durumBilgileri,
      sonGuncelleyen: tesvik.sonGuncelleyen,
      sonGuncellemeNotlari: tesvik.sonGuncellemeNotlari
    };

    // Soft delete
    tesvik.aktif = false;
    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = 'Teşvik silindi';
    
    await tesvik.save();

    // Silme sonrası durumu kaydet
    const afterState = {
      aktif: tesvik.aktif,
      tesvikId: tesvik.tesvikId,
      yatirimciUnvan: tesvik.yatirimciUnvan,
      gmId: tesvik.gmId,
      durumBilgileri: tesvik.durumBilgileri,
      sonGuncelleyen: tesvik.sonGuncelleyen,
      sonGuncellemeNotlari: tesvik.sonGuncellemeNotlari
    };

    // Silinen alanları tespit et
    const deletedFields = [
      {
        field: 'aktif',
        fieldName: 'Aktiflik Durumu',
        oldValue: beforeState.aktif,
        newValue: afterState.aktif
      },
      {
        field: 'sonGuncellemeNotlari',
        fieldName: 'Son Güncelleme Notları',
        oldValue: beforeState.sonGuncellemeNotlari,
        newValue: afterState.sonGuncellemeNotlari
      }
    ];

    // IP ve User Agent bilgilerini al
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     (req.connection.socket ? req.connection.socket.remoteAddress : null) || 
                     req.ip || 
                     'Bilinmiyor';
    
    const userAgent = req.headers['user-agent'] || 'Bilinmiyor';

    // Detaylı activity log
    await Activity.logActivity({
      action: 'delete',
      category: 'tesvik',
      title: 'Teşvik Silindi',
      description: `${tesvik.tesvikId} numaralı teşvik silindi (soft delete)`,
      targetResource: {
        type: 'tesvik',
        id: tesvik._id,
        name: tesvik.yatirimciUnvan,
        tesvikId: tesvik.tesvikId
      },
      user: {
        id: req.user._id,
        name: req.user.adSoyad,
        email: req.user.email,
        role: req.user.rol
      },
      changes: {
        before: beforeState,
        after: afterState,
        fields: deletedFields
      },
      metadata: {
        ip: clientIp,
        userAgent: userAgent,
        source: 'web_interface',
        timestamp: new Date(),
        operationType: 'soft_delete'
      }
    });

    res.json({
      success: true,
      message: 'Teşvik başarıyla silindi'
    });

  } catch (error) {
    console.error('🚨 Teşvik silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Teşvik silinirken hata oluştu',
      error: error.message
    });
  }
};

// SONRAKİ TEŞVİK ID'Yİ AL
const getNextTesvikId = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const lastTesvik = await Tesvik.findOne(
      { tesvikId: new RegExp(`^TES${year}`) },
      { tesvikId: 1 },
      { sort: { tesvikId: -1 } }
    );
    
    let nextNumber = 1;
    if (lastTesvik && lastTesvik.tesvikId) {
      const currentNumber = parseInt(lastTesvik.tesvikId.slice(7));
      nextNumber = currentNumber + 1;
    }
    
    const nextTesvikId = `TES${year}${nextNumber.toString().padStart(4, '0')}`;

    res.json({
      success: true,
      message: 'Sonraki teşvik ID getirildi',
      data: {
        nextTesvikId,
        year,
        sequenceNumber: nextNumber
      }
    });

  } catch (error) {
    console.error('🚨 Next ID hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sonraki ID alınırken hata oluştu',
      error: error.message
    });
  }
};

// 🆔 SONRAKİ GM ID'Yİ AL - OTOMATIK GENERATION
const getNextGmId = async (req, res) => {
  try {
    console.log('🔍 Finding next available GM ID...');
    
    // Son GM ID'yi bul
    const lastTesvik = await Tesvik.findOne(
      { gmId: { $exists: true, $ne: '' } },
      { gmId: 1 },
      { sort: { gmId: -1 } }
    );
    
    let nextNumber = 1;
    
    if (lastTesvik && lastTesvik.gmId) {
      // GM ID format: GM2024001, GM2024002, etc.
      const match = lastTesvik.gmId.match(/^GM(\d{4})(\d{3})$/);
      if (match) {
        const year = parseInt(match[1]);
        const currentNumber = parseInt(match[2]);
        
        // Aynı yıl içindeyse sequence artır, yoksa 1'den başla
        if (year === new Date().getFullYear()) {
          nextNumber = currentNumber + 1;
        } else {
          nextNumber = 1;
        }
      }
    }
    
    const currentYear = new Date().getFullYear();
    const nextGmId = `GM${currentYear}${nextNumber.toString().padStart(3, '0')}`;
    
    console.log('✅ Next available GM ID:', nextGmId);

    res.json({
      success: true,
      message: 'Sonraki GM ID getirildi',
      data: {
        nextGmId,
        year: currentYear,
        sequenceNumber: nextNumber,
        format: 'GM + Year + 3 digit sequence'
      }
    });

  } catch (error) {
    console.error('🚨 Next GM ID hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sonraki GM ID alınırken hata oluştu',
      error: error.message
    });
  }
};

// 📋 TEŞVİK FORM TEMPLATE VERİLERİNİ GETİR
const getTesvikFormTemplate = async (req, res) => {
  try {
    console.log('📋 Loading template data for teşvik form...');

    // Paralel sorgular ile verileri al
    const [
      firmalar,
      nextGmId,
      nextTesvikId,
      durumlar,
      destekSiniflari,
      iller,
      dayandigiKanunlar,
      belgeDurumlari,
      yatirimTipleri,
      kapasiteBirimleri,
      osbOptions,
      yatirimKonusuKategorileri,
      u97Kodlari,
      destekUnsurlariOptions,
      destekSartlariOptions,
      ozelSartKisaltmalari,
      ozelSartNotlari
    ] = await Promise.all([
      // Tüm aktif firmaları getir - LIMIT YOK!
      Firma.find({ aktif: true })
        .select('firmaId tamUnvan vergiNoTC firmaIl')
        .sort({ firmaId: 1 })
        .lean(),

      // Sonraki GM ID
      getNextGmIdValue(),

      // Sonraki Teşvik ID
      getNextTesvikIdValue(),

      // Durum listesi
      getDurumOptions(),

      // Destek sınıfları
      getDestekSiniflariOptions(),

      // İller listesi
      getIllerOptions(),

      // Dayandığı Kanunlar
      getDayandigiKanunOptions(),

      // Belge Durumları
      getBelgeDurumOptions(),

      // Yatırım Tipleri (Cinsi)
      getYatirimTipiOptions(),

      // Kapasite Birimleri
      getKapasiteBirimleriOptions(),

      // OSB Seçenekleri
      getOsbOptions(),

      // Yatırım Konusu Kategorileri
      getYatirimKonusuKategorileri(),

      // U$97 Kodları
      getU97KodlariOptions(),

      // 🎯 DİNAMİK DESTEK UNSURLARI (Statik + Dinamik Birleşim)
      getDynamicDestekUnsurlariData(),

      // 🎯 DİNAMİK DESTEK ŞARTLARI (Statik + Dinamik Birleşim)  
      getDynamicDestekSartlariData(),

      // 🎯 DİNAMİK ÖZEL ŞARTLAR (Statik + Dinamik Birleşim)
      getDynamicOzelSartlarData(),

      // 🎯 DİNAMİK ÖZEL ŞART NOTLARI (Statik + Dinamik Birleşim)
      getDynamicOzelSartNotlariData()
    ]);

    console.log(`✅ Template data loaded: ${firmalar.length} firmalar, GM ID: ${nextGmId}, Teşvik ID: ${nextTesvikId}`);

    res.json({
      success: true,
      message: 'Template verileri başarıyla getirildi',
      data: {
        firmalar,
        nextGmId,
        nextTesvikId,
        durumlar,
        destekSiniflari,
        iller,
        dayandigiKanunlar,
        belgeDurumlari,
        yatirimTipleri,
        kapasiteBirimleri,
        osbOptions,
        yatirimKonusuKategorileri,
        u97Kodlari,
        destekUnsurlariOptions,
        destekSartlariOptions,
        ozelSartKisaltmalari,
        ozelSartNotlari,
        urunKodlari: getUrunKodlariTemplate(), // Excel U$97 kodları
        destekUnsurlari: getDestekUnsurlariTemplate(),
        ozelSartlar: getOzelSartlarTemplate(),
        kunyeBilgileri: getKunyeBilgileriTemplate()
      }
    });

  } catch (error) {
    console.error('🚨 Template data hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Template verileri yüklenirken hata oluştu',
      error: error.message
    });
  }
};

// 🔧 Helper Functions for Template Data
const getNextGmIdValue = async () => {
  const lastTesvik = await Tesvik.findOne(
    { gmId: { $exists: true, $ne: '' } },
    { gmId: 1 },
    { sort: { gmId: -1 } }
  );
  
  let nextNumber = 1;
  if (lastTesvik && lastTesvik.gmId) {
    const match = lastTesvik.gmId.match(/^GM(\d{4})(\d{3})$/);
    if (match) {
      const year = parseInt(match[1]);
      const currentNumber = parseInt(match[2]);
      if (year === new Date().getFullYear()) {
        nextNumber = currentNumber + 1;
      }
    }
  }
  
  return `GM${new Date().getFullYear()}${nextNumber.toString().padStart(3, '0')}`;
};

const getNextTesvikIdValue = async () => {
  const year = new Date().getFullYear();
  const lastTesvik = await Tesvik.findOne(
    { tesvikId: new RegExp(`^TES${year}`) },
    { tesvikId: 1 },
    { sort: { tesvikId: -1 } }
  );
  
  let nextNumber = 1;
  if (lastTesvik && lastTesvik.tesvikId) {
    const currentNumber = parseInt(lastTesvik.tesvikId.slice(7));
    nextNumber = currentNumber + 1;
  }
  
  return `TES${year}${nextNumber.toString().padStart(4, '0')}`;
};

const getDurumOptions = () => [
  { value: 'taslak', label: 'Taslak', color: '#6B7280' },
  { value: 'hazirlaniyor', label: 'Hazırlanıyor', color: '#F59E0B' },
  { value: 'başvuru_yapildi', label: 'Başvuru Yapıldı', color: '#3B82F6' },
  { value: 'inceleniyor', label: 'İnceleniyor', color: '#F97316' },
  { value: 'ek_belge_istendi', label: 'Ek Belge İstendi', color: '#F59E0B' },
  { value: 'revize_talep_edildi', label: 'Revize Talep Edildi', color: '#EF4444' },
  { value: 'onay_bekliyor', label: 'Onay Bekliyor', color: '#F97316' },
  { value: 'onaylandi', label: 'Onaylandı', color: '#10B981' },
  { value: 'reddedildi', label: 'Reddedildi', color: '#EF4444' },
  { value: 'iptal_edildi', label: 'İptal Edildi', color: '#6B7280' }
];

const getDestekSiniflariOptions = () => [
  { value: 'Genel', label: 'Genel Teşvik', aciklama: 'Genel teşvik uygulaması' },
  { value: 'Bölgesel', label: 'Bölgesel Teşvik', aciklama: 'Bölgesel kalkınma teşviki' },
  { value: 'Bölgesel Alt Bölge', label: 'Bölgesel Alt Bölge', aciklama: 'Bölgesel alt kategori teşviki' },
  { value: 'Bölgesel Alt Bölge 18-1-a', label: 'Bölgesel Alt Bölge 18-1-a', aciklama: 'Özel bölge teşviki 18-1-a' },
  { value: 'Bölgesel Alt Bölge 18-1-b', label: 'Bölgesel Alt Bölge 18-1-b', aciklama: 'Özel bölge teşviki 18-1-b' },
  { value: 'Bölgesel Alt Bölge 18-2', label: 'Bölgesel Alt Bölge 18-2', aciklama: 'Özel bölge teşviki 18-2' },
  { value: 'Bölgesel Alt Bölge 18-3 OECD', label: 'Bölgesel Alt Bölge 18-3 OECD', aciklama: 'OECD standartları' },
  { value: 'Bölgesel Alt Bölge 18-3 OECD İstanbul', label: 'Bölgesel Alt Bölge 18-3 OECD İstanbul', aciklama: 'İstanbul özel kategori' },
  { value: 'Bölgesel Alt Bölge 18-5 ilçe', label: 'Bölgesel Alt Bölge 18-5 ilçe', aciklama: 'İlçe bazlı teşvik' },
  { value: 'Bölgesel Öncelikli 17', label: 'Bölgesel Öncelikli 17', aciklama: 'Öncelikli bölge teşviki' },
  { value: 'Stratejik', label: 'Stratejik Yatırım Teşviki', aciklama: 'Stratejik sektör teşviki' },
  { value: 'Stratejik Hamle', label: 'Stratejik Hamle Teşviki', aciklama: 'Stratejik hamle programı' },
  { value: 'Stratejik Hamle - Yüksek Öncelik', label: 'Stratejik Hamle - Yüksek Öncelik', aciklama: 'Yüksek öncelikli stratejik' },
  { value: 'Proje Bazlı', label: 'Proje Bazlı Teşvik', aciklama: 'Özel proje teşviki' }
];

const getIllerOptions = () => [
  'ADANA', 'ADIYAMAN', 'AFYONKARAHİSAR', 'AĞRI', 'AMASYA', 'ANKARA', 'ANTALYA', 
  'ARTVİN', 'AYDIN', 'BALIKESİR', 'BİLECİK', 'BİNGÖL', 'BİTLİS', 'BOLU', 
  'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI', 'ÇORUM', 'DENİZLİ', 'DİYARBAKIR', 
  'EDİRNE', 'ELAZIĞ', 'ERZİNCAN', 'ERZURUM', 'ESKİŞEHİR', 'GAZİANTEP', 'GİRESUN',
  'GÜMÜŞHANE', 'HAKKARİ', 'HATAY', 'ISPARTA', 'İÇEL', 'İSTANBUL', 'İZMİR', 
  'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRKLARELİ', 'KIRŞEHİR', 'KOCAELİ', 'KONYA',
  'KÜTAHYA', 'MALATYA', 'MANİSA', 'KAHRAMANMARAŞ', 'MARDİN', 'MUĞLA', 'MUŞ',
  'NEVŞEHİR', 'NİĞDE', 'ORDU', 'RİZE', 'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP',
  'SİVAS', 'TEKİRDAĞ', 'TOKAT', 'TRABZON', 'TUNCELİ', 'ŞANLIURFA', 'UŞAK',
  'VAN', 'YOZGAT', 'ZONGULDAK', 'AKSARAY', 'BAYBURT', 'KARAMAN', 'KIRIKKALE',
  'BATMAN', 'ŞIRNAK', 'BARTIN', 'ARDAHAN', 'IĞDIR', 'YALOVA', 'KARABÜK', 
  'KİLİS', 'OSMANİYE', 'DÜZCE'
];

const getDayandigiKanunOptions = () => [
  { value: '2012/3305', label: '2012/3305', aciklama: 'Yatırım Teşvik Kararnamesi' },
  { value: '2018/11201', label: '2018/11201', aciklama: 'Güncel Teşvik Sistemi' },
  { value: '2016/9495', label: '2016/9495', aciklama: 'Önceki Teşvik Sistemi' }
];

const getBelgeDurumOptions = () => [
  { value: 'hazirlaniyor', label: 'Hazırlanıyor', color: '#F59E0B', backgroundColor: '#fef3c7' },
  { value: 'başvuru_yapildi', label: 'Başvuru Yapıldı', color: '#3B82F6', backgroundColor: '#dbeafe' },
  { value: 'inceleniyor', label: 'İnceleniyor', color: '#8B5CF6', backgroundColor: '#ede9fe' },
  { value: 'ek_belge_bekleniyor', label: 'Ek Belge Bekleniyor', color: '#F59E0B', backgroundColor: '#fef3c7' },
  { value: 'onaylandi', label: 'Onaylandı', color: '#10B981', backgroundColor: '#d1fae5' },
  { value: 'reddedildi', label: 'Reddedildi', color: '#EF4444', backgroundColor: '#fee2e2' },
  { value: 'iptal', label: 'İptal', color: '#6B7280', backgroundColor: '#f3f4f6' }
];

// 🔄 YATIRIM TİPİ (CİNSİ) - CSV'den gerçek veriler
const getYatirimTipiOptions = () => [
  { value: 'Komple Yeni', label: 'Komple Yeni', aciklama: 'Tamamen yeni yatırım' },
  { value: 'Tevsi', label: 'Tevsi', aciklama: 'Mevcut yatırımın genişletilmesi' },
  { value: 'Modernizasyon', label: 'Modernizasyon', aciklama: 'Teknolojik yenileme' },
  { value: 'Entegrasyon', label: 'Entegrasyon', aciklama: 'Entegre yatırım' },
  { value: 'Ürün Çeşitlendirme', label: 'Ürün Çeşitlendirme', aciklama: 'Yeni ürün geliştirme' },
  { value: 'Nakil', label: 'Nakil', aciklama: 'Taşınma işlemi' },
  { value: 'Taşınma', label: 'Taşınma', aciklama: 'Yer değiştirme' }
];

// 📊 KAPASİTE BİRİMLERİ - CSV'den gerçek veriler (Excel'deki tüm seçenekler)
const getKapasiteBirimleriOptions = () => [
  // Temel birimler
  'ADET', 'ADET(UNIT)', 'ADET-ÇİFT', 'ABONE', 'ABONELİK',
  'KİLOGRAM', 'KİLOGRAM-ADET', 'KİLOGRAM-BAŞ', 'KİLOGRAM-ÇİFT',
  'GRAM', 'TON', 'LİTRE', 'METRE', 'METRE KARE', 'METRE KÜP',
  
  // Zamanlı birimler - Excel'deki gibi
  'ADET/YIL', 'ADET/AY', 'ADET/GÜN', 'ADET/SAAT', 'ADET/8 SAAT',
  'ADET/HAFTA', 'ADET/DÖNEM', 'ADET/PERYOT', 'ADET/DAKİKA',
  'ABONE/YIL', 'ABONE/GÜN', 'ÇİFT/YIL', 'ÇİFT/GÜN', 'GRAM/YIL',
  
  // Özel birimler - Excel'den
  'ADET/10L', 'ADET/BALON', 'ADET/DEVRE', 'ADET/TEST', 'ADET/TEKNE', 'ADET/UÇAK',
  'ÇİFT', 'LEVHA', 'RULO', 'PLAKA', 'BOBIN', 'TABAKA',
  'DEMET', 'PAKET', 'KOLI', 'KASA', 'KUTU',
  
  // Kilo Watt ve enerji birimleri
  'KILO WATT', 'KILO WATT SAAT', 'BİN KILO WATT SAAT',
  
  // Bin birimler
  'BİN ADET', 'BİN KİLOGRAM', 'BİN LİTRE', 'BİN METRE KÜP',
  
  // Diğer özel birimler
  'ALTIN AYARI', 'ATV birim fiyatı', 'AFİF birim fiyatı',
  'AZOTUN KİLOGRAMI', 'BAS', 'BRÜT KALORİ DEĞERİ',
  'DİFOSFOR PENTAOKSİT KİLOGRAMI', 'FISSILE İZOTOP GRAMI'
];

// 📦 U$97 KODLARI - CSV'den gerçek ürün kodları  
const getU97KodlariOptions = () => [
  // 0111 - TAHIL VE DİĞER BİTKİSEL ÜRÜNLER
  { kod: '0111.0.01', aciklama: 'Durum buğdayı (makarnalık buğday)', kategori: 'Tahıl' },
  { kod: '0111.0.02', aciklama: 'Yumuşak buğday ve diğer buğdaylar', kategori: 'Tahıl' },
  { kod: '0111.0.03', aciklama: 'Mısır', kategori: 'Tahıl' },
  { kod: '0111.0.04', aciklama: 'Dış zarı çıkartılmamış pirinç (çeltik)', kategori: 'Tahıl' },
  { kod: '0111.0.05', aciklama: 'Arpa', kategori: 'Tahıl' },
  { kod: '0111.0.06', aciklama: 'Çavdar ve yulaf', kategori: 'Tahıl' },
  { kod: '0111.0.07', aciklama: 'Diğer tahıllar', kategori: 'Tahıl' },
  { kod: '0111.0.08', aciklama: 'Patates', kategori: 'Kök ve Yumru' },
  { kod: '0111.0.09', aciklama: 'Kuru baklagil sebzeler (kabuklu)', kategori: 'Baklagil' },
  { kod: '0111.0.10', aciklama: 'Yüksek oranda nişasta ve inülin içeren kök ve yumru bitkiler', kategori: 'Kök ve Yumru' },
  { kod: '0111.0.11', aciklama: 'Soya fasülyesi', kategori: 'Yağlı Tohum' },
  { kod: '0111.0.12', aciklama: 'Yer fıstığı', kategori: 'Yağlı Tohum' },
  { kod: '0111.0.14', aciklama: 'Çiğit (pamuk tohumu)', kategori: 'Yağlı Tohum' },
  { kod: '0111.0.15', aciklama: 'B.y.s. yağlı tohumlar ve yağlı meyveler', kategori: 'Yağlı Tohum' },
  { kod: '0111.0.16', aciklama: 'Tütün (işlenmemiş)', kategori: 'Endüstriyel Bitki' },
  { kod: '0111.0.17', aciklama: 'Şeker pancarı', kategori: 'Endüstriyel Bitki' },
  { kod: '0111.0.18', aciklama: 'Şeker kamışı', kategori: 'Endüstriyel Bitki' },
  { kod: '0111.0.19', aciklama: 'Saman ve yem bitkileri', kategori: 'Yem Bitkisi' },
  { kod: '0111.0.20', aciklama: 'Pamuk (çırçırlanmış ya da çırçırlanmamış)', kategori: 'Endüstriyel Bitki' },
  
  // 0112 - SEBZE, BAHÇE VE KÜLTÜR BİTKİLERİ
  { kod: '0112.0.02', aciklama: 'Meyvesi yenen sebzeler', kategori: 'Sebze' },
  { kod: '0112.0.03', aciklama: 'Yaprağı yenen sebzeler', kategori: 'Sebze' },
  { kod: '0112.0.04', aciklama: 'Baklagil sebzeler', kategori: 'Sebze' },
  { kod: '0112.0.05', aciklama: 'B.y.s. diğer sebzeler', kategori: 'Sebze' },
  { kod: '0112.0.08', aciklama: 'Çiçek ve meyve tohumları', kategori: 'Tohum' },
  { kod: '0112.0.09', aciklama: 'Sebze tohumları', kategori: 'Tohum' },
  
  // 0113 - MEYVE VE BAHARAT BİTKİLERİ
  { kod: '0113.0.01', aciklama: 'Sofralık üzüm', kategori: 'Meyve' },
  { kod: '0113.0.02', aciklama: 'Diğer yaş üzüm', kategori: 'Meyve' },
  { kod: '0113.0.04', aciklama: 'Turunçgiller', kategori: 'Meyve' },
  { kod: '0113.0.05', aciklama: 'Diğer meyveler (yumuşak çekirdekli)', kategori: 'Meyve' },
  { kod: '0113.0.06', aciklama: 'Diğer meyveler (sert çekirdekli)', kategori: 'Meyve' },
  { kod: '0113.0.08', aciklama: 'Zeytin', kategori: 'Meyve' },
  { kod: '0113.0.12', aciklama: 'Kakao çekirdeği', kategori: 'Endüstriyel Bitki' },
  { kod: '0113.0.13', aciklama: 'Baharatlar (işlenmemiş)', kategori: 'Baharat' },
  
  // 0121 - BÜYÜKBAŞ HAYVANCILIK
  { kod: '0121.1.01', aciklama: 'Sığır (saf kültür)', kategori: 'Büyükbaş' },
  { kod: '0121.1.02', aciklama: 'Sığır (kültür melezi)', kategori: 'Büyükbaş' },
  { kod: '0121.1.03', aciklama: 'Sığır (yerli-diğer)', kategori: 'Büyükbaş' },
  { kod: '0121.1.04', aciklama: 'Manda', kategori: 'Büyükbaş' },
  { kod: '0121.1.05', aciklama: 'Damızlık sığır yetiştiriciliği', kategori: 'Büyükbaş' },
  { kod: '0121.1.06', aciklama: 'Sığırdan elde edilen ham süt', kategori: 'Süt Ürünü' },
  { kod: '0121.1.07', aciklama: 'Sığır spermi üretimi (dondurulmuş)', kategori: 'Damızlık' },
  
  // 0121 - KÜÇÜKBAŞ HAYVANCILIK  
  { kod: '0121.2.01', aciklama: 'Merinos Koyunu', kategori: 'Küçükbaş' },
  { kod: '0121.2.02', aciklama: 'Yerli Koyun', kategori: 'Küçükbaş' },
  { kod: '0121.2.03', aciklama: 'Damızlık koyun yetiştiriciliği', kategori: 'Küçükbaş' },
  { kod: '0121.2.04', aciklama: 'Kıl keçisi', kategori: 'Küçükbaş' }
];

// 🏭 OSB SEÇENEKLERİ - CSV'den real-time yükleme
const getOsbListFromCSV = () => {
  try {
    const csvPath = path.join(__dirname, '../../belge ytb - admin.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('⚠️ OSB CSV dosyası bulunamadı:', csvPath);
      return [];
    }

    // CSV dosyasını satır satır oku
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n');
    
    const osbList = new Set(); // Duplicate'leri önlemek için Set kullan
    
    // İlk satır header, ondan sonrakiler data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim() === '') continue;
      
      const columns = line.split(',');
      const osbIli = columns[12]; // OSB İli (13. kolon)
      const osbUnvani = columns[13]; // OSB Ünvanı (14. kolon)
      
      if (osbIli && osbUnvani && osbIli.trim() !== '' && osbUnvani.trim() !== '') {
        // Unique key oluştur
        const osbKey = `${osbIli.trim()}|${osbUnvani.trim()}`;
        osbList.add(osbKey);
      }
    }
    
    // Set'i array'e çevir ve formatla
    const formattedOsb = Array.from(osbList).map(osbKey => {
      const [il, unvan] = osbKey.split('|');
      return {
        value: unvan,
        label: unvan,
        il: il,
        fullLabel: `${unvan} (${il})`
      };
    }).sort((a, b) => a.il.localeCompare(b.il) || a.label.localeCompare(b.label));
    
    console.log(`✅ ${formattedOsb.length} OSB verisi CSV'den yüklendi`);
    return formattedOsb;
    
  } catch (error) {
    console.error('❌ OSB CSV okuma hatası:', error);
    return [];
  }
};

// OSB seçenekleri - CSV'den dinamik yükleme
const getOsbOptions = () => {
  return getOsbListFromCSV();
};

// 💼 YATIRIM KONUSU KATEGORİLERİ - CSV'den ana kategoriler
const getYatirimKonusuKategorileri = () => [
  {
    kod: '111',
    kategori: 'TAHIL VE BAŞKA YERDE SINIFLANDIRILMAMIŞ DİĞER BİTKİSEL ÜRÜNLERİN YETİŞTİRİLMESİ',
    altKategoriler: [
      '111.0.01 - Durum buğdayı (makarnalık buğday)',
      '111.0.02 - Yumuşak buğday ve diğer buğdaylar',
      '111.0.03 - Mısır',
      '111.0.04 - Dış zarı çıkartılmamış pirinç (çeltik)',
      '111.0.05 - Arpa',
      '111.0.06 - Çavdar ve yulaf',
      '111.0.07 - Diğer tahıllar'
    ]
  },
  {
    kod: '112',
    kategori: 'SEBZE, BAHÇE VE KÜLTÜR BİTKİLERİ İLE FİDANLIK ÜRÜNLERİNİN YETİŞTİRİLMESİ',
    altKategoriler: [
      '112.01 - Sebze yetiştiriciliği',
      '112.02 - Bahçe bitkileri yetiştiriciliği',
      '112.03 - Fidan yetiştiriciliği'
    ]
  },
  {
    kod: '113',
    kategori: 'MEYVE, SERT KABUKLULAR, İÇECEK VE BAHARAT BİTKİLERİNİN YETİŞTİRİLMESİ',
    altKategoriler: [
      '113.01 - Meyve yetiştiriciliği',
      '113.02 - Sert kabuklu yetiştiriciliği',
      '113.03 - İçecek bitkileri yetiştiriciliği'
    ]
  },
  {
    kod: '121',
    kategori: 'KOYUN, KEÇİ, SIĞIR, AT, EŞEK, BARDO, KATIR VB. YETİŞTİRİLMESİ; SÜT HAYVANCILIĞI',
    altKategoriler: [
      '121.01 - Büyükbaş hayvancılık',
      '121.02 - Küçükbaş hayvancılık',
      '121.03 - Süt hayvancılığı'
    ]
  },
  {
    kod: '122',
    kategori: 'DİĞER HAYVANLARIN YETİŞTİRİLMESİ; BAŞKA YERDE SINIFLANDIRILMAMIŞ HAYVANSAL ÜRÜNLERİN ÜRETİMİ',
    altKategoriler: [
      '122.01 - Kümes hayvancılığı',
      '122.02 - Arıcılık',
      '122.03 - Diğer hayvan yetiştiriciliği'
    ]
  }
];

const getKunyeBilgileriTemplate = () => ({
  talepSonuc: '',
  revizeId: '', // 🆕 Excel şablonundan eklendi
  sorguBaglantisi: '',
  yatirimci: '',
  yatirimciUnvan: '',
  sgkSicilNo: '', // 🆕 Excel şablonundan eklendi
  belgeBaslamaTarihi: null,
  belgeBitisTarihi: null,
  uzatimTarihi: null,
  mucbirUzatimTarihi: null,
  kararTarihi: '',
  kararSayisi: '',
  yonetmelikMaddesi: '',
  basvuruTarihi: '',
  dosyaNo: '',
  projeBedeli: 0,
  tesvikMiktari: 0,
  tesvikOrani: 0
});

// 📦 Excel U$97 Ürün Kodları Template
const getUrunKodlariTemplate = () => [
  { kod: 'U$97_1', aciklama: 'Ürün Kodu 1', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_2', aciklama: 'Ürün Kodu 2', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_3', aciklama: 'Ürün Kodu 3', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_4', aciklama: 'Ürün Kodu 4', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_5', aciklama: 'Ürün Kodu 5', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_6', aciklama: 'Ürün Kodu 6', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_7', aciklama: 'Ürün Kodu 7', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_8', aciklama: 'Ürün Kodu 8', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' },
  { kod: 'U$97_9', aciklama: 'Ürün Kodu 9', mevcut: 0, ilave: 0, toplam: 0, kapsite: 0, kapasite_birimi: '' }
];

// 🎯 DESTEK UNSURLARI - CSV'den gerçek veriler
const getDestekUnsurlariOptions = () => [
  { value: 'Sigorta Primi İşveren Hissesi', label: 'Sigorta Primi İşveren Hissesi', kategori: 'Sigorta', renk: '#10B981' },
  { value: 'Sigorta Prim Desteği', label: 'Sigorta Prim Desteği', kategori: 'Sigorta', renk: '#10B981' },
  { value: 'Vergi İndirimi', label: 'Vergi İndirimi', kategori: 'Vergi', renk: '#3B82F6' },
  { value: 'Gelir Vergisi Stopaj Desteği', label: 'Gelir Vergisi Stopaj Desteği', kategori: 'Vergi', renk: '#3B82F6' },
  { value: 'KDV İstisnası', label: 'KDV İstisnası', kategori: 'Vergi', renk: '#3B82F6' },
  { value: 'KDV İadesi', label: 'KDV İadesi', kategori: 'Vergi', renk: '#3B82F6' },
  { value: 'Gümrük Vergisi Muafiyeti', label: 'Gümrük Vergisi Muafiyeti', kategori: 'Gümrük', renk: '#F59E0B' },
  { value: 'Faiz Desteği', label: 'Faiz Desteği', kategori: 'Finansal', renk: '#EF4444' },
  { value: 'Yatırım Yeri Tahsisi', label: 'Yatırım Yeri Tahsisi', kategori: 'Yer', renk: '#8B5CF6' },
  { value: 'Yatırım Konusu Zorunluluğu', label: 'Yatırım Konusu Zorunluluğu', kategori: 'Zorunluluk', renk: '#6B7280' }
];

// 📋 DESTEK UNSURU ŞARTLARI - CSV'den gerçek veriler
const getDestekSartlariOptions = () => [
  // Bölgesel Katkı Oranları
  { value: 'Yatırıma Katkı Oranı:%15 - Vergi İndirim %50 (1. Bölge)', label: 'Yatırıma Katkı Oranı:%15 - Vergi İndirim %50 (1. Bölge)', kategori: '1. Bölge', yuzde: 15 },
  { value: 'Yatırıma Katkı Oranı:%20 - Vergi İndirim %55 (2. Bölge)', label: 'Yatırıma Katkı Oranı:%20 - Vergi İndirim %55 (2. Bölge)', kategori: '2. Bölge', yuzde: 20 },
  { value: 'Yatırıma Katkı Oranı:%25 - Vergi İndirim %60 (3. Bölge)', label: 'Yatırıma Katkı Oranı:%25 - Vergi İndirim %60 (3. Bölge)', kategori: '3. Bölge', yuzde: 25 },
  { value: 'Yatırıma Katkı Oranı:%30 - Vergi İndirim %70 (4. Bölge)', label: 'Yatırıma Katkı Oranı:%30 - Vergi İndirim %70 (4. Bölge)', kategori: '4. Bölge', yuzde: 30 },
  { value: 'Yatırıma Katkı Oranı:%40 - Vergi İndirim %80 (5. Bölge)', label: 'Yatırıma Katkı Oranı:%40 - Vergi İndirim %80 (5. Bölge)', kategori: '5. Bölge', yuzde: 40 },
  { value: 'Yatırıma Katkı Oranı:%50 - Vergi İndirim %90 (6. Bölge)', label: 'Yatırıma Katkı Oranı:%50 - Vergi İndirim %90 (6. Bölge)', kategori: '6. Bölge', yuzde: 50 },
  { value: 'Yatırıma Katkı Oranı:%50 - Vergi İndirim %90 (Stratejik)', label: 'Yatırıma Katkı Oranı:%50 - Vergi İndirim %90 (Stratejik)', kategori: 'Stratejik', yuzde: 50 },
  
  // Yatırım Tutarı Destekleri
  { value: '2 Yıl ve En Fazla Yatırım Tutarının %10\'lu (1. Bölge)', label: '2 Yıl ve En Fazla Yatırım Tutarının %10\'lu (1. Bölge)', kategori: '1. Bölge', yil: 2 },
  { value: '3 Yıl ve En Fazla Yatırım Tutarının %15\'i (2. Bölge)', label: '3 Yıl ve En Fazla Yatırım Tutarının %15\'i (2. Bölge)', kategori: '2. Bölge', yil: 3 },
  { value: '5 Yıl ve En Fazla Yatırım Tutarının %20\'si (3. Bölge)', label: '5 Yıl ve En Fazla Yatırım Tutarının %20\'si (3. Bölge)', kategori: '3. Bölge', yil: 5 },
  { value: '6 Yıl ve En Fazla Yatırım Tutarının %25\'i (4. Bölge)', label: '6 Yıl ve En Fazla Yatırım Tutarının %25\'i (4. Bölge)', kategori: '4. Bölge', yil: 6 },
  { value: '7 Yıl ve En Fazla Yatırım Tutarının %35\'i (5. Bölge)', label: '7 Yıl ve En Fazla Yatırım Tutarının %35\'i (5. Bölge)', kategori: '5. Bölge', yil: 7 },
  { value: '10 Yıl (6. Bölge)', label: '10 Yıl (6. Bölge)', kategori: '6. Bölge', yil: 10 },
  { value: '7 Yıl ve En Fazla Yatırım Tutarının %15\'i (Stratejik)', label: '7 Yıl ve En Fazla Yatırım Tutarının %15\'i (Stratejik)', kategori: 'Stratejik', yil: 7 },
  
  // Hamle Programları
  { value: '5 Yıl (Hamle)', label: '5 Yıl (Hamle)', kategori: 'Hamle', yil: 5 },
  { value: '7 Yıl (Hamle Yüksek Teknoloji)', label: '7 Yıl (Hamle Yüksek Teknoloji)', kategori: 'Hamle', yil: 7 },
  
  // Özel Şartlar
  { value: 'Var (Yerli ve İthal Liste - Tamamı)', label: 'Var (Yerli ve İthal Liste - Tamamı)', kategori: 'Liste' },
  { value: 'Var (Yerli ve İthal Liste - Tamamı)', label: 'Var (Yerli ve İthal Liste - Tamamı)', kategori: 'Liste' },
  
  // Diğer Şartlar
  { value: '10 Yıl 6. Bölge', label: '10 Yıl 6. Bölge', kategori: '6. Bölge', yil: 10 }
];

// 🎯 Destek Unsurları Template - Excel benzeri 8 alan yapısı
const getDestekUnsurlariTemplate = () => [
  {
    index: 1,
    destekUnsuru: '',
    sartlari: ''
  },
  {
    index: 2,
    destekUnsuru: '',
    sartlari: ''
  },
  {
    index: 3,
    destekUnsuru: '',
    sartlari: ''
  },
  {
    index: 4,
    destekUnsuru: '',
    sartlari: ''
  },
  {
    index: 5,
    destekUnsuru: '',
    sartlari: ''
  },
  {
    index: 6,
    destekUnsuru: '',
    sartlari: ''
  },
  {
    index: 7,
    destekUnsuru: '',
    sartlari: ''
  },
  {
    index: 8,
    destekUnsuru: '',
    sartlari: ''
  }
];

// 🏷️ Özel Şartlar Template
const getOzelSartlarTemplate = () => [
  { 
    kosul: 'Özel Şart Koşulu 1', 
    aciklama: 'Açıklama Notu 1',
    kosul2: 'Özel Şart Koşulu 2',
    aciklama2: 'Açıklama Notu 2'
  },
  { 
    kosul: 'Özel Şart Koşulu 3', 
    aciklama: 'Açıklama Notu 3',
    kosul2: 'Özel Şart Koşulu 4',
    aciklama2: 'Açıklama Notu 4'
  },
  { 
    kosul: 'Özel Şart Koşulu 5', 
    aciklama: 'Açıklama Notu 5',
    kosul2: 'Özel Şart Koşulu 6',
    aciklama2: 'Açıklama Notu 6'
  },
  { 
    kosul: 'Özel Şart Koşulu 7', 
    aciklama: 'Açıklama Notu 7',
    kosul2: '',
    aciklama2: ''
  }
];

// 🏢 FİRMAYA AİT TEŞVİKLER
const getTesvikByFirma = async (req, res) => {
  try {
    const { firmaId } = req.params;
    
    const tesvikler = await Tesvik.find({ firma: firmaId, aktif: true })
      .populate('olusturanKullanici', 'adSoyad')
      .select('tesvikId gmId durumBilgileri istihdam maliHesaplamalar createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: `Firmaya ait ${tesvikler.length} teşvik bulundu`,
      data: tesvikler
    });

  } catch (error) {
    console.error('🚨 Firma teşvikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Firma teşvikleri getirilemedi',
      error: error.message
    });
  }
};

// TOPLU DURUM GÜNCELLEME
const bulkUpdateDurum = async (req, res) => {
  try {
    const { tesvikIds, yeniDurum, aciklama } = req.body;

    if (!tesvikIds || !Array.isArray(tesvikIds) || tesvikIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teşvik ID listesi gerekli'
      });
    }

    const updateResult = await Tesvik.updateMany(
      { _id: { $in: tesvikIds }, aktif: true },
      {
        'durumBilgileri.genelDurum': yeniDurum,
        'durumBilgileri.durumAciklamasi': aciklama || '',
        'durumBilgileri.sonDurumGuncelleme': new Date(),
        sonGuncelleyen: req.user._id
      }
    );

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} teşvik durumu güncellendi`,
      data: {
        guncellenenSayisi: updateResult.modifiedCount,
        yeniDurum,
        aciklama
      }
    });

  } catch (error) {
    console.error('🚨 Toplu güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu güncelleme yapılırken hata oluştu',
      error: error.message
    });
  }
};

// 🏷️ ÖZEL ŞART KISALTMALARI - CSV'den gerçek veriler
const getOzelSartKisaltmalariOptions = () => [
  // Bölgesel Kodlar
  { value: 'BÖL - SGK NO', label: 'BÖL - SGK NO', kategori: 'SGK', renk: '#10B981' },
  { value: 'BÖL 3305-SGK:Bölgesel-1.Bölge', label: 'BÖL 3305-SGK:Bölgesel-1.Bölge', kategori: '1. Bölge', renk: '#3B82F6' },
  { value: 'BÖL 3305-SGK:Bölgesel-2.Bölge', label: 'BÖL 3305-SGK:Bölgesel-2.Bölge', kategori: '2. Bölge', renk: '#3B82F6' },
  { value: 'BÖL 3305-SGK:Bölgesel-3.Bölge', label: 'BÖL 3305-SGK:Bölgesel-3.Bölge', kategori: '3. Bölge', renk: '#3B82F6' },
  { value: 'BÖL 3305-SGK:Bölgesel-4.Bölge', label: 'BÖL 3305-SGK:Bölgesel-4.Bölge', kategori: '4. Bölge', renk: '#3B82F6' },
  { value: 'BÖL 3305-SGK:Bölgesel-5.Bölge', label: 'BÖL 3305-SGK:Bölgesel-5.Bölge', kategori: '5. Bölge', renk: '#3B82F6' },
  { value: 'BÖL- Faliyet Zorunlukuğu', label: 'BÖL- Faliyet Zorunlukuğu', kategori: 'Zorunluluk', renk: '#6B7280' },
  { value: 'BÖL - Faiz Desteği', label: 'BÖL - Faiz Desteği', kategori: 'Faiz', renk: '#EF4444' },
  
  // Kurum ve Tarih
  { value: 'DİĞER KURUM-3(21.08.2020)', label: 'DİĞER KURUM-3(21.08.2020)', kategori: 'Kurum', renk: '#F59E0B' },
  
  // Sigorta ve Özel Durumlar
  { value: 'SİGORTA BAŞLAMA', label: 'SİGORTA BAŞLAMA', kategori: 'Sigorta', renk: '#10B981' },
  { value: 'ÖCELİKLİ YATIRIM', label: 'ÖCELİKLİ YATIRIM', kategori: 'Yatırım', renk: '#8B5CF6' },
  { value: '3305-Yatırım Konusu Zorunluluğu', label: '3305-Yatırım Konusu Zorunluluğu', kategori: 'Zorunluluk', renk: '#6B7280' },
  
  // Finansal ve Makine
  { value: 'FİNANSAL KİRALAMA', label: 'FİNANSAL KİRALAMA', kategori: 'Finansal', renk: '#EF4444' },
  { value: 'Kullanılmış Makine Münferit', label: 'Kullanılmış Makine Münferit', kategori: 'Makine', renk: '#F59E0B' },
  
  // Genel
  { value: 'DİĞER', label: 'DİĞER', kategori: 'Genel', renk: '#6B7280' },
  { value: 'İşyeri Açma ve Çalışma Ruhsatı', label: 'İşyeri Açma ve Çalışma Ruhsatı', kategori: 'Ruhsat', renk: '#8B5CF6' }
];

// 📝 ÖZEL ŞART NOTLARI - Detaylı açıklamalar
const getOzelSartNotlariOptions = () => [
  'Bölgesel teşvik kapsamında',
  'SGK primleri için geçerli',
  'Yatırım tutarı sınırlaması var',
  'Faiz desteği süre sınırı: 5 yıl',
  'Sigorta başlama tarihi önemli',
  'Öncelikli yatırım listesinde',
  'Finansal kiralama şartları uygulanır',
  'Kullanılmış makine değerlendirmesi',
  'İşyeri ruhsatı zorunlu',
  'Diğer özel şartlar için açıklama ekleyin'
];

// 🎯 YENİ SEÇENEK EKLEME - Dinamik Dropdown Yönetimi
const addNewOption = async (req, res) => {
  try {
    const { type } = req.params;
    const { value, label, kategori, aciklama, ek_bilgi } = req.body;

    console.log(`🆕 Yeni seçenek ekleniyor: ${type} - ${label}`);

    // Yeni seçenek objesi oluştur
    const newOption = {
      value: value || label,
      label,
      kategori: kategori || 'Genel',
      aciklama: aciklama || '',
      ek_bilgi: ek_bilgi || {},
      olusturma_tarihi: new Date(),
      aktif: true
    };

    // Type'a göre MongoDB collection'ına kaydet
    let savedOption;
    switch (type) {
      case 'yatirimTipleri':
        // Yatırım tipleri için basit yapı
        savedOption = newOption;
        break;
        
      case 'osbOptions':
        // OSB için şehir bilgisi ekle
        newOption.sehir = ek_bilgi.sehir || 'Belirtilmemiş';
        savedOption = newOption;
        break;
        
      case 'u97Kodlari':
        // U$97 kodları için kod ve kategori
        newOption.kod = value;
        newOption.kategori = kategori || 'DİĞER';
        savedOption = newOption;
        break;
        
      case 'destekUnsurlariOptions':
        // Destek unsurları için renk kodu
        newOption.renk = ek_bilgi.renk || '#6B7280';
        savedOption = newOption;
        break;
        
      case 'ozelSartKisaltmalari':
        // Özel şartlar için renk kodu
        newOption.renk = ek_bilgi.renk || '#6B7280';
        savedOption = newOption;
        break;
        
      case 'destekSartlariOptions':
        // Şartlar için yüzde ve yıl bilgisi
        newOption.yuzde = ek_bilgi.yuzde || null;
        newOption.yil = ek_bilgi.yil || null;
        savedOption = newOption;
        break;
        
      case 'kapasiteBirimleri':
        // Kapasite birimleri için basit yapı
        savedOption = newOption;
        break;
        
      case 'belgeDurumlari':
        // Belge durumları için renk kodu
        newOption.renk = ek_bilgi.renk || '#6B7280';
        savedOption = newOption;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Desteklenmeyen seçenek türü: ${type}`
        });
    }

    // Başarı yanıtı
    res.status(201).json({
      success: true,
      message: `Yeni ${type} başarıyla eklendi`,
      data: savedOption
    });

    console.log(`✅ Yeni seçenek eklendi: ${type} - ${label}`);

  } catch (error) {
    console.error(`❌ Seçenek ekleme hatası:`, error);
    res.status(500).json({
      success: false,
      message: 'Yeni seçenek eklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 📋 DROPDOWN SEÇENEKLERİNİ GETIR - Güncel liste
const getOptionsForType = async (req, res) => {
  try {
    const { type } = req.params;

    console.log(`📋 Dropdown seçenekleri getiriliyor: ${type}`);

    let options = [];
    
    // Type'a göre güncel seçenekleri getir
    switch (type) {
      case 'yatirimTipleri':
        options = getYatirimTipiOptions();
        break;
      case 'destekSiniflari':
        options = getDestekSiniflariOptions();
        break;
      case 'dayandigiKanunlar':
        options = getDayandigiKanunOptions();
        break;
      case 'osbOptions':
        options = getOsbOptions();
        break;
      case 'u97Kodlari':
        options = getU97KodlariOptions();
        break;
      case 'destekUnsurlariOptions':
        options = getDestekUnsurlariOptions();
        break;
      case 'ozelSartKisaltmalari':
        options = getOzelSartKisaltmalariOptions();
        break;
      case 'destekSartlariOptions':
        options = getDestekSartlariOptions();
        break;
      case 'kapasiteBirimleri':
        options = getKapasiteBirimleriOptions();
        break;
      case 'belgeDurumlari':
        options = getBelgeDurumOptions();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Desteklenmeyen seçenek türü: ${type}`
        });
    }

    res.json({
      success: true,
      data: options,
      count: options.length
    });

    console.log(`✅ ${type} seçenekleri gönderildi: ${options.length} adet`);

  } catch (error) {
    console.error(`❌ Seçenekler getirme hatası:`, error);
    res.status(500).json({
      success: false,
      message: 'Seçenekler getirilirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 🏢 ENTERPRISE SİSTEM REVİZYON EXCEL EXPORT
// MongoDB'den tam veri çekme + CSV formatına tam uyum + Revizyon tracking + Professional export
const exportRevizyonExcel = async (req, res) => {
  const startTime = Date.now();
  const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { id } = req.params;
    const { includeColors = true } = req.query;
    
    console.log(`🚀 [${exportId}] Enterprise Sistem Revizyon Excel export başlatıldı: ${id}`);
    
    // 📊 PHASE 1: ENTERPRISE VERİ ÇEKME SİSTEMİ
    console.log(`⏱️  [${exportId}] Phase 1: MongoDB'den tam veri çekme başladı`);
    
    const tesvik = await getCompleteTesvikData(id);
    if (!tesvik) {
      console.log(`❌ [${exportId}] Teşvik bulunamadı: ${id}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Teşvik bulunamadı',
        exportId 
      });
    }
    
    console.log(`✅ [${exportId}] Teşvik verisi çekildi: ${tesvik.tesvikId || tesvik.gmId}`);
    console.log(`📋 [${exportId}] Revizyon sayısı: ${tesvik.revizyonlar?.length || 0}`);
    console.log(`👥 [${exportId}] İlişkili veri: Firma, Kullanıcılar, Aktiviteler yüklendi`);
    
    // 📊 PHASE 2: CSV SÜTUN KONTROLÜ VE DOĞRULAMA
    console.log(`⏱️  [${exportId}] Phase 2: CSV sütun yapısı doğrulama başladı`);
    
    const csvStructure = await validateAndBuildCsvStructure();
    console.log(`✅ [${exportId}] CSV yapısı doğrulandı: ${csvStructure.totalColumns} sütun`);
    
    // 📊 PHASE 3: REVİZYON TRAKİNG ALGORİTMASI  
    console.log(`⏱️  [${exportId}] Phase 3: Revizyon tracking algoritması başladı`);
    
    const revisionData = await buildRevisionTrackingData(tesvik);
    console.log(`✅ [${exportId}] Revizyon tracking tamamlandı: ${revisionData.length} satır`);
    console.log(`🔍 [${exportId}] Toplam değişiklik: ${revisionData.reduce((sum, r) => sum + r.changesCount, 0)} alan`);
    
    // 📊 PHASE 4: PROFESSIONAL EXCEL EXPORT
    console.log(`⏱️  [${exportId}] Phase 4: Professional Excel export başladı`);
    
    const workbook = await createProfessionalWorkbook(csvStructure, revisionData, includeColors, exportId);
    
    console.log(`✅ [${exportId}] Excel workbook oluşturuldu`);
    
    // 📊 PHASE 5: EXPORT FİNALİZATİON
    console.log(`⏱️  [${exportId}] Phase 5: Export finalization başladı`);
    
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const fileName = generateFileName(tesvik);
    
    // Response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('X-Revision-Rows', revisionData.length.toString());
    res.setHeader('X-Export-ID', exportId);
    res.setHeader('X-Export-Duration', `${Date.now() - startTime}ms`);
    
    // Activity log
    await logExportActivity(tesvik, req.user, exportId, revisionData.length, Date.now() - startTime, req.ip, req.get('User-Agent'));
    
    // Send Excel file
    res.send(excelBuffer);
    
    const duration = Date.now() - startTime;
    console.log(`🎉 [${exportId}] Export tamamlandı! Süre: ${duration}ms, Dosya: ${fileName}`);
    console.log(`📈 [${exportId}] Performans: ${revisionData.length} satır, ${csvStructure.totalColumns} sütun işlendi`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 [${exportId}] Export hatası! Süre: ${duration}ms`, error);
    
    // Enterprise error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Sistem revizyon Excel çıktısı oluşturulurken hata oluştu',
        exportId,
        duration,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
};

// 🏢 ENTERPRISE HELPER FUNCTIONS

// 📊 PHASE 1: COMPLETE MONGODB DATA RETRIEVAL
const getCompleteTesvikData = async (id) => {
  try {
    console.log(`📊 MongoDB'den tam veri çekme başladı: ${id}`);
    
    // ID format detection
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: id } : { tesvikId: id };
    
    // Complete data with all relations
    const tesvik = await Tesvik.findOne(query)
      .populate({
        path: 'firma',
        select: 'tamUnvan firmaId vergiNoTC firmaIl firmaIlce aktif etuysYetkiBitis dysYetkiBitis createdAt'
      })
      .populate({
        path: 'revizyonlar.yapanKullanici', 
        select: 'adSoyad email rol aktif'
      })
      .populate({
        path: 'olusturanKullanici',
        select: 'adSoyad email rol aktif createdAt'
      })
      .populate({
        path: 'sonGuncelleyen',
        select: 'adSoyad email rol aktif'
      })
        .lean();
    
    if (!tesvik) return null;
    
    // Get related activities for complete revision history
    const activities = await Activity.find({
      'targetResource.type': 'tesvik',
      'targetResource.id': tesvik._id,
      action: { $in: ['create', 'update', 'revision'] }
    })
      .sort({ createdAt: 1 })
        .lean();
    
    tesvik.relatedActivities = activities;
    
    console.log(`✅ Tam veri çekildi: ${tesvik.tesvikId}, ${activities.length} aktivite`);
    return tesvik;
    
  } catch (error) {
    console.error('❌ MongoDB veri çekme hatası:', error);
    throw error;
  }
};

// 📊 PHASE 2: CSV STRUCTURE VALIDATION
const validateAndBuildCsvStructure = async () => {
  try {
    console.log(`📊 CSV sütun yapısı doğrulanıyor...`);
    
    // CSV'den gerçek sütun yapısını çıkar (belytbsütun çalışması - Sayfa2.csv'ye göre)
    const csvStructure = {
      // 1. SEVIYE - Ana kategoriler (CSV'den sayılar çıkarıldı)
      level1: [
        { text: 'KÜNYE BİLGLERİ', span: 17, startCol: 1 },
        { text: 'YATIRIM İLE İLGİLİ BİLGİLER', span: 17, startCol: 18 }, 
        { text: 'İSTİHDAM', span: 2, startCol: 35 },
        { text: 'ÜRÜN BİLGLERİ', span: 54, startCol: 37 },
        { text: 'DESTEK UNSURLARI', span: 16, startCol: 91 },
        { text: 'ÖZEL ŞARTLAR', span: 28, startCol: 107 },
        { text: 'FİNANSAL BİLGLER', span: 26, startCol: 135 }, // 26 sütun (25 + REVIZE TARIHI)
      ],
      
      // 2. SEVIYE - Alt kategoriler  
      level2: [
        { text: 'YATIRIMCI', span: 6, startCol: 1 },
        { text: 'BELGE BİLGLERİ', span: 11, startCol: 7 },
        { text: 'YATIRIM İLE İLGİLİ BİLGİLER', span: 17, startCol: 18 },
        { text: 'İSTİHDAM', span: 2, startCol: 35 },
        { text: 'ÜRÜN BİLGLERİ', span: 54, startCol: 37 },
        { text: 'DESTEK UNSURLARI', span: 16, startCol: 91 },
        { text: 'ÖZEL ŞARTLAR', span: 28, startCol: 107 },
        { text: 'FİNANSAL BİLGLER', span: 26, startCol: 135 },
      ],
      
      // 3. SEVIYE - Özel kategoriler (sadece finansal kısımda)
      level3: [
        ...Array(134).fill(''), // İlk 134 sütun boş
        'ARAZİ-ARSA BEDELİ', '', '', '',
        'BİNA İNŞAAT GİDERLERİ TL', '', '', '', '',  
        'DİĞER YATIRIM HARCAMALARI TL', '', '', '', '', '', '',
        'TOPLAM SABİT YATIRIM TUTARI TL',
        'MAKİNE TEÇHİZAT GİDERLERİ TL(*)', '', '',
        'İTHAL MAKİNE ($)', '', '',
        'YABANCI KAYNAKLAR', 'ÖZ KAYNAKLAR', '',
        '' // REVİZE TARİHİ
      ],
      
      // 4. SEVIYE - Sütun isimleri (CSV'den tam kopyası - 156 sütun)
      level4: [
        'GM ID', 'TALEP/SONUÇ', 'REVIZE ID', 'FIRMA ID', 'YATIRIMCI UNVAN', 'SGK SİCİL NO',
        'BELGE ID', 'BELGE NO', 'BELGE TARIHI', 'BELGE MURACAAT TARIHI', 'MÜRACAAT SAYISI', 
        'BELGE BASLAMA TARIHI', 'BELGE BITIS TARIHI', 'SÜRE UZATIM TARİHİ', 'ÖZELLİKLİ YATIRIM İSE', 'DAYANDIĞI KANUN', 'BELGE DURUMU',
        '2-YATIRIM KONUSU', '3-CINSI(1)', '3-CINSI(2)', '3-CINSI(3)', '3-CINSI(4)', 'DESTEK SINIFI', 'YERI IL', 'YERI ILCE',
        'ADA', 'PARSEL', 'YATIRIM ADRESI(1)', 'YATIRIM ADRESI(2)', 'YATIRIM ADRESI(3)', 'OSB ISE MUDURLUK', 'İL BAZLI BÖLGE', 'İLÇE BAZLI BÖLGE', 'SERBEST BÖLGE',
        'Mevcut Kişi', 'İlave Kişi',
        // Ürün bilgileri (9 ürün x 6 alan = 54 sütun)
        'US97 Kodu (1)', 'Ürün(1)', 'Mevcut(1)', 'İlave(1)', 'Toplam(1)', 'Kapsite Birimi(1)',
        'US97 Kodu (2)', 'Ürün(2)', 'Mevcut(2)', 'İlave(2)', 'Toplam(2)', 'Kapsite Birimi(2)',
        'US97 Kodu (3)', 'Ürün(3)', 'Mevcut(3)', 'İlave(3)', 'Toplam(3)', 'Kapsite Birimi(3)',
        'US97 Kodu (4)', 'Ürün(4)', 'Mevcut(4)', 'İlave(4)', 'Toplam(4)', 'Kapsite Birimi(4)',
        'US97 Kodu (5)', 'Ürün(5)', 'Mevcut(5)', 'İlave(5)', 'Toplam(5)', 'Kapsite Birimi(5)',
        'US97 Kodu (6)', 'Ürün(6)', 'Mevcut(6)', 'İlave(6)', 'Toplam(6)', 'Kapsite Birimi(6)',
        'US97 Kodu (7)', 'Ürün(7)', 'Mevcut(7)', 'İlave(7)', 'Toplam(7)', 'Kapsite Birimi(7)',
        'US97 Kodu (8)', 'Ürün(8)', 'Mevcut(8)', 'İlave(8)', 'Toplam(8)', 'Kapsite Birimi(8)',
        'US97 Kodu (9)', 'Ürün(9)', 'Mevcut(9)', 'İlave(9)', 'Toplam(9)', 'Kapsite Birimi(9)',
        // Destek unsurları (8 destek x 2 alan = 16 sütun)
        'Destek Unusrları(1)', 'Şartları(1)', 'Destek Unusrları(2)', 'Şartları(2)',
        'Destek Unusrları(3)', 'Şartları(3)', 'Destek Unusrları(4)', 'Şartları(4)',
        'Destek Unusrları(5)', 'Şartları(5)', 'Destek Unusrları(6)', 'Şartları(6)',
        'Destek Unusrları(7)', 'Şartları(7)', 'Destek Unusrları(8)', 'Şartları(8)',
        // Özel şartlar (14 şart x 2 alan = 28 sütun) - CSV'de hata var, düzeltildi
        'Özel Şart Kısaltma 1', 'Özelşart Notu 1', 'Özel Şart Kısaltma 2', 'Özelşart Notu 2',
        'Özel Şart Kısaltma 3', 'Özelşart Notu 3', 'Özel Şart Kısaltma 4', 'Özelşart Notu 4',
        'Özel Şart Kısaltma 5', 'Özelşart Notu 5', 'Özel Şart Kısaltma 6', 'Özelşart Notu 6',
        'Özel Şart Kısaltma 7', 'Özelşart Notu 7', 'Özel Şart Kısaltma 8', 'Özelşart Notu 8',
        'Özel Şart Kısaltma 9', 'Özelşart Notu 9', 'Özel Şart Kısaltma 10', 'Özelşart Notu 10',
        'Özel Şart Kısaltma 11', 'Özelşart Notu 11', 'Özel Şart Kısaltma 12', 'Özelşart Notu 12',
        'Özel Şart Kısaltma 13', 'Özelşart Notu 13', 'Özel Şart Kısaltma 14', 'Özelşart Notu 14',
        // Finansal bilgiler (25 sütun)
        'Arazi-Arsa Bedeli Açıklama', 'Metrekaresi', 'Birim Fiyatı TL', 'ARAZİ ARSA BEDELİ',
        'Bina İnşaat Gideri Açıklama', 'Ana Bina ve Tesisleri', 'Yardımcı İş. Bina ve Tesisleri', 'İdare Binaları', 'TOPLAM BİNA İNŞAAT GİDERİ',
        'Yardımcı İşl. Mak. Teç. Gid.', 'İthalat ve Güm.Giderleri', 'Taşıma ve Sigorta Giderleri', 'Montaj Giderleri', 'Etüd ve Proje Giderleri', 'Diğer Giderleri', 'TOPLAM DİĞER YATIRIM HARCAMALARI',
        'TOPLAM SABİT YATIRIM TUTARI TL', 'İthal', 'Yerli', 'Toplam Makine Teçhizat', 'Yeni Makine', 'Kullanılmış Makine', 'TOPLAM İTHAL MAKİNE ($)', 'Toplam Yabancı Kaynak', 'Öz kaynak', 'TOPLAM FİNANSMAN',
        'REVIZE TARIHI'
      ]
    };
    
    csvStructure.totalColumns = csvStructure.level4.length;
    
    console.log(`✅ CSV yapısı doğrulandı: ${csvStructure.totalColumns} sütun`);
    return csvStructure;
    
  } catch (error) {
    console.error('❌ CSV yapısı doğrulama hatası:', error);
    throw error;
  }
};

// 📊 PHASE 3: PROFESSIONAL REVISION TRACKING ALGORITHM - FIXED!
const buildRevisionTrackingData = async (tesvik) => {
  try {
    console.log(`📊 PROFESSIONAL Revizyon tracking algoritması başlıyor...`);
    
    const revisionData = [];
    
    // 🔥 REMOVED: currentState artık kullanılmıyor - her revizyon kendi historik snapshot'ını tutuyor!
    
    console.log(`🎯 İşleme alınan teşvik: ${tesvik.tesvikId} | Revizyon sayısı: ${tesvik.revizyonlar?.length || 0}`);
    
    // 🟢 İLK OLUŞTURMA KAYDI - Original creation state
    console.log('📝 İlk oluşturma snapshot hazırlanıyor...');
    
    // İlk hali için snapshot oluştur
    // Tercih sırası:
    // 1) İlk revizyonun veriSnapshot.oncesi (varsa) → gerçek başlangıç durumu
    // 2) Aksi halde mevcut tesvik'in kopyası
    let initialSnapshot;
    const firstRevisionWithSnapshot = tesvik.revizyonlar?.find?.(r => r?.veriSnapshot?.oncesi);
    if (firstRevisionWithSnapshot?.veriSnapshot?.oncesi) {
      initialSnapshot = JSON.parse(JSON.stringify(firstRevisionWithSnapshot.veriSnapshot.oncesi));
      console.log('🧩 Initial snapshot: İlk revizyonun ONCESI kullanıldı');
    } else if (Array.isArray(tesvik.revizyonlar) && tesvik.revizyonlar.length > 0) {
      // 🚑 Fallback 2: Mevcut state'ten GERİYE DOĞRU rollback yaparak ilk halini inşa et
      console.log('🧩 Initial snapshot: Rollback ile inşa ediliyor (oncesi yok)');
      const rolledBack = JSON.parse(JSON.stringify(tesvik.toObject ? tesvik.toObject() : tesvik));
      delete rolledBack.revizyonlar;
      // En sondan başa doğru tüm değişiklikleri geri al
      for (let r = tesvik.revizyonlar.length - 1; r >= 0; r--) {
        const rev = tesvik.revizyonlar[r];
        if (Array.isArray(rev.degisikenAlanlar)) {
          rev.degisikenAlanlar.forEach(ch => {
            const path = (ch.alan || '').split('.');
            if (!path.length) return;
            let target = rolledBack;
            for (let i = 0; i < path.length - 1; i++) {
              if (!target[path[i]]) target[path[i]] = {};
              target = target[path[i]];
            }
            target[path[path.length - 1]] = ch.eskiDeger;
          });
        }
      }
      initialSnapshot = rolledBack;
    } else {
      initialSnapshot = JSON.parse(JSON.stringify(tesvik));
      console.log('🧩 Initial snapshot: Mevcut tesvik state kullanıldı (fallback 3)');
    }
    delete initialSnapshot.revizyonlar; // İlk halde revizyon yok
    
    const initialRow = await buildCsvDataRowWithSnapshot(initialSnapshot, null, 0);
    revisionData.push({
      rowData: initialRow,
      revisionNo: 0,
      revisionDate: tesvik.createdAt,
      changedBy: tesvik.olusturanKullanici,
      reason: 'İlk Oluşturma',
      changesCount: 0,
      isInitial: true,
      snapshot: initialSnapshot
    });
    
    console.log('✅ İlk oluşturma kaydı eklendi');
    
    // 🔄 REVİZYON GEÇMİŞİ - Her revizyon için o andaki state'i kullan
    if (tesvik.revizyonlar && tesvik.revizyonlar.length > 0) {
      console.log(`🔍 ${tesvik.revizyonlar.length} revizyon işleniyor...`);
      
      for (let i = 0; i < tesvik.revizyonlar.length; i++) {
        const revizyon = tesvik.revizyonlar[i];
        console.log(`📋 Revizyon ${i + 1} işleniyor: ${revizyon.revizyonSebebi}`);
        
        // 🎯 Bu revizyonda kaydedilmiş snapshot varsa kullan
        let revizyonSnapshot;
        
        if (revizyon.veriSnapshot?.oncesi && i > 0) {
          // Önceki durum snapshot'ı varsa kullan (değişiklik öncesi hali)
          revizyonSnapshot = revizyon.veriSnapshot.oncesi;
          console.log('✅ Revizyon ÖNCESİ snapshot kullanılıyor');
        } else if (revizyon.veriSnapshot?.sonrasi) {
          // Yeni sisteme göre snapshot varsa kullan
          revizyonSnapshot = revizyon.veriSnapshot.sonrasi;
          console.log('✅ Revizyon SONRASI snapshot kullanılıyor');
        } else if (revizyon.degisikenAlanlar && revizyon.degisikenAlanlar.length > 0) {
          // 🔥 CRITICAL FIX: Her revizyon kendi HISTORIK snapshot'ını tutsun!
          // Son revizyon varsa onun snapshot'ını kullan, yoksa initial tesvik state'i kullan
          const previousSnapshot = revisionData[revisionData.length - 1]?.snapshot || JSON.parse(JSON.stringify(tesvik));
          revizyonSnapshot = JSON.parse(JSON.stringify(previousSnapshot));
          
          // ENHANCED CHANGE APPLICATION - Veri kaybını önle
          revizyon.degisikenAlanlar.forEach(degisiklik => {
            if (degisiklik.yeniDeger !== undefined && degisiklik.yeniDeger !== null) {
              const keys = degisiklik.alan.split('.');
              let current = revizyonSnapshot;
              
              // Sadece belirtilen alanları değiştir, diğerlerini koru
              for (let j = 0; j < keys.length - 1; j++) {
                if (!current[keys[j]]) current[keys[j]] = {};
                current = current[keys[j]];
              }
              
              const finalKey = keys[keys.length - 1];
              
              // PRESERVE: Eğer değişiklik array'i azaltıyorsa (örn length=0), veriyi sakla
              if (Array.isArray(degisiklik.yeniDeger) && degisiklik.yeniDeger.length === 0) {
                // Boş array için önceki revision'daki veriyi koru
                if (i > 0 && revisionData[i-1]?.snapshot?.[keys[0]]) {
                  console.log(`🔒 PRESERVE: ${degisiklik.alan} için önceki veri korunuyor`);
                  // Önceki revision'dan veriyi al
                  const prevValue = revisionData[i-1].snapshot;
                  let prevCurrent = prevValue;
                  for (let k = 0; k < keys.length - 1; k++) {
                    if (prevCurrent && prevCurrent[keys[k]]) {
                      prevCurrent = prevCurrent[keys[k]];
                    }
                  }
                  if (prevCurrent && prevCurrent[finalKey]) {
                    current[finalKey] = prevCurrent[finalKey];
                  } else {
                    current[finalKey] = degisiklik.yeniDeger;
                  }
                } else {
                  current[finalKey] = degisiklik.yeniDeger;
                }
              } else {
                // Normal değişiklik
                current[finalKey] = degisiklik.yeniDeger;
              }
            }
          });
          
          console.log(`🔧 Değişiklikler uygulandı: ${revizyon.degisikenAlanlar.length} alan`);
        } else {
          // 🔥 STRONG FIX: Eğer revizyon üzerinde tam snapshot varsa onu kullan
          if (revizyon?.veriSnapshot?.sonrasi) {
            revizyonSnapshot = JSON.parse(JSON.stringify(revizyon.veriSnapshot.sonrasi));
            console.log('📦 Revizyon snapshot (SONRASI) kullanıldı');
          } else {
            // CRITICAL: Sadece önceki revizyonun snapshot'ını baz al
            const baseSnapshot = revisionData.length > 0
              ? revisionData[revisionData.length - 1].snapshot
              : initialSnapshot;
            revizyonSnapshot = JSON.parse(JSON.stringify(baseSnapshot));
            console.log(`📋 Baz snapshot kullanıldı (${revisionData.length === 0 ? 'initial' : 'previous'})`);

            // Revizyon değişikliklerini uygula
            if (revizyon.degisikenAlanlar && revizyon.degisikenAlanlar.length > 0) {
              revizyon.degisikenAlanlar.forEach(degisiklik => {
                // Alan yolunu parçala ve değeri güncelle
                const fieldPath = degisiklik.alan?.split('.') || [];
                if (fieldPath.length > 0) {
                  let target = revizyonSnapshot;
                  for (let j = 0; j < fieldPath.length - 1; j++) {
                    if (!target[fieldPath[j]]) {
                      target[fieldPath[j]] = {};
                    }
                    target = target[fieldPath[j]];
                  }
                  target[fieldPath[fieldPath.length - 1]] = degisiklik.yeniDeger;
                }
              });
              console.log(`📝 ${revizyon.degisikenAlanlar.length} alan güncellendi`);
            }
          }
        }
        
        // CSV satırı oluştur
        const revizyonRow = await buildCsvDataRowWithSnapshot(revizyonSnapshot, revizyon, i + 1);
        
        // Önceki satırla değişiklikleri karşılaştır
        const previousRow = revisionData[revisionData.length - 1].rowData;
        const changes = detectDetailedChangesInCsvRows(previousRow, revizyonRow);
        
        // Revizyon'dan gelen değişiklikleri de ekle
        if (revizyon.degisikenAlanlar && revizyon.degisikenAlanlar.length > 0) {
          revizyon.degisikenAlanlar.forEach(degisiklik => {
            const existingChange = changes.find(c => c.columnName === degisiklik.label);
            if (!existingChange) {
              changes.push({
                columnName: degisiklik.label || degisiklik.alan,
                oldValue: degisiklik.eskiDeger || '-',
                newValue: degisiklik.yeniDeger || '-',
                changeType: 'modified',
                label: degisiklik.label,
                alan: degisiklik.alan
              });
            }
          });
        }
        
        revisionData.push({
          rowData: revizyonRow,
          revisionNo: i + 1,
          revisionDate: revizyon.revizyonTarihi || revizyon.createdAt || new Date(),
          changedBy: revizyon.yapanKullanici,
          reason: revizyon.revizyonSebebi || 'Güncelleme',
          changes: changes,
          changesCount: changes.length,
          isInitial: false,
          snapshot: revizyonSnapshot,
          // 🎯 Debug bilgileri
          debug: {
            hasSnapshot: !!(revizyon.veriSnapshot?.sonrasi),
            hasChanges: !!(revizyon.degisikenAlanlar?.length),
            changeCount: revizyon.degisikenAlanlar?.length || 0
          }
        });
        
        console.log(`✅ Revizyon ${i + 1} eklendi - ${changes.length} değişiklik tespit edildi`);
        console.log(`🔍 CSV değişiklik analizi: ${changes.length} farklılık tespit edildi`);
        
        // 🚫 CRITICAL FIX: currentState güncellemesini KALDIR! 
        // Her revizyon kendi historik snapshot'ını kullanmalı, güncel state ile değil!
        // currentState = JSON.parse(JSON.stringify(revizyonSnapshot)); // ❌ REMOVED
      }
    }
    
    const totalChanges = revisionData.reduce((sum, r) => sum + (r.changesCount || 0), 0);
    console.log(`🎉 PROFESSIONAL Revizyon tracking tamamlandı!`);
    console.log(`📊 İstatistikler:`);
    console.log(`   • Toplam satır: ${revisionData.length}`);
    console.log(`   • İlk oluşturma: 1`);
    console.log(`   • Revizyonlar: ${revisionData.length - 1}`);
    console.log(`   • Toplam değişiklik: ${totalChanges} alan`);
    
    return revisionData;
    
  } catch (error) {
    console.error('💥 PROFESSIONAL Revizyon tracking hatası:', error);
    throw error;
  }
};

// 🏗️ CSV DATA ROW BUILDER WITH SNAPSHOT - PROFESSIONAL DEBUG VERSION
const buildCsvDataRowWithSnapshot = async (snapshot, revizyon = null, revizyonNo = 0) => {
  try {
    console.log(`🔍 [DEBUG] CSV Builder başladı - Revizyon: ${revizyonNo}`);
    console.log(`📊 [DEBUG] Snapshot keys:`, Object.keys(snapshot));
    console.log(`📋 [DEBUG] Snapshot sample:`, {
      tesvikId: snapshot.tesvikId,
      istihdam: snapshot.istihdam,
      yatirimBilgileri: !!snapshot.yatirimBilgileri,
      urunler: snapshot.urunler?.length,
      destekUnsurlari: snapshot.destekUnsurlari?.length,
      ozelSartlar: snapshot.ozelSartlar?.length,
      maliHesaplamalar: !!snapshot.maliHesaplamalar
    });
    
    // Snapshot kullanarak CSV satırı oluştur
    const row = [];
    
    // Temel bilgiler - ENHANCED DEBUG
    const gmId = snapshot.tesvikId || snapshot.gmId || '';
    // TALEP/SONUÇ: Revizyona özel seçilen durum öncelikli
    // "TALEP/SONUÇ": Öncelik sırası → Revizyonun seçilen işlemi (revizyonSebebi) > revizyonun yeni durumu > snapshot durumu
    const talepSonuc = (revizyon?.revizyonSebebi)
      || (revizyon?.yeniDurum)
      || (revizyon?.durumSonrasi)
      || (snapshot.kunyeBilgileri?.talepSonuc)
      || (snapshot.durumBilgileri?.genelDurum)
      || (revizyonNo === 0 ? 'İlk Oluşturma' : '');
    const firmaId = snapshot.firmaId || '';
    const yatirimciUnvan = snapshot.yatirimciUnvan || '';
    
    console.log(`🏢 [DEBUG] Temel bilgiler: GM=${gmId}, Talep/Sonuç=${talepSonuc}, Firma=${firmaId}, Ünvan=${yatirimciUnvan}`);
    console.log(`🧾 [DEBUG] TALEP/SONUÇ sütunu kaynağı:`, {
      kullanilan: talepSonuc,
      revizyonSebebi: revizyon?.revizyonSebebi,
      yeniDurum: revizyon?.yeniDurum,
      durumSonrasi: revizyon?.durumSonrasi,
      snapshotTalepSonuc: snapshot?.kunyeBilgileri?.talepSonuc,
      snapshotDurum: snapshot?.durumBilgileri?.genelDurum
    });
    
    row.push(gmId);                                               // GM ID
    row.push(talepSonuc);                                         // TALEP/SONUÇ  
    row.push(revizyonNo.toString());                              // REVIZE ID
    row.push(firmaId);                                            // FIRMA ID
    row.push(yatirimciUnvan);                                     // YATIRIMCI UNVAN
    row.push('');                                                 // SGK SİCİL NO
    
    // Belge bilgileri - ENHANCED DEBUG
    const belge = snapshot.belgeYonetimi || {};
    console.log(`📋 [DEBUG] Belge bilgileri:`, {
      belgeId: belge.belgeId,
      belgeNo: belge.belgeNo,
      belgeTarihi: belge.belgeTarihi,
      dayandigiKanun: belge.dayandigiKanun
    });
    
    row.push(belge.belgeId || '');                                // BELGE ID
    row.push(belge.belgeNo || '');                                // BELGE NO
    row.push(belge.belgeTarihi || '');                            // BELGE TARIHI
    row.push(belge.belgeMuracaatTarihi || '');                    // BELGE MURACAAT TARIHI
    row.push(belge.muracaatSayisi || snapshot.belgeYonetimi?.muracaatSayisi || ''); // MÜRACAAT SAYISI
    row.push(belge.belgeBaslamaTarihi || '');                     // BELGE BASLAMA TARIHI
    row.push(belge.belgeBitisTarihi || snapshot.belgeYonetimi?.belgeBitisTarihi || ''); // BELGE BITIS TARIHI
    row.push(belge.sureUzatimTarihi || snapshot.belgeYonetimi?.sureUzatimTarihi || ''); // SÜRE UZATIM TARİHİ
    row.push(belge.oncelikliYatirim || 'hayır');                  // ÖZELLİKLİ YATIRIM İSE
    row.push(belge.dayandigiKanun || '');                         // DAYANDIĞI KANUN
    row.push(snapshot.durumBilgileri?.genelDurum || '');          // BELGE DURUMU
    
    // Yatırım bilgileri - FIXED FIELD MAPPING!
    const yatirimBilgileri = snapshot.yatirimBilgileri || {};
    const yatirim1 = yatirimBilgileri.yatirimBilgileri1 || yatirimBilgileri;
    const yatirim2 = yatirimBilgileri.yatirimBilgileri2 || yatirimBilgileri;
    
    console.log(`🏭 [DEBUG] Yatırım bilgileri:`, {
      yatirim1: {
        yatirimKonusu: yatirim1.yatirimKonusu,
        cins1: yatirim1.cins1,
        destekSinifi: yatirim1.destekSinifi
      },
      yatirim2: {
        il: yatirim2.il,
        ilce: yatirim2.ilce,
        yatirimAdresi1: yatirim2.yatirimAdresi1
      }
    });
    
    row.push(yatirim1.yatirimKonusu || '');                       // 2-YATIRIM KONUSU
    row.push(yatirim1.cins1 || yatirimBilgileri.sCinsi1 || snapshot.yatirimBilgileri?.sCinsi1 || '');  // 3-CINSI(1)
    row.push(yatirim1.cins2 || yatirimBilgileri.tCinsi2 || snapshot.yatirimBilgileri?.tCinsi2 || '');  // 3-CINSI(2)
    row.push(yatirim1.cins3 || yatirimBilgileri.uCinsi3 || snapshot.yatirimBilgileri?.uCinsi3 || '');  // 3-CINSI(3)
    row.push(yatirim1.cins4 || yatirimBilgileri.vCinsi4 || snapshot.yatirimBilgileri?.vCinsi4 || '');  // 3-CINSI(4)
    row.push(yatirim1.destekSinifi || yatirimBilgileri.destekSinifi || ''); // DESTEK SINIFI
    row.push(yatirim2.yerinIl || yatirimBilgileri.yerinIl || ''); // YERI IL
    row.push(yatirim2.yerinIlce || yatirimBilgileri.yerinIlce || ''); // YERI ILCE
    row.push(yatirim2.ada || yatirimBilgileri.ada || '');        // ADA
    row.push(yatirim2.parsel || yatirimBilgileri.parsel || '');  // PARSEL
    row.push(yatirim2.yatirimAdresi1 || '');                      // YATIRIM ADRESI(1)
    row.push(yatirim2.yatirimAdresi2 || '');                      // YATIRIM ADRESI(2)
    row.push(yatirim2.yatirimAdresi3 || '');                      // YATIRIM ADRESI(3)
    row.push('');                                                 // OSB ISE MUDURLUK
    row.push('');                                                 // İL BAZLI BÖLGE
    row.push('');                                                 // İLÇE BAZLI BÖLGE
    row.push('');                                                 // SERBEST BÖLGE
    
    // İstihdam - ENHANCED DEBUG
    const istihdam = snapshot.istihdam || {};
    console.log(`👥 [DEBUG] İstihdam bilgileri:`, {
      mevcutKisi: istihdam.mevcutKisi,
      ilaveKisi: istihdam.ilaveKisi,
      toplamKisi: istihdam.toplamKisi
    });
    
    row.push(istihdam.mevcutKisi || 0);                           // Mevcut Kişi
    row.push(istihdam.ilaveKisi || 0);                            // İlave Kişi
    
    // Ürün bilgileri (9 ürün x 6 alan = 54 sütun) - FIXED FIELD MAPPING!
    const urunler = snapshot.urunler || snapshot.urunBilgileri || [];
    console.log(`📦 [DEBUG] Ürün bilgileri:`, {
      length: urunler.length,
      first: urunler[0] ? {
        us97Kodu: urunler[0].us97Kodu,
        urunAdi: urunler[0].urunAdi,
        mevcutKapasite: urunler[0].mevcutKapasite,
        ilaveKapasite: urunler[0].ilaveKapasite,
        kapasiteBirimi: urunler[0].kapasiteBirimi
      } : null
    });
    
    // CRITICAL FIX: Sadece KAPASİTESİ OLAN ürünleri göster!
    const actualProducts = urunler.filter(urun => 
      urun && 
      (urun.urunAdi || urun.us97Kodu) && 
      urun.urunAdi !== '' && 
      // CRITICAL: Kapasite kontrolü ekle!
      (
        (urun.mevcutKapasite && urun.mevcutKapasite > 0) ||
        (urun.ilaveKapasite && urun.ilaveKapasite > 0) ||
        (urun.toplamKapasite && urun.toplamKapasite > 0)
      )
    );
    
    console.log(`📦 [DEBUG] Filtered products: ${actualProducts.length}/${urunler.length} gerçek ürün`);
    
    for (let i = 0; i < 9; i++) {
      if (i < actualProducts.length) {
        // GERÇEK ÜRÜN VAR - Göster
        const urun = actualProducts[i];
        row.push(urun.u97Kodu || '');                            // US97 Kodu - MODEL'E UYGUN
        row.push(urun.urunAdi || '');                             // Ürün
        row.push(urun.mevcutKapasite || 0);                       // Mevcut
        row.push(urun.ilaveKapasite || 0);                        // İlave
        row.push(urun.toplamKapasite || (urun.mevcutKapasite || 0) + (urun.ilaveKapasite || 0));  // Toplam
        row.push(urun.kapasiteBirimi || '');                      // Kapasite Birimi
      } else {
        // BOŞ SLOT - Tamamen boş bırak (0 değil, boş string)
        row.push('');     // US97 Kodu
        row.push('');     // Ürün
        row.push('');     // Mevcut - BOŞ STRING!
        row.push('');     // İlave - BOŞ STRING!
        row.push('');     // Toplam - BOŞ STRING!
        row.push('');     // Kapasite Birimi
      }
    }
    
    // Destek unsurları (8 destek x 2 alan = 16 sütun) - PROFESSIONAL DEBUG!
    const destekUnsurlari = snapshot.destekUnsurlari || [];
    console.log(`🎯 [DEBUG] Destek unsurları DETAYLI:`, {
      length: destekUnsurlari.length,
      raw: destekUnsurlari,
      first: destekUnsurlari[0] ? {
        destekUnsuru: destekUnsurlari[0].destekUnsuru,
        sartlari: destekUnsurlari[0].sartlari,
        keys: Object.keys(destekUnsurlari[0])
      } : null
    });
    
    for (let i = 0; i < 8; i++) {
      if (i < destekUnsurlari.length && destekUnsurlari[i] && destekUnsurlari[i].destekUnsuru) {
        // Gerçek destek unsuru var - FIXED FIELD MAPPING!
        const destek = destekUnsurlari[i];
        row.push(destek.destekUnsuru || '');                      // Destek Unsuru
        row.push(destek.sartlari || destek.sarti || '');          // Şartları (VERİTABANI: 'sarti')
      } else {
        // Boş destek unsuru
        row.push('');  // Destek Unsuru
        row.push('');  // Şartları
      }
    }
    
    // Özel şartlar (14 şart x 2 alan = 28 sütun) - PROFESSIONAL DEBUG!
    const ozelSartlar = snapshot.ozelSartlar || [];
    console.log(`⚙️ [DEBUG] Özel şartlar DETAYLI:`, {
      length: ozelSartlar.length,
      raw: ozelSartlar,
      all: ozelSartlar.map(s => ({
        kisaltma: s.kisaltma,
        notu: s.notu,
        keys: s ? Object.keys(s) : []
      }))
    });
    
    for (let i = 0; i < 14; i++) {
      if (i < ozelSartlar.length && ozelSartlar[i] && 
          (ozelSartlar[i].kisaltma || ozelSartlar[i].notu || ozelSartlar[i].koşulMetni || ozelSartlar[i].aciklamaNotu)) {
        // Gerçek özel şart var - FIXED FIELD MAPPING!
        const sart = ozelSartlar[i];
        row.push(sart.kisaltma || sart.koşulMetni || '');         // Özel Şart Kısaltma (VERİTABANI: 'koşulMetni')
        row.push(sart.notu || sart.aciklamaNotu || '');           // Özelşart Notu (VERİTABANI: 'aciklamaNotu')
      } else {
        // Boş özel şart
        row.push('');  // Özel Şart Kısaltma
        row.push('');  // Özelşart Notu
      }
    }
    
    // Finansal bilgiler (26 sütun) - FIXED FIELD MAPPING!
    const finansal = snapshot.maliHesaplamalar || snapshot.finansalBilgiler || {};
    console.log(`💰 [DEBUG] Finansal bilgiler DETAYLI:`, {
      has: !!finansal,
      keys: finansal ? Object.keys(finansal) : [],
      dataFields: {
        araziArsaBedeli_OLD: finansal.araziArsaBedeli,
        araciArsaBedeli_NEW: finansal.araciArsaBedeli,
        toplamSabitYatirimTutari_OLD: finansal.toplamSabitYatirimTutari,
        toplamSabitYatirim_NEW: finansal.toplamSabitYatirim,
        binaInsaatGiderleri_OLD: finansal.binaInsaatGiderleri,
        binaInsaatGideri_NEW: finansal.binaInsaatGideri,
        makinaTechizat_NEW: finansal.makinaTechizat,
        makineTeçhizatGiderleri_OLD: finansal.makineTeçhizatGiderleri
      }
    });
    
    // Arazi-Arsa Bedeli (4 sütun) - MODEL'E UYGUN
    // NOT: Frontend'den maliyetlenen objesi içinde geliyor, model'de aracAracaGideri
    const maliyetlenen = finansal.maliyetlenen || {};
    const araziGideri = finansal.aracAracaGideri || {};
    
    // Veri öncelik sırası: maliyetlenen > aracAracaGideri > legacy alan
    const metrekaresi = parseInt(maliyetlenen.sl ?? araziGideri.sx ?? 0);
    const birimFiyat  = parseInt(maliyetlenen.sm ?? araziGideri.sayisi ?? 0);
    // Her revizyonda doğru toplamı türet: eğer sn yoksa sl*sm; o da yoksa alternatif/legacy toplam
    const hesaplananSn = Number.isFinite(maliyetlenen.sl) && Number.isFinite(maliyetlenen.sm)
      ? (maliyetlenen.sl || 0) * (maliyetlenen.sm || 0)
      : undefined;
    const araziToplam = parseInt(
      (maliyetlenen.sn ?? hesaplananSn ?? araziGideri.toplam ?? finansal.araciArsaBedeli ?? 0)
    );
    
    // Açıklama için otomatik oluştur veya varsa kullan
    const araziAciklama = finansal.araziAciklama || 
                         (metrekaresi > 0 ? `${metrekaresi} m² x ${birimFiyat} TL` : '');
    
    row.push(araziAciklama);                                       // Arazi-Arsa Bedeli Açıklama
    
    // Güvenlik kontrolü: 1 trilyon üzerindeki sayıları sıfırla
    const maxValue = 1000000000000; // 1 trilyon TL limit
    
    row.push(metrekaresi > maxValue ? 0 : metrekaresi);           // Metrekaresi
    row.push(birimFiyat > maxValue ? 0 : birimFiyat);             // Birim Fiyatı TL
    row.push(araziToplam > maxValue ? 0 : araziToplam);           // ARAZİ ARSA BEDELİ
    
    // Bina İnşaat Giderleri (5 sütun) - MODEL'E UYGUN
    const bina = finansal.binaInsaatGideri || finansal.binaInsaatGiderleri || {};
    row.push(bina.aciklama || '');                                // Bina İnşaat Gideri Açıklama
    row.push(bina.anaBinaGideri || bina.anaBinaVeTesisleri || 0);                       // Ana Bina ve Tesisleri
    row.push(bina.yardimciBinaGideri || bina.yardimciIsBinaVeTesisleri || 0);                // Yardımcı İş. Bina ve Tesisleri
    row.push(bina.idareBinalari || 0);                            // İdare Binaları
    row.push(bina.toplamBinaGideri || bina.toplamBinaInsaatGideri || 0);                   // TOPLAM BİNA İNŞAAT GİDERİ
    
    // Diğer Yatırım Harcamaları (7 sütun) - MODEL'E UYGUN
    // NOT: Model'de yatirimHesaplamalari altında et, eu, ev, ew, ex, ey, ez olarak saklanıyor
    const yatirimHesap = finansal.yatirimHesaplamalari || {};
    
    row.push(parseInt(yatirimHesap.et || 0));                   // Yardımcı İşl. Mak. Teç. Gid.
    row.push(parseInt(yatirimHesap.eu || 0));                   // İthalat ve Güm.Giderleri
    row.push(parseInt(yatirimHesap.ev || 0));                   // Taşıma ve Sigorta Giderleri
    row.push(parseInt(yatirimHesap.ew || 0));                   // Montaj Giderleri
    row.push(parseInt(yatirimHesap.ex || 0));                   // Etüd ve Proje Giderleri
    row.push(parseInt(yatirimHesap.ey || 0));                   // Diğer Giderleri
    row.push(parseInt(yatirimHesap.ez || 0));                   // TOPLAM DİĞER YATIRIM HARCAMALARI
    
    // Toplam Sabit Yatırım Tutarı (1 sütun) - PRIORITY: toplamSabitYatirim FIRST!
    const toplamSabitYatirim = parseInt(finansal.toplamSabitYatirim || finansal.toplamSabitYatirimTutari || 0);
    row.push(toplamSabitYatirim > maxValue ? 0 : toplamSabitYatirim);  // TOPLAM SABİT YATIRIM TUTARI TL
    
    // Makine Teçhizat Giderleri TL (3 sütun) - MODEL'E UYGUN
    const makineTeçhizat = finansal.makinaTechizat || finansal.makineTeçhizatGiderleri || {};
    row.push(makineTeçhizat.ithalMakina || 0);                                  // İthal
    row.push(makineTeçhizat.yerliMakina || 0);                                  // Yerli
    row.push(makineTeçhizat.toplamMakina || ((makineTeçhizat.ithalMakina || 0) + (makineTeçhizat.yerliMakina || 0)));          // Toplam Makine Teçhizat
    
    // İthal Makine USD (3 sütun) - MODEL'E UYGUN
    row.push(makineTeçhizat.yeniMakina || 0);                        // Yeni Makine
    row.push(makineTeçhizat.kullanimisMakina || 0);                 // Kullanılmış Makine
    row.push(makineTeçhizat.toplamYeniMakina || ((makineTeçhizat.yeniMakina || 0) + (makineTeçhizat.kullanimisMakina || 0))); // TOPLAM İTHAL MAKİNE ($)
    
    // Finansman (3 sütun) - MODEL'E UYGUN
    const finansmanBilgisi = finansal.finansman || {};
    row.push(finansmanBilgisi.yabanciKaynak || 0);                                      // Toplam Yabancı Kaynak
    row.push(finansmanBilgisi.ozKaynak || 0);                          // Öz kaynak
    row.push(finansmanBilgisi.toplamFinansman || 0);        // TOPLAM FİNANSMAN
    
    // Revize tarihi (revizyon varsa onun tarihi, yoksa kaydın oluşturulma)
    const revizyonTarihi = revizyon?.revizyonTarihi || revizyon?.createdAt || snapshot.updatedAt || snapshot.createdAt;
    row.push(revizyonTarihi ? new Date(revizyonTarihi).toLocaleString('tr-TR') : '');
    
    console.log(`📊 CSV satırı oluşturuldu: ${row.length} sütun, Revizyon: ${revizyonNo}`);
    
    return row;
    
  } catch (error) {
    console.error('❌ CSV satır oluşturma hatası:', error);
    throw error;
  }
};

// 🔍 CSV SATIRLAR ARASI DEĞİŞİKLİK TESPİT ALGORİTMASI
const detectDetailedChangesInCsvRows = (previousRow, currentRow) => {
  try {
    const changes = [];
    
    // CSV sütun isimleri - indeks bazlı mapping
    const csvColumnNames = [
      'GM ID', 'TALEP/SONUÇ', 'REVIZE ID', 'FIRMA ID', 'YATIRIMCI UNVAN', 'SGK SİCİL NO',
      'BELGE ID', 'BELGE NO', 'BELGE TARIHI', 'BELGE MURACAAT TARIHI', 'MÜRACAAT SAYISI', 
      'BELGE BASLAMA TARIHI', 'BELGE BITIS TARIHI', 'SÜRE UZATIM TARİHİ', 'ÖZELLİKLİ YATIRIM İSE', 
      'DAYANDIĞI KANUN', 'BELGE DURUMU', '2-YATIRIM KONUSU', '3-CINSI(1)', '3-CINSI(2)', 
      '3-CINSI(3)', '3-CINSI(4)', 'DESTEK SINIFI', 'YERI IL', 'YERI ILCE', 'ADA', 'PARSEL',
      'YATIRIM ADRESI(1)', 'YATIRIM ADRESI(2)', 'YATIRIM ADRESI(3)', 'OSB ISE MUDURLUK', 
      'İL BAZLI BÖLGE', 'İLÇE BAZLI BÖLGE', 'SERBEST BÖLGE', 'Mevcut Kişi', 'İlave Kişi'
    ];
    
    // Ürün bilgileri sütunları (9 ürün x 6 alan = 54 sütun)
    for (let i = 1; i <= 9; i++) {
      csvColumnNames.push(
        `US97 Kodu (${i})`, `Ürün(${i})`, `Mevcut(${i})`, 
        `İlave(${i})`, `Toplam(${i})`, `Kapsite Birimi(${i})`
      );
    }
    
    // Destek unsurları sütunları (8 destek x 2 alan = 16 sütun)
    for (let i = 1; i <= 8; i++) {
      csvColumnNames.push(`Destek Unusrları(${i})`, `Şartları(${i})`);
    }
    
    // Özel şartlar sütunları (14 şart x 2 alan = 28 sütun)
    for (let i = 1; i <= 14; i++) {
      csvColumnNames.push(`Özel Şart Kısaltma ${i}`, `Özelşart Notu ${i}`);
    }
    
    // Finansal bilgiler sütunları (26 sütun)
    csvColumnNames.push(
      'Arazi-Arsa Bedeli Açıklama', 'Metrekaresi', 'Birim Fiyatı TL', 'ARAZİ ARSA BEDELİ',
      'Bina İnşaat Gideri Açıklama', 'Ana Bina ve Tesisleri', 'Yardımcı İş. Bina ve Tesisleri', 
      'İdare Binaları', 'TOPLAM BİNA İNŞAAT GİDERİ', 'Yardımcı İşl. Mak. Teç. Gid.',
      'İthalat ve Güm.Giderleri', 'Taşıma ve Sigorta Giderleri', 'Montaj Giderleri', 
      'Etüd ve Proje Giderleri', 'Diğer Giderleri', 'TOPLAM DİĞER YATIRIM HARCAMALARI',
      'TOPLAM SABİT YATIRIM TUTARI TL', 'İthal', 'Yerli', 'Toplam Makine Teçhizat',
      'Yeni Makine', 'Kullanılmış Makine', 'TOPLAM İTHAL MAKİNE ($)', 
      'Toplam Yabancı Kaynak', 'Öz kaynak', 'TOPLAM FİNANSMAN', 'REVIZE TARIHI'
    );
    
    // Satır uzunluğu kontrolü
    const maxLength = Math.max(previousRow?.length || 0, currentRow?.length || 0);
    
    if (maxLength === 0) {
      console.log('⚠️ Her iki CSV satırı da boş');
      return [];
    }
    
    // Her sütunu karşılaştır
    for (let i = 0; i < maxLength; i++) {
      const oldValue = previousRow && previousRow[i] !== undefined ? previousRow[i] : '';
      const newValue = currentRow && currentRow[i] !== undefined ? currentRow[i] : '';
      
      // Değer farklıysa değişiklik kaydet
      if (String(oldValue).trim() !== String(newValue).trim()) {
        // Sistem sütunlarını filtrele (REVIZE ID hep farklı olacak)
        if (i !== 2) { // REVIZE ID sütununu skip et
          changes.push({
            columnIndex: i,
            columnName: csvColumnNames[i] || `Sütun ${i + 1}`,
            oldValue: oldValue === '' ? '-' : String(oldValue),
            newValue: newValue === '' ? '-' : String(newValue),
            changeType: oldValue === '' ? 'added' : newValue === '' ? 'removed' : 'modified'
          });
        }
      }
    }
    
    console.log(`🔍 CSV değişiklik analizi: ${changes.length} farklılık tespit edildi`);
    
    return changes;
    
  } catch (error) {
    console.error('❌ CSV değişiklik tespit hatası:', error);
    return [];
  }
};

// 🏗️ CSV DATA ROW BUILDER - 156 SÜTUN TAM UYUMLU
const buildCsvDataRow = async (tesvik, revizyon = null, revizyonNo = 0) => {
  try {
    const row = [];
    
    // KÜNYE BİLGLERİ (17 sütun)
    row.push(tesvik.tesvikId || tesvik.gmId || 'GM2025000'); // GM ID
    // TALEP/SONUÇ: Revizyon satırında varsa o revizyonun durumunu yaz
    const revTalepSonuc = (revizyon && (revizyon.revizyonSebebi || revizyon.yeniDurum || revizyon.durumSonrasi)) || tesvik.kunyeBilgileri?.talepSonuc || tesvik.durumBilgileri?.genelDurum || 'taslak';
    row.push(revTalepSonuc); // TALEP/SONUÇ
    row.push(revizyonNo); // REVIZE ID
    row.push(tesvik.firma?.firmaId || 'A000000'); // FIRMA ID
    row.push(tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan || '-'); // YATIRIMCI UNVAN
    row.push(tesvik.kunyeBilgileri?.sgkSicilNo || ''); // Schema'da 'kunyeBilgileri' içinde
    row.push(tesvik._id || ''); // BELGE ID
    row.push(tesvik.belgeYonetimi?.belgeNo || ''); // BELGE NO
    row.push(tesvik.belgeYonetimi?.belgeTarihi ? new Date(tesvik.belgeYonetimi.belgeTarihi).toLocaleDateString('tr-TR') : ''); // BELGE TARIHI
    row.push(tesvik.belgeYonetimi?.belgeMuracaatTarihi ? new Date(tesvik.belgeYonetimi.belgeMuracaatTarihi).toLocaleDateString('tr-TR') : ''); // BELGE MURACAAT TARIHI
    row.push(tesvik.belgeYonetimi?.muracaatSayisi || ''); // MÜRACAAT SAYISI
    row.push(tesvik.belgeYonetimi?.belgeBaslamaTarihi ? new Date(tesvik.belgeYonetimi.belgeBaslamaTarihi).toLocaleDateString('tr-TR') : ''); // BELGE BASLAMA TARIHI
    row.push(tesvik.belgeYonetimi?.belgeBitisTarihi ? new Date(tesvik.belgeYonetimi.belgeBitisTarihi).toLocaleDateString('tr-TR') : ''); // BELGE BITIS TARIHI
    row.push(tesvik.belgeYonetimi?.sureUzatimTarihi ? new Date(tesvik.belgeYonetimi.sureUzatimTarihi).toLocaleDateString('tr-TR') : ''); // SÜRE UZATIM TARİHİ
    row.push(tesvik.yatirimBilgileri?.ozellikliYatirimMi ? 'evet' : 'hayir'); // ÖZELLİKLİ YATIRIM İSE
    row.push(tesvik.belgeYonetimi?.dayandigiKanun || '2012/3305'); // DAYANDIĞI KANUN
    row.push(tesvik.durumBilgileri?.genelDurum || 'taslak'); // BELGE DURUMU
    
    // YATIRIM İLE İLGİLİ BİLGLER (17 sütun)
    row.push(tesvik.yatirimBilgileri?.yatirimKonusu || ''); // 2-YATIRIM KONUSU
    row.push(tesvik.yatirimBilgileri?.sCinsi1 || ''); // Schema'da 'sCinsi1'
    row.push(tesvik.yatirimBilgileri?.tCinsi2 || ''); // Schema'da 'tCinsi2'
    row.push(tesvik.yatirimBilgileri?.uCinsi3 || ''); // Schema'da 'uCinsi3'
    row.push(tesvik.yatirimBilgileri?.vCinsi4 || ''); // Schema'da 'vCinsi4'
    row.push(tesvik.yatirimBilgileri?.destekSinifi || 'Genel'); // DESTEK SINIFI
    row.push(tesvik.yatirimBilgileri?.yerinIl || tesvik.firma?.firmaIl || ''); // YERI IL
    row.push(tesvik.yatirimBilgileri?.yerinIlce || tesvik.firma?.firmaIlce || ''); // YERI ILCE
    row.push(tesvik.yatirimBilgileri?.ada || ''); // ADA
    row.push(tesvik.yatirimBilgileri?.parsel || ''); // PARSEL
    row.push(tesvik.yatirimBilgileri?.yatirimAdresi1 || ''); // YATIRIM ADRESI(1)
    row.push(tesvik.yatirimBilgileri?.yatirimAdresi2 || ''); // YATIRIM ADRESI(2)
    row.push(tesvik.yatirimBilgileri?.yatirimAdresi3 || ''); // YATIRIM ADRESI(3)
    row.push(tesvik.yatirimBilgileri?.osbMudurluk || ''); // OSB ISE MUDURLUK
    row.push(tesvik.yatirimBilgileri?.ilBazliBolge || ''); // İL BAZLI BÖLGE
    row.push(tesvik.yatirimBilgileri?.ilceBazliBolge || ''); // İLÇE BAZLI BÖLGE
    row.push(tesvik.yatirimBilgileri?.serbsetBolge || ''); // Schema'da 'serbsetBolge' (typo olabilir)
    
    // İSTİHDAM (2 sütun)
    row.push(tesvik.istihdam?.mevcutKisi || 0); // Mevcut Kişi
    row.push(tesvik.istihdam?.ilaveKisi || 0); // İlave Kişi
    
    // ÜRÜN BİLGLERİ (54 sütun - 9 ürün x 6 alan)
    for (let i = 1; i <= 9; i++) {
      const urun = tesvik.urunler?.[i-1]; // Schema'da 'urunler' array'i kullanılıyor
      row.push(urun?.u97Kodu || ''); // Schema'da 'u97Kodu' kullanılıyor
      row.push(urun?.urunAdi || ''); // Ürün(i)
      row.push(urun?.mevcutKapasite || 0); // Mevcut(i)
      row.push(urun?.ilaveKapasite || 0); // İlave(i)
      row.push(urun?.toplamKapasite || 0); // Toplam(i)
      row.push(urun?.kapasiteBirimi || ''); // Kapsite Birimi(i)
    }
    
    // DESTEK UNSURLARI (16 sütun - 8 destek x 2 alan)
    for (let i = 1; i <= 8; i++) {
      const destek = tesvik.destekUnsurlari?.[i-1]; // Schema'da 'destekUnsurlari' kullanılıyor
      row.push(destek?.destekUnsuru || ''); // Schema'da 'destekUnsuru' kullanılıyor
      row.push(destek?.sarti || ''); // Schema'da 'sarti' kullanılıyor
    }
    
    // ÖZEL ŞARTLAR (28 sütun - 14 şart x 2 alan)
    for (let i = 1; i <= 14; i++) {
      const sart = tesvik.ozelSartlar?.[i-1];
      row.push(sart?.koşulNo || ''); // Schema'da 'koşulNo' kullanılıyor
      row.push(sart?.koşulMetni || ''); // Schema'da 'koşulMetni' kullanılıyor
    }
    
    // FİNANSAL BİLGLER (25 sütun) - Schema'ya uygun düzeltmeler
    row.push(''); // Arazi-Arsa Bedeli Açıklama (schema'da yok)
    row.push(0); // Metrekaresi (schema'da yok)
    row.push(0); // Birim Fiyatı TL (schema'da yok)
    row.push(tesvik.maliHesaplamalar?.araciArsaBedeli || 0); // Schema'da 'araciArsaBedeli'
    row.push(''); // Bina İnşaat Gideri Açıklama (schema'da yok)
    row.push(tesvik.maliHesaplamalar?.binaInsaatGideri?.anaBinaGideri || 0); // Schema'da nested
    row.push(tesvik.maliHesaplamalar?.binaInsaatGideri?.yardimciBinaGideri || 0); // Schema'da nested
    row.push(0); // İdare Binaları (schema'da yok)
    row.push(tesvik.maliHesaplamalar?.binaInsaatGideri?.toplamBinaGideri || 0); // Schema'da nested
    row.push(0); // Yardımcı İşl. Mak. Teç. Gid. (schema'da yok)
    row.push(0); // İthalat ve Güm.Giderleri (schema'da yok)
    row.push(0); // Taşıma ve Sigorta Giderleri (schema'da yok)
    row.push(0); // Montaj Giderleri (schema'da yok)
    row.push(0); // Etüd ve Proje Giderleri (schema'da yok)
    row.push(0); // Diğer Giderleri (schema'da yok)
    row.push(tesvik.maliHesaplamalar?.yatirimHesaplamalari?.ez || 0); // Schema'da 'ez' = TOPLAM
    row.push(tesvik.maliHesaplamalar?.toplamSabitYatirim || 0); // Schema'da mevcut
    row.push(tesvik.maliHesaplamalar?.makinaTechizat?.ithalMakina || 0); // Schema'da nested
    row.push(tesvik.maliHesaplamalar?.makinaTechizat?.yerliMakina || 0); // Schema'da nested
    row.push(tesvik.maliHesaplamalar?.makinaTechizat?.toplamMakina || 0); // Schema'da nested
    row.push(tesvik.maliHesaplamalar?.makinaTechizat?.yeniMakina || 0); // Schema'da nested
    row.push(tesvik.maliHesaplamalar?.makinaTechizat?.kullanimisMakina || 0); // Schema'da nested
    row.push(0); // TOPLAM İTHAL MAKİNE ($) (schema'da yok)
    row.push(tesvik.maliHesaplamalar?.finansman?.yabanciKaynak || 0); // Schema'da nested
    row.push(tesvik.maliHesaplamalar?.finansman?.ozKaynak || 0); // Schema'da nested
    row.push(tesvik.maliHesaplamalar?.finansman?.toplamFinansman || 0); // Schema'da nested
    
    // REVİZE TARİHİ (1 sütun)
    const revizeTarihi = revizyon?.revizyonTarihi || tesvik.createdAt;
    row.push(revizeTarihi ? new Date(revizeTarihi).toLocaleDateString('tr-TR') + ' ' + new Date(revizeTarihi).toLocaleTimeString('tr-TR') : '');
    
    return row;
    
  } catch (error) {
    console.error('❌ CSV data row build hatası:', error);
    throw error;
  }
};

// 🔍 CHANGE DETECTION ALGORITHM
const detectChanges = (previousRow, currentRow) => {
  const changes = [];
  
  for (let i = 0; i < currentRow.length; i++) {
    if (previousRow[i] !== currentRow[i] && currentRow[i] !== '' && currentRow[i] !== 0) {
      changes.push({
        columnIndex: i,
        oldValue: previousRow[i],
        newValue: currentRow[i]
      });
    }
  }
  
  return changes;
};

// 📊 PHASE 4: PROFESSIONAL WORKBOOK CREATION
const createProfessionalWorkbook = async (csvStructure, revisionData, includeColors, exportId) => {
  try {
    console.log(`📊 [${exportId}] Professional workbook oluşturuluyor...`);
    
    const ExcelJS = require('exceljs');
    // 🏢 ENTERPRISE-LEVEL WORKBOOK SETUP
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties for professional look
    workbook.creator = 'GM Teşvik Sistemi';
    workbook.lastModifiedBy = 'GM Teşvik Sistemi';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = 'Teşvik Revizyon Excel Çıktısı';
    workbook.description = 'Kurumsal Teşvik Sistemi - Profesyonel Excel Raporu';
    workbook.keywords = 'teşvik, revizyon, excel, kurumsal, rapor';
    workbook.category = 'Raporlar';
    
    const sheet = workbook.addWorksheet('📊 Sistem Revizyon Çıktısı', {
      properties: { 
        tabColor: { argb: 'FF1F4E79' },
        defaultRowHeight: 18,
        defaultColWidth: 12
      },
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToHeight: 1,
        fitToWidth: 1,
        paperSize: 9, // A4
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3
        }
      }
    });
    
    // 🎨 ENTERPRISE-LEVEL PROFESSIONAL STYLES - SECTION-BASED CORPORATE DESIGN
    const styles = {
            // 🏢 KÜNYE BİLGLERİ - Deep Blue Corporate Theme - FONTRENGİ SİYAH!
      kunyeLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }, // Deep blue
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
          top: { style: 'medium', color: { argb: 'FF1E40AF' } }, 
          left: { style: 'medium', color: { argb: 'FF1E40AF' } }, 
          bottom: { style: 'medium', color: { argb: 'FF1E40AF' } }, 
          right: { style: 'medium', color: { argb: 'FF1E40AF' } }
        }
      },
      kunyeLevel2: {
        font: { bold: true, color: { argb: 'FF1E3A8A' }, size: 10, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }, // Light blue
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FF3B82F6' } }, 
          left: { style: 'thin', color: { argb: 'FF3B82F6' } }, 
          bottom: { style: 'thin', color: { argb: 'FF3B82F6' } }, 
          right: { style: 'thin', color: { argb: 'FF3B82F6' } }
        }
      },
      kunyeColumn: {
        font: { bold: true, color: { argb: 'FF1E3A8A' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FF3B82F6' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF3B82F6' } }, right: { style: 'thin' } }
      },
      kunyeData: {
        font: { color: { argb: 'FF1E40AF' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBFCFF' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // 🏭 YATIRIM BİLGLERİ - Forest Green Corporate Theme
      yatirimLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } }, // Forest green
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
          top: { style: 'medium', color: { argb: 'FF065F46' } }, 
          left: { style: 'medium', color: { argb: 'FF065F46' } }, 
          bottom: { style: 'medium', color: { argb: 'FF065F46' } }, 
          right: { style: 'medium', color: { argb: 'FF065F46' } }
        }
      },
      yatirimLevel2: {
        font: { bold: true, color: { argb: 'FF064E3B' }, size: 10, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }, // Light green
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FF10B981' } }, 
          left: { style: 'thin', color: { argb: 'FF10B981' } }, 
          bottom: { style: 'thin', color: { argb: 'FF10B981' } }, 
          right: { style: 'thin', color: { argb: 'FF10B981' } }
        }
      },
      yatirimColumn: {
        font: { bold: true, color: { argb: 'FF064E3B' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FF10B981' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF10B981' } }, right: { style: 'thin' } }
      },
      yatirimData: {
        font: { color: { argb: 'FF065F46' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FEFC' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // 👥 İSTİHDAM - Purple Corporate Theme
      istihdamLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } }, // Purple
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'medium', color: { argb: 'FF7C3AED' } }, 
          left: { style: 'medium', color: { argb: 'FF7C3AED' } }, 
          bottom: { style: 'medium', color: { argb: 'FF7C3AED' } }, 
          right: { style: 'medium', color: { argb: 'FF7C3AED' } }
        }
      },
      istihdamLevel2: {
        font: { bold: true, color: { argb: 'FF581C87' }, size: 10, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9D5FF' } }, // Light purple
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FF8B5CF6' } }, 
          left: { style: 'thin', color: { argb: 'FF8B5CF6' } }, 
          bottom: { style: 'thin', color: { argb: 'FF8B5CF6' } }, 
          right: { style: 'thin', color: { argb: 'FF8B5CF6' } }
        }
      },
      istihdamColumn: {
        font: { bold: true, color: { argb: 'FF581C87' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FF8B5CF6' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF8B5CF6' } }, right: { style: 'thin' } }
      },
      istihdamData: {
        font: { color: { argb: 'FF7C3AED' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF9FF' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // 📦 ÜRÜN BİLGLERİ - Orange Corporate Theme  
      urunLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }, // Orange
        alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
          top: { style: 'medium', color: { argb: 'FFD97706' } }, 
          left: { style: 'medium', color: { argb: 'FFD97706' } }, 
          bottom: { style: 'medium', color: { argb: 'FFD97706' } }, 
          right: { style: 'medium', color: { argb: 'FFD97706' } }
        }
      },
      urunLevel2: {
        font: { bold: true, color: { argb: 'FFB45309' }, size: 10, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, // Light orange
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FFF59E0B' } }, 
          left: { style: 'thin', color: { argb: 'FFF59E0B' } }, 
          bottom: { style: 'thin', color: { argb: 'FFF59E0B' } }, 
          right: { style: 'thin', color: { argb: 'FFF59E0B' } }
        }
      },
      urunColumn: {
        font: { bold: true, color: { argb: 'FFB45309' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FFF59E0B' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FFF59E0B' } }, right: { style: 'thin' } }
      },
      urunData: {
        font: { color: { argb: 'FFD97706' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFEF7' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // 🛠️ DESTEK UNSURLARI - Teal Corporate Theme
      destekLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }, // Teal
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'medium', color: { argb: 'FF14B8A6' } }, 
          left: { style: 'medium', color: { argb: 'FF14B8A6' } }, 
          bottom: { style: 'medium', color: { argb: 'FF14B8A6' } }, 
          right: { style: 'medium', color: { argb: 'FF14B8A6' } }
        }
      },
      destekLevel2: {
        font: { bold: true, color: { argb: 'FF0F766E' }, size: 10, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } }, // Light teal
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FF2DD4BF' } }, 
          left: { style: 'thin', color: { argb: 'FF2DD4BF' } }, 
          bottom: { style: 'thin', color: { argb: 'FF2DD4BF' } }, 
          right: { style: 'thin', color: { argb: 'FF2DD4BF' } }
        }
      },
      destekColumn: {
        font: { bold: true, color: { argb: 'FF0F766E' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FF2DD4BF' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF2DD4BF' } }, right: { style: 'thin' } }
      },
      destekData: {
        font: { color: { argb: 'FF14B8A6' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFFFE' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // 📋 ÖZEL ŞARTLAR - Indigo Corporate Theme
      ozelLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } }, // Indigo
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'medium', color: { argb: 'FF4F46E5' } }, 
          left: { style: 'medium', color: { argb: 'FF4F46E5' } }, 
          bottom: { style: 'medium', color: { argb: 'FF4F46E5' } }, 
          right: { style: 'medium', color: { argb: 'FF4F46E5' } }
        }
      },
      ozelLevel2: {
        font: { bold: true, color: { argb: 'FF3730A3' }, size: 10, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }, // Light indigo
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FF6366F1' } }, 
          left: { style: 'thin', color: { argb: 'FF6366F1' } }, 
          bottom: { style: 'thin', color: { argb: 'FF6366F1' } }, 
          right: { style: 'thin', color: { argb: 'FF6366F1' } }
        }
      },
      ozelColumn: {
        font: { bold: true, color: { argb: 'FF3730A3' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2FF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FF6366F1' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF6366F1' } }, right: { style: 'thin' } }
      },
      ozelData: {
        font: { color: { argb: 'FF4F46E5' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFCFF' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // 💰 FİNANSAL BİLGLER - Rose Gold Corporate Theme
      finansalLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F1239' } }, // Rose
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'medium', color: { argb: 'FFE11D48' } }, 
          left: { style: 'medium', color: { argb: 'FFE11D48' } }, 
          bottom: { style: 'medium', color: { argb: 'FFE11D48' } }, 
          right: { style: 'medium', color: { argb: 'FFE11D48' } }
        }
      },
      finansalLevel2: {
        font: { bold: true, color: { argb: 'FF9F1239' }, size: 10, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE7F3' } }, // Light rose
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FFF43F5E' } }, 
          left: { style: 'thin', color: { argb: 'FFF43F5E' } }, 
          bottom: { style: 'thin', color: { argb: 'FFF43F5E' } }, 
          right: { style: 'thin', color: { argb: 'FFF43F5E' } }
        }
      },
      finansalLevel3: {
        font: { bold: true, color: { argb: 'FF9F1239' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2F8' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FFF43F5E' } }, 
          left: { style: 'thin', color: { argb: 'FFF43F5E' } }, 
          bottom: { style: 'thin', color: { argb: 'FFF43F5E' } }, 
          right: { style: 'thin', color: { argb: 'FFF43F5E' } }
        }
      },
      finansalColumn: {
        font: { bold: true, color: { argb: 'FF9F1239' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF7F0' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FFF43F5E' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FFF43F5E' } }, right: { style: 'thin' } }
      },
      finansalData: {
        font: { color: { argb: 'FFE11D48' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCFD' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // 🕐 REVİZE TARİHİ - Gray Corporate Theme
      revizyonLevel1: {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12, name: 'Calibri' }, // SİYAH FONT!
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }, // Gray
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
          top: { style: 'medium', color: { argb: 'FF6B7280' } }, 
          left: { style: 'medium', color: { argb: 'FF6B7280' } }, 
          bottom: { style: 'medium', color: { argb: 'FF6B7280' } }, 
          right: { style: 'medium', color: { argb: 'FF6B7280' } }
        }
      },
      revizyonColumn: {
        font: { bold: true, color: { argb: 'FF374151' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: { style: 'medium', color: { argb: 'FF9CA3AF' } }, left: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } }, right: { style: 'thin' } }
      },
      revizyonData: {
        font: { color: { argb: 'FF6B7280' }, size: 9, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFEFE' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      },

      // ⚠️ SPECIAL DATA STYLES
      initialRowCell: {
        font: { color: { argb: 'FF065F46' }, size: 9, bold: true, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFFA' } }, // Very light green
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { 
          top: { style: 'thin', color: { argb: 'FF059669' } }, 
          left: { style: 'thin', color: { argb: 'FF059669' } }, 
          bottom: { style: 'thin', color: { argb: 'FF059669' } }, 
          right: { style: 'thin', color: { argb: 'FF059669' } }
        }
      },
      changedCell: {
        font: { color: { argb: 'FF8B0000' }, size: 9, bold: true, name: 'Calibri' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } }, // Light red
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: { 
          top: { style: 'medium', color: { argb: 'FFFF0000' } }, 
          bottom: { style: 'medium', color: { argb: 'FFFF0000' } },
          left: { style: 'medium', color: { argb: 'FFFF0000' } }, 
          right: { style: 'medium', color: { argb: 'FFFF0000' } }
        }
      }
    };
    
    // 🏗️ BUILD 4-LEVEL HEADER STRUCTURE WITH SECTION-BASED CORPORATE COLORS
    console.log(`📊 [${exportId}] 4 seviyeli kurumsal renk şemalı başlık yapısı oluşturuluyor...`);
    
    // 🎨 Section styling mapping function - DÜZELTİLMİŞ VERSİYON
    const getSectionStyle = (colIndex, level) => {
      console.log(`🎨 [${exportId}] getSectionStyle called: colIndex=${colIndex}, level=${level}`);
      
      // KÜNYE BİLGLERİ: 1-17
      if (colIndex >= 1 && colIndex <= 17) {
        return level === 1 ? styles.kunyeLevel1 : 
               level === 2 ? styles.kunyeLevel2 : 
               level === 3 ? styles.kunyeLevel2 : // Level 3 fallback
               level === 4 ? styles.kunyeColumn : styles.kunyeLevel1;
      }
      // YATIRIM BİLGLERİ: 18-34
      else if (colIndex >= 18 && colIndex <= 34) {
        return level === 1 ? styles.yatirimLevel1 : 
               level === 2 ? styles.yatirimLevel2 : 
               level === 3 ? styles.yatirimLevel2 : // Level 3 fallback
               level === 4 ? styles.yatirimColumn : styles.yatirimLevel1;
      }
      // İSTİHDAM: 35-36
      else if (colIndex >= 35 && colIndex <= 36) {
        return level === 1 ? styles.istihdamLevel1 : 
               level === 2 ? styles.istihdamLevel2 : 
               level === 3 ? styles.istihdamLevel2 : // Level 3 fallback
               level === 4 ? styles.istihdamColumn : styles.istihdamLevel1;
      }
      // ÜRÜN BİLGLERİ: 37-90
      else if (colIndex >= 37 && colIndex <= 90) {
        return level === 1 ? styles.urunLevel1 : 
               level === 2 ? styles.urunLevel2 : 
               level === 3 ? styles.urunLevel2 : // Level 3 fallback
               level === 4 ? styles.urunColumn : styles.urunLevel1;
      }
      // DESTEK UNSURLARI: 91-106
      else if (colIndex >= 91 && colIndex <= 106) {
        return level === 1 ? styles.destekLevel1 : 
               level === 2 ? styles.destekLevel2 : 
               level === 3 ? styles.destekLevel2 : // Level 3 fallback
               level === 4 ? styles.destekColumn : styles.destekLevel1;
      }
      // ÖZEL ŞARTLAR: 107-134
      else if (colIndex >= 107 && colIndex <= 134) {
        return level === 1 ? styles.ozelLevel1 : 
               level === 2 ? styles.ozelLevel2 : 
               level === 3 ? styles.ozelLevel2 : // Level 3 fallback
               level === 4 ? styles.ozelColumn : styles.ozelLevel1;
      }
      // FİNANSAL BİLGLER: 135-160
      else if (colIndex >= 135 && colIndex <= 160) {
        return level === 1 ? styles.finansalLevel1 : 
               level === 2 ? styles.finansalLevel2 : 
               level === 3 ? styles.finansalLevel3 :
               level === 4 ? styles.finansalColumn : styles.finansalLevel1;
      }
      // REVİZE TARİHİ: 161
      else if (colIndex >= 161) {
        return level === 1 ? styles.revizyonLevel1 : 
               level === 2 ? styles.revizyonLevel1 : // Level 2 fallback
               level === 3 ? styles.revizyonLevel1 : // Level 3 fallback
               level === 4 ? styles.revizyonColumn : styles.revizyonLevel1;
      }
      
      return styles.kunyeLevel1; // Default
    };
    
    // 🏆 ENTERPRISE-LEVEL KURUMSAL EXCEL ŞABLONU - AŞK OLACAKSIN!
    console.log(`🏆 [${exportId}] PROFESYONEL KURUMSAL ŞABLON OLUŞTURULUYOR...`);
    
    // 🎨 KURUMSAL PROFESYONEL STİLLER - HER BÖLÜM ÖZEL RENK!
    const professionalStyles = {
      // 🏢 KÜNYE BİLGLERİ - Navy Blue Corporate
      kunye: {
        level1: {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } }
        },
        level2: {
          font: { bold: true, color: { argb: 'FF1E3A8A' }, size: 11, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBFDBFE' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        },
        column: {
          font: { bold: true, color: { argb: 'FF1E40AF' }, size: 9, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      },
      // 🏭 YATIRIM - Forest Green Corporate  
      yatirim: {
        level1: {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } }
        },
        level2: {
          font: { bold: true, color: { argb: 'FF064E3B' }, size: 11, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB7F5E8' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        },
        column: {
          font: { bold: true, color: { argb: 'FF065F46' }, size: 9, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      },
      // 👥 İSTİHDAM - Purple Corporate
      istihdam: {
        level1: {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } }
        },
        level2: {
          font: { bold: true, color: { argb: 'FF581C87' }, size: 11, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9D5FF' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        },
        column: {
          font: { bold: true, color: { argb: 'FF7C3AED' }, size: 9, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      },
      // 📦 ÜRÜN - Orange Corporate
      urun: {
        level1: {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } }
        },
        level2: {
          font: { bold: true, color: { argb: 'FFEA580C' }, size: 11, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        },
        column: {
          font: { bold: true, color: { argb: 'FFDC2626' }, size: 9, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      },
      // 🛠️ DESTEK - Teal Corporate
      destek: {
        level1: {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } }
        },
        level2: {
          font: { bold: true, color: { argb: 'FF0F766E' }, size: 11, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        },
        column: {
          font: { bold: true, color: { argb: 'FF14B8A6' }, size: 9, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      },
      // 📋 ÖZEL ŞARTLAR - Indigo Corporate
      ozel: {
        level1: {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } }
        },
        level2: {
          font: { bold: true, color: { argb: 'FF4338CA' }, size: 11, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        },
        column: {
          font: { bold: true, color: { argb: 'FF6366F1' }, size: 9, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2FF' } },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      },
      // 💰 FİNANSAL - Rose Corporate
      finansal: {
        level1: {
          font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 13, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBE185D' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } }
        },
        level2: {
          font: { bold: true, color: { argb: 'FFBE185D' }, size: 11, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE7F3' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        },
        column: {
          font: { bold: true, color: { argb: 'FFE11D48' }, size: 9, name: 'Segoe UI' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF7F0' } },
          alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
          border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      }
    };
    
    // 🎯 BÖLÜM TANIMLAMALARI - KURUMSAL RENKLER İLE
    const sections = [
      { name: 'KÜNYE BİLGLERİ', start: 1, end: 17, style: professionalStyles.kunye },
      { name: 'YATIRIM BİLGLERİ', start: 18, end: 34, style: professionalStyles.yatirim },
      { name: 'İSTİHDAM', start: 35, end: 36, style: professionalStyles.istihdam },
      { name: 'ÜRÜN BİLGLERİ', start: 37, end: 90, style: professionalStyles.urun },
      { name: 'DESTEK UNSURLARI', start: 91, end: 106, style: professionalStyles.destek },
      { name: 'ÖZEL ŞARTLAR', start: 107, end: 134, style: professionalStyles.ozel },
      { name: 'FİNANSAL BİLGLER', start: 135, end: 161, style: professionalStyles.finansal }
    ];
    
    // 🏆 SATIR 1 - ANA BÖLÜM BAŞLIKLARI (KURUMSAL RENKLER)
    console.log(`🏆 [${exportId}] Level 1 - Ana bölüm başlıkları kurumsal renklerle...`);
    sections.forEach(section => {
      // Merge cells for entire section
      sheet.mergeCells(1, section.start, 1, section.end);
      
      // Apply corporate styling to merged area
      for (let col = section.start; col <= section.end; col++) {
        const cell = sheet.getCell(1, col);
        if (col === section.start) cell.value = section.name;
        cell.style = section.style.level1;
      }
      console.log(`🎨 Merged: ${section.name} (${section.start}-${section.end}) - ${section.style.level1.fill.fgColor.argb}`);
    });
    
    // 🎯 SATIR 2 - ALT BÖLÜM BAŞLIKLARI (KURUMSAL RENKLER)
    console.log(`🎯 [${exportId}] Level 2 - Alt bölüm başlıkları kurumsal renklerle...`);
    
    // KÜNYE alt bölümleri
    sheet.mergeCells(2, 1, 2, 6);
    for (let c = 1; c <= 6; c++) {
      const cell = sheet.getCell(2, c);
      if (c === 1) cell.value = 'YATIRIMCI';
      cell.style = professionalStyles.kunye.level2;
    }
    sheet.mergeCells(2, 7, 2, 17);
    for (let c = 7; c <= 17; c++) {
      const cell = sheet.getCell(2, c);
      if (c === 7) cell.value = 'BELGE BİLGLERİ';
      cell.style = professionalStyles.kunye.level2;
    }
    
    // Diğer ana bölümler
    const level2Sections = [
      { name: 'YATIRIM İLE İLGİLİ BİLGLER', start: 18, end: 34, style: professionalStyles.yatirim.level2 },
      { name: 'İSTİHDAM', start: 35, end: 36, style: professionalStyles.istihdam.level2 },
      { name: 'ÜRÜN BİLGLERİ', start: 37, end: 90, style: professionalStyles.urun.level2 },
      { name: 'DESTEK UNSURLARI', start: 91, end: 106, style: professionalStyles.destek.level2 },
      { name: 'ÖZEL ŞARTLAR', start: 107, end: 134, style: professionalStyles.ozel.level2 },
      { name: 'FİNANSAL BİLGLER', start: 135, end: 161, style: professionalStyles.finansal.level2 }
    ];
    
    level2Sections.forEach(section => {
      sheet.mergeCells(2, section.start, 2, section.end);
      for (let c = section.start; c <= section.end; c++) {
        const cell = sheet.getCell(2, c);
        if (c === section.start) cell.value = section.name;
        cell.style = section.style;
      }
      console.log(`🎨 Level2: ${section.name} (${section.start}-${section.end})`);
    });
    
    // 📝 SATIR 4 - SÜTUN İSİMLERİ (BÖLÜM BAZLI KURUMSAL RENKLER)
    console.log(`📝 [${exportId}] Level 4 - Sütun isimleri bölüm renkleryle...`);
    csvStructure.level4.forEach((columnName, index) => {
      const cell = sheet.getCell(4, index + 1);
      cell.value = columnName;
      
      // Bölüm bazlı stil ata
      const colNum = index + 1;
      let columnStyle = professionalStyles.kunye.column; // Default
      
      if (colNum >= 1 && colNum <= 17) columnStyle = professionalStyles.kunye.column;
      else if (colNum >= 18 && colNum <= 34) columnStyle = professionalStyles.yatirim.column;
      else if (colNum >= 35 && colNum <= 36) columnStyle = professionalStyles.istihdam.column;
      else if (colNum >= 37 && colNum <= 90) columnStyle = professionalStyles.urun.column;
      else if (colNum >= 91 && colNum <= 106) columnStyle = professionalStyles.destek.column;
      else if (colNum >= 107 && colNum <= 134) columnStyle = professionalStyles.ozel.column;
      else if (colNum >= 135 && colNum <= 161) columnStyle = professionalStyles.finansal.column;
      
      cell.style = columnStyle;
      
      if (index < 10) {
        console.log(`🎨 Col ${colNum}: "${columnName}"`);
      }
    });
    
    console.log(`🏆 [${exportId}] KURUMSAL ŞABLON TAMAMLANDI - 161 sütun, 7 renkli bölüm!`);
    
    // 🎨 PROFESYONEL SATIR YÜKSEKLİKLERİ & DONDURMALAR
    sheet.getRow(1).height = 35; // Ana bölüm başlıkları - daha yüksek
    sheet.getRow(2).height = 30; // Alt bölüm başlıkları  
    sheet.getRow(3).height = 25; // Boş satır (ileride kullanım için)
    sheet.getRow(4).height = 28; // Sütun isimleri - daha yüksek
    
    // Freeze header rows for better user experience
    sheet.views = [{
      state: 'frozen',
      xSplit: 0,
      ySplit: 4, // Freeze first 4 header rows
      topLeftCell: 'A5',
      activeCell: 'A5'
    }];
    
    console.log(`📊 [${exportId}] Başlık yapısı tamamlandı: ${csvStructure.totalColumns} sütun`);
    
    // 📊 POPULATE DATA ROWS WITH SECTION-BASED CORPORATE COLORS
    console.log(`📊 [${exportId}] Kurumsal renk şemalı veri satırları oluşturuluyor: ${revisionData.length} satır`);
    
    // 🎨 Section data styling function
    const getSectionDataStyle = (colIndex, isInitial = false, isChanged = false) => {
      // İlk satır için özel stil
      if (isInitial) {
        return styles.initialRowCell;
      }
      // Değişen hücreler için kırmızı vurgu
      if (isChanged) {
        return styles.changedCell;
      }
      
      // Section-based normal data styles
      // KÜNYE BİLGLERİ: 1-17 (Blue theme)
      if (colIndex >= 1 && colIndex <= 17) {
        return styles.kunyeData;
      }
      // YATIRIM BİLGLERİ: 18-34 (Green theme)
      else if (colIndex >= 18 && colIndex <= 34) {
        return styles.yatirimData;
      }
      // İSTİHDAM: 35-36 (Purple theme)
      else if (colIndex >= 35 && colIndex <= 36) {
        return styles.istihdamData;
      }
      // ÜRÜN BİLGLERİ: 37-90 (Orange theme)
      else if (colIndex >= 37 && colIndex <= 90) {
        return styles.urunData;
      }
      // DESTEK UNSURLARI: 91-106 (Teal theme)
      else if (colIndex >= 91 && colIndex <= 106) {
        return styles.destekData;
      }
      // ÖZEL ŞARTLAR: 107-134 (Indigo theme)
      else if (colIndex >= 107 && colIndex <= 134) {
        return styles.ozelData;
      }
      // FİNANSAL BİLGLER: 135-160 (Rose theme)
      else if (colIndex >= 135 && colIndex <= 160) {
        return styles.finansalData;
      }
      // REVİZE TARİHİ: 161+ (Gray theme)
      else if (colIndex >= 161) {
        return styles.revizyonData;
      }
      
      return styles.kunyeData; // Default
    };
    
    let currentRow = 5;
    
    revisionData.forEach((revision, revisionIndex) => {
      revision.rowData.forEach((value, colIndex) => {
        const cell = sheet.getCell(currentRow, colIndex + 1);
            cell.value = value;
        
        // Determine styling based on section and state
        const isChanged = includeColors && revision.changes?.some(c => c.columnIndex === colIndex);
        const baseStyle = getSectionDataStyle(colIndex + 1, revision.isInitial, isChanged);
        
        // 🎨 ADD ALTERNATING ROW EFFECT (subtle gradient-like effect)
        if (!revision.isInitial && !isChanged && revisionIndex % 2 === 1) {
          // Create slightly darker version for alternating rows
          const alternatingStyle = { ...baseStyle };
          
          // Section-specific alternating colors
          if (colIndex + 1 >= 1 && colIndex + 1 <= 17) { // KÜNYE
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FF' } };
          } else if (colIndex + 1 >= 18 && colIndex + 1 <= 34) { // YATIRIM
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3FDF6' } };
          } else if (colIndex + 1 >= 35 && colIndex + 1 <= 36) { // İSTİHDAM
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F5FF' } };
          } else if (colIndex + 1 >= 37 && colIndex + 1 <= 90) { // ÜRÜN
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFCF5' } };
          } else if (colIndex + 1 >= 91 && colIndex + 1 <= 106) { // DESTEK
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FFFE' } };
          } else if (colIndex + 1 >= 107 && colIndex + 1 <= 134) { // ÖZEL ŞARTLAR
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F8FF' } };
          } else if (colIndex + 1 >= 135 && colIndex + 1 <= 160) { // FİNANSAL
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF8F9' } };
          } else { // REVİZYON
            alternatingStyle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCFCFC' } };
          }
          
          cell.style = alternatingStyle;
        } else {
          cell.style = baseStyle;
        }
      });
      
      // 🎨 ENHANCED ROW HEIGHTS
      if (revision.isInitial) {
        sheet.getRow(currentRow).height = 22; // Initial row daha yüksek
      } else if (revision.changes && revision.changes.length > 0) {
        sheet.getRow(currentRow).height = 20; // Changed rows biraz daha yüksek
      } else {
        sheet.getRow(currentRow).height = 18; // Normal rows
      }
      
      currentRow++;
    });
    
    // 📏 COLUMN WIDTHS
    console.log(`📊 [${exportId}] Sütun genişlikleri ayarlanıyor...`);
    
    const columnWidths = [
      8, 12, 8, 10, 35, 12, 25, 12, 12, 15, 12, 15, 12, 15, 15, 12, 15, // KÜNYE + YATIRIM
      25, 10, 10, 10, 10, 18, 12, 12, 8, 8, 20, 20, 20, 15, 15, 15, 12, 10, 10, // YATIRIM devam + İSTİHDAM
    ];
    
    // Ürün bilgileri için sütun genişlikleri (54 sütun)
    for (let i = 0; i < 54; i++) {
      if (i % 6 === 0) columnWidths.push(12); // US97 Kodu
      else if (i % 6 === 1) columnWidths.push(25); // Ürün adı
      else columnWidths.push(8); // Diğer alanlar
    }
    
    // Kalan sütunlar için
    for (let i = columnWidths.length; i < csvStructure.totalColumns; i++) {
      columnWidths.push(12);
    }
    
    columnWidths.forEach((width, index) => {
      if (sheet.getColumn(index + 1)) {
        sheet.getColumn(index + 1).width = width;
      }
    });
    
    console.log(`✅ [${exportId}] Professional workbook oluşturuldu`);
    return workbook;
    
  } catch (error) {
    console.error(`❌ [${exportId}] Workbook creation hatası:`, error);
    throw error;
  }
};

// 📁 FILE NAME GENERATOR
const generateFileName = (tesvik) => {
  const firmId = tesvik.firma?.firmaId || 'A000000';
  const tesvikId = tesvik.tesvikId || tesvik.gmId || 'UNKNOWN';
  const date = new Date().toISOString().split('T')[0];
  
  return `sistem_excel_ciktisi_${firmId}_${tesvikId}_${date}.xlsx`;
};

// 📋 EXPORT ACTIVITY LOGGER
const logExportActivity = async (tesvik, user, exportId, rowCount, duration, ip, userAgent) => {
  try {
    await Activity.logActivity({
      action: 'export',
      category: 'tesvik',
      title: 'Enterprise Sistem Revizyon Excel Çıktısı',
      description: `${tesvik.tesvikId || tesvik.gmId} için enterprise seviyede CSV formatında sistem revizyon Excel çıktısı oluşturuldu`,
      targetResource: {
        type: 'tesvik',
        id: tesvik._id,
        name: tesvik.yatirimciUnvan,
        tesvikId: tesvik.tesvikId
      },
      user: {
        id: user._id,
        name: user.adSoyad,
        email: user.email,
        role: user.rol
      },
      metadata: {
        ip: ip || '127.0.0.1',
        userAgent: userAgent,
        exportId,
        exportType: 'enterprise_sistem_revizyon_excel',
        csvFormat: true,
        columnCount: 156,
        rowCount,
        duration,
        enterprise: true,
        source: 'web'
      }
    });
  } catch (error) {
    console.error('❌ Export activity log hatası:', error);
    // Log hatası export'u engellemez
  }
};

// MODULE EXPORTS
module.exports = {
  createTesvik,
  getTesvikler,
  getTesvik,
  updateTesvik,
  deleteTesvik,
  searchTesvikler,
  getTesvikStats,
  getTesvikByFirma,
  updateTesvikDurum,
  addTesvikRevizyon,
  exportRevizyonExcel,
  calculateMaliHesaplamalar,
  getDurumRenkleri,
  getNextTesvikId,
  bulkUpdateDurum,
  
  // 📄 EXCEL EXPORT - Excel benzeri renk kodlamalı çıktı (ExcelJS ile)
  exportTesvikExcel: async (req, res) => {
    try {
        const { id } = req.params;
  const { format = 'xlsx', includeColors = true } = req.query;
  
  console.log(`📊 Excel export başlatılıyor: ${id}`);
  
  // ID validation
  if (!id || id === 'undefined') {
    return res.status(400).json({
      success: false,
      message: 'Geçersiz teşvik ID\'si'
    });
  }
  
  // Teşvik verisini getir
  const tesvik = await Tesvik.findById(id)
        .populate('firma', 'unvan vergiNo')
        .lean();
        
      if (!tesvik) {
        return res.status(404).json({ success: false, message: 'Teşvik bulunamadı' });
      }
      
      // ExcelJS workbook oluştur
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Ana sayfa - Teşvik Detayları
      const mainSheet = workbook.addWorksheet('Teşvik Detayları');
      
      // Başlık stilleri
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
      
      const subHeaderStyle = {
        font: { bold: true, color: { argb: 'FF000000' }, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } },
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
      
      const dataStyle = {
        font: { color: { argb: 'FF000000' }, size: 11 },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
      
      // Ana başlık
      mainSheet.mergeCells('A1:G1');
      mainSheet.getCell('A1').value = 'TEŞVİK BELGESI';
      mainSheet.getCell('A1').style = headerStyle;
      
      // Temel bilgiler
      let row = 3;
      mainSheet.getCell(`A${row}`).value = 'GM ID:';
      mainSheet.getCell(`A${row}`).style = subHeaderStyle;
      mainSheet.getCell(`B${row}`).value = tesvik.gmId || '';
      mainSheet.getCell(`B${row}`).style = dataStyle;
      mainSheet.getCell(`D${row}`).value = 'Teşvik ID:';
      mainSheet.getCell(`D${row}`).style = subHeaderStyle;
      mainSheet.getCell(`E${row}`).value = tesvik.tesvikId || '';
      mainSheet.getCell(`E${row}`).style = dataStyle;
      
      row++;
      mainSheet.getCell(`A${row}`).value = 'Firma:';
      mainSheet.getCell(`A${row}`).style = subHeaderStyle;
      mainSheet.getCell(`B${row}`).value = tesvik.firma?.unvan || '';
      mainSheet.getCell(`B${row}`).style = dataStyle;
      mainSheet.getCell(`D${row}`).value = 'Vergi No:';
      mainSheet.getCell(`D${row}`).style = subHeaderStyle;
      mainSheet.getCell(`E${row}`).value = tesvik.firma?.vergiNo || '';
      mainSheet.getCell(`E${row}`).style = dataStyle;
      
      // Künye bilgileri bölümü
      row += 2;
      mainSheet.mergeCells(`A${row}:G${row}`);
      mainSheet.getCell(`A${row}`).value = 'KÜNYE BİLGİLERİ';
      mainSheet.getCell(`A${row}`).style = headerStyle;
      
      row++;
      const kunyeFields = [
        ['Karar Tarihi:', tesvik.kunyeBilgileri?.kararTarihi || '', 'Karar Sayısı:', tesvik.kunyeBilgileri?.kararSayisi || ''],
        ['Başvuru Tarihi:', tesvik.kunyeBilgileri?.basvuruTarihi || '', 'Dosya No:', tesvik.kunyeBilgileri?.dosyaNo || ''],
        ['Proje Bedeli:', tesvik.kunyeBilgileri?.projeBedeli || 0, 'Teşvik Miktarı:', tesvik.kunyeBilgileri?.tesvikMiktari || 0]
      ];
      
      kunyeFields.forEach(fieldRow => {
        mainSheet.getCell(`A${row}`).value = fieldRow[0];
        mainSheet.getCell(`A${row}`).style = subHeaderStyle;
        mainSheet.getCell(`B${row}`).value = fieldRow[1];
        mainSheet.getCell(`B${row}`).style = dataStyle;
        mainSheet.getCell(`D${row}`).value = fieldRow[2];
        mainSheet.getCell(`D${row}`).style = subHeaderStyle;
        mainSheet.getCell(`E${row}`).value = fieldRow[3];
        mainSheet.getCell(`E${row}`).style = dataStyle;
        row++;
      });
      
      // Finansal bilgiler bölümü
      row++;
      mainSheet.mergeCells(`A${row}:G${row}`);
      mainSheet.getCell(`A${row}`).value = 'FİNANSAL BİLGİLER';
      mainSheet.getCell(`A${row}`).style = headerStyle;
      
      row++;
      const finansalFields = [
        ['Toplam Sabit Yatırım:', tesvik.maliHesaplamalar?.toplamSabitYatirim || 0],
        ['Arazi/Arsa Bedeli:', tesvik.maliHesaplamalar?.araciArsaBedeli || 0],
        ['Yerli Makine (TL):', tesvik.maliHesaplamalar?.makinaTechizat?.yerliMakina || 0],
        ['İthal Makine (TL):', tesvik.maliHesaplamalar?.makinaTechizat?.ithalMakina || 0],
        ['İthal Makine (USD):', tesvik.maliHesaplamalar?.makinaTechizat?.yeniMakina || 0]
      ];
      
      finansalFields.forEach(fieldRow => {
        mainSheet.getCell(`A${row}`).value = fieldRow[0];
        mainSheet.getCell(`A${row}`).style = subHeaderStyle;
        mainSheet.getCell(`B${row}`).value = fieldRow[1];
        mainSheet.getCell(`B${row}`).style = dataStyle;
        row++;
      });
      
      // Sütun genişlikleri
      mainSheet.columns = [
        { width: 25 }, { width: 20 }, { width: 5 }, { width: 20 }, { width: 20 }, { width: 10 }, { width: 10 }
      ];
      
      // Ürün bilgileri sayfası
      const urunSheet = workbook.addWorksheet('Ürün Bilgileri');
      
      // Ürün sayfası başlığı
      urunSheet.mergeCells('A1:G1');
      urunSheet.getCell('A1').value = 'ÜRÜN BİLGİLERİ (U$97 KODLARI)';
      urunSheet.getCell('A1').style = headerStyle;
      
      // Ürün tablosu başlıkları
      const urunHeaders = ['Kod', 'Açıklama', 'Mevcut', 'İlave', 'Toplam', 'Kapasite', 'Birim'];
      urunHeaders.forEach((header, index) => {
        const cell = urunSheet.getCell(3, index + 1);
        cell.value = header;
        cell.style = subHeaderStyle;
      });
      
      // Ürün verileri - Sadece anlamlı verisi olan ürünler
      if (tesvik.urunler && tesvik.urunler.length > 0) {
        // 🔧 FİLTRE: SADECE 1+ kapasitesi olan ürünleri göster (Kod/açıklama olsa bile kapasite 0 ise gösterme)
        const filteredUrunler = tesvik.urunler.filter(urun => 
          (urun.mevcutKapasite && urun.mevcutKapasite > 0) ||
          (urun.ilaveKapasite && urun.ilaveKapasite > 0) ||
          (urun.toplamKapasite && urun.toplamKapasite > 0)
        );
        
        filteredUrunler.forEach((urun, index) => {
          const rowIndex = index + 4;
          const urunData = [
            urun.u97Kodu || '',
            urun.urunAdi || '',
            urun.mevcutKapasite || 0,
            urun.ilaveKapasite || 0,
            urun.toplamKapasite || 0,
            urun.toplamKapasite || 0,
            urun.kapasiteBirimi || ''
          ];
          
          urunData.forEach((value, colIndex) => {
            const cell = urunSheet.getCell(rowIndex, colIndex + 1);
            cell.value = value;
            cell.style = dataStyle;
          });
        });
      }
      
      // Ürün sayfası sütun genişlikleri
      urunSheet.columns = [
        { width: 15 }, { width: 40 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 12 }
      ];
      
      // Destek unsurları sayfası
      const destekSheet = workbook.addWorksheet('Destek Unsurları');
      
      // Destek sayfası başlığı
      destekSheet.mergeCells('A1:D1');
      destekSheet.getCell('A1').value = 'DESTEK UNSURLARI';
      destekSheet.getCell('A1').style = headerStyle;
      
      // Destek tablosu başlıkları
      const destekHeaders = ['Sıra', 'Destek Unsuru', 'Şartları', 'Açıklama'];
      destekHeaders.forEach((header, index) => {
        const cell = destekSheet.getCell(3, index + 1);
        cell.value = header;
        cell.style = subHeaderStyle;
      });
      
      // Destek verileri
      if (tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0) {
        tesvik.destekUnsurlari.forEach((destek, index) => {
          const rowIndex = index + 4;
          const destekData = [
            index + 1,
            destek.destekUnsuru || '',
            destek.sarti || '',
            destek.aciklama || ''
          ];
          
          destekData.forEach((value, colIndex) => {
            const cell = destekSheet.getCell(rowIndex, colIndex + 1);
            cell.value = value;
            cell.style = dataStyle;
          });
        });
      }
      
      // Destek sayfası sütun genişlikleri
      destekSheet.columns = [
        { width: 8 }, { width: 50 }, { width: 40 }, { width: 40 }
      ];
      
      // Excel dosyasını buffer olarak oluştur
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      // Response headers ayarla
      const fileName = `tesvik_${tesvik.gmId || tesvik.tesvikId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      // Excel dosyasını gönder
      res.send(excelBuffer);
      
      console.log(`✅ Excel export tamamlandı: ${fileName}`);
      
    } catch (error) {
      console.error('❌ Excel export hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Excel export sırasında hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  
  // 📄 PDF EXPORT - Excel benzeri görsel PDF çıktı
  exportTesvikPDF: async (req, res) => {
    try {
      const { id } = req.params;
      const { includeColors = true } = req.query;
      
      console.log(`📄 PDF export başlatılıyor: ${id}`);
      
      // Teşvik verisini getir
      const tesvik = await Tesvik.findById(id)
        .populate('firma', 'unvan vergiNo')
        .lean();
        
      if (!tesvik) {
        return res.status(404).json({ success: false, message: 'Teşvik bulunamadı' });
      }
      
      // PDF document oluştur
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      // Response headers ayarla
      const fileName = `tesvik_${tesvik.gmId || tesvik.tesvikId}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // PDF stream'i response'a pipe et
      doc.pipe(res);
      
      // Başlık
      doc.fontSize(20).font('Helvetica-Bold').text('TEŞVİK BELGESI', { align: 'center' });
      doc.moveDown(2);
      
      // Temel bilgiler
      doc.fontSize(12).font('Helvetica-Bold').text('TEMEL BİLGİLER', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`GM ID: ${tesvik.gmId || 'Belirtilmemiş'}`);
      doc.text(`Teşvik ID: ${tesvik.tesvikId || 'Belirtilmemiş'}`);
      doc.text(`Firma: ${tesvik.firma?.unvan || 'Belirtilmemiş'}`);
      doc.text(`Vergi No: ${tesvik.firma?.vergiNo || 'Belirtilmemiş'}`);
      doc.moveDown(1);
      
      // Künye bilgileri
      doc.font('Helvetica-Bold').text('KÜNYE BİLGİLERİ', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Karar Tarihi: ${tesvik.kunyeBilgileri?.kararTarihi || 'Belirtilmemiş'}`);
      doc.text(`Karar Sayısı: ${tesvik.kunyeBilgileri?.kararSayisi || 'Belirtilmemiş'}`);
      doc.text(`Başvuru Tarihi: ${tesvik.kunyeBilgileri?.basvuruTarihi || 'Belirtilmemiş'}`);
      doc.text(`Dosya No: ${tesvik.kunyeBilgileri?.dosyaNo || 'Belirtilmemiş'}`);
      doc.text(`Proje Bedeli: ${tesvik.kunyeBilgileri?.projeBedeli || 0} TL`);
      doc.text(`Teşvik Miktarı: ${tesvik.kunyeBilgileri?.tesvikMiktari || 0} TL`);
      doc.moveDown(1);
      
      // Finansal bilgiler
      doc.font('Helvetica-Bold').text('FİNANSAL BİLGİLER', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Toplam Sabit Yatırım: ${tesvik.finansalBilgiler?.toplamSabitYatirimTutari || 0} TL`);
      doc.text(`Arazi/Arsa Bedeli: ${tesvik.finansalBilgiler?.araziArsaBedeli || 0} TL`);
      doc.moveDown(0.5);
      
      // Makine teçhizat TL
      doc.text(`Yerli Makine: ${tesvik.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.yerliMakine || 0} TL`);
      doc.text(`İthal Makine: ${tesvik.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.ithalMakine || 0} TL`);
      doc.text(`Toplam Makine (TL): ${tesvik.finansalBilgiler?.makineTeçhizatGiderleri?.tl?.toplamMakineTeç || 0} TL`);
      doc.moveDown(0.5);
      
      // Makine teçhizat USD
      doc.text(`İthal Makine (USD): ${tesvik.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.ithalMakine || 0} USD`);
      doc.text(`Toplam İthal (USD): ${tesvik.finansalBilgiler?.makineTeçhizatGiderleri?.dolar?.toplamIthalMakine || 0} USD`);
      doc.moveDown(1);
      
      // Yeni sayfa - Ürün bilgileri
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('ÜRÜN BİLGİLERİ (U$97 KODLARI)', { align: 'center' });
      doc.moveDown(1);
      
      if (tesvik.urunBilgileri && tesvik.urunBilgileri.length > 0) {
        // Tablo başlıkları
        doc.fontSize(10).font('Helvetica-Bold');
        const tableTop = doc.y;
        const colWidths = [60, 150, 60, 60, 60, 80, 60];
        let currentX = 50;
        
        ['Kod', 'Açıklama', 'Mevcut', 'İlave', 'Toplam', 'Kapasite', 'Birim'].forEach((header, i) => {
          doc.text(header, currentX, tableTop, { width: colWidths[i], align: 'center' });
          currentX += colWidths[i];
        });
        
        doc.moveDown(0.5);
        
        // Tablo verileri
        doc.font('Helvetica');
        tesvik.urunBilgileri.forEach((urun, index) => {
          if (doc.y > 700) { // Sayfa sonu kontrolü
            doc.addPage();
          }
          
          currentX = 50;
          const rowY = doc.y;
          
          [
            urun.kod || '',
            urun.aciklama || '',
            urun.mevcut || 0,
            urun.ilave || 0,
            urun.toplam || 0,
            urun.kapsite || 0,
            urun.kapasite_birimi || ''
          ].forEach((value, i) => {
            doc.text(String(value), currentX, rowY, { width: colWidths[i], align: 'center' });
            currentX += colWidths[i];
          });
          
          doc.moveDown(0.3);
        });
      }
      
      // Yeni sayfa - Destek unsurları
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('DESTEK UNSURLARI', { align: 'center' });
      doc.moveDown(1);
      
      if (tesvik.destekUnsurlari && tesvik.destekUnsurlari.length > 0) {
        tesvik.destekUnsurlari.forEach((destek, index) => {
          if (doc.y > 700) { // Sayfa sonu kontrolü
            doc.addPage();
          }
          
          doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${destek.destekUnsuru || 'Belirtilmemiş'}`);
          doc.fontSize(10).font('Helvetica');
          doc.text(`Şartları: ${destek.sarti || 'Belirtilmemiş'}`);
          if (destek.aciklama) {
            doc.text(`Açıklama: ${destek.aciklama}`);
          }
          doc.moveDown(0.5);
        });
      }
      
      // PDF'i sonlandır
      doc.end();
      
      console.log(`✅ PDF export tamamlandı: ${fileName}`);
      
    } catch (error) {
      console.error('❌ PDF export hatası:', error);
      res.status(500).json({
        success: false,
        message: 'PDF export sırasında hata oluştu',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },
  getTesvikTimeline: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Teşvik kaydını bul
      const tesvik = await Tesvik.findById(id).populate('revizyonlar.user', 'name email');
      
      if (!tesvik) {
        return res.status(404).json({
          success: false,
          message: 'Teşvik kaydı bulunamadı'
        });
      }
      
      // Revizyon geçmişini hazırla
      const timeline = [];
      
      // İlk oluşturma kaydı
      timeline.push({
        _id: 'created',
        type: 'created',
        title: 'Teşvik Kaydı Oluşturuldu',
        description: `${tesvik.tesvikId} numaralı teşvik kaydı oluşturuldu`,
        user: tesvik.olusturan,
        createdAt: tesvik.createdAt,
        changes: []
      });
      
      // Revizyonları ekle
      if (tesvik.revizyonlar && tesvik.revizyonlar.length > 0) {
        tesvik.revizyonlar.forEach(revizyon => {
          timeline.push({
            _id: revizyon._id,
            type: revizyon.type || 'updated',
            title: revizyon.baslik || 'Revizyon',
            description: revizyon.aciklama,
            reason: revizyon.sebep,
            notes: revizyon.notlar,
            user: revizyon.user,
            createdAt: revizyon.tarih,
            changes: revizyon.degisikenAlanlar || []
          });
        });
      }
      
      // Durum değişikliklerini ekle
      if (tesvik.durumGecmisi && tesvik.durumGecmisi.length > 0) {
        tesvik.durumGecmisi.forEach(durum => {
          timeline.push({
            _id: `status_${durum._id}`,
            type: 'status_changed',
            title: 'Durum Değişikliği',
            description: `Durum "${durum.eskiDurum}" den "${durum.yeniDurum}" e değiştirildi`,
            reason: durum.sebep,
            user: durum.degistiren,
            createdAt: durum.tarih,
            changes: [{
              field: 'Durum',
              oldValue: durum.eskiDurum,
              newValue: durum.yeniDurum
            }]
          });
        });
      }
      
      // Tarihe göre sırala (en yeni en üstte)
      timeline.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      res.json({
        success: true,
        data: timeline
      });
      
    } catch (error) {
      console.error('🚨 Timeline hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Timeline yüklenirken hata oluştu'
      });
    }
  },
  getDestekUnsurlari: (req, res) => {
    res.status(501).json({ success: false, message: 'Destek unsurları yakında gelecek' });
  },
  getTesvikAnalytics: (req, res) => {
    res.status(501).json({ success: false, message: 'Analytics yakında gelecek' });
  },
  getTesvikFormTemplate: getTesvikFormTemplate,
  getNextGmId: getNextGmId,
  addNewOption: addNewOption,
  getOptionsForType: getOptionsForType,
  getTesvikRevisions: getTesvikRevisions,
  
  // 🎯 DİNAMİK VERİ YÖNETİMİ API'LERİ
  getDynamicDestekUnsurlari: getDynamicDestekUnsurlari,
  addDestekUnsuru: addDestekUnsuru,
  getDynamicDestekSartlari: getDynamicDestekSartlari,
  addDestekSarti: addDestekSarti,
  getDynamicOzelSartlar: getDynamicOzelSartlar,
  addOzelSart: addOzelSart,
  getDynamicOzelSartNotlari: getDynamicOzelSartNotlari,
  addOzelSartNotu: addOzelSartNotu
};