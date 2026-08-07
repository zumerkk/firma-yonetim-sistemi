// 🧩 İŞLEM VE EVRAK YÖNETİMİ ROUTES
// /api/islem-evrak/* → admin/danışman (auth) · /api/islem-evrak/public/* → token ile açık

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/tesvikUpload');
const ctrl = require('../controllers/islemEvrakController');

const editor = authorize('admin', 'kullanici');

// ── Public (AUTH YOK) — auth middleware'inden ÖNCE tanımlanmalı
router.get('/public/:token', ctrl.publicBilgi);
router.post('/public/:token', uploadMultiple('dosyalar'), ctrl.publicYukle);

// ── Bundan sonrası giriş gerektirir
router.use(authenticate);

// İşlem türleri (şablonlar)
router.get('/turler', ctrl.turListe);
router.get('/turler/:id', ctrl.turDetay);
router.post('/turler', editor, ctrl.turKaydet);
router.put('/turler/:id', editor, ctrl.turKaydet);
router.delete('/turler/:id', editor, ctrl.turSil);

// Talepler
router.get('/talepler', ctrl.talepListe);
router.post('/talepler', editor, ctrl.talepOlustur);
router.get('/talepler/:id', ctrl.talepDetay);
router.patch('/talepler/:id', editor, ctrl.talepGuncelle);
router.delete('/talepler/:id', editor, ctrl.talepSil);
router.post('/talepler/:id/varyant', editor, ctrl.talepVaryantUygula);
router.get('/talepler/:id/mail-onizle', ctrl.talepMailOnizle);
router.post('/talepler/:id/mail-gonder', editor, ctrl.talepMailGonder);
router.post('/talepler/:id/link', editor, ctrl.talepLinkUret);
router.post('/talepler/:id/evrak/:evrakId/ornek', editor, uploadMultiple('dosyalar'), ctrl.talepOrnekDosyaYukle);
// İndirme: hem firmanın yüklediği evrak hem örnek/şablon dosya (görüntüleme yetkisi yeterli)
router.get('/talepler/:id/dosya/:dosyaId/indir', ctrl.talepDosyaIndir);
router.delete('/talepler/:id/yuklenen/:dosyaId', editor, ctrl.talepYuklenenSil);

module.exports = router;
