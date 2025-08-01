// ✅ Validation Middleware - Excel Formatına Uygun
// Excel sisteminin modern validation kuralları
// Otomatik firma ID, yeni alanlar, tam uyum

const { body } = require('express-validator');

// 👤 Kullanıcı Validasyonları
const validateRegister = [
  body('adSoyad')
    .notEmpty()
    .withMessage('Ad Soyad zorunludur')
    .isLength({ min: 2, max: 100 })
    .withMessage('Ad Soyad 2-100 karakter arasında olmalıdır')
    .trim(),
    
  body('email')
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('E-posta adresi çok uzun'),
    
  body('sifre')
    .isLength({ min: 6 })
    .withMessage('Şifre en az 6 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
    
  body('telefon')
    .optional()
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz'),
    
  body('rol')
    .optional()
    .isIn(['admin', 'kullanici', 'readonly'])
    .withMessage('Geçersiz rol')
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail(),
    
  body('sifre')
    .notEmpty()
    .withMessage('Şifre zorunludur')
];

const validateUpdateProfile = [
  body('adSoyad')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ad Soyad 2-100 karakter arasında olmalıdır')
    .trim(),
    
  body('telefon')
    .optional()
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz'),
    
  body('notlar')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notlar 500 karakterden fazla olamaz')
    .trim()
];

const validateChangePassword = [
  body('eskiSifre')
    .notEmpty()
    .withMessage('Mevcut şifre zorunludur'),
    
  body('yeniSifre')
    .isLength({ min: 6 })
    .withMessage('Yeni şifre en az 6 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Yeni şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir')
];

// 🏢 Firma Validasyonları - Excel Formatına Uygun
const validateCreateFirma = [
  // firmaId artık otomatik oluşturuluyor, manuel girişe gerek yok
  
  // Temel kimlik bilgileri - Excel formatı
  body('vergiNoTC')
    .notEmpty()
    .withMessage('Vergi No/TC zorunludur')
    .matches(/^\d{10}$|^\d{11}$/)
    .withMessage('Vergi No (10 hane) veya TC No (11 hane) formatında olmalıdır')
    .trim(),
    
  body('tamUnvan')
    .notEmpty()
    .withMessage('Tam ünvan zorunludur')
    .isLength({ min: 3, max: 500 })
    .withMessage('Tam ünvan 3-500 karakter arasında olmalıdır')
    .trim(),
    
  // Adres bilgileri - Excel formatı
  body('adres')
    .notEmpty()
    .withMessage('Adres zorunludur')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Adres 10-1000 karakter arasında olmalıdır')
    .trim(),
    
  body('firmaIl')
    .notEmpty()
    .withMessage('Firma ili zorunludur')
    .isLength({ min: 2, max: 50 })
    .withMessage('Firma ili 2-50 karakter arasında olmalıdır')
    .trim(),
    
  body('firmaIlce')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 50 })
    .withMessage('Firma ilçesi 2-50 karakter arasında olmalıdır')
    .trim(),
    
  // Excel'deki ek alanlar
  body('kepAdresi')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .isEmail()
    .withMessage('Geçerli bir KEP adresi giriniz')
    .normalizeEmail(),
    
  body('yabanciSermayeli')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .isBoolean()
    .withMessage('Yabancı sermayeli alanı true/false olmalıdır'),
    
  body('anaFaaliyetKonusu')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .isLength({ max: 200 })
    .withMessage('Ana faaliyet konusu 200 karakterden fazla olamaz')
    .trim(),
    
  // Yetki bitiş tarihleri
  body('etuysYetkiBitisTarihi')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && value.trim() !== '') {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Bugünün başlangıcı
        
        if (inputDate < today) {
          throw new Error('ETUYS yetki bitiş tarihi bugün veya gelecek bir tarih olmalıdır');
        }
      }
      return true;
    }),
    
  body('dysYetkiBitisTarihi')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && value.trim() !== '') {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Bugünün başlangıcı
        
        if (inputDate < today) {
          throw new Error('DYS yetki bitiş tarihi bugün veya gelecek bir tarih olmalıdır');
        }
      }
      return true;
    }),
    
  // İrtibat bilgisi - Excel'de zorunlu
  body('ilkIrtibatKisi')
    .notEmpty()
    .withMessage('İlk irtibat kişisi zorunludur')
    .isLength({ min: 2, max: 100 })
    .withMessage('İlk irtibat kişisi 2-100 karakter arasında olmalıdır')
    .trim(),
    
  // Modern eklentiler (fazlası)
  body('firmaTelefon')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir firma telefon numarası giriniz'),
    
  body('firmaEmail')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .isEmail()
    .withMessage('Geçerli bir firma e-posta adresi giriniz')
    .normalizeEmail(),
    
  body('firmaWebsite')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        // URL validation - http:// veya https:// ile başlamalı
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('Website adresi http:// veya https:// ile başlamalıdır');
        }
      }
      return true;
    })
    .withMessage('Geçerli bir website adresi giriniz'),
    
  body('notlar')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .isLength({ max: 2000 })
    .withMessage('Notlar 2000 karakterden fazla olamaz')
    .trim(),
    
  // Yetkili kişiler array validasyonu - Excel formatı
  body('yetkiliKisiler')
    .isArray({ min: 1, max: 2 })
    .withMessage('En az 1, en fazla 2 yetkili kişi eklenmelidir'),
    
  // Birinci yetkili kişi (zorunlu alanlar)
  body('yetkiliKisiler.0.adSoyad')
    .notEmpty()
    .withMessage('Birinci yetkili kişi ad soyad zorunludur')
    .isLength({ min: 2, max: 100 })
    .withMessage('Yetkili kişi ad soyad 2-100 karakter arasında olmalıdır')
    .trim(),
    
  body('yetkiliKisiler.0.telefon1')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz (Telefon 1)'),
    
  body('yetkiliKisiler.0.eposta1')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz (E-posta 1)')
    .normalizeEmail(),
    
  // Birinci yetkili kişi (opsiyonel alanlar)
  body('yetkiliKisiler.0.telefon2')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz (Telefon 2)'),
    
  body('yetkiliKisiler.0.eposta2')
    .optional({ checkFalsy: true })  // Boş string'i de kabul et
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz (E-posta 2)')
    .normalizeEmail(),
    
  // İkinci yetkili kişi (tamamı opsiyonel)
  body('yetkiliKisiler.1.adSoyad')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 100 })
    .withMessage('İkinci yetkili kişi ad soyad 2-100 karakter arasında olmalıdır')
    .trim(),
    
  body('yetkiliKisiler.1.telefon1')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz'),
    
  body('yetkiliKisiler.1.telefon2')
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz'),
    
  body('yetkiliKisiler.1.eposta1')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail(),
    
  body('yetkiliKisiler.1.eposta2')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz')
    .normalizeEmail()
];

