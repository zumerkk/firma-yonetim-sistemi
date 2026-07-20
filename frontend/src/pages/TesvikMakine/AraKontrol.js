// 📮 ARA KONTROL MAİLİ - /tesvikler/ara-kontrol
// Belge geneli firma maili: onaylı makine listesi (ek/link) + faturaların XML+PDF yüklenmesi talebi.
// Müşteri istekleri: (1) ek elle YA DA sistemden otomatik eklenebilsin, (2) genişleyebilir yeni bir yer,
// (3) mail gönderilmeden önce serbestçe düzenlenebilsin — düzenlenen hali gönderilir.

import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Stack, Autocomplete, TextField, Button, Checkbox, FormControlLabel,
  Chip, Alert, Snackbar, Divider, Tooltip, CircularProgress, IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmailIcon from '@mui/icons-material/Email';
import CloseIcon from '@mui/icons-material/Close';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/tesvikMakineService';
import { formatDate } from './helpers';

const ARA_KONTROL_KODU = 'ara_kontrol_fatura_talebi';
// {listeBilgisi} cümlesinin iki hali — ek durumu değişince metinde birbirine çevrilir (v2 şablonuyla uyumlu)
const LISTE_EKTE = 'yerli makine listesi ektedir';
const LISTE_AYRICA = 'yerli makine listesi tarafımızca ayrıca iletilecektir';
const EVRAK_TUR_ETIKET = {
  kdv_muafiyet: 'KDV Muafiyet', proforma_teklif: 'Proforma/Teklif', fatura_taslak: 'Fatura Taslağı',
  fatura_onayli: 'Onaylı Fatura', sevk_teslimat: 'Sevk/Teslimat', diger: 'Diğer'
};

