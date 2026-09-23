// 🌐 İŞLEM EVRAK PUBLIC YÜKLEME - /evrak/:token (AUTH YOK)
// Firma, maildeki bağlantıdan istenen evrakları yükler.
// Hassas veri gösterilmez: yalnızca firma adı, işlem adı ve istenen evrak listesi.

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, Chip, Alert,
  CircularProgress, Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import UploadProgress from '../../components/common/UploadProgress';
import usePanoDosyaYapistir from '../../hooks/usePanoDosyaYapistir';
import svc from '../../services/islemEvrakService';

const IslemEvrakPublicUpload = () => {
  const { token } = useParams();
  const [bilgi, setBilgi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState('');
  const [seciliEvrak, setSeciliEvrak] = useState('');
  const [nedenler, setNedenler] = useState({});
  const [nedenAcik, setNedenAcik] = useState({});
  const [yukleyenAdi, setYukleyenAdi] = useState('');
  // Firma tarafı en çok burada bekliyor: belirsiz bar yerine gerçek yüzde gösterilir
  const [yukleme, setYukleme] = useState(null);

  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setLoading(true);
    try {
      setBilgi(await svc.publicBilgi(token));
      setHata('');
    } catch (e) {
      setHata(e?.response?.data?.message || 'Bağlantı geçersiz veya süresi dolmuş.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { yukle(); }, [yukle]);

  // Dosya seçimi ve panodan yapıştırma aynı yükleme yolunu kullanır
  const dosyalariYukle = async (files, evrakId = seciliEvrak) => {
    if (!files.length) return;
    setYukleniyor(true); setSonuc(''); setHata('');
    const toplamBayt = files.reduce((s, f) => s + (f.size || 0), 0);
    setYukleme({ fileName: files.length > 1 ? `${files.length} dosya` : files[0].name, pct: 0, loaded: 0, total: toplamBayt });
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('dosyalar', f));
      if (evrakId) fd.append('istenenEvrakId', evrakId);
      if (yukleyenAdi.trim()) fd.append('yukleyenAdi', yukleyenAdi.trim());
      const r = await svc.publicYukle(token, fd, (p) => setYukleme((o) => (o ? { ...o, ...p } : o)));
      setSonuc(r.message || 'Dosyanız yüklendi.');
      await yukle(true); // durum işaretleri tazelensin
    } catch (err) {
      setSonuc('');
      setHata(err?.kullaniciMesaji || err?.response?.data?.message || 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setYukleniyor(false);
      setYukleme(null);
    }
  };

  const dosyaSec = async (e, evrakId) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setSeciliEvrak(evrakId);
    await dosyalariYukle(files, evrakId);
  };

  const nedenKaydet = async (evrakId) => {
    setYukleniyor(true); setHata(''); setSonuc('');
    try {
      const r = await svc.publicNedenKaydet(token, { istenenEvrakId: evrakId, neden: nedenler[evrakId] || '' });
      setSonuc(r.message);
      await yukle(true);
      setNedenAcik(prev => ({ ...prev, [evrakId]: false }));
    } catch (err) {
      setHata(err?.response?.data?.message || 'Neden kaydedilemedi.');
    } finally { setYukleniyor(false); }
  };

  // 📋 Panodan yapıştırma (müşteri: kopyalanan görseli direkt yapıştırma)
  usePanoDosyaYapistir(dosyalariYukle, { aktif: !yukleniyor && !!seciliEvrak });

  if (loading) {
    return <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (hata && !bilgi) {
    return (
      <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
        <Alert severity="error">{hata}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720, mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{bilgi.islemAdi}</Typography>
        <Typography variant="body2" color="text.secondary">
          {bilgi.firmaAdi}{bilgi.varyantAd ? ` · ${bilgi.varyantAd}` : ''}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          Aşağıda listelenen evrakları bu sayfadan yükleyebilirsiniz.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>İstenen Evraklar</Typography>
        <Stack spacing={1}>
          {(bilgi.istenenEvraklar || []).map((e) => (
            <Box key={e.id} sx={{ borderBottom: '1px solid #e2e8f0', py: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                {e.geldiMi
                  ? <CheckCircleIcon sx={{ color: '#059669', fontSize: 20 }} />
                  : <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1', fontSize: 20 }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{e.ad}</Typography>
                  {e.aciklama && <Typography variant="caption" color="text.secondary">{e.aciklama}</Typography>}
                  {e.yuklenememeNedeni && <Typography variant="body2" sx={{ mt: 0.5 }}>Yüklenememe nedeni: {e.yuklenememeNedeni}</Typography>}
                </Box>
                {e.geldiMi && <Chip label={e.yuklenememeNedeni ? 'Neden bildirildi' : 'Yüklendi'} size="small" color="success" />}
                <Button component="label" variant="contained" size="small" startIcon={<CloudUploadIcon />} disabled={yukleniyor}
                  onClick={() => setSeciliEvrak(e.id)}>
                  Dosya yükle
                  <input hidden type="file" multiple aria-label={`${e.ad} yükle`} onChange={(event) => dosyaSec(event, e.id)} />
                </Button>
                <Button size="small" disabled={yukleniyor} onClick={() => {
                  setNedenAcik(prev => ({ ...prev, [e.id]: !prev[e.id] }));
                  setNedenler(prev => ({ ...prev, [e.id]: prev[e.id] ?? e.yuklenememeNedeni ?? '' }));
                }}>Yükleyemiyorum</Button>
              </Stack>
              {nedenAcik[e.id] && <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField multiline minRows={2} size="small" label={`${e.ad} yüklenememe nedeni`}
                  value={nedenler[e.id] || ''} inputProps={{ maxLength: 2000 }} disabled={yukleniyor}
                  onChange={event => { const value = event.target.value; setNedenler(prev => ({ ...prev, [e.id]: value })); }} />
                <Button variant="outlined" disabled={yukleniyor || !nedenler[e.id]?.trim()} onClick={() => nedenKaydet(e.id)}>Nedeni kaydet</Button>
              </Stack>}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <TextField size="small" label="Adınız (opsiyonel)" value={yukleyenAdi}
            onChange={(e) => setYukleyenAdi(e.target.value)} />
          <UploadProgress active={yukleniyor} {...(yukleme || {})} />
          {sonuc && <Alert severity="success">{sonuc}</Alert>}
          {hata && <Alert severity="error" onClose={() => setHata('')}>{hata}</Alert>}
          <Typography variant="caption" color="text.secondary">
            Her evrakın yanındaki düğmeden birden fazla dosya seçebilirsiniz. Dosya başına en fazla {bilgi.maxUploadMB} MB.
            Yükleyemediğiniz evrak için neden belirtmeniz yanıt olarak kabul edilir.
          </Typography>
        </Stack>
      </Paper>

      <Divider sx={{ my: 3, opacity: 0 }} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        GM Planlama Yatırım Danışmanlık
      </Typography>
    </Box>
  );
};

export default IslemEvrakPublicUpload;
