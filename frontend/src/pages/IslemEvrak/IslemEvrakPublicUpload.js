// 🌐 İŞLEM EVRAK PUBLIC YÜKLEME - /evrak/:token (AUTH YOK)
// Firma, maildeki bağlantıdan istenen evrakları yükler.
// Hassas veri gösterilmez: yalnızca firma adı, işlem adı ve istenen evrak listesi.

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, Chip, Alert, MenuItem,
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
  const [yukleyenAdi, setYukleyenAdi] = useState('');
  // Firma tarafı en çok burada bekliyor: belirsiz bar yerine gerçek yüzde gösterilir
  const [yukleme, setYukleme] = useState(null);

  const yukle = useCallback(async () => {
    setLoading(true);
    try {
      setBilgi(await svc.publicBilgi(token));
      setHata('');
    } catch (e) {
      setHata(e?.response?.data?.message || 'Bağlantı geçersiz veya süresi dolmuş.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { yukle(); }, [yukle]);

  // Dosya seçimi ve panodan yapıştırma aynı yükleme yolunu kullanır
  const dosyalariYukle = async (files) => {
    if (!files.length) return;
    setYukleniyor(true); setSonuc('');
    const toplamBayt = files.reduce((s, f) => s + (f.size || 0), 0);
    setYukleme({ fileName: files.length > 1 ? `${files.length} dosya` : files[0].name, pct: 0, loaded: 0, total: toplamBayt });
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('dosyalar', f));
      if (seciliEvrak) fd.append('istenenEvrakId', seciliEvrak);
      if (yukleyenAdi.trim()) fd.append('yukleyenAdi', yukleyenAdi.trim());
      const r = await svc.publicYukle(token, fd, (p) => setYukleme((o) => (o ? { ...o, ...p } : o)));
      setSonuc(r.message || 'Dosyanız yüklendi.');
      await yukle(); // durum işaretleri tazelensin
    } catch (err) {
      setSonuc('');
      setHata(err?.kullaniciMesaji || err?.response?.data?.message || 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setYukleniyor(false);
      setYukleme(null);
    }
  };

  const dosyaSec = async (e) => {
    await dosyalariYukle(Array.from(e.target.files || []));
    if (e.target) e.target.value = '';
  };

  // 📋 Panodan yapıştırma (müşteri: kopyalanan görseli direkt yapıştırma)
  usePanoDosyaYapistir(dosyalariYukle, { aktif: !yukleniyor });

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
            <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {e.geldiMi
                ? <CheckCircleIcon sx={{ color: '#059669', fontSize: 20 }} />
                : <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1', fontSize: 20 }} />}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {e.ad} {!e.zorunlu && <Chip label="opsiyonel" size="small" sx={{ height: 16, fontSize: '0.6rem', ml: 0.5 }} />}
                </Typography>
                {e.aciklama && <Typography variant="caption" color="text.secondary">{e.aciklama}</Typography>}
              </Box>
              {e.geldiMi && <Chip label="Yüklendi" size="small" color="success" />}
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Dosya Yükle</Typography>
        <Stack spacing={2}>
          <TextField
            select size="small" label="Hangi evrak? (opsiyonel)" value={seciliEvrak}
            onChange={(e) => setSeciliEvrak(e.target.value)}
            helperText="Seçerseniz dosya o evrakla eşleştirilir"
          >
            <MenuItem value="">Belirtmeden yükle</MenuItem>
            {(bilgi.istenenEvraklar || []).map((e) => (
              <MenuItem key={e.id} value={e.id}>{e.ad}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small" label="Adınız (opsiyonel)" value={yukleyenAdi}
            onChange={(e) => setYukleyenAdi(e.target.value)}
          />

          <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} disabled={yukleniyor} size="large">
            {yukleniyor ? 'Yükleniyor...' : 'Dosya Seç ve Yükle'}
            <input hidden type="file" multiple onChange={dosyaSec} />
          </Button>

          <UploadProgress active={yukleniyor} {...(yukleme || {})} />
          {sonuc && <Alert severity="success">{sonuc}</Alert>}
          {hata && bilgi && <Alert severity="error" onClose={() => setHata('')}>{hata}</Alert>}

          <Typography variant="caption" color="text.secondary">
            Birden fazla dosya seçebilirsiniz — kopyaladığınız görseli Ctrl/⌘+V ile yapıştırabilirsiniz. Dosya başına en fazla {bilgi.maxUploadMB} MB.
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
