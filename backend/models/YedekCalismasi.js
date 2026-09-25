// 🗂️ Yedek çalışma kaydı — "en son ne zaman, ne yedeklendi" sorusunun cevabı
//
// Yedeğin sessizce durması, hiç yedek olmamasından beterdir: kimse fark etmez.
// Her çalışma (otomatik ya da elle) buraya yazılır; Ayarlar ekranı son durumu gösterir.
const mongoose = require('mongoose');

const yedekCalismasiSchema = new mongoose.Schema({
  tur: { type: String, enum: ['otomatik', 'elle'], default: 'otomatik', index: true },
  basladi: { type: Date, default: Date.now, index: true },
  bitti: { type: Date },
  basarili: { type: Boolean, default: false },
  baslatan: { type: String, trim: true, default: 'Sistem' },

  veritabani: {
    dosyaAdi: String,
    boyut: Number,
    driveId: String,
    toplamKayit: Number,
    eksikler: { type: [String], default: [] }
  },
  evrak: {
    envanter: Number,      // sistemdeki toplam dosya
    yedekliOnceden: Number,
    yuklenen: Number,
    hatali: Number,
    hatalar: { type: [String], default: [] },
    sureDoldu: { type: Boolean, default: false }  // bütçe bitti, kalanlar yarın
  },
  temizlik: { silinen: { type: Number, default: 0 } },
  hata: { type: String, trim: true, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('YedekCalismasi', yedekCalismasiSchema);
