// 🧩 İŞLEM VE EVRAK YÖNETİMİ - Talep detayı (/islem-evrak/:id)
// Müşteri sheet'indeki akış tek ekranda:
//   1) İstenenler listesi — ekle/çıkar/düzenle, örnek dosya iliştir
//   2) Mail — düzenle, örnek dosyaları ekle, gönder
//   3) Gelen evraklar — firmanın linkten yüklediği dosyalar

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, Chip, IconButton, Tooltip,
  Checkbox, FormControlLabel, MenuItem, Snackbar, Alert, CircularProgress, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/islemEvrakService';

const IslemEvrakDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [talep, setTalep] = useState(null);
  const [tur, setTur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [snack, setSnack] = useState(null);

  // İstenen evrak listesi (yerel düzenleme — Kaydet ile gönderilir)
  const [evraklar, setEvraklar] = useState([]);
  // Mail alanları
  const [mail, setMail] = useState({ to: '', cc: '', subject: '', body: '', uploadLink: '', smtpConfigured: true });
  const [secilenEkler, setSecilenEkler] = useState([]);

  const notify = (message, severity = 'success') => setSnack({ message, severity });
  const errMsg = (e) => e?.response?.data?.message || e?.message || 'İşlem başarısız';

  const yukle = useCallback(async () => {
    setLoading(true);
    try {
      const t = await svc.talepDetay(id);
      setTalep(t);
      setEvraklar(t.istenenEvraklar || []);
      const tt = await svc.turDetay(t.islemTuru).catch(() => null);
      setTur(tt);
      const m = await svc.mailOnizle(id);
      setMail({
        to: (m.to || []).join(', '),
        cc: (m.cc || []).join(', '),
        subject: m.subject || '',
        body: m.body || '',
        uploadLink: m.uploadLink || '',
        smtpConfigured: m.smtpConfigured
      });
      // Varsayılan: örnek dosyası olan tüm evraklar maile eklenir
      setSecilenEkler((m.ornekDosyalar || []).map((o) => String(o.evrakId)));
    } catch (e) { notify(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { yukle(); }, [yukle]);

  // ── İstenen evraklar
  const evrakEkle = () => setEvraklar((p) => [...p, { ad: '', aciklama: '', zorunlu: true }]);
  const evrakSil = (i) => setEvraklar((p) => p.filter((_, j) => j !== i));
  const evrakDegistir = (i, alan, deger) =>
    setEvraklar((p) => p.map((e, j) => (j === i ? { ...e, [alan]: deger } : e)));

  const evraklariKaydet = async () => {
    const temiz = evraklar.filter((e) => String(e.ad || '').trim());
    setBusy('evrak');
    try {
      const g = await svc.talepGuncelle(id, { istenenEvraklar: temiz });
      setTalep(g); setEvraklar(g.istenenEvraklar || []);
      notify('İstenen evrak listesi kaydedildi');
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const varyantDegistir = async (kod) => {
    if (!window.confirm('Evrak listesi bu türün şablonuyla yeniden oluşturulacak. Devam edilsin mi?')) return;
    setBusy('varyant');
    try {
      const g = await svc.varyantUygula(id, kod);
      setTalep(g); setEvraklar(g.istenenEvraklar || []);
      notify(`${g.varyantAd || 'Varsayılan'} şablonu uygulandı`);
      const m = await svc.mailOnizle(id);
      setMail((p) => ({ ...p, subject: m.subject, body: m.body }));
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const ornekYukle = async (evrakId, file) => {
    if (!file) return;
    setBusy(`ornek-${evrakId}`);
    try {
      const fd = new FormData();
      fd.append('dosyalar', file);
      const g = await svc.ornekDosyaYukle(id, evrakId, fd);
      setTalep(g); setEvraklar(g.istenenEvraklar || []);
      notify('Örnek dosya eklendi — maile ek olarak gidebilir');
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  // ── Mail
  const mailGonder = async () => {
    setBusy('mail');
    try {
      const sonuc = await svc.mailGonder(id, {
        to: mail.to, cc: mail.cc, subject: mail.subject, body: mail.body, ekEvrakIdler: secilenEkler
      });
      setTalep(sonuc.talep);
      notify(`Mail gönderildi${sonuc.ekSayisi ? ` · ${sonuc.ekSayisi} ek` : ''} ✅`);
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const linkKopyala = () => {
    if (mail.uploadLink) {
      navigator.clipboard?.writeText(mail.uploadLink);
      notify('Yükleme linki kopyalandı');
    }
  };

  const yuklenenSil = async (dosyaId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;
    try {
      const g = await svc.yuklenenSil(id, dosyaId);
      setTalep(g);
      notify('Dosya silindi');
    } catch (e) { notify(errMsg(e), 'error'); }
  };

  if (loading) {
    return (
      <LayoutWrapper>
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      </LayoutWrapper>
    );
  }
  if (!talep) {
    return (
      <LayoutWrapper>
        <Box sx={{ p: 4 }}><Alert severity="error">Talep bulunamadı.</Alert></Box>
      </LayoutWrapper>
    );
  }

  const ornekliEvraklar = (talep.istenenEvraklar || []).filter((e) => e.ornekDosya?.dosyaAdi);

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
        {/* Başlık */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/islem-evrak')}><ArrowBackIcon /></IconButton>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{talep.firmaAdi}</Typography>
            <Typography variant="body2" color="text.secondary">
              {talep.islemTuruAdi}{talep.varyantAd ? ` · ${talep.varyantAd}` : ''}
            </Typography>
          </Box>
          {tur?.varyantlar?.length > 0 && (
            <TextField
              select size="small" label="Tür" value={talep.varyantKod || ''}
              onChange={(e) => varyantDegistir(e.target.value)}
              disabled={busy === 'varyant'} sx={{ minWidth: 150 }}
            >
              {tur.varyantlar.map((v) => <MenuItem key={v.kod} value={v.kod}>{v.ad}</MenuItem>)}
            </TextField>
          )}
          <Tooltip title={mail.uploadLink || 'Link üretilecek'}>
            <Chip icon={<ContentCopyIcon />} label="Yükleme linki" onClick={linkKopyala} color="info" size="small" />
          </Tooltip>
          <Tooltip title="Yenile"><IconButton onClick={yukle}><RefreshIcon /></IconButton></Tooltip>
        </Paper>

        {/* 1) İstenen evraklar */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>1. İstenen Evraklar ({evraklar.length})</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" startIcon={<AddIcon />} onClick={evrakEkle}>Satır Ekle</Button>
              <Button size="small" variant="contained" startIcon={<SaveIcon />}
                onClick={evraklariKaydet} disabled={busy === 'evrak'}>Kaydet</Button>
            </Stack>
          </Stack>

          <Stack spacing={1}>
            {evraklar.map((e, i) => (
              <Box key={e._id || i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap', pb: 1, borderBottom: '1px dashed #e2e8f0' }}>
                <Tooltip title={e.geldiMi ? 'Firmadan geldi' : 'Bekleniyor'}>
                  {e.geldiMi
                    ? <CheckCircleIcon sx={{ color: '#059669', mt: 1 }} />
                    : <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1', mt: 1 }} />}
                </Tooltip>
                <TextField
                  size="small" placeholder="Evrak adı" value={e.ad || ''}
                  onChange={(ev) => evrakDegistir(i, 'ad', ev.target.value)}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <TextField
                  size="small" placeholder="Açıklama (opsiyonel)" value={e.aciklama || ''}
                  onChange={(ev) => evrakDegistir(i, 'aciklama', ev.target.value)}
                  sx={{ flex: 1.4, minWidth: 220 }}
                />
                <FormControlLabel
                  control={<Checkbox size="small" checked={e.zorunlu !== false}
                    onChange={(ev) => evrakDegistir(i, 'zorunlu', ev.target.checked)} />}
                  label={<Typography variant="caption">Zorunlu</Typography>}
                />
                {e._id && (
                  <Tooltip title={e.ornekDosya?.dosyaAdi ? `Örnek: ${e.ornekDosya.dosyaAdi}` : 'Örnek/şablon dosya ekle'}>
                    <Button component="label" size="small" variant={e.ornekDosya?.dosyaAdi ? 'contained' : 'outlined'}
                      color={e.ornekDosya?.dosyaAdi ? 'success' : 'primary'}
                      startIcon={<AttachFileIcon />} disabled={busy === `ornek-${e._id}`}>
                      {e.ornekDosya?.dosyaAdi ? 'Örnek ✓' : 'Örnek'}
                      <input hidden type="file" onChange={(ev) => ornekYukle(e._id, ev.target.files?.[0])} />
                    </Button>
                  </Tooltip>
                )}
                <Tooltip title="Satırı sil">
                  <IconButton size="small" color="error" onClick={() => evrakSil(i)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
                {e.isteyenAdi && (
                  <Typography variant="caption" color="text.secondary" sx={{ width: '100%', pl: 4.5 }}>
                    İsteyen: {e.isteyenAdi}
                    {e.istenmeTarihi ? ` · ${new Date(e.istenmeTarihi).toLocaleDateString('tr-TR')}` : ''}
                  </Typography>
                )}
              </Box>
            ))}
            {evraklar.length === 0 && (
              <Typography variant="body2" color="text.secondary">Henüz evrak eklenmedi. "Satır Ekle" ile başlayın.</Typography>
            )}
          </Stack>
        </Paper>

        {/* 2) Mail */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>2. Mail Gönderimi</Typography>
          {!mail.smtpConfigured && <Alert severity="info" sx={{ mb: 1 }}>SMTP yapılandırılmamış — gönderim devre dışı.</Alert>}

          {ornekliEvraklar.length > 0 && (
            <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                Maile eklenecek örnek dosyalar:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ornekliEvraklar.map((e) => {
                  const secili = secilenEkler.includes(String(e._id));
                  return (
                    <Chip
                      key={e._id} size="small"
                      label={e.ornekDosya.dosyaAdi}
                      color={secili ? 'primary' : 'default'}
                      variant={secili ? 'filled' : 'outlined'}
                      onClick={() => setSecilenEkler((p) =>
                        secili ? p.filter((x) => x !== String(e._id)) : [...p, String(e._id)])}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          <Stack spacing={1.5}>
            <TextField label="Kime" size="small" fullWidth value={mail.to}
              onChange={(e) => setMail((p) => ({ ...p, to: e.target.value }))}
              placeholder="firma@ornek.com (virgülle birden fazla)" />
            <TextField label="CC" size="small" fullWidth value={mail.cc}
              onChange={(e) => setMail((p) => ({ ...p, cc: e.target.value }))} placeholder="isteğe bağlı" />
            <TextField label="Konu" size="small" fullWidth value={mail.subject}
              onChange={(e) => setMail((p) => ({ ...p, subject: e.target.value }))} />
            <TextField label="İçerik" fullWidth multiline minRows={12} value={mail.body}
              onChange={(e) => setMail((p) => ({ ...p, body: e.target.value }))}
              helperText="Metni istediğiniz gibi düzenleyebilirsiniz — mail bu haliyle gönderilir." />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              {talep.mailGonderimSayisi > 0
                ? `${talep.mailGonderimSayisi} kez gönderildi · Son: ${new Date(talep.sonMailTarihi).toLocaleString('tr-TR')}`
                : 'Henüz gönderilmedi'}
            </Typography>
            <Button variant="contained" startIcon={busy === 'mail' ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              onClick={mailGonder} disabled={busy === 'mail' || !mail.smtpConfigured || !mail.to.includes('@')}>
              SMTP ile Gönder
            </Button>
          </Stack>
        </Paper>

        {/* 3) Gelen evraklar */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            3. Firmadan Gelen Evraklar ({(talep.yuklenenEvraklar || []).length})
          </Typography>
          {(talep.yuklenenEvraklar || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Henüz yükleme yok. Firma maildeki bağlantıdan dosya yükleyince burada listelenir.
            </Typography>
          )}
          <Stack spacing={1}>
            {(talep.yuklenenEvraklar || []).map((y) => (
              <Box key={y._id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px dashed #e2e8f0', pb: 0.75 }}>
                {y.istenenEvrakAdi && <Chip size="small" variant="outlined" label={y.istenenEvrakAdi} />}
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {new Date(y.yuklemeTarihi).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }} noWrap>{y.orijinalAd || y.dosyaAdi}</Typography>
                {y.yukleyenAdi && <Typography variant="caption" color="text.secondary">{y.yukleyenAdi}</Typography>}
                {y.fileUrl && (
                  <Button size="small" href={y.fileUrl} target="_blank" rel="noopener noreferrer">Aç</Button>
                )}
                <Tooltip title="Sil">
                  <IconButton size="small" color="error" onClick={() => yuklenenSil(y._id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Divider sx={{ my: 2, opacity: 0 }} />
      </Box>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : null}
      </Snackbar>
    </LayoutWrapper>
  );
};

export default IslemEvrakDetail;
