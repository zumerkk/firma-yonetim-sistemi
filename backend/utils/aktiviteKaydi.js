// 📋 "Son İşlemler" (Activity) kaydı — istekten şemaya uygun kayıt üretir
//
// SORUN: Activity şeması kullanıcıyı gömülü nesne olarak ister
//     user: { id, name, email, role }   +   category, title, description zorunlu
// Belge Takip ise `user: req.user._id` ve şemada olmayan `entityType/details`
// gönderiyordu. Her kayıt doğrulamada düşüyor, hata yalnız konsola yazılıyordu;
// hiçbir Belge Takip işlemi Son İşlemler ekranına ulaşmadı.
//
// ÇÖZÜM: Kullanıcı ve istemci bilgisini req'ten tek yerde dolduran yardımcı.
// Kayıt EN-İYİ-ÇABA'dır: yazılamazsa asıl işlem asla bozulmaz, yalnız konsola düşer.

const net = require('net');
const Activity = require('../models/Activity');

// Rol modelin listesinde yoksa şema varsayılanına bırakılır; kayıt düşmesin
const ROLLER = Activity.schema.path('user.role').enumValues;

// Şemadaki uzunluk sınırını aşan tek bir alan bütün kaydı geçersiz kılar (ör. Firma
// tam ünvanı 500 karaktere kadar olabilir, targetResource.name en fazla 200) → kırp.
const kirp = (metin, sinir) => (typeof metin === 'string' ? metin.slice(0, sinir) : metin);

// Modelin IP doğrulayıcısı kısaltılmış IPv6'yı (ör. 2a02:e0::1) reddediyor; böyle bir
// adres yüzünden kaydı kaybetmektense IP'siz yazılır. ::ffff:1.2.3.4 → 1.2.3.4
const istemciIp = (req) => {
  const ip = String(req.ip || '').replace(/^::ffff:/, '');
  return net.isIPv4(ip) || ip === '::1' ? ip : undefined;
};

/**
 * @param {import('express').Request} req  kimliği doğrulanmış istek (req.user dolu)
 * @param {object} kayit  action, category, title, description; isteğe bağlı targetResource, changes, tags, metadata
 * @returns {Promise<object|null>} kaydedilen Activity, yazılamadıysa null (asla hata fırlatmaz)
 */
const aktiviteKaydet = async (req, kayit) => {
  try {
    const kullanici = req.user || {};
    const hedef = kayit.targetResource;
    return await Activity.logActivity({
      ...kayit,
      title: kirp(kayit.title, 200),
      description: kirp(kayit.description, 500),
      ...(hedef && { targetResource: { ...hedef, name: kirp(hedef.name, 200) } }),
      user: {
        id: kullanici._id,
        name: kullanici.adSoyad || kullanici.email,
        email: kullanici.email,
        role: ROLLER.includes(kullanici.rol) ? kullanici.rol : undefined
      },
      metadata: {
        ip: istemciIp(req),
        userAgent: kirp(req.get('User-Agent'), 500),
        ...kayit.metadata
      }
    });
  } catch (hata) {
    console.error('🚨 Aktivite kaydı hatası:', hata.message);
    return null;
  }
};

module.exports = { aktiviteKaydet };
