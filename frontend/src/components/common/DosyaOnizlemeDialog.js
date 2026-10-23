import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Typography, useMediaQuery, useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { blobVerisi, pdfKutuphaneAl, pdfVarlikYolu } from '../../utils/pdfOnizleme';

const RESIM_MIMELERI = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/avif'];
const UZANTILAR = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif' };

export const onizlemeTuru = (dosya, blob) => {
  const gelenMime = (blob?.type || '').split(';')[0].toLowerCase();
  const mime = (gelenMime && gelenMime !== 'application/octet-stream'
    ? gelenMime : (dosya?.mimeType || gelenMime)).split(';')[0].toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (RESIM_MIMELERI.includes(mime)) return 'resim';
  // Genel MIME ile kaydedilmiş eski dosyalarda uzantı kullanılabilir. HTML/SVG
  // gibi etkin içerikler hiçbir zaman uygulama origin'inde çalıştırılmaz.
  if (mime && mime !== 'application/octet-stream') return '';
  const uzanti = String(dosya?.ad || '').toLowerCase().split('.').pop();
  const tahmin = UZANTILAR[uzanti];
  return tahmin === 'application/pdf' ? 'pdf' : (RESIM_MIMELERI.includes(tahmin) ? 'resim' : '');
};

// Ekranın üstünde/altında bu kadar alan içindeki sayfalar çizili tutulur.
// Uzaktaki sayfaların tuvali boşaltılır; 100 sayfalık PDF de belleği şişirmez.
const SAYFA_PAYI = '1200px 0px';

const PdfTekSayfa = ({ pdf, no, toplam, genislik, varsayilanOran, kok, kutuAyarla }) => {
  const kutu = useRef(null);
  const canvas = useRef(null);
  const [gorunur, setGorunur] = useState(typeof IntersectionObserver === 'undefined');
  const [oran, setOran] = useState(varsayilanOran);
  const [durum, setDurum] = useState('bekliyor');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !kutu.current) return undefined;
    const izleyici = new IntersectionObserver(([g]) => setGorunur(g.isIntersecting), { root: kok.current, rootMargin: SAYFA_PAYI });
    izleyici.observe(kutu.current);
    return () => izleyici.disconnect();
  }, [kok]);

  useEffect(() => {
    if (!gorunur || !genislik) {
      if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; }
      setDurum('bekliyor');
      return undefined;
    }
    let iptal = false;
    let cizim;
    setDurum('ciziliyor');
    (async () => {
      try {
        const sayfaVerisi = await pdf.getPage(no);
        if (iptal || !canvas.current) return;
        const normal = sayfaVerisi.getViewport({ scale: 1 });
        setOran(normal.height / normal.width);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = sayfaVerisi.getViewport({ scale: (genislik / normal.width) * dpr });
        const hedef = canvas.current;
        hedef.width = viewport.width; hedef.height = viewport.height;
        cizim = sayfaVerisi.render({ canvasContext: hedef.getContext('2d'), viewport });
        await cizim.promise;
        if (!iptal) setDurum('hazir');
      } catch (e) {
        if (!iptal && e?.name !== 'RenderingCancelledException') setDurum('hata');
      }
    })();
    return () => { iptal = true; cizim?.cancel(); };
  }, [pdf, no, genislik, gorunur]);

  return (
    <>
      {toplam > 1 && (
        <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontWeight: 600, mb: 0.5 }}>
          {no}. sayfa
        </Typography>
      )}
      <Box ref={(el) => { kutu.current = el; kutuAyarla(no, el); }}
        sx={{ position: 'relative', width: `${genislik}px`, maxWidth: '100%', height: `${Math.round(genislik * oran)}px`, mx: 'auto', mb: 2, bgcolor: '#fff', boxShadow: '0 1px 4px rgba(15,23,42,.25)' }}>
        <canvas ref={canvas} role="img" aria-label={`PDF sayfa ${no}`} style={{ display: 'block', width: '100%', height: '100%' }} />
        {durum !== 'hazir' && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            {durum === 'hata'
              ? <Typography variant="body2" color="text.secondary">Bu sayfa görüntülenemedi. Dosyayı indirerek açabilirsiniz.</Typography>
              : <CircularProgress size={22} aria-label={`${no}. sayfa hazırlanıyor`} />}
          </Box>
        )}
      </Box>
    </>
  );
};