const AraKontrol = () => {
  const [belgeler, setBelgeler] = useState([]);
  const [belgeArama, setBelgeArama] = useState('');
  const [belgeLoading, setBelgeLoading] = useState(false);
  const [secili, setSecili] = useState(null);

  const [compose, setCompose] = useState(null);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sistemListesi, setSistemListesi] = useState(false);
  const [ekler, setEkler] = useState([]);

  const [busy, setBusy] = useState('');
  const [gecmis, setGecmis] = useState([]);
  const [yuklemeler, setYuklemeler] = useState([]); // firmadan gelen belge-geneli yüklemeler
  const [snack, setSnack] = useState(null);

  const notify = (message, severity = 'success') => setSnack({ message, severity });
  const errMsg = (e) => e?.response?.data?.message || e?.message || 'İşlem başarısız';
  // listCertificates satırlarında tesvikId = Mongo ObjectId (tesvikKodu ise GM kodu)
  const idOf = (b) => b?.tesvikId;

  // Belge arama (300ms debounce) — Eski + Yeni sistem belgelerini birlikte listeler
  useEffect(() => {
    const t = setTimeout(async () => {
      setBelgeLoading(true);
      try {
        const r = await svc.listCertificates({ q: belgeArama || undefined, limit: 50 });
        setBelgeler(Array.isArray(r?.data) ? r.data : []);
      } catch { setBelgeler([]); } finally { setBelgeLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [belgeArama]);

  const gecmisiYukle = async (b) => {
    try {
      const mails = await svc.getCertMails(b.tesvikModel, idOf(b));
      setGecmis((mails || []).filter((m) => m.templateCode === ARA_KONTROL_KODU));
    } catch { setGecmis([]); }
  };

  // Ara Kontrol linkiyle firmanın yüklediği dosyalar = makine sürecine bağlı OLMAYAN evrak kayıtları
  const yuklemeleriYukle = async (b) => {
    try {
      const docs = await svc.getCertDocuments(b.tesvikModel, idOf(b));
      setYuklemeler((docs || []).filter((d) => !d.machineProcessId));
    } catch { setYuklemeler([]); }
  };

  const indir = async (d) => {
    try {
      const res = await svc.downloadDocument(d._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = d.originalName || d.fileName || 'evrak';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) { notify(errMsg(e), 'error'); }
  };

  const belgeSecildi = async (b) => {
    setSecili(b); setCompose(null); setGecmis([]); setYuklemeler([]); setEkler([]); setSistemListesi(false);
    if (!b) return;
    setBusy('compose');
    try {
      const c = await svc.araKontrolCompose(b.tesvikModel, idOf(b));
      setCompose(c);
      setSubject(c.subject || '');
      setBody(c.body || '');
      setTo((c.to || []).join(', '));
      setCc('');
      await gecmisiYukle(b);
      await yuklemeleriYukle(b);
      if (!(c.to || []).length) notify('Firma kayıtlarında e-posta bulunamadı — alıcıyı elle girin.', 'warning');
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  // Ek durumu değişince {listeBilgisi} cümlesini otomatik uyarla (elle yazılan diğer metne dokunmaz)
  useEffect(() => {
    const ekVar = sistemListesi || ekler.length > 0;
    setBody((prev) => (ekVar ? prev.replace(LISTE_AYRICA, LISTE_EKTE) : prev.replace(LISTE_EKTE, LISTE_AYRICA)));
  }, [sistemListesi, ekler.length]);

  const dosyaSec = (e) => {
    const yeni = Array.from(e.target.files || []);
    if (yeni.length) setEkler((prev) => [...prev, ...yeni]);
    e.target.value = '';
  };

  const gonder = async () => {
    if (!secili) return;
    setBusy('send');
    try {
      const fd = new FormData();
      ekler.forEach((f) => fd.append('ekler', f));
      fd.append('to', to);
      fd.append('cc', cc);
      fd.append('subject', subject);
      fd.append('body', body);
      fd.append('sistemListesi', sistemListesi ? '1' : '0');
      await svc.araKontrolSend(secili.tesvikModel, idOf(secili), fd);
      notify('Ara kontrol maili gönderildi ✅');
      await gecmisiYukle(secili);
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const linkKopyala = () => {
    if (compose?.uploadLink) {
      navigator.clipboard?.writeText(compose.uploadLink);
      notify('Yükleme linki kopyalandı');
    }
  };

  const gonderilebilir = !!secili && !!compose && to.trim().includes('@') && subject.trim() && body.trim() && busy !== 'send';

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
        {/* Başlık */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EmailIcon color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Ara Kontrol Maili</Typography>
            <Typography variant="body2" color="text.secondary">
              Firmaya belge geneli mail: onaylı makine listesi (ek veya link) + faturaların XML ve PDF yüklenmesi talebi
            </Typography>
          </Box>
        </Paper>

        {/* 1) Belge seçimi */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>1. Belge Seç</Typography>
          <Autocomplete
            options={belgeler}
            value={secili}
            loading={belgeLoading}
            onChange={(e, val) => belgeSecildi(val)}
            onInputChange={(e, val, reason) => { if (reason === 'input') setBelgeArama(val); }}
            getOptionLabel={(b) => `${b.belgeNo || b.belgeId || b.tesvikKodu || '—'} — ${b.firmaAdi || ''}`}
            isOptionEqualToValue={(a, b) => idOf(a) === idOf(b)}
            filterOptions={(x) => x}
            renderOption={(props, b) => {
              const { key, ...rest } = props;
              return (
                <Box component="li" key={`${b.tesvikModel}-${idOf(b)}`} {...rest} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" color="primary" label={b.belgeNo || b.belgeId || b.tesvikKodu || '—'} />
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>{b.firmaAdi || ''}</Typography>
                  <Chip size="small" variant="outlined" label={`${(b.localCount || 0) + (b.importCount || 0)} makine`} />
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Belge no veya firma adı ile ara..." size="small" />
            )}
          />
          {secili && compose && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`Belge: ${compose.belgeNo || '—'}`} />
              <Chip size="small" label={`Yerli: ${compose.yerliSayisi}`} variant="outlined" />
              <Chip size="small" label={`İthal: ${compose.ithalSayisi}`} variant="outlined" />
              <Tooltip title={compose.uploadLink || ''}>
                <Chip size="small" color="info" icon={<ContentCopyIcon />} label="Yükleme linkini kopyala" onClick={linkKopyala} />
              </Tooltip>
            </Stack>
          )}
          {busy === 'compose' && <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center"><CircularProgress size={16} /><Typography variant="caption">Şablon hazırlanıyor...</Typography></Stack>}
        </Paper>

        {secili && compose && (
          <>
            {/* 2) Ekler */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>2. Makine Listesi / Ekler</Typography>
              <FormControlLabel
                control={<Checkbox checked={sistemListesi} onChange={(e) => setSistemListesi(e.target.checked)} />}
                label={
                  <Box>
                    <Typography variant="body2">Yerli makine listesini sistemden ekle (Excel)</Typography>
                    <Typography variant="caption" color="text.secondary">Belgedeki yerli listeden otomatik üretilir (ithal dahil edilmez)</Typography>
                  </Box>
                }
              />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                <Button component="label" variant="outlined" size="small" startIcon={<AttachFileIcon />}>
                  Dosya Ekle (PDF/Excel/Görsel)
                  <input hidden type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.xml" onChange={dosyaSec} />
                </Button>
                {ekler.map((f, i) => (
                  <Chip key={`${f.name}-${i}`} size="small" label={f.name}
                    onDelete={() => setEkler((prev) => prev.filter((_, j) => j !== i))} deleteIcon={<CloseIcon />} />
                ))}
                {sistemListesi && <Chip size="small" color="success" label="Yerli_Makine_Listesi.xlsx (sistemden)" />}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Henüz makineleri sisteme girilmemiş firmalar için hazır listeyi elle dosya olarak ekleyebilirsiniz.
              </Typography>
            </Paper>

            {/* 3) Mail içeriği (düzenlenebilir) */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>3. Mail İçeriği</Typography>
                <Tooltip title="Şablonu baştan doldur (düzenlemeleriniz silinir)">
                  <IconButton size="small" onClick={() => belgeSecildi(secili)}><RefreshIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Stack>
              {!compose.smtpConfigured && <Alert severity="info" sx={{ mb: 1 }}>SMTP yapılandırılmamış — gönderim devre dışı.</Alert>}
              <Stack spacing={1.5}>
                <TextField label="Kime" size="small" fullWidth value={to} onChange={(e) => setTo(e.target.value)}
                  placeholder="firma@ornek.com (virgülle birden fazla)" />
                <TextField label="CC" size="small" fullWidth value={cc} onChange={(e) => setCc(e.target.value)}
                  placeholder="isteğe bağlı" />
                <TextField label="Konu" size="small" fullWidth value={subject} onChange={(e) => setSubject(e.target.value)} />
                <TextField label="İçerik" fullWidth multiline minRows={12} value={body} onChange={(e) => setBody(e.target.value)}
                  helperText="Metni istediğiniz gibi düzenleyebilirsiniz — mail bu haliyle gönderilir." />
              </Stack>
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button variant="contained" startIcon={busy === 'send' ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  onClick={gonder} disabled={!gonderilebilir || !compose.smtpConfigured}>
                  SMTP ile Gönder
                </Button>
              </Stack>
            </Paper>

            {/* 4) Gönderim geçmişi */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Bu Belgenin Ara Kontrol Gönderimleri ({gecmis.length})</Typography>
              {gecmis.length === 0 && <Typography variant="body2" color="text.secondary">Henüz gönderim yok.</Typography>}
              <Stack spacing={1}>
                {gecmis.map((m) => (
                  <Box key={m._id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px dashed #e2e8f0', pb: 0.75 }}>
                    <Chip size="small" color={m.status === 'sent' ? 'success' : m.status === 'failed' ? 'error' : 'default'}
                      label={m.status === 'sent' ? 'Gönderildi' : m.status === 'failed' ? 'Başarısız' : 'Taslak'} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDate(m.sentAt || m.createdAt)}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 160 }}>
                      {(m.toEmails || []).join(', ')}
                    </Typography>
                    <Typography variant="caption" noWrap sx={{ maxWidth: 320 }}>{m.subject}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* 5) Firmadan gelen yüklemeler — müşteri: "karşı taraf belge yüklediğinde nereye geliyor?" */}
            <Paper sx={{ p: 2, mt: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Firmadan Gelen Yüklemeler ({yuklemeler.length})</Typography>
                <Tooltip title="Listeyi yenile">
                  <IconButton size="small" onClick={() => yuklemeleriYukle(secili)}><RefreshIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Stack>
              {yuklemeler.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Henüz yükleme yok. Firma maildeki bağlantıdan dosya yükleyince burada listelenir; ayrıca üstteki zil bildirimine düşer ve size bilgilendirme maili gelir.
                </Typography>
              )}
              <Stack spacing={1}>
                {yuklemeler.map((d) => (
                  <Box key={d._id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px dashed #e2e8f0', pb: 0.75 }}>
                    <Chip size="small" variant="outlined" label={EVRAK_TUR_ETIKET[d.documentType] || 'Diğer'} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDate(d.createdAt, true)}</Typography>
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 160 }}>{d.originalName || d.fileName}</Typography>
                    {d.uploaderName && <Typography variant="caption" color="text.secondary">{d.uploaderName}</Typography>}
                    <Tooltip title="İndir">
                      <IconButton size="small" color="primary" onClick={() => indir(d)}><DownloadIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </>
        )}

        <Divider sx={{ my: 2, opacity: 0 }} />
      </Box>

      <Snackbar open={!!snack} autoHideDuration={4500} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : null}
      </Snackbar>
    </LayoutWrapper>
  );
};

export default AraKontrol;
