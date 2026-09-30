// 🌐 PUBLIC EVRAK YÜKLEME - /upload/tesvik/:token  (AUTH YOK)
// Müşteri/tedarikçi için sade yükleme ekranı. LayoutWrapper KULLANMAZ.
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, MenuItem, Button, Alert, CircularProgress, Stack, Divider, Chip, IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TutarAlani from '../../components/common/TutarAlani';
import api from '../../utils/axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadProgress from '../../components/common/UploadProgress';
import svc from '../../services/tesvikMakineService';
import islemEvrakSvc from '../../services/islemEvrakService';
import { listTypeLabel } from './helpers';
import usePanoDosyaYapistir from '../../hooks/usePanoDosyaYapistir';

// Component DIŞINDA tanımlı olmalı: içeride tanımlanırsa her render'da yeni component
// kimliği oluşur, alt ağaç remount olur ve input her tuşta focus kaybeder.
function Wrapper({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, maxWidth: 520, width: '100%' }}>{children}</Paper>
    </Box>
  );
}

export default function PublicUpload() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Sunucudan gelen ilk tür ile değiştirilir; public linkte artık yalnızca fatura türleri var
  const [docType, setDocType] = useState('fatura_taslak');
  const [note, setNote] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Firma tarafı burada bekliyor: belirsiz spinner yerine gerçek yüzde
  const [yukleme, setYukleme] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // 🧾 Fatura bildirimi — müşteri (29.09.2026): "firmaların onaylı faturalarını doldurmak için bu
  // fatura listesine özel bir yükleme linki … 'Fatura Tarih - Fatura No - Kalem Tutarı' … Bu
  // doldurdukları bilgiler de otomatik olarak uygun sıra numarasındaki makineye yansısın."
  const [faturalar, setFaturalar] = useState([]);
  const [faturaDurum, setFaturaDurum] = useState('');
  const [faturaHata, setFaturaHata] = useState('');
  const [faturaGonderiliyor, setFaturaGonderiliyor] = useState(false);
  const anahtarRef = useRef(0);
  const yeniFatura = (siraNo = '') => ({ _a: `k${(anahtarRef.current += 1)}`, siraNo, tarih: '', no: '', tutar: 0, adet: 0 });
  const faturaDegistir = (i, alan, deger) => setFaturalar((o) => o.map((f, x) => (x === i ? { ...f, [alan]: deger } : f)));

  const faturaGonder = async () => {
    setFaturaGonderiliyor(true); setFaturaHata(''); setFaturaDurum('');
    try {
      const govde = faturalar
        .filter((f) => f.no || f.tutar || f.adet || f.tarih)
        .map(({ _a, ...f }) => ({ ...f, siraNo: Number(f.siraNo) || undefined }));
      if (!govde.length) { setFaturaHata('Lütfen en az bir fatura satırı doldurun.'); return; }
      const yanit = await api.post(`/tesvik-evrak/${token}/faturalar`, { faturalar: govde, bildiren: uploaderName });
      setFaturaDurum(yanit.data?.message || 'Fatura bilgileri iletildi.');
      setFaturalar([]);
    } catch (e) {
      setFaturaHata(e?.response?.data?.message || 'Fatura bilgisi iletilemedi. Lütfen tekrar deneyin.');
    } finally { setFaturaGonderiliyor(false); }
  };
  const fileRef = useRef(null);

  useEffect(() => {
    let iptal = false;
    svc.publicInfo(token)
      .then((d) => {
        if (iptal) return;
        setInfo(d); setDocType(d.documentTypes?.[0]?.key || 'diger');
        setLoading(false);
      })
      .catch(async (e) => {
        if (iptal) return;
        // 🔁 Geriye dönük kurtarma: İşlem & Evrak modülü bir dönem linkleri bu yola üretti
        // (doğrusu /evrak/:token). Firmanın elindeki eski mailler bozulmasın diye, token
        // bu modülde geçersizse İşlem & Evrak tarafında deneyip oraya yönlendiriyoruz.
        try {
          await islemEvrakSvc.publicBilgi(token);
          if (!iptal) navigate(`/evrak/${token}`, { replace: true });
          return;
        } catch (digerHata) { /* orada da yok → asıl hatayı göster */ }
        if (!iptal) {
          setError(e?.response?.data?.message || 'Bağlantı geçersiz veya süresi dolmuş.');
          setLoading(false);
        }
      });
    return () => { iptal = true; };
  }, [token, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!files.length) { setSubmitError('Lütfen en az bir dosya seçin.'); return; }
    setSubmitting(true);
    setYukleme({ fileName: files.length > 1 ? `${files.length} dosya` : files[0].name, pct: 0, loaded: 0, total: files.reduce((t, f) => t + (f.size || 0), 0) });
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f)); // çoklu (XML + PDF aynı anda)
      fd.append('documentType', docType);
      fd.append('note', note);
      fd.append('uploaderName', uploaderName);
      fd.append('uploaderType', 'customer');
      await svc.publicUpload(token, fd, (p) => setYukleme((o) => (o ? { ...o, ...p } : o)));
      setDone(true);
    } catch (err) {
      setSubmitError(err?.kullaniciMesaji || err?.response?.data?.message || 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
    } finally { setSubmitting(false); setYukleme(null); }
  };

  // 📋 Panodan yapıştırma — kopyalanan görsel/dosya seçime eklenir (müşteri: WhatsApp gibi)
  usePanoDosyaYapistir((dosyalar) => setFiles((onceki) => [...onceki, ...dosyalar]), {
    aktif: !submitting && !done
  });

  if (loading) return <Wrapper><Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box></Wrapper>;
  if (error) return <Wrapper><Alert severity="error">{error}</Alert></Wrapper>;

  if (done) return (
    <Wrapper>
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
        <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>Dosyanız başarıyla yüklendi</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Teşekkür ederiz. Belgeniz tarafımıza ulaştı ve kontrol edilecektir.</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { setDone(false); setFiles([]); setNote(''); if (fileRef.current) fileRef.current.value = ''; }}>Yeni Dosya Yükle</Button>
      </Box>
    </Wrapper>
  );

  return (
    <Wrapper>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Teşvik Evrak Yükleme</Typography>
        <Typography variant="body2" color="text.secondary">Lütfen ilgili evrakı aşağıdan yükleyiniz.</Typography>
      </Stack>
      <Box sx={{ bgcolor: '#f8fafc', p: 2, mb: 2 }}>
        <Row label="Firma" value={info.firmaAdi} />
        <Row label="Belge No" value={info.belgeNo} />
        <Row label="Makine" value={`${info.siraNo ? info.siraNo + '. ' : ''}${info.makineAdi}`} />
        {/* Toplu mail linki birden fazla makineyi kapsar: yüklenen evrak hepsine işlenir */}
        {Array.isArray(info.makineler) && info.makineler.length > 0 ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Bu bağlantıyla yüklenen evrak aşağıdaki makinelerin hepsine işlenir:
            </Typography>
            {info.makineler.map((m) => (
              <Typography key={`${m.siraNo}-${m.makineId}-${m.makineAdi}`} variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>
                {m.siraNo ? `${m.siraNo}. ` : ''}{m.makineAdi || 'Makine'}{m.makineId ? ` (ID ${m.makineId})` : ''}
              </Typography>
            ))}
          </Box>
        ) : (
          <Row label="Liste" value={listTypeLabel(info.listType)} />
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />

      {/* 🧾 Fatura bilgisi — makine kapsamı olan bağlantılarda */}
      {(Array.isArray(info.makineler) ? info.makineler.length > 0 : !!info.siraNo) && (
        <Box sx={{ mb: 3 }}>
          {/* Müşteri (30.09.2026): "Fatura Bilgisinden (opsiyonel) yazısını kaldıralım, gören
              firmalar kesin yazmaz; satır ama yine opsiyonel kalsın işlem olarak." Başlıkta
              yazmıyor ama alan zorunlu değil: boş bırakılırsa yalnız dosya yüklenir. */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Fatura Bilgisi</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Kestiğiniz faturaları buraya girebilirsiniz; bilgiler ilgili sıra numaralı makineye işlenir.
          </Typography>
          <Stack spacing={1}>
            {faturalar.map((f, i) => (
              <Stack key={f._a} direction="row" spacing={1} flexWrap="wrap" useFlexGap
                sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1 }}>
                {Array.isArray(info.makineler) && info.makineler.length > 0 && (
                  <TextField select size="small" label="Makine (sıra no)" value={f.siraNo}
                    onChange={(e) => faturaDegistir(i, 'siraNo', e.target.value)} sx={{ flex: '1 1 100%' }}>
                    {info.makineler.map((m) => (
                      <MenuItem key={`${m.siraNo}-${m.makineId}`} value={m.siraNo}>
                        {m.siraNo}. {m.makineAdi || 'Makine'}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <TextField size="small" type="date" label="Fatura Tarihi" InputLabelProps={{ shrink: true }}
                  value={f.tarih} onChange={(e) => faturaDegistir(i, 'tarih', e.target.value)} sx={{ flex: '1 1 46%', minWidth: 150 }} />
                <TextField size="small" label="Fatura No" value={f.no}
                  onChange={(e) => faturaDegistir(i, 'no', e.target.value)} sx={{ flex: '1 1 46%', minWidth: 130 }} />
                <TutarAlani size="small" label="Kalem Tutarı" value={f.tutar}
                  onChange={(v) => faturaDegistir(i, 'tutar', v)} sx={{ flex: '1 1 46%', minWidth: 140 }} />
                <TextField size="small" type="number" label="Adet" value={f.adet || ''}
                  onChange={(e) => faturaDegistir(i, 'adet', Number(e.target.value) || 0)} sx={{ flex: '0 0 80px' }} />
                <IconButton size="small" color="error" aria-label="Satırı sil"
                  onClick={() => setFaturalar((o) => o.filter((_, x) => x !== i))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button size="small" startIcon={<AddIcon />}
                onClick={() => setFaturalar((o) => [...o, yeniFatura(Array.isArray(info.makineler) && info.makineler.length ? info.makineler[0].siraNo : info.siraNo)])}>
                Fatura Satırı Ekle
              </Button>
              {faturalar.length > 0 && (
                <Button size="small" variant="contained" onClick={faturaGonder} disabled={faturaGonderiliyor}
                  startIcon={faturaGonderiliyor ? <CircularProgress size={14} /> : null}>
                  Fatura Bilgisini Gönder
                </Button>
              )}
            </Stack>
            {faturaDurum && <Alert severity="success">{faturaDurum}</Alert>}
            {faturaHata && <Alert severity="error">{faturaHata}</Alert>}
          </Stack>
          <Divider sx={{ mt: 2 }} />
        </Box>
      )}

      <form onSubmit={submit}>
        <Stack spacing={2}>
          <TextField select fullWidth label="Evrak Türü" value={docType} onChange={(e) => setDocType(e.target.value)} required>
            {(info.documentTypes || []).map((dt) => <MenuItem key={dt.key} value={dt.key}>{dt.label}</MenuItem>)}
          </TextField>
          <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
            {files.length ? `${files.length} dosya seçildi` : 'Dosya Seç (birden fazla seçebilirsiniz)'}
            <input ref={fileRef} type="file" hidden multiple accept={(info.allowedExtensions || []).join(',')} onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </Button>
          <Typography variant="caption" color="text.secondary">
            İzinli türler: {(info.allowedExtensions || []).join(', ')} · Maks {info.maxUploadMB} MB · Kopyaladığınız görseli Ctrl/⌘+V ile yapıştırabilirsiniz
          </Typography>
          <TextField fullWidth label="Adınız (opsiyonel)" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} />
          <TextField fullWidth label="Not (opsiyonel)" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
          <UploadProgress active={submitting} {...(yukleme || {})} />
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={submitting} startIcon={submitting ? <CircularProgress size={18} /> : <CloudUploadIcon />}>
            {submitting ? 'Yükleniyor...' : 'Gönder'}
          </Button>
        </Stack>
      </form>
    </Wrapper>
  );
}

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', ml: 2 }}>{value || '-'}</Typography>
    </Box>
  );
}
