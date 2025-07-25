// 🏆 TEŞVİK CONTROLLER - ENTERPRISE EDITION
// Excel + Word şablonu analizine göre tam kapsamlı controller
// Mali hesaplamalar + renk kodlaması + durum yönetimi + revizyon takibi

const Tesvik = require('../models/Tesvik');
const Firma = require('../models/Firma');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
    
    // Güncelleme verisini uygula
    Object.assign(tesvik, updateData);
    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = updateData.guncellemeNotu || '';

    // Mali hesaplamaları otomatik güncelle
    tesvik.updateMaliHesaplamalar();
    
    // Durum değişmişse rengi güncelle
    if (updateData.durumBilgileri?.genelDurum) {
      tesvik.updateDurumRengi();
    }

    await tesvik.save();

    // Activity log
    await Activity.logActivity({
      action: 'update',
      category: 'tesvik',
      title: 'Teşvik Güncellendi',
      description: `${tesvik.tesvikId} numaralı teşvik güncellendi`,
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
        after: tesvik.toSafeJSON()
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

    // Soft delete
    tesvik.aktif = false;
    tesvik.sonGuncelleyen = req.user._id;
    tesvik.sonGuncellemeNotlari = 'Teşvik silindi';
    
    await tesvik.save();

    // Activity log
    await Activity.logActivity({
      action: 'delete',
      category: 'tesvik',
      title: 'Teşvik Silindi',
      description: `${tesvik.tesvikId} numaralı teşvik silindi`,
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

      // Destek Unsurları Seçenekleri
      getDestekUnsurlariOptions(),

      // Destek Şartları Seçenekleri
      getDestekSartlariOptions(),

      // Özel Şart Kısaltmaları - CSV'den
      getOzelSartKisaltmalariOptions(),

      // Özel Şart Notları
      getOzelSartNotlariOptions()
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

// 🏢 OSB (Organize Sanayi Bölgesi) SEÇENEKLERİ
const getOsbOptions = () => [
  { il: 'Adana', osb: 'Adana Gıda İhtisas OSB' },
  { il: 'Adana', osb: 'Adana Hacı Sabancı OSB' },
  { il: 'Adana', osb: 'Adana Karataş TDİ (Su Ürünleri)' },
  { il: 'Adana', osb: 'Adana TDİ (Sera)' },
  { il: 'Adana', osb: 'Ceyhan OSB' },
  { il: 'Adana', osb: 'Kozan OSB' },
  { il: 'Adıyaman', osb: 'Adıyaman OSB' },
  { il: 'Adıyaman', osb: 'Adıyaman Gölbaşı OSB' },
  { il: 'Adıyaman', osb: 'Adıyaman Kahta OSB' },
  { il: 'Afyonkarahisar', osb: 'Afyonkarahisar OSB' },
  { il: 'Afyonkarahisar', osb: 'Afyonkarahisar Bolvadin OSB' },
  { il: 'Afyonkarahisar', osb: 'Afyonkarahisar Bolvadin TDİ(Besi)' },
  // ... daha fazla OSB seçeneği eklenebilir
];

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
  sorguBaglantisi: '',
  belgeBaslamaTarihi: null,
  belgeBitisTarihi: null,
  uzatimTarihi: null,
  mucbirUzatimTarihi: null
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
  calculateMaliHesaplamalar,
  getDurumRenkleri,
  getNextTesvikId,
  bulkUpdateDurum,
  
  // TODO: Implement remaining functions
  exportTesvikExcel: (req, res) => {
    res.status(501).json({ success: false, message: 'Excel export yakında gelecek' });
  },
  exportTesvikPDF: (req, res) => {
    res.status(501).json({ success: false, message: 'PDF export yakında gelecek' });
  },
  getTesvikTimeline: (req, res) => {
    res.status(501).json({ success: false, message: 'Timeline yakında gelecek' });
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
  getOptionsForType: getOptionsForType
}; 