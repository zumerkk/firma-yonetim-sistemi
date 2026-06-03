// 🌐 PUBLIC EVRAK YÜKLEME - /upload/tesvik/:token  (AUTH YOK)
// Müşteri/tedarikçi için sade yükleme ekranı. LayoutWrapper KULLANMAZ.
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, MenuItem, Button, Alert, CircularProgress, Stack, Divider, Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import svc from '../../services/tesvikMakineService';
import { listTypeLabel } from './helpers';

export default function PublicUpload() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('kdv_muafiyet');
  const [note, setNote] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    svc.publicInfo(token)
      .then((d) => { setInfo(d); setDocType(d.documentTypes?.[0]?.key || 'diger'); })
      .catch((e) => setError(e?.response?.data?.message || 'Bağlantı geçersiz veya süresi dolmuş.'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!file) { setSubmitError('Lütfen bir dosya seçin.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', docType);
      fd.append('note', note);
      fd.append('uploaderName', uploaderName);
      fd.append('uploaderType', 'customer');
      await svc.publicUpload(token, fd);
      setDone(true);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
    } finally { setSubmitting(false); }
  };

  const Wrapper = ({ children }) => (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, maxWidth: 520, width: '100%' }}>{children}</Paper>
    </Box>
  );

  if (loading) return <Wrapper><Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box></Wrapper>;
  if (error) return <Wrapper><Alert severity="error">{error}</Alert></Wrapper>;

  if (done) return (
    <Wrapper>
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
        <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>Dosyanız başarıyla yüklendi</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Teşekkür ederiz. Belgeniz tarafımıza ulaştı ve kontrol edilecektir.</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { setDone(false); setFile(null); setNote(''); if (fileRef.current) fileRef.current.value = ''; }}>Yeni Dosya Yükle</Button>
      </Box>
    </Wrapper>
  );

  return (
    <Wrapper>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Teşvik Evrak Yükleme</Typography>
        <Typography variant="body2" color="text.secondary">Lütfen ilgili evrakı aşağıdan yükleyiniz.</Typography>
      </Stack>
      <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1, mb: 2 }}>
        <Row label="Firma" value={info.firmaAdi} />
        <Row label="Belge No" value={info.belgeNo} />
        <Row label="Makine" value={`${info.siraNo ? info.siraNo + '. ' : ''}${info.makineAdi}`} />
        <Row label="Liste" value={listTypeLabel(info.listType)} />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <form onSubmit={submit}>
        <Stack spacing={2}>
          <TextField select fullWidth label="Evrak Türü" value={docType} onChange={(e) => setDocType(e.target.value)} required>
            {(info.documentTypes || []).map((dt) => <MenuItem key={dt.key} value={dt.key}>{dt.label}</MenuItem>)}
          </TextField>
          <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
            {file ? file.name : 'Dosya Seç'}
            <input ref={fileRef} type="file" hidden accept={(info.allowedExtensions || []).join(',')} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <Typography variant="caption" color="text.secondary">
            İzinli türler: {(info.allowedExtensions || []).join(', ')} · Maks {info.maxUploadMB} MB
          </Typography>
          <TextField fullWidth label="Adınız (opsiyonel)" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} />
          <TextField fullWidth label="Not (opsiyonel)" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} />
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
