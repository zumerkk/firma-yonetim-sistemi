const mongoose = require('mongoose');

const screenshotJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'error'],
      default: 'pending',
    },
    totalImages: {
      type: Number,
      required: true,
    },
    processedImages: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      default: 0, // 0-100 arası
    },
    results: {
      type: Array, // Ham ekran görüntüsü analiz sonuçları
      default: [],
    },
    mergedData: {
      type: Object, // Birleştirilmiş son teşvik verisi
      default: null,
    },
    errors: {
      type: Array, // Hata alan görsellerin detayları
      default: [],
    },
    errorMessage: {
      type: String, // Genel bir hata (örn: API çökmesi) varsa
      default: null,
    },
    // 💓 Canlılık sinyali: işi yürüten süreç 30 sn'de bir tazeler.
    // Sunucu yeniden başlarsa (OOM/deploy) bu alan donar ve iş "yetim" sayılır.
    // Olmasaydı iş sonsuza dek 'processing' kalıp arayüzü %0'da donduruyordu.
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScreenshotJob', screenshotJobSchema);
