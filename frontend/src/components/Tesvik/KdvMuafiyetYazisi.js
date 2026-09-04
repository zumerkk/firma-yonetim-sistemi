// 🧾 KDV MUAFİYET YAZISI — teşvik belgesi detayında kompakt yükleme alanı
//
// Müşteri talebi: "teşvik belgelerinde en alta KDV muafiyet yazısı yüklemek için küçük bir
// alan" + "yükledikten sonra başlangıç ve bitiş tarihi de girebilelim". Yüklenen yazı
// tedarikçiye mail EKİ olarak değil, buradaki public indirme linki ile iletilir.
//
// Tesvik ve YeniTesvik detay sayfalarının ikisi de aynı bileşeni kullanır (tesvikModel prop'u).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Paper, Typography, Button, Grid, TextField, Chip, IconButton, Tooltip,
  Stack, Alert, CircularProgress, Snackbar
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import svc from '../../services/tesvikMakineService';

const IZINLI_UZANTILAR = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx';

// Date input'u yyyy-MM-dd bekler
const toInputDate = (v) => (v ? String(v).slice(0, 10) : '');
const trTarih = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '—');
const boyutYaz = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Yüklü yazının durumu → tek bakışta okunan rozet
function durumRozeti(bilgi) {
  if (!bilgi?.varMi) return { label: 'Yüklenmedi', color: '#64748b', bg: '#f1f5f9' };
  if (bilgi.suresiDoldu) return { label: 'Süresi Doldu', color: '#b91c1c', bg: '#fef2f2' };
  if (bilgi.henuzBaslamadi) return { label: 'Henüz Başlamadı', color: '#b45309', bg: '#fffbeb' };
  return { label: 'Geçerli', color: '#15803d', bg: '#f0fdf4' };
}

