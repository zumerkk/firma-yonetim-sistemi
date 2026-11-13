const express = require('express');
const { authorize } = require('../middleware/auth');
const faturaDosyalariniAl = require('../middleware/faturaEvrakYukleme');
const { HARCAMA_KATEGORILERI } = require('../constants/harcama');
const harcama = require('../services/tesvikMakine/harcamaService');

const router = express.Router({ mergeParams: true });
const editor = authorize('admin', 'kullanici');

const istek = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Harcama Takip:', error.message);
    res.status(status).json({
      success: false,
      message: status < 500 || status === 503 ? error.message : 'Harcama işlemi tamamlanamadı. Lütfen tekrar deneyin.'
    });
  }
};

const yanitla = (fn, status = 200) => istek(async (req, res) => {
  res.status(status).json({ success: true, data: await fn(req) });
});

router.use(istek(async (req, _res, next) => {
  req.harcamaBelgesi = await harcama.belgeFiltresi(req.params);
  next();
}));

router.param('kalemId', istek((req, _res, next) => {
  req.harcamaFiltresi = harcama.kalemFiltresi(req.harcamaBelgesi, req.params.kalemId);
  next();
}));

router.get('/', yanitla(async (req) => ({
  kalemler: await harcama.listele(req.harcamaBelgesi), kategoriler: HARCAMA_KATEGORILERI
})));
router.post('/', editor, yanitla((req) => harcama.ekle(req.harcamaBelgesi, req.body || {}, req.user), 201));
router.patch('/:kalemId', editor, yanitla((req) => harcama.guncelle(req.harcamaFiltresi, req.body || {}, req.user)));
router.delete('/:kalemId', editor, yanitla((req) => harcama.sil(req.harcamaFiltresi)));

const evrakYuklemeYetkisi = istek(async (req, _res, next) => {
  const { listType } = await harcama.evrakBaglami(req.harcamaFiltresi);
  req.faturaListType = listType;
  next();
});

router.post('/:kalemId/evrak', editor, evrakYuklemeYetkisi, faturaDosyalariniAl,
  yanitla((req) => harcama.evrakYukle(req.harcamaFiltresi, {
    istekId: req.body?.istekId, dosyalar: req.files, user: req.user
  })));

router.get('/:kalemId/evrak/:evrakId', istek(async (req, res) => {
  const { evrak, buffer } = await harcama.evrakIndir(req.harcamaFiltresi, req.params.evrakId);
  res.attachment(evrak.dosyaAdi);
  res.set({
    'Content-Type': evrak.mimeType,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.send(buffer);
}));

module.exports = router;
