// 📄 Drive'a kopyalanmış evrak kaydı — artımlı yedek için
//
// Her gece bütün dosyaları yeniden yüklemek 600+ MB trafik demek olurdu; bunun yerine
// hangi dosyanın kopyalandığı burada tutulur ve yalnız yenileri gönderilir.
// İŞ VERİSİNE DOKUNULMAZ: bu ayrı bir koleksiyondur, DosyaTakip/UploadedDocument'a bayrak yazılmaz.
const mongoose = require('mongoose');

const yedekDosyaSchema = new mongoose.Schema({
  // Kaynak URL veya özel deponun sabit kimliği
  anahtar: { type: String, required: true, unique: true, index: true },
  kaynak: { type: String, trim: true, default: '' },
  ad: { type: String, trim: true, default: '' },
  boyut: { type: Number, default: 0 },
  driveId: { type: String, trim: true, default: '' },
  driveAd: { type: String, trim: true, default: '' },
  tarih: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('YedekDosya', yedekDosyaSchema);