// Müşteri (23.10): "en aşağıya kaydırınca bitti sanıyoruz, devam sayfalarını
// unutuyoruz". Sayfalar artık alt alta; kaydırdıkça sıradaki sayfa gelir,
// üstteki sayaç görünen sayfayı izler, belge sonu ayrıca işaretlenir.
const PdfSayfasi = ({ blob }) => {
  const alan = useRef(null);
  const kutular = useRef([]);
  const kare = useRef(0);
  const [pdf, setPdf] = useState(null);
  const [varsayilanOran, setVarsayilanOran] = useState(Math.SQRT2);
  const [sayfa, setSayfa] = useState(1);
  const [genislik, setGenislik] = useState(0);
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    let gorev;
    setPdf(null); setSayfa(1); setHata(''); kutular.current = [];
    (async () => {
      try {
        const [pdfjs, data] = await Promise.all([pdfKutuphaneAl(), blobVerisi(blob)]);
        if (iptal) return;
        gorev = pdfjs.getDocument({
          data, isEvalSupported: false, enableXfa: false,
          cMapUrl: `${pdfVarlikYolu}cmaps/`, cMapPacked: true,
          standardFontDataUrl: `${pdfVarlikYolu}standard_fonts/`
        });
        const belge = await gorev.promise;
        let oran = Math.SQRT2;
        try {
          const ilk = (await belge.getPage(1)).getViewport({ scale: 1 });
          if (ilk.width > 0 && ilk.height > 0) oran = ilk.height / ilk.width;
        } catch (e) { /* sayfa kendi oranını çizerken bulur */ }
        if (!iptal) { setVarsayilanOran(oran); setPdf(belge); }
      } catch (e) {
        if (!iptal) setHata(e?.name === 'PasswordException'
          ? 'Bu PDF parola korumalı. Görüntülemek için dosyayı indirebilirsiniz.'
          : 'PDF önizlemesi açılamadı. Dosyayı indirerek açabilirsiniz.');
      }
    })();
    return () => {
      iptal = true;
      if (gorev) Promise.resolve(gorev.destroy()).catch(() => {});
    };
  }, [blob]);

  useEffect(() => {
    const olc = () => {
      const yeni = Math.max(1, (alan.current?.clientWidth || window.innerWidth) - 24);
      setGenislik((eski) => (Math.abs(eski - yeni) < 2 ? eski : yeni));
    };
    olc();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(olc) : null;
    if (alan.current) observer?.observe(alan.current);
    window.addEventListener('resize', olc);
    return () => { observer?.disconnect(); window.removeEventListener('resize', olc); };
  }, []);

  useEffect(() => () => { if (kare.current) cancelAnimationFrame(kare.current); }, []);

  const kutuAyarla = useCallback((no, el) => { kutular.current[no - 1] = el; }, []);

  const konumuGuncelle = useCallback(() => {
    const k = alan.current;
    if (!k || !pdf) return;
    // En alta inildiyse son sayfa; kısa son sayfa hiçbir zaman üste çıkamaz.
    if (k.scrollTop > 0 && k.scrollTop + k.clientHeight >= k.scrollHeight - 4) { setSayfa(pdf.numPages); return; }
    const esik = k.scrollTop + k.clientHeight / 3;
    let bulunan = 1;
    kutular.current.forEach((el, i) => { if (el && el.offsetTop <= esik) bulunan = i + 1; });
    setSayfa(bulunan);
  }, [pdf]);

  const kaydirildi = () => {
    if (kare.current) return;
    kare.current = requestAnimationFrame(() => { kare.current = 0; konumuGuncelle(); });
  };

  const sayfayaGit = (no) => {
    const hedef = Math.min(Math.max(1, no), pdf.numPages);
    setSayfa(hedef);
    const el = kutular.current[hedef - 1];
    if (el && alan.current) alan.current.scrollTop = Math.max(0, el.offsetTop - 28);
  };

  const sayfaNolari = pdf ? Array.from({ length: pdf.numPages }, (_, i) => i + 1) : [];

  return (
    <Box sx={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {pdf && !hata && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, p: 1, flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
          <Button size="small" disabled={sayfa <= 1} onClick={() => sayfayaGit(sayfa - 1)}>Önceki</Button>
          <Typography role="status" variant="body2" sx={{ fontWeight: 600 }}>Sayfa {sayfa} / {pdf.numPages}</Typography>
          <Button size="small" disabled={sayfa >= pdf.numPages} onClick={() => sayfayaGit(sayfa + 1)}>Sonraki</Button>
          {pdf.numPages > 1 && sayfa < pdf.numPages && (
            <Typography variant="caption" color="text.secondary">Sonraki sayfalar için aşağı kaydırın</Typography>
          )}
        </Box>
      )}
      {hata ? <Alert severity="warning" sx={{ m: 2 }}>{hata}</Alert> : (
        <Box ref={alan} onScroll={kaydirildi} tabIndex={0} role="region" aria-label="PDF sayfaları"
          sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto', p: 1.5, bgcolor: '#e2e8f0', textAlign: 'center', '&:focus-visible': { outline: '2px solid #2563eb', outlineOffset: -2 } }}>
          {!pdf && <CircularProgress size={24} aria-label="PDF hazırlanıyor" sx={{ display: 'block', mx: 'auto', mb: 1 }} />}
          {pdf && genislik > 0 && sayfaNolari.map((no) => (
            <PdfTekSayfa key={no} pdf={pdf} no={no} toplam={pdf.numPages} genislik={genislik}
              varsayilanOran={varsayilanOran} kok={alan} kutuAyarla={kutuAyarla} />
          ))}
          {pdf && pdf.numPages > 1 && (
            <Typography variant="caption" sx={{ display: 'block', color: '#475569', pb: 1 }}>
              Belgenin sonu · {pdf.numPages} sayfa
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

/** dosya: { ad, mimeType, yukle(signal, indir) -> AxiosResponse | Blob }. */
export default function DosyaOnizlemeDialog({ dosya, onClose }) {
  const tema = useTheme();
  const dar = useMediaQuery(tema.breakpoints.down('sm'));
  const [icerik, setIcerik] = useState(null);
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [indiriliyor, setIndiriliyor] = useState(false);
  const [tekrar, setTekrar] = useState(0);
  const indirmeUrl = useRef(null);
  const indirmeIstegi = useRef(null);
  const gecerli = useRef(null);

  useEffect(() => {
    setIcerik(null); setHata(''); setIndiriliyor(false);
    if (!dosya) return undefined;
    const controller = new AbortController();
    gecerli.current = dosya;
    let url;
    const tur = onizlemeTuru(dosya);
    setYukleniyor(Boolean(tur));
    if (tur) (async () => {
      try {
        const yanit = await dosya.yukle(controller.signal, false);
        if (controller.signal.aborted) return;
        const blob = yanit instanceof Blob ? yanit : yanit.data;
        if (!(blob instanceof Blob)) throw new Error('Dosya okunamadı.');
        url = URL.createObjectURL(blob);
        setIcerik({ blob, url, tur: onizlemeTuru(dosya, blob) });
      } catch (e) {
        if (!controller.signal.aborted) setHata('Dosya alınamadı. Yeniden deneyebilir veya indirme düğmesini kullanabilirsiniz.');
      } finally { if (!controller.signal.aborted) setYukleniyor(false); }
    })();
    return () => {
      controller.abort();
      indirmeIstegi.current?.abort();
      if (url) URL.revokeObjectURL(url);
      if (indirmeUrl.current) { URL.revokeObjectURL(indirmeUrl.current); indirmeUrl.current = null; }
      gecerli.current = null;
    };
  }, [dosya, tekrar]);

  const indir = async () => {
    setIndiriliyor(true);
    const controller = new AbortController();
    indirmeIstegi.current = controller;
    try {
      let url = icerik?.url;
      if (!url) {
        const yanit = await dosya.yukle(controller.signal, true);
        if (controller.signal.aborted || gecerli.current !== dosya) return;
        const blob = yanit instanceof Blob ? yanit : yanit.data;
        if (!(blob instanceof Blob)) throw new Error('Dosya okunamadı.');
        url = URL.createObjectURL(blob);
        if (indirmeUrl.current) URL.revokeObjectURL(indirmeUrl.current);
        indirmeUrl.current = url;
      }
      const a = document.createElement('a');
      a.href = url; a.download = dosya.ad || 'dosya';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      if (!controller.signal.aborted && gecerli.current === dosya) setHata('Dosya indirilemedi. Lütfen yeniden deneyin.');
    } finally {
      if (indirmeIstegi.current === controller) indirmeIstegi.current = null;
      if (gecerli.current === dosya) setIndiriliyor(false);
    }
  };

  return (
    <Dialog open={Boolean(dosya)} onClose={onClose} fullScreen={dar} fullWidth maxWidth="lg" aria-labelledby="dosya-onizleme-baslik"
      PaperProps={{ sx: { height: { xs: '100%', sm: '90dvh' }, maxHeight: { xs: '100%', sm: '90dvh' }, m: { xs: 0, sm: 2 }, minWidth: 0 } }}>
      <DialogTitle id="dosya-onizleme-baslik" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5, px: 2, minWidth: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" sx={{ fontWeight: 600, display: 'block' }}>Evrak Önizleme</Typography>
          <Typography component="span" variant="body2" sx={{ display: 'block', wordBreak: 'break-word', color: 'text.secondary' }}>{dosya?.ad}</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Önizlemeyi kapat"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {yukleniyor ? <Box sx={{ m: 'auto', p: 3, textAlign: 'center' }}><CircularProgress size={28} /><Typography sx={{ mt: 1 }}>Dosya yükleniyor…</Typography></Box>
          : hata ? <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={() => setTekrar((v) => v + 1)}>Yeniden dene</Button>}>{hata}</Alert>
            : icerik?.tur === 'pdf' ? <PdfSayfasi blob={icerik.blob} />
              : icerik?.tur === 'resim' ? <Box sx={{ overflow: 'auto', height: '100%', p: 1.5, bgcolor: '#f1f5f9', textAlign: 'center' }}><Box component="img" src={icerik.url} alt={dosya?.ad || 'Evrak'} onError={() => setHata('Görsel görüntülenemedi. Dosyayı indirerek açabilirsiniz.')} sx={{ maxWidth: '100%', height: 'auto' }} /></Box>
                : <Alert severity="info" sx={{ m: 2 }}>Bu dosya türü uygulama içinde görüntülenemiyor. Dosyayı indirerek açabilirsiniz.</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Kapat</Button>
        <Button variant="contained" startIcon={indiriliyor ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />} disabled={yukleniyor || indiriliyor} onClick={indir}>{indiriliyor ? 'İndiriliyor…' : 'İndir'}</Button>
      </DialogActions>
    </Dialog>
  );
}
