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

// ✏️ TEŞVİK GÜNCELLEME
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

    const tesvik = await Tesvik.findById(id);
    if (!tesvik || !tesvik.aktif) {
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    // Değişiklikleri kaydet (revizyon için)
    const eskiVeri = tesvik.toSafeJSON();
    
    // Güncelleme verisini uygula - null/undefined alanları filtrele
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => {
        // firma alanı null ise güncelleme
        if (key === 'firma' && (value === null || value === undefined || value === '')) {
          return false;
        }
        return value !== null && value !== undefined;
      })
    );
    
    Object.assign(tesvik, filteredUpdateData);
    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = updateData.guncellemeNotu || '';

    // Mali hesaplamaları otomatik güncelle
    tesvik.updateMaliHesaplamalar();
    
    // Durum değişmişse rengi güncelle
    if (updateData.durumBilgileri?.genelDurum) {
      tesvik.updateDurumRengi();
    }

    await tesvik.save();

    // Değişen alanları tespit et
    const changedFields = [];
    const fieldLabels = {
      'yatirimciUnvan': 'Yatırımcı Ünvanı',
      'yatirimciAdres': 'Yatırımcı Adresi',
      'yatirimciTelefon': 'Telefon',
      'yatirimciEmail': 'E-posta',
      'yatirimTutari': 'Yatırım Tutarı',
      'istihdam.mevcutKisi': 'Mevcut Kişi Sayısı',
      'istihdam.yeniKisi': 'Yeni Kişi Sayısı',
      'durumBilgileri.genelDurum': 'Genel Durum',
      'durumBilgileri.durumAciklamasi': 'Durum Açıklaması',
      'maliHesaplamalar.toplamYatirim': 'Toplam Yatırım',
      'maliHesaplamalar.tesvikTutari': 'Teşvik Tutarı',
      'notlar.dahiliNotlar': 'Dahili Notlar',
      'notlar.resmiAciklamalar': 'Resmi Açıklamalar'
    };

    // Nested object değişikliklerini kontrol et
    const checkNestedChanges = (oldObj, newObj, prefix = '') => {
      if (!oldObj || !newObj) return;
      
      Object.keys(newObj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        
        if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
          checkNestedChanges(oldValue, newValue, fullKey);
        } else if (oldValue !== newValue && fieldLabels[fullKey]) {
          changedFields.push({
            field: fieldLabels[fullKey],
            oldValue: oldValue || '-',
            newValue: newValue || '-'
          });
        }
      });
    };

    // Ana alanları kontrol et
    Object.keys(updateData).forEach(key => {
      if (key === 'guncellemeNotu') return; // Skip update note
      
      const oldValue = eskiVeri[key];
      const newValue = updateData[key];
      
      if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
        checkNestedChanges(oldValue, newValue, key);
      } else if (oldValue !== newValue && fieldLabels[key]) {
        changedFields.push({
          field: fieldLabels[key],
          oldValue: oldValue || '-',
          newValue: newValue || '-'
        });
      }
    });

    // Activity log
    await Activity.logActivity({
      action: 'update',
      category: 'tesvik',
      title: 'Teşvik Güncellendi',
      description: `${tesvik.tesvikId} numaralı teşvik güncellendi (${changedFields.length} alan değiştirildi)`,
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
        before: eskiVeri,
        after: tesvik.toSafeJSON(),
        fields: changedFields
      },
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        source: 'web'
      }
    });

    await tesvik.populate('firma', 'tamUnvan firmaId');
    await tesvik.populate('sonGuncelleyen', 'adSoyad email');

    res.json({
      success: true,
      message: 'Teşvik başarıyla güncellendi',
      data: tesvik.toSafeJSON()
    });

  } catch (error) {
    console.error('🚨 Teşvik güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Teşvik güncellenirken hata oluştu',
      error: error.message
    });
  }
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

