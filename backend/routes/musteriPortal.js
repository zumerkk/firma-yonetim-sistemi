// 🔗 MÜŞTERİ BELGE LİNKİ — personel linki üretir (oturumlu); firma token ile görür ve kalem girer.
// Bkz. services/musteriPortal/portalService.js

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const faturaDosyalariniAl = require('../middleware/faturaEvrakYukleme');
const portal = require('../services/musteriPortal/portalService');
const ozelNotlar = require('../services/tesvik/belgeOzelNotlar');

const router = express.Router();
const editor = authorize('admin', 'kullanici');

function hataGonder(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error('🚨 [musteriPortal]', err && (err.stack || err.message));
  res.status(status).json({ success: false, message: status >= 500 ? 'İşlem yapılamadı. Lütfen tekrar deneyin.' : err.message });
}

const gonder = (fn) => async (req, res) => {
  try {
    res.json({ success: true, data: await fn(req) });
  } catch (err) {
    hataGonder(res, err);
  }
};

// ───────── Personel ─────────
router.get('/yonetim/:tesvikModel/:tesvikId/notlar', authenticate,
  gonder((req) => ozelNotlar.listele(req.params.tesvikModel, req.params.tesvikId)));
router.post('/yonetim/:tesvikModel/:tesvikId/notlar', authenticate, editor,
  gonder((req) => ozelNotlar.ekle(req.params.tesvikModel, req.params.tesvikId, req.body?.metin, req.user)));
router.delete('/yonetim/:tesvikModel/:tesvikId/notlar/:notId', authenticate, editor,
  gonder((req) => ozelNotlar.sil(req.params.tesvikModel, req.params.tesvikId, req.params.notId)));
router.get('/yonetim/:tesvikModel/:tesvikId', authenticate,
  gonder((req) => portal.linkGetir(req.params.tesvikModel, req.params.tesvikId)));
router.post('/yonetim/:tesvikModel/:tesvikId', authenticate, editor,
  gonder((req) => portal.linkUret(req.params.tesvikModel, req.params.tesvikId, {
    user: req.user, yenile: req.body?.yenile === true, istekId: req.body?.istekId, beklenenSurum: req.body?.beklenenSurum
  })));
router.delete('/yonetim/:tesvikModel/:tesvikId', authenticate, editor,
  gonder((req) => portal.linkKapat(req.params.tesvikModel, req.params.tesvikId)));

// ───────── Firma (AUTH YOK, token) ─────────
// Kalem girişi için ayrı sınır: genel /api sınırının (15 dk'da 1000) çok altında
const kalemSiniri = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla kayıt denemesi. Lütfen biraz sonra tekrar deneyin.' }
});

router.get('/:token', gonder((req) => portal.portalVerisi(req.params.token)));
router.post('/:token/fatura-kalemi', kalemSiniri, gonder((req) => portal.firmaKalemiEkle(req.params.token, req.body || {})));

async function faturaBaglantisiniDogrula(req, res, next) {
  try {
    const { proc } = await portal.firmaFaturaEvrakBaglami(req.params.token, req.params.kalemId);
    req.faturaListType = proc.listType;
    next();
  } catch (err) { hataGonder(res, err); }
}

router.post('/:token/fatura-kalemi/:kalemId/evrak', kalemSiniri, faturaBaglantisiniDogrula, faturaDosyalariniAl,
  gonder((req) => portal.firmaFaturaEvrakiYukle(req.params.token, req.params.kalemId, req.body, req.files)));

module.exports = router;
