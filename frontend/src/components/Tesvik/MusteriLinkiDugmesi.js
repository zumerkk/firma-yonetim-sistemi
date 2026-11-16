// 🔗 "Müşteri Linki" düğmesi — belge sayfalarının ve Ekipman Takip'in sağ üstünde.
//
// Müşteri (13.10.2026): "Müşterinin sadece burayı görebileceği bir link üretmemiz mümkün mü acaba? …
// Olursa o linki de sağ üst kısma ekleyebilir miyiz?" Link: belge bilgileri (evrak listesi hariç) +
// yerli/ithal liste + firmanın makinelere fatura kalemi girmesi (backend services/musteriPortal).
import React, { useEffect, useRef, useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip,
  Typography, Alert, Stack, CircularProgress, InputAdornment
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../utils/axios';

const tarihYaz = (v) => (v ? new Date(v).toLocaleString('tr-TR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul'
}) : '');
const isGunuYaz = (v) => typeof v === 'string' ? v.split('-').reverse().join('.') : '';
const takvimFormati = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Istanbul'
});
const istanbulBugun = () => {
  const parcalar = Object.fromEntries(takvimFormati.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parcalar.year}-${parcalar.month}-${parcalar.day}`;
};
const LINK_TIMEOUT = 60000;
const tekrarEdilebilir = (e) => !e.response || [502, 503, 504].includes(e.response.status);
const istekKimligi = () => window.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const hataMesaji = (e, yazma) => {
  const durum = e.response?.status;
  let mesaj;
  if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
    mesaj = 'Sunucu zamanında yanıt vermedi. Bağlantı yavaş olabilir; tekrar deneyin.';
  } else if (e.code === 'ERR_BAD_RESPONSE' && !durum) {
    mesaj = 'Sunucudan beklenmeyen bir yanıt alındı. Tekrar deneyin.';
  } else if (!e.response) {
    mesaj = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  } else if (durum === 401) {
    mesaj = e.kullaniciMesaji || 'Oturumunuz doğrulanamadı. Çıkış yapıp tekrar giriş yapın.';
  } else if (durum >= 500) {
    mesaj = 'Sunucu geçici olarak kullanılamıyor. Biraz sonra tekrar deneyin.';
  } else {
    mesaj = e.kullaniciMesaji || e.response?.data?.message || `Link bilgisi alınamadı (HTTP ${durum}).`;
  }
  return yazma && (!durum || durum >= 500)
    ? `${mesaj} İşlem tamamlanmış olabilir; "Tekrar Dene" ile sonucu kontrol edebilirsiniz.`
    : mesaj;
};

export default function MusteriLinkiDugmesi({ tesvikModel, tesvikId }) {
  const [acik, setAcik] = useState(false);
  const [bilgi, setBilgi] = useState(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState('');
  const [kopyalandi, setKopyalandi] = useState(false);
  const [kopyalamaHatasi, setKopyalamaHatasi] = useState(false);
  const [okundu, setOkundu] = useState(false);
  const [tarihler, setTarihler] = useState(() => ({ baslangicTarihi: istanbulBugun(), bitisTarihi: '' }));
  const kontrol = useRef({ sira: 0, iptal: null, mesgul: false });
  const sonIstek = useRef(null);
  const linkAlani = useRef(null);
  const kopyalamaSayaci = useRef(0);
  const adres = `/musteri-belge/yonetim/${tesvikModel}/${tesvikId}`;

  // Belge değiştiğinde/kapanınca eski yanıt yeni belgenin linkini ezmesin.
  useEffect(() => {
    const durum = kontrol.current;
    setAcik(false); setBilgi(null); setHata(''); setOkundu(false); setMesgul(false);
    setTarihler({ baslangicTarihi: istanbulBugun(), bitisTarihi: '' });
    sonIstek.current = null;
    durum.mesgul = false;
    return () => {
      durum.iptal?.abort();
      durum.sira += 1;
    };
  }, [adres]);

  const pencereyiKapat = () => {
    kontrol.current.iptal?.abort();
    kontrol.current.sira += 1;
    kontrol.current.mesgul = false;
    setMesgul(false); setAcik(false);
  };

  const istek = async (islem) => {
    if (kontrol.current.mesgul) return;
    const sira = ++kontrol.current.sira;
    const iptal = new AbortController();
    kontrol.current.iptal = iptal;
    kontrol.current.mesgul = true;
    sonIstek.current = islem;
    setMesgul(true); setHata(''); setKopyalandi(false); setKopyalamaHatasi(false);
    const guncel = () => sira === kontrol.current.sira && !iptal.signal.aborted;
    try {
      let cevap;
      for (let deneme = 0; deneme < 2; deneme += 1) {
        try {
          const ayarlar = { timeout: LINK_TIMEOUT, signal: iptal.signal };
          cevap = islem.yontem === 'get' ? await api.get(adres, ayarlar)
            : islem.yontem === 'delete' ? await api.delete(adres, ayarlar)
              : await api.post(adres, islem.veri, ayarlar);
          break;
        } catch (e) {
          // GET güvenle tekrarlanabilir. Yazma işlemi yalnız kullanıcı isterse,
          // aynı işlem kimliğiyle tekrarlanır; otomatik link yenilenmez.
          if (!guncel() || islem.yontem !== 'get' || deneme !== 0 || !tekrarEdilebilir(e)) throw e;
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (!guncel()) return;
        }
      }
      if (!guncel()) return;
      const veri = cevap?.data?.data;
      if (cevap?.data?.success !== true || !Object.prototype.hasOwnProperty.call(cevap.data, 'data')
        || (islem.yontem !== 'delete' && veri !== null && (typeof veri?.link !== 'string' || !veri.link))) {
        throw Object.assign(new Error('Beklenmeyen yanıt'), { code: 'ERR_BAD_RESPONSE' });
      }
      setBilgi(islem.yontem === 'delete' ? null : veri);
      if (islem.yontem === 'delete' || veri) {
        setTarihler({ baslangicTarihi: veri?.baslangicTarihi || istanbulBugun(), bitisTarihi: veri?.bitisTarihi || '' });
      }
      setOkundu(true);
    } catch (e) {
      if (!guncel()) return;
      // İlk üretimde başka eşzamanlı istek kazanmış olabilir. Yanıt kaybolup
      // personel linki kapattıysa ilk POST'u tekrarlamak onu yeniden açabilir.
      // İlk üretim ve kapatmada tekrar düğmesi yalnız güncel durumu okur.
      if (islem.yontem === 'delete' || (islem.yontem === 'post' && !islem.veri?.yenile)) {
        sonIstek.current = { yontem: 'get' };
      }
      setHata(hataMesaji(e, islem.yontem !== 'get'));
    } finally {
      if (guncel()) {
        kontrol.current.mesgul = false;
        setMesgul(false);
      }
    }
  };

  // Açınca yalnız okunur; link bilerek üretilir (bakmak için açan kişi link yaratmasın)
  const ac = () => {
    setAcik(true);
    setOkundu(false);
    setTarihler({ baslangicTarihi: istanbulBugun(), bitisTarihi: '' });
    istek({ yontem: 'get' });
  };
  const { baslangicTarihi, bitisTarihi } = tarihler;
  const tarihHatasi = baslangicTarihi && bitisTarihi && (bitisTarihi < baslangicTarihi
    ? 'Bitiş tarihi başlangıç tarihinden önce olamaz.'
    : bitisTarihi < istanbulBugun() ? 'Bitiş tarihi bugün veya daha ileri bir gün olmalıdır.' : '');
  const tarihGecerli = !!baslangicTarihi && !!bitisTarihi && !tarihHatasi;
  const islemKapali = mesgul || !okundu || !!hata;
  const suresiDoldu = bilgi?.durum === 'suresi_doldu';
  const planlandi = bilgi?.durum === 'planlandi';
  const uret = () => tarihGecerli && istek({ yontem: 'post', veri: { ...tarihler, istekId: istekKimligi() } });
  const yenile = () => {
    if (!tarihGecerli) return;
    if (!window.confirm('Yeni link üretilsin mi? Firmaya daha önce gönderdiğiniz link çalışmaz hale gelir.')) return;
    istek({ yontem: 'post', veri: { ...tarihler, yenile: true, istekId: istekKimligi(), beklenenSurum: bilgi.surum } });
  };
  const kapat = () => {
    if (!window.confirm('Link kapatılsın mı? Firma bu belgeyi artık göremez ve fatura kalemi giremez.')) return;
    istek({ yontem: 'delete' });
  };
  const kopyala = async () => {
    if (!bilgi?.link || suresiDoldu) return;
    const sira = kontrol.current.sira;
    const kopyalama = ++kopyalamaSayaci.current;
    const guncel = () => sira === kontrol.current.sira && kopyalama === kopyalamaSayaci.current;
    setKopyalandi(false);
    setKopyalamaHatasi(false);
    try {
      await navigator.clipboard.writeText(bilgi.link);
      if (guncel()) setKopyalandi(true);
    } catch (_) {
      if (!guncel()) return;
      linkAlani.current?.focus();
      linkAlani.current?.select();
      setKopyalamaHatasi(true);
    }
  };

  if (!tesvikId) return null;
  return (
    <>
      {/* describeChild: ipucu düğmenin ADI olmasın — ekran okuyucu "Müşteri Linki" desin, ipucu açıklama olsun */}
      <Tooltip describeChild title="Firmanın belgeyi, harcama kalemlerini ve gerçekleşme özetini açacağı link">
        <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={ac}
          sx={{ textTransform: 'none', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          Müşteri Linki
        </Button>
      </Tooltip>
      <Dialog open={acik} onClose={pencereyiKapat} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Müşteri Belge Linki</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Firma bu linkle belge bilgilerini, onaylı ve gerçekleşen makine listelerini, diğer harcamaları ve
            gerçekleşme özetini ayrı görür. Fatura, beyanname ve harcama kalemi ekleyebilir; kendi kalemlerine evrak
            yükleyebilir. Kaydedilen kalemleri yalnızca personel Harcama Takip ekranından düzenleyebilir veya silebilir.
          </Typography>
          {mesgul && <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="caption" color="text.secondary">Link bilgisi alınıyor; sunucunun yanıtı biraz sürebilir.</Typography>
          </Stack>}
          {!mesgul && !hata && bilgi?.link && (
            <>
              <Alert severity={suresiDoldu ? 'warning' : planlandi || !bilgi.bitisTarihi ? 'info' : 'success'} sx={{ mb: 1.5 }}>
                {suresiDoldu ? 'Linkin süresi doldu; firma artık bu linki kullanamaz.'
                  : planlandi ? 'Link planlandı; başlangıç gününde açılacak.'
                    : bilgi.bitisTarihi ? 'Link aktif.' : 'Bu eski linkin bitiş tarihi yok.'}
                {bilgi.bitisTarihi && ` Geçerlilik: ${isGunuYaz(bilgi.baslangicTarihi)} – ${isGunuYaz(bilgi.bitisTarihi)}.`}
              </Alert>
              <TextField fullWidth size="small" value={bilgi.link} inputRef={linkAlani} InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    {!suresiDoldu && <Tooltip title="Kopyala"><IconButton size="small" onClick={kopyala}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>}
                    {!suresiDoldu && !planlandi && <Tooltip title="Yeni sekmede aç"><IconButton size="small" component="a" href={bilgi.link} target="_blank" rel="noopener noreferrer"><OpenInNewIcon fontSize="small" /></IconButton></Tooltip>}
                  </InputAdornment>
                )
              }} />
              {kopyalandi && <Alert severity="success" sx={{ mt: 1, py: 0 }}>Link kopyalandı</Alert>}
              {kopyalamaHatasi && <Alert severity="info" sx={{ mt: 1, py: 0 }}>Linki seçili alandan kopyalayabilirsiniz.</Alert>}
              {bilgi.olusturmaTarihi && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Oluşturma: {tarihYaz(bilgi.olusturmaTarihi)}{bilgi.olusturanAdi ? ` · ${bilgi.olusturanAdi}` : ''}
                </Typography>
              )}
            </>
          )}
          {!mesgul && okundu && !bilgi && !hata && (
            <Alert severity="info">Bu belge için henüz link üretilmedi. Tarih aralığını seçip "Link Üret" ile oluşturabilirsiniz.</Alert>
          )}
          {!mesgul && okundu && !hata && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" component="div">{bilgi ? 'Yeni linkin geçerlilik aralığı' : 'Linkin geçerlilik aralığı'}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField type="date" label="Başlangıç tarihi" size="small" fullWidth required
                  value={baslangicTarihi} InputLabelProps={{ shrink: true }}
                  onChange={(e) => setTarihler((onceki) => ({ ...onceki, baslangicTarihi: e.target.value }))} />
                <TextField type="date" label="Bitiş tarihi" size="small" fullWidth required
                  value={bitisTarihi} error={!!tarihHatasi} helperText={tarihHatasi || undefined}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: baslangicTarihi > istanbulBugun() ? baslangicTarihi : istanbulBugun() }}
                  onChange={(e) => setTarihler((onceki) => ({ ...onceki, bitisTarihi: e.target.value }))} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Başlangıç ve bitiş günleri dahildir (Türkiye saati). Link, bitiş günü sona erdiğinde otomatik kapanır.
                {bilgi && ' Tarihleri uygulamak için yeni link üretin; önceki link kapanır.'}
              </Typography>
            </Stack>
          )}
          {hata && <Alert severity="error" sx={{ mt: 1 }} action={
            <Button color="inherit" size="small" onClick={() => sonIstek.current && istek(sonIstek.current)} disabled={mesgul}>Tekrar Dene</Button>
          }>{hata}</Alert>}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
          <Stack direction="row" spacing={1}>
            {bilgi?.link && <Button color="error" size="small" onClick={kapat} disabled={islemKapali}>Linki Kapat</Button>}
            {bilgi?.link
              ? <Button size="small" onClick={yenile} disabled={islemKapali || !tarihGecerli}>Yeni Link Üret</Button>
              : <Button size="small" variant="contained" onClick={uret} disabled={islemKapali || !tarihGecerli}>Link Üret</Button>}
          </Stack>
          <Button onClick={pencereyiKapat}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
