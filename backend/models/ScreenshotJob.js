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
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScreenshotJob', screenshotJobSchema);
