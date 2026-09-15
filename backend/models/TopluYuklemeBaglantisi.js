// 🔗 TOPLU YÜKLEME BAĞLANTISI — birden fazla makineyi kapsayan tek public yükleme linki
//
// Müşteri (15.09.2026): "Toplu mailde makine'idler ve belge yükleme linki gelmiyor
// '{makineId}' ve '(uploadLink)' olarak geliyor."
//
// Toplu mail TEK mail ve çoğu zaman TEK fatura birden fazla makineyi kapsıyor (müşterinin
// KDV açıklaması örneği: "4743905, 4743906, ... makine ID numaralı 913, 917, ... sıra no'lu
// kalemlerinin teslimatı"). Makine başına ayrı link koymak tedarikçiye aynı faturayı N kez
// yükletirdi; bu link yüklenen evrakı kapsadığı HER makinenin klasörüne ve kaydına işler.
// Çözümleme sırası (tesvikEvrakUploadController.resolveByToken): makine linki → belge geneli
// (Ara Kontrol) linki → toplu link.

const mongoose = require('mongoose');

const topluYuklemeBaglantisiSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, trim: true },
  tesvikModel: { type: String, enum: ['Tesvik', 'YeniTesvik'], required: true },
  tesvikId: { type: mongoose.Schema.Types.ObjectId, required: true },
  processIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MachineProcess' }],
  // Sıralı süreç kimlikleri: aynı seçimle önizlemeyi yeniden açmak yeni link üretmesin
  kapsamAnahtari: { type: String, required: true, index: true },
  expiresAt: { type: Date, default: null },
  olusturanKullanici: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true,
  collection: 'topluyuklemebaglantilari'
});

module.exports = mongoose.model('TopluYuklemeBaglantisi', topluYuklemeBaglantisiSchema);