export default function KdvMuafiyetYazisi({ tesvikModel, tesvikId, saltOkunur = false }) {
  const [bilgi, setBilgi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [mesgul, setMesgul] = useState('');            // 'upload' | 'save' | 'delete' | 'download'
  const [hata, setHata] = useState('');
  const [snack, setSnack] = useState(null);
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [secilenDosya, setSecilenDosya] = useState(null);
  const fileRef = useRef(null);

  const bildir = (message, severity = 'success') => setSnack({ message, severity });
  const hataMetni = (e) => e?.kullaniciMesaji || e?.response?.data?.message || e?.message || 'İşlem başarısız';

  // Sunucudan gelen özet → form alanları (tarihler dosyayla birlikte gelir)
  const uygula = useCallback((d) => {
    setBilgi(d);
    setBaslangic(toInputDate(d?.gecerlilikBaslangic));
    setBitis(toInputDate(d?.gecerlilikBitis));
  }, []);

  useEffect(() => {
    if (!tesvikModel || !tesvikId) return undefined;
    let iptal = false;
    setYukleniyor(true);
    svc.kdvMuafiyetGetir(tesvikModel, tesvikId)
      .then((d) => { if (!iptal) { uygula(d); setHata(''); } })
      .catch((e) => { if (!iptal) setHata(hataMetni(e)); })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [tesvikModel, tesvikId, uygula]);

  const dosyaSec = (e) => {
    const f = (e.target.files || [])[0];
    if (f) setSecilenDosya(f);
  };

  // Dosya seçiliyse yükle, değilse yalnızca tarihleri güncelle — tek "Kaydet" akışı
  const kaydet = async () => {
    if (baslangic && bitis && bitis < baslangic) {
      return bildir('Bitiş tarihi başlangıç tarihinden önce olamaz.', 'warning');
    }
    if (!secilenDosya && !bilgi?.varMi) {
      return bildir('Önce KDV muafiyet yazısı dosyasını seçin.', 'warning');
    }
    setMesgul(secilenDosya ? 'upload' : 'save');
    try {
      let sonuc;
      if (secilenDosya) {
        const fd = new FormData();
        fd.append('file', secilenDosya);
        fd.append('gecerlilikBaslangic', baslangic);
        fd.append('gecerlilikBitis', bitis);
        sonuc = await svc.kdvMuafiyetYukle(tesvikModel, tesvikId, fd);
        setSecilenDosya(null);
        if (fileRef.current) fileRef.current.value = '';
      } else {
        sonuc = await svc.kdvMuafiyetTarihGuncelle(tesvikModel, tesvikId, {
          gecerlilikBaslangic: baslangic, gecerlilikBitis: bitis
        });
      }
      uygula(sonuc);
      bildir(secilenDosya ? 'KDV muafiyet yazısı kaydedildi' : 'Geçerlilik tarihleri güncellendi');
    } catch (e) { bildir(hataMetni(e), 'error'); } finally { setMesgul(''); }
  };

  const indir = async () => {
    setMesgul('download');
    try {
      const res = await svc.kdvMuafiyetIndir(tesvikModel, tesvikId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = bilgi?.dosyaAdi || 'kdv-muafiyet-yazisi';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { bildir(hataMetni(e), 'error'); } finally { setMesgul(''); }
  };

  const sil = async () => {
    // Link tedarikçiye gitmiş olabilir; silince çalışmaz — bu yüzden onay isteniyor
    if (!window.confirm('KDV muafiyet yazısı kaldırılacak. Tedarikçilere gönderilen indirme bağlantısı da çalışmayacak. Onaylıyor musunuz?')) return;
    setMesgul('delete');
    try {
      const sonuc = await svc.kdvMuafiyetSil(tesvikModel, tesvikId);
      uygula(sonuc);
      bildir('KDV muafiyet yazısı kaldırıldı');
    } catch (e) { bildir(hataMetni(e), 'error'); } finally { setMesgul(''); }
  };

  const linkKopyala = () => {
    if (!bilgi?.indirmeLinki) return;
    navigator.clipboard?.writeText(bilgi.indirmeLinki);
    bildir('İndirme linki kopyalandı');
  };

  const rozet = durumRozeti(bilgi);
  const islemVar = Boolean(mesgul);

  return (
    <Paper sx={{ p: 1.5, background: '#ffffff', border: '1px solid #e2e8f0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#6366f1' }} />
        <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
          🧾 KDV Muafiyet Yazısı
        </Typography>
        <Chip
          label={rozet.label}
          size="small"
          sx={{ ml: 'auto', backgroundColor: rozet.bg, color: rozet.color, fontSize: '0.6rem', height: 20, fontWeight: 600 }}
        />
      </Box>

      {yukleniyor ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
      ) : hata ? (
        <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{hata}</Alert>
      ) : (
        <>
          <Grid container spacing={0.75} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                disabled={saltOkunur || islemVar}
                startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
                onClick={() => fileRef.current?.click()}
                sx={{ p: 1, borderColor: '#e2e8f0', color: '#475569', fontSize: '0.7rem', '&:hover': { borderColor: '#6366f1', color: '#6366f1' } }}
              >
                {secilenDosya ? 'Dosyayı Değiştir' : bilgi?.varMi ? 'Yeni Dosya Seç' : 'Dosya Seç'}
              </Button>
              <input type="file" ref={fileRef} hidden accept={IZINLI_UZANTILAR} onChange={dosyaSec} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth size="small" type="date" label="Başlangıç" value={baslangic}
                disabled={saltOkunur || islemVar}
                onChange={(e) => setBaslangic(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ style: { fontSize: '0.75rem' } }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth size="small" type="date" label="Bitiş" value={bitis}
                disabled={saltOkunur || islemVar}
                onChange={(e) => setBitis(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ style: { fontSize: '0.75rem' } }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth size="small" variant="contained"
                disabled={saltOkunur || islemVar}
                startIcon={islemVar ? <CircularProgress size={12} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
                onClick={kaydet}
                sx={{ p: 1, fontSize: '0.7rem', backgroundColor: '#6366f1', '&:hover': { backgroundColor: '#4f46e5' } }}
              >
                Kaydet
              </Button>
            </Grid>
          </Grid>

          {secilenDosya && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#6366f1', fontSize: '0.68rem' }}>
              Seçilen dosya: <b>{secilenDosya.name}</b> ({boyutYaz(secilenDosya.size)}) — kaydedilmesi için “Kaydet”e basın.
            </Typography>
          )}

          {bilgi?.varMi && (
            <Box sx={{ mt: 1, p: 1, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="caption" sx={{ color: '#0f172a', fontWeight: 600, fontSize: '0.7rem' }}>
                  {bilgi.dosyaAdi}
                </Typography>
                {bilgi.boyut > 0 && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>({boyutYaz(bilgi.boyut)})</Typography>
                )}
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem', ml: 0.5 }}>
                  Geçerlilik: {trTarih(bilgi.gecerlilikBaslangic)} – {trTarih(bilgi.gecerlilikBitis)}
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex' }}>
                  <Tooltip title="İndir">
                    <span>
                      <IconButton size="small" onClick={indir} disabled={islemVar}><DownloadIcon sx={{ fontSize: 16 }} /></IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Yazıyı kaldır">
                    <span>
                      <IconButton size="small" color="error" onClick={sil} disabled={saltOkunur || islemVar}>
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Stack>

              {/* Tedarikçiye giden bağlantı — mail gövdesine bu link eklenir */}
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
                <TextField
                  fullWidth size="small" value={bilgi.indirmeLinki || ''}
                  InputProps={{ readOnly: true, style: { fontSize: '0.68rem' } }}
                />
                <Tooltip title="Linki kopyala">
                  <span>
                    <IconButton size="small" onClick={linkKopyala} disabled={!bilgi.indirmeLinki}>
                      <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b', fontSize: '0.65rem' }}>
                Bu bağlantı tedarikçi maillerine “KDV muafiyet yazısını aşağıdaki bağlantıdan indirebilirsiniz” satırı olarak otomatik eklenir.
              </Typography>

              {bilgi.suresiDoldu && (
                <Alert severity="warning" sx={{ mt: 0.75, py: 0, fontSize: '0.68rem' }}>
                  Geçerlilik süresi dolduğu için link maillere eklenmez. Yeni yazıyı yükleyin veya bitiş tarihini güncelleyin.
                </Alert>
              )}
              {bilgi.henuzBaslamadi && (
                <Alert severity="info" sx={{ mt: 0.75, py: 0, fontSize: '0.68rem' }}>
                  Başlangıç tarihi geleceğe ayarlı; o tarihe kadar link maillere eklenmez.
                </Alert>
              )}
            </Box>
          )}

          {!bilgi?.varMi && !secilenDosya && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#94a3b8', fontSize: '0.68rem' }}>
              Yazı yüklendiğinde tedarikçi maillerine indirme bağlantısı olarak eklenir (ek dosya gönderilmez).
            </Typography>
          )}
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>}
      </Snackbar>
    </Paper>
  );
}
