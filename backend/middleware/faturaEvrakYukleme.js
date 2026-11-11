const multer = require('multer');
const { EVRAK_ALANLARI, EVRAK_BOYUTU, EVRAK_SAYISI } = require('../constants/faturaEvrak');

const yukleme = multer({
  storage: multer.memoryStorage(),
  // Busboy sınıra eşit baytı da keser. Uygulamanın üst sınırına eşit dosya geçebilsin.
  limits: { fileSize: EVRAK_BOYUTU + 1, files: EVRAK_SAYISI, fields: 2, fieldSize: 800, fieldNameSize: 40 }
});

const ayristiricilar = Object.fromEntries(Object.entries(EVRAK_ALANLARI).map(([liste, alanlar]) => [
  liste, yukleme.fields(Object.keys(alanlar).map((name) => ({ name, maxCount: EVRAK_SAYISI })))
]));

function faturaDosyalariniAl(req, res, next) {
  ayristiricilar[req.faturaListType](req, res, (err) => {
    if (!err) return next();
    const mesaj = err.code === 'LIMIT_FILE_SIZE' ? 'Her dosya en fazla 10 MB olabilir.'
      : err.code === 'LIMIT_FILE_COUNT' ? 'Bir seferde en fazla 6 dosya yüklenebilir.'
        : 'Bu makine listesi için dosya alanları geçersiz. Lütfen dosyalarınızı tekrar seçin.';
    res.status(400).json({ success: false, message: mesaj });
  });
}

module.exports = faturaDosyalariniAl;
