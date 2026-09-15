// 🌐 BELGE TAKİP — FİRMA YÜKLEME SAYFASI - /belge-yukle/:token (AUTH YOK)
//
// Müşteri (15.09.2026): "Birde firma mailine yükleme linki koyabilir miyiz, yüklenen belgeler belge
// takipde firma maili- gelen gibi bir alt kısımda görünebilir"
//
// Firma, belge takipten gönderilen maildeki bağlantıyla buraya gelir. Yüklenen dosyalar talebin
// "Firma Maili" sekmesinde "Firmadan Gelen Belgeler" altında görünür.
// Hassas veri gösterilmez: firma unvanı, talep türü, belge no, beklenen evraklar ve firmanın kendi
// gönderdiği dosyaların adları.

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, Alert, CircularProgress,
  List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import UploadProgress from '../../components/common/UploadProgress';
import usePanoDosyaYapistir from '../../hooks/usePanoDosyaYapistir';
import dosyaTakipService from '../../services/dosyaTakipService';

// Sunucudaki izin listesiyle aynı (controllers/dosyaTakipController.js → IZINLI_UZANTILAR)
const KABUL_EDILEN = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.ppt,.pptx';

const BelgeTakipPublicUpload = () => {
  const { token } = useParams();
  const [bilgi, setBilgi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState('');
  const [yukleyenAdi, setYukleyenAdi] = useState('');
  const [aciklama, setAciklama] = useState('');
  // Belirsiz bar yerine gerçek yüzde: firma "yükleniyor mu, takıldı mı" diye beklemesin
  const [yukleme, setYukleme] = useState(null);

  // sessiz: yükleme sonrası tazelemede sayfa yerine dönen çark gösterilmesin
  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setLoading(true);
    try {
      setBilgi(await dosyaTakipService.publicBilgi(token));
      if (!sessiz) setHata('');
    } catch (e) {
      setHata(e?.response?.data?.message || 'Bağlantı geçersiz veya süresi dolmuş.');
    } finally {
      if (!sessiz) setLoading(false);
    }
  }, [token]);

  useEffect(() => { yukle(); }, [yukle]);

  // Dosya seçimi ve panodan yapıştırma aynı yükleme yolunu kullanır
  const dosyalariYukle = async (files) => {
    if (!files.length) return;
    setYukleniyor(true); setSonuc(''); setHata('');
    const toplamBayt = files.reduce((s, f) => s + (f.size || 0), 0);
    setYukleme({ fileName: files.length > 1 ? `${files.length} dosya` : files[0].name, pct: 0, loaded: 0, total: toplamBayt });
    try {
      const fd = new FormData();
      if (yukleyenAdi.trim()) fd.append('yukleyenAdi', yukleyenAdi.trim());
      if (aciklama.trim()) fd.append('aciklama', aciklama.trim());
      files.forEach((f) => fd.append('dosyalar', f));
      const r = await dosyaTakipService.publicYukle(token, fd, (p) => setYukleme((o) => (o ? { ...o, ...p } : o)));
      setSonuc(r?.message || 'Dosyanız iletildi. Teşekkür ederiz.');
      setAciklama('');
      await yukle(true);
    } catch (err) {
      setHata(err?.kullaniciMesaji || err?.response?.data?.message || 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setYukleniyor(false);
      setYukleme(null);
    }
  };

  const dosyaSec = async (e) => {
    const secilen = Array.from(e.target.files || []);
    if (e.target) e.target.value = '';
    await dosyalariYukle(secilen);
  };

  // 📋 Kopyalanan görseli Ctrl/⌘+V ile yapıştırma
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

  const beklenenler = bilgi?.beklenenler || [];
  const yuklenenler = bilgi?.yuklenenler || [];
  const altBaslik = [bilgi?.firmaUnvan, bilgi?.belgeNo ? `Belge No: ${bilgi.belgeNo}` : ''].filter(Boolean).join(' · ');

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720, mx: 'auto' }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{bilgi?.talepTuru || 'Evrak Gönderimi'}</Typography>
        {altBaslik && <Typography variant="body2" color="text.secondary">{altBaslik}</Typography>}
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          Talebinizle ilgili evrakları bu sayfadan danışmanınıza iletebilirsiniz.
        </Typography>
      </Paper>

      {beklenenler.length > 0 && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Beklenen Evraklar</Typography>
          <List dense disablePadding>
            {beklenenler.map((b, i) => (
              <ListItem key={`${i}-${b}`} disableGutters>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <RadioButtonUncheckedIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText primary={b} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Dosya Yükle</Typography>
        <Stack spacing={2}>
          <TextField
            size="small" label="Adınız (opsiyonel)" value={yukleyenAdi}
            onChange={(e) => setYukleyenAdi(e.target.value)}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            size="small" label="Açıklama (opsiyonel)" value={aciklama}
            placeholder="Örn: Vergi levhası, imza sirküleri"
            onChange={(e) => setAciklama(e.target.value)}
            inputProps={{ maxLength: 300 }}
            helperText="Gönderdiğiniz dosyanın ne olduğunu kısaca yazabilirsiniz"
          />

          <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} disabled={yukleniyor} size="large">
            {yukleniyor ? 'Yükleniyor...' : 'Dosya Seç ve Yükle'}
            <input hidden type="file" multiple accept={KABUL_EDILEN} onChange={dosyaSec} />
          </Button>

          <UploadProgress active={yukleniyor} {...(yukleme || {})} />
          {sonuc && <Alert severity="success">{sonuc}</Alert>}
          {hata && <Alert severity="error" onClose={() => setHata('')}>{hata}</Alert>}

          <Typography variant="caption" color="text.secondary">
            Birden fazla dosya seçebilirsiniz (tek seferde en fazla {bilgi?.enFazlaDosya || 10}) — kopyaladığınız
            görseli Ctrl/⌘+V ile yapıştırabilirsiniz. Dosya başına en fazla {bilgi?.maxUploadMB || 100} MB.
          </Typography>
        </Stack>
      </Paper>

      {yuklenenler.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            İletilen Dosyalar ({yuklenenler.length})
          </Typography>
          <List dense disablePadding>
            {yuklenenler.map((y, i) => (
              <ListItem key={`${i}-${y.ad}`} disableGutters>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckCircleIcon sx={{ color: '#059669', fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText
                  primary={y.ad}
                  primaryTypographyProps={{ sx: { wordBreak: 'break-word' } }}
                  secondary={y.tarih ? new Date(y.tarih).toLocaleString('tr-TR') : ''}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
        GM Planlama Yatırım Danışmanlık
      </Typography>
    </Box>
  );
};

export default BelgeTakipPublicUpload;