// 📝 REVİZYON EKLEME
const addTesvikRevizyon = async (req, res) => {
  try {
    const { id } = req.params;
    const { revizyonSebebi, degisikenAlanlar, yeniDurum, kullaniciNotu } = req.body;

    const tesvik = await Tesvik.findById(id);
    if (!tesvik || !tesvik.aktif) {
      return res.status(404).json({
        success: false,
        message: 'Teşvik bulunamadı'
      });
    }

    // Revizyon ekle
    tesvik.addRevizyon({
      revizyonSebebi,
      degisikenAlanlar: degisikenAlanlar || [],
      yapanKullanici: req.user._id,
      yeniDurum,
      kullaniciNotu
    });

    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = kullaniciNotu || `Revizyon eklendi: ${revizyonSebebi}`;

    await tesvik.save();

    // Activity log
    await Activity.logActivity({
      action: 'update',
      category: 'tesvik',
      title: 'Teşvik Revizyonu',
      description: `${tesvik.tesvikId} revizyonu eklendi: ${revizyonSebebi}`,
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
      message: 'Revizyon başarıyla eklendi',
      data: {
        tesvikId: tesvik.tesvikId,
        revizyonNo: tesvik.revizyonlar.length,
        revizyonSebebi,
        eklenmeTarihi: new Date()
      }
    });

  } catch (error) {
    console.error('🚨 Revizyon ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Revizyon eklenirken hata oluştu',
      error: error.message
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

// 📋 REVİZYON EXCEL EXPORT - Her revizyon ayrı satır olacak şekilde
const exportRevizyonExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeColors = true } = req.query;
    
    console.log(`📊 Revizyon Excel export başlatılıyor: ${id}`);
    
    // ID format'ını kontrol et: ObjectId mi yoksa TesvikId mi?
    let tesvik;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // ObjectId format (24 karakter hex)
      tesvik = await Tesvik.findById(id)
        .populate('firma', 'tamUnvan firmaId vergiNoTC')
        .populate('revizyonlar.yapanKullanici', 'adSoyad email rol')
        .populate('olusturanKullanici', 'adSoyad email')
        .populate('sonGuncelleyen', 'adSoyad email')
        .lean();
    } else {
      // TesvikId format (TES20250007 gibi)
      tesvik = await Tesvik.findOne({ tesvikId: id })
        .populate('firma', 'tamUnvan firmaId vergiNoTC')
        .populate('revizyonlar.yapanKullanici', 'adSoyad email rol')
        .populate('olusturanKullanici', 'adSoyad email')
        .populate('sonGuncelleyen', 'adSoyad email')
        .lean();
    }
      
    if (!tesvik) {
      return res.status(404).json({ success: false, message: 'Teşvik bulunamadı' });
    }
    
    // ExcelJS workbook oluştur
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // Stil tanımlamaları
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } },
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
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCFE2F3' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
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
    
    // Revizyon geçmişi sayfası
    const revizyonSheet = workbook.addWorksheet('Revizyon Geçmişi');
    
    // Ana başlık - 12 sütun için güncellendi
    revizyonSheet.mergeCells('A1:L1');
    revizyonSheet.getCell('A1').value = `${tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan} - REVİZYON GEÇMİŞİ RAPORU`;
    revizyonSheet.getCell('A1').style = headerStyle;
    
    // Teşvik bilgi satırı
    revizyonSheet.mergeCells('A2:L2');
    revizyonSheet.getCell('A2').value = `Teşvik ID: ${tesvik.tesvikId || tesvik.gmId} | Firma: ${tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan} | Vergi/TC: ${tesvik.firma?.vergiNoTC || '-'}`;
    revizyonSheet.getCell('A2').style = {
      font: { bold: true, color: { argb: 'FF000000' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    
    // Boş satır bırak
    revizyonSheet.mergeCells('A3:L3');
    revizyonSheet.getCell('A3').value = '';
    revizyonSheet.getCell('A3').style = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    };
    
    // Tablo başlıkları - Resimde gösterilen şablona uygun
    const headers = [
      'SIRA NO',
      'TEŞVİK ID',
      'FİRMA ÜNVANI',
      'REVİZYON NO',
      'REVİZYON TARİHİ',
      'REVİZYON SEBEBİ',
      'DEĞİŞEN ALAN',
      'ESKİ DEĞER',
      'YENİ DEĞER',
      'DEĞİŞİKLİK YAPAN',
      'KULLANICI ROLÜ',
      'DURUM'
    ];
    
    headers.forEach((header, index) => {
      const cell = revizyonSheet.getCell(4, index + 1);
      cell.value = header;
      cell.style = subHeaderStyle;
    });
    
    // İlk oluşturma kaydı ekle - Resim şablonuna uygun
    let rowIndex = 5;
    let siraNo = 1;
    
    const ilkKayit = [
      siraNo,                                                                    // SIRA NO
      tesvik.tesvikId || tesvik.gmId || '-',                                    // TEŞVİK ID
      tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan || '-',                   // FİRMA ÜNVANI
      0,                                                                        // REVİZYON NO
      tesvik.createdAt ? new Date(tesvik.createdAt).toLocaleDateString('tr-TR') + ' ' + new Date(tesvik.createdAt).toLocaleTimeString('tr-TR') : '', // REVİZYON TARİHİ
      'İlk Oluşturma',                                                          // REVİZYON SEBEBİ
      'Sistem',                                                                 // DEĞİŞEN ALAN
      '-',                                                                      // ESKİ DEĞER
      'Teşvik belgesi oluşturuldu',                                            // YENİ DEĞER
      tesvik.olusturanKullanici?.adSoyad || 'Sistem',                          // DEĞİŞİKLİK YAPAN
      tesvik.olusturanKullanici?.rol || 'sistem',                              // KULLANICI ROLÜ
      tesvik.durumBilgileri?.genelDurum || 'taslak'                            // DURUM
    ];
    
    ilkKayit.forEach((value, colIndex) => {
      const cell = revizyonSheet.getCell(rowIndex, colIndex + 1);
      cell.value = value;
      cell.style = dataStyle;
      
      // İlk satır için özel renk (yeşil)
      if (includeColors) {
        cell.style = {
          ...dataStyle,
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } }
        };
      }
    });
    
    siraNo++;
    
    // Revizyon kayıtları - Her alan değişikliği için ayrı satır
    if (tesvik.revizyonlar && tesvik.revizyonlar.length > 0) {
      tesvik.revizyonlar.forEach((revizyon) => {
        const revizyonTarihi = revizyon.revizyonTarihi ? new Date(revizyon.revizyonTarihi).toLocaleDateString('tr-TR') + ' ' + new Date(revizyon.revizyonTarihi).toLocaleTimeString('tr-TR') : '';
        const yapanKullanici = revizyon.yapanKullanici?.adSoyad || 'Bilinmiyor';
        const kullaniciRolu = revizyon.yapanKullanici?.rol || '-';
        const durum = revizyon.durumSonrasi || tesvik.durumBilgileri?.genelDurum || '-';
        
        // Eğer değişiklik detayları varsa, her alan için ayrı satır
        if (revizyon.degisikenAlanlar && revizyon.degisikenAlanlar.length > 0) {
          revizyon.degisikenAlanlar.forEach((degisiklik) => {
            rowIndex++;
            const revizyonData = [
              siraNo,                                                             // SIRA NO
              tesvik.tesvikId || tesvik.gmId || '-',                             // TEŞVİK ID
              tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan || '-',            // FİRMA ÜNVANI
              revizyon.revizyonNo,                                               // REVİZYON NO
              revizyonTarihi,                                                    // REVİZYON TARİHİ
              revizyon.revizyonSebebi || 'Güncelleme',                          // REVİZYON SEBEBİ
              degisiklik.alan || 'Belirtilmemiş',                               // DEĞİŞEN ALAN
              degisiklik.eskiDeger || '-',                                       // ESKİ DEĞER
              degisiklik.yeniDeger || '-',                                       // YENİ DEĞER
              yapanKullanici,                                                    // DEĞİŞİKLİK YAPAN
              kullaniciRolu,                                                     // KULLANICI ROLÜ
              durum                                                              // DURUM
            ];
            
            revizyonData.forEach((value, colIndex) => {
              const cell = revizyonSheet.getCell(rowIndex, colIndex + 1);
              cell.value = value;
              cell.style = dataStyle;
              
              // Durum bazında renk kodlaması (son sütun)
              if (includeColors && colIndex === 11) { // DURUM sütunu
                let fillColor = 'FFFFFFFF'; // Varsayılan beyaz
                
                switch (value) {
                  case 'onaylandi':
                    fillColor = 'FFD4EDDA'; // Yeşil
                    break;
                  case 'reddedildi':
                    fillColor = 'FFF8D7DA'; // Kırmızı
                    break;
                  case 'revize_talep_edildi':
                    fillColor = 'FFFFEAA7'; // Sarı
                    break;
                  case 'inceleniyor':
                    fillColor = 'FFD1ECF1'; // Mavi
                    break;
                  case 'ek_belge_istendi':
                    fillColor = 'FFFDEBD0'; // Turuncu
                    break;
                  default:
                    fillColor = 'FFF0F0F0'; // Gri
                }
                
                cell.style = {
                  ...dataStyle,
                  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
                };
              }
            });
            
            siraNo++;
          });
        } else {
          // Değişiklik detayı yoksa, genel revizyon bilgisi olarak bir satır ekle
          rowIndex++;
          const revizyonData = [
            siraNo,                                                             // SIRA NO
            tesvik.tesvikId || tesvik.gmId || '-',                             // TEŞVİK ID
            tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan || '-',            // FİRMA ÜNVANI
            revizyon.revizyonNo,                                               // REVİZYON NO
            revizyonTarihi,                                                    // REVİZYON TARİHİ
            revizyon.revizyonSebebi || 'Güncelleme',                          // REVİZYON SEBEBİ
            'Genel Güncelleme',                                               // DEĞİŞEN ALAN
            '-',                                                               // ESKİ DEĞER
            'Veriler güncellendi',                                            // YENİ DEĞER
            yapanKullanici,                                                    // DEĞİŞİKLİK YAPAN
            kullaniciRolu,                                                     // KULLANICI ROLÜ
            durum                                                              // DURUM
          ];
          
          revizyonData.forEach((value, colIndex) => {
            const cell = revizyonSheet.getCell(rowIndex, colIndex + 1);
            cell.value = value;
            cell.style = dataStyle;
            
            // Durum bazında renk kodlaması
            if (includeColors && colIndex === 11) {
              let fillColor = 'FFFFFFFF';
              
              switch (value) {
                case 'onaylandi':
                  fillColor = 'FFD4EDDA';
                  break;
                case 'reddedildi':
                  fillColor = 'FFF8D7DA';
                  break;
                case 'revize_talep_edildi':
                  fillColor = 'FFFFEAA7';
                  break;
                case 'inceleniyor':
                  fillColor = 'FFD1ECF1';
                  break;
                case 'ek_belge_istendi':
                  fillColor = 'FFFDEBD0';
                  break;
                default:
                  fillColor = 'FFF0F0F0';
              }
              
              cell.style = {
                ...dataStyle,
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
              };
            }
          });
          
          siraNo++;
        }
      });
    }
    
    // Son güncelleme kaydı ekle (eğer revizyonlardan farklıysa)
    if (tesvik.sonGuncelleyen && tesvik.updatedAt && tesvik.updatedAt > tesvik.createdAt) {
      const sonGuncellemeVar = tesvik.revizyonlar && tesvik.revizyonlar.length > 0 && 
        tesvik.revizyonlar[tesvik.revizyonlar.length - 1].revizyonTarihi < tesvik.updatedAt;
      
      if (sonGuncellemeVar) {
        rowIndex++;
        const sonGuncelleme = [
          rowIndex - 4, // Sıra hesaplaması
          (tesvik.revizyonlar?.length || 0) + 1,
          new Date(tesvik.updatedAt).toLocaleDateString('tr-TR') + ' ' + new Date(tesvik.updatedAt).toLocaleTimeString('tr-TR'),
          '-',
          tesvik.durumBilgileri?.genelDurum || '-',
          'Veri güncelleme',
          tesvik.sonGuncelleyen?.adSoyad || 'Sistem',
          tesvik.sonGuncelleyen?.rol || 'sistem',
          tesvik.sonGuncellemeNotlari || 'Teşvik verileri güncellendi'
        ];
        
        sonGuncelleme.forEach((value, colIndex) => {
          const cell = revizyonSheet.getCell(rowIndex, colIndex + 1);
          cell.value = value;
          cell.style = {
            ...dataStyle,
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } }
          };
        });
      }
    }
    
    // Sütun genişlikleri - Resim şablonuna uygun
    revizyonSheet.columns = [
      { width: 8 },   // SIRA NO
      { width: 15 },  // TEŞVİK ID
      { width: 25 },  // FİRMA ÜNVANI
      { width: 12 },  // REVİZYON NO
      { width: 20 },  // REVİZYON TARİHİ
      { width: 25 },  // REVİZYON SEBEBİ
      { width: 20 },  // DEĞİŞEN ALAN
      { width: 25 },  // ESKİ DEĞER
      { width: 25 },  // YENİ DEĞER
      { width: 20 },  // DEĞİŞİKLİK YAPAN
      { width: 15 },  // KULLANICI ROLÜ
      { width: 15 }   // DURUM
    ];
    
    // Özet sayfası ekle
    const ozetSheet = workbook.addWorksheet('Özet');
    
    // Özet başlık
    ozetSheet.mergeCells('A1:L1');
    ozetSheet.getCell('A1').value = 'REVİZYON ÖZETİ RAPORU';
    ozetSheet.getCell('A1').style = headerStyle;
    
    // Özet bilgi başlığı
    ozetSheet.mergeCells('A2:L2');
    ozetSheet.getCell('A2').value = `${tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan} - Revizyon İstatistikleri`;
    ozetSheet.getCell('A2').style = {
      font: { bold: true, color: { argb: 'FF000000' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCFE2F3' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    
    // Özet bilgileri
    const ozetBilgileri = [
      ['Teşvik ID:', tesvik.tesvikId || tesvik.gmId || '-'],
      ['Firma Ünvanı:', tesvik.firma?.tamUnvan || tesvik.yatirimciUnvan || '-'],
      ['Toplam Revizyon Sayısı:', (tesvik.revizyonlar?.length || 0) + 1], // +1 ilk oluşturma için
      ['Mevcut Durum:', tesvik.durumBilgileri?.genelDurum || 'taslak'],
      ['İlk Oluşturma Tarihi:', tesvik.createdAt ? new Date(tesvik.createdAt).toLocaleDateString('tr-TR') : '-'],
      ['Son Güncelleme Tarihi:', tesvik.updatedAt ? new Date(tesvik.updatedAt).toLocaleDateString('tr-TR') : '-'],
      ['Son Güncelleyen:', tesvik.sonGuncelleyen?.adSoyad || 'Sistem'],
      ['Rapor Oluşturma Tarihi:', new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR')]
    ];
    
    ozetBilgileri.forEach((bilgi, index) => {
      const row = index + 4;
      ozetSheet.getCell(`A${row}`).value = bilgi[0];
      ozetSheet.getCell(`A${row}`).style = {
        ...subHeaderStyle,
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
      ozetSheet.getCell(`B${row}`).value = bilgi[1];
      ozetSheet.getCell(`B${row}`).style = {
        ...dataStyle,
        alignment: { horizontal: 'left', vertical: 'middle' }
      };
    });
    
    // Sütun genişlikleri
    ozetSheet.columns = [
      { width: 25 },   // Açıklama
      { width: 35 },   // Değer
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 },   // Boş
      { width: 15 }    // Boş
    ];
    
    // Excel dosyasını buffer olarak oluştur
    const excelBuffer = await workbook.xlsx.writeBuffer();
    
    // Response headers ayarla
    const fileName = `revizyon_gecmisi_${tesvik.firma?.firmaId}_${tesvik.tesvikId || tesvik.gmId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Activity log
    await Activity.logActivity({
      action: 'export',
      category: 'tesvik',
      title: 'Revizyon Geçmişi Excel Export',
      description: `${tesvik.tesvikId || tesvik.gmId} için revizyon geçmişi Excel olarak export edildi`,
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
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        source: 'web',
        exportType: 'revizyon_excel'
      }
    });
    
    // Excel dosyasını gönder
    res.send(excelBuffer);
    
    console.log(`✅ Revizyon Excel export tamamlandı: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Revizyon Excel export hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Revizyon Excel export sırasında hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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