const validateUpdateFirma = [
  // Güncelleme için tüm alanlar opsiyonel (firmaId hariç - o değişmez)
  
  body('vergiNoTC')
    .optional()
    .matches(/^\d{10}$|^\d{11}$/)
    .withMessage('Vergi No (10 hane) veya TC No (11 hane) formatında olmalıdır')
    .trim(),
    
  body('tamUnvan')
    .optional()
    .isLength({ min: 3, max: 500 })
    .withMessage('Tam ünvan 3-500 karakter arasında olmalıdır')
    .trim(),
    
  body('adres')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Adres 10-1000 karakter arasında olmalıdır')
    .trim(),
    
  body('firmaIl')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Firma ili 2-50 karakter arasında olmalıdır')
    .trim(),
    
  body('firmaIlce')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 50 })
    .withMessage('Firma ilçesi 2-50 karakter arasında olmalıdır')
    .trim(),
    
  body('kepAdresi')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          throw new Error('Geçerli bir KEP adresi giriniz');
        }
      }
      return true;
    }),
    
  body('yabanciSermayeli')
    .optional()
    .isBoolean()
    .withMessage('Yabancı sermayeli alanı true/false olmalıdır'),
    
  body('anaFaaliyetKonusu')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Ana faaliyet konusu 200 karakterden fazla olamaz')
    .trim(),
    
  body('etuysYetkiBitisTarihi')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && value.trim() !== '') {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Bugünün başlangıcı
        
        if (inputDate < today) {
          throw new Error('ETUYS yetki bitiş tarihi bugün veya gelecek bir tarih olmalıdır');
        }
      }
      return true;
    }),
    
  body('dysYetkiBitisTarihi')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && value.trim() !== '') {
        const inputDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Bugünün başlangıcı
        
        if (inputDate < today) {
          throw new Error('DYS yetki bitiş tarihi bugün veya gelecek bir tarih olmalıdır');
        }
      }
      return true;
    }),
    
  body('ilkIrtibatKisi')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('İlk irtibat kişisi 2-100 karakter arasında olmalıdır')
    .trim(),
    
  body('firmaTelefon')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        const phonePattern = /^[0-9+\s-()]{10,20}$/;
        if (!phonePattern.test(value)) {
          throw new Error('Geçerli bir firma telefon numarası giriniz');
        }
      }
      return true;
    }),
    
  body('firmaEmail')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          throw new Error('Geçerli bir firma e-posta adresi giriniz');
        }
      }
      return true;
    }),
    
  body('firmaWebsite')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        // URL validation - http:// veya https:// ile başlamalı
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          throw new Error('Website adresi http:// veya https:// ile başlamalıdır');
        }
      }
      return true;
    })
    .withMessage('Geçerli bir website adresi giriniz'),
    
  body('notlar')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Notlar 2000 karakterden fazla olamaz')
    .trim(),
    
  // Yetkili kişiler array validasyonu (güncelleme için opsiyonel)
  body('yetkiliKisiler')
    .optional()
    .isArray({ min: 1, max: 2 })
    .withMessage('En az 1, en fazla 2 yetkili kişi eklenmelidir'),
    
  body('yetkiliKisiler.*.adSoyad')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Yetkili kişi ad soyad 2-100 karakter arasında olmalıdır')
    .trim(),
    
  body('yetkiliKisiler.*.telefon1')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        const phonePattern = /^[0-9+\s-()]{10,20}$/;
        if (!phonePattern.test(value)) {
          throw new Error('Geçerli bir telefon numarası giriniz (Telefon 1)');
        }
      }
      return true;
    }),
    
  body('yetkiliKisiler.*.telefon2')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        const phonePattern = /^[0-9+\s-()]{10,20}$/;
        if (!phonePattern.test(value)) {
          throw new Error('Geçerli bir telefon numarası giriniz (Telefon 2)');
        }
      }
      return true;
    }),
    
  body('yetkiliKisiler.*.eposta1')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          throw new Error('Geçerli bir e-posta adresi giriniz (E-posta 1)');
        }
      }
      return true;
    }),
    
  body('yetkiliKisiler.*.eposta2')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value && value.trim() !== '') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          throw new Error('Geçerli bir e-posta adresi giriniz (E-posta 2)');
        }
      }
      return true;
    })
];

