const mongoose = require('mongoose');
const Tesvik = require('../../models/Tesvik');
const YeniTesvik = require('../../models/YeniTesvik');
const BelgeOzelNot = require('../../models/BelgeOzelNot');

const modeller = { Tesvik, YeniTesvik };
const hata = (message, status) => Object.assign(new Error(message), { status });

async function belgeyiKontrolEt(tesvikModel, tesvikId) {
  if (!Object.hasOwn(modeller, tesvikModel) || !mongoose.isObjectIdOrHexString(tesvikId)) {
    throw hata('Geçersiz belge bilgisi.', 400);
  }
  if (!await modeller[tesvikModel].exists({ _id: tesvikId })) throw hata('Belge bulunamadı.', 404);
}

async function listele(tesvikModel, tesvikId) {
  await belgeyiKontrolEt(tesvikModel, tesvikId);
  return BelgeOzelNot.find({ tesvikModel, tesvikId }).sort({ createdAt: -1, _id: -1 }).lean();
}

async function ekle(tesvikModel, tesvikId, metin, user) {
  if (typeof metin !== 'string' || !metin.trim() || metin.trim().length > 5000) {
    throw hata('Not 1–5000 karakter olmalıdır.', 400);
  }
  await belgeyiKontrolEt(tesvikModel, tesvikId);
  return BelgeOzelNot.create({
    tesvikModel, tesvikId, metin: metin.trim(),
    kullanici: user._id, kullaniciAdi: user.adSoyad || 'Personel'
  });
}

module.exports = { listele, ekle };
