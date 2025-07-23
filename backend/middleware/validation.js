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
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Firma ilçesi 2-50 karakter arasında olmalıdır')
    .trim(),
    
  // Excel'deki ek alanlar
  body('kepAdresi')
    .optional()
    .isEmail()
    .withMessage('Geçerli bir KEP adresi giriniz')
    .normalizeEmail(),
    
  body('yabanciSermayeli')
    .optional()
    .isBoolean()
    .withMessage('Yabancı sermayeli alanı true/false olmalıdır'),
    
  body('anaFaaliyetKonusu')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Ana faaliyet konusu 200 karakterden fazla olamaz')
    .trim(),
    
  // Yetki bitiş tarihleri
  body('etuysYetkiBitisTarihi')
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('ETUYS yetki bitiş tarihi gelecek bir tarih olmalıdır');
      }
      return true;
    }),
    
  body('dysYetkiBitisTarihi')
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('DYS yetki bitiş tarihi gelecek bir tarih olmalıdır');
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
    .optional()
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir firma telefon numarası giriniz'),
    
  body('firmaEmail')
    .optional()
    .isEmail()
    .withMessage('Geçerli bir firma e-posta adresi giriniz')
    .normalizeEmail(),
    
  body('firmaWebsite')
    .optional()
    .isURL()
    .withMessage('Geçerli bir website adresi giriniz'),
    
  body('notlar')
    .optional()
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
    .notEmpty()
    .withMessage('Birinci yetkili kişi telefon 1 zorunludur')
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz (Telefon 1)'),
    
  body('yetkiliKisiler.0.eposta1')
    .notEmpty()
    .withMessage('Birinci yetkili kişi e-posta 1 zorunludur')
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
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Firma ilçesi 2-50 karakter arasında olmalıdır')
    .trim(),
    
  body('kepAdresi')
    .optional()
    .isEmail()
    .withMessage('Geçerli bir KEP adresi giriniz')
    .normalizeEmail(),
    
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
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('ETUYS yetki bitiş tarihi gelecek bir tarih olmalıdır');
      }
      return true;
    }),
    
  body('dysYetkiBitisTarihi')
    .optional()
    .isISO8601()
    .withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD)')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('DYS yetki bitiş tarihi gelecek bir tarih olmalıdır');
      }
      return true;
    }),
    
  body('ilkIrtibatKisi')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('İlk irtibat kişisi 2-100 karakter arasında olmalıdır')
    .trim(),
    
  body('firmaTelefon')
    .optional()
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir firma telefon numarası giriniz'),
    
  body('firmaEmail')
    .optional()
    .isEmail()
    .withMessage('Geçerli bir firma e-posta adresi giriniz')
    .normalizeEmail(),
    
  body('firmaWebsite')
    .optional()
    .isURL()
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
    .optional()
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz (Telefon 1)'),
    
  body('yetkiliKisiler.*.telefon2')
    .optional()
    .matches(/^[0-9+\s-()]{10,20}$/)
    .withMessage('Geçerli bir telefon numarası giriniz (Telefon 2)'),
    
  body('yetkiliKisiler.*.eposta1')
    .optional()
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz (E-posta 1)')
    .normalizeEmail(),
    
  body('yetkiliKisiler.*.eposta2')
    .optional()
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi giriniz (E-posta 2)')
    .normalizeEmail()
];

module.exports = {
  // Auth validations
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  
  // Firma validations - Excel formatına uygun
  validateCreateFirma,
  validateUpdateFirma
}; 