// 🏆 TEŞVİK VALİDASYONLARI - ENTERPRISE EDITION
const validateCreateTesvik = [
  body('gmId')
    .notEmpty()
    .withMessage('GM ID zorunludur')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('GM ID 3-50 karakter arasında olmalıdır'),
    
  body('firma')
    .notEmpty()
    .withMessage('Firma seçimi zorunludur')
    .isMongoId()
    .withMessage('Geçersiz firma ID'),
    
  body('yatirimciUnvan')
    .notEmpty()
    .withMessage('Yatırımcı ünvanı zorunludur')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Yatırımcı ünvanı 3-500 karakter arasında olmalıdır'),
    
  body('yatirimBilgileri.yatirimKonusu')
    .notEmpty()
    .withMessage('Yatırım konusu zorunludur')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Yatırım konusu 3-200 karakter arasında olmalıdır'),
    
  body('yatirimBilgileri.destekSinifi')
    .notEmpty()
    .withMessage('Destek sınıfı zorunludur')
    .trim(),
    
  body('yatirimBilgileri.yerinIl')
    .notEmpty()
    .withMessage('Yatırım yeri ili zorunludur')
    .trim(),
    
  body('belgeYonetimi.belgeNo')
    .notEmpty()
    .withMessage('Belge numarası zorunludur')
    .trim(),
    
  body('belgeYonetimi.belgeTarihi')
    .notEmpty()
    .withMessage('Belge tarihi zorunludur')
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz'),
    
  body('kunyeBilgileri.sgkSicilNo')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('SGK Sicil No en fazla 50 karakter olabilir'),
    
  body('kunyeBilgileri.revizeId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Revize ID en fazla 50 karakter olabilir'),
];

const validateUpdateTesvik = [
  body('yatirimciUnvan')
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Yatırımcı ünvanı 3-500 karakter arasında olmalıdır'),
    
  body('durumBilgileri.genelDurum')
    .optional()
    .isIn(['taslak', 'hazirlaniyor', 'başvuru_yapildi', 'inceleniyor', 'ek_belge_istendi', 'revize_talep_edildi', 'onay_bekliyor', 'onaylandi', 'reddedildi', 'iptal_edildi'])
    .withMessage('Geçersiz durum'),
];

const validateDurumUpdate = [
  body('yeniDurum')
    .notEmpty()
    .withMessage('Yeni durum zorunludur')
    .isIn(['taslak', 'hazirlaniyor', 'başvuru_yapildi', 'inceleniyor', 'ek_belge_istendi', 'revize_talep_edildi', 'onay_bekliyor', 'onaylandi', 'reddedildi', 'iptal_edildi'])
    .withMessage('Geçersiz durum'),
    
  body('aciklama')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Açıklama 500 karakterden fazla olamaz'),
];

module.exports = {
  // Auth validations
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  
  // Firma validations - Excel formatına uygun
  validateCreateFirma,
  validateUpdateFirma,
  
  // 🏆 Teşvik validations
  validateCreateTesvik,
  validateUpdateTesvik,
  validateDurumUpdate
};