import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Grid, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import UploadProgress from '../common/UploadProgress';

const YEVMIYE_EVRAK_TURU = { alan: 'yevmiyePdf', tur: 'yevmiye_pdf', etiket: 'Yevmiye Kayıt PDF', uzanti: '.pdf' };
export const FATURA_EVRAK_TURLERI = [
  { alan: 'faturaPdf', tur: 'fatura_pdf', etiket: 'Fatura PDF', uzanti: '.pdf' },
  { alan: 'faturaXml', tur: 'fatura_xml', etiket: 'Fatura XML', uzanti: '.xml' },
  YEVMIYE_EVRAK_TURU
];
export const BEYANNAME_EVRAK_TURLERI = [
  { alan: 'beyannamePdf', tur: 'beyanname_pdf', etiket: 'Beyanname PDF', uzanti: '.pdf' },
  { alan: 'yurtdisiFaturaPdf', tur: 'yurtdisi_fatura_pdf', etiket: 'Yurt Dışı Fatura PDF', uzanti: '.pdf' },
  { ...YEVMIYE_EVRAK_TURU, etiket: 'Yevmiye Kaydı PDF' }
];
const EVRAK_SAYI_SINIRI = 6;
const EVRAK_BOYUT_SINIRI = 10 * 1024 * 1024;
const yeniIstekId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function KalemEvrakPaneli({ kalem, rowId, ithal, islem, onYukle, yuklenenleriGoster = true }) {
  const belgeTuru = ithal ? 'Beyanname' : 'Fatura';
  const evrakTurleri = ithal ? BEYANNAME_EVRAK_TURLERI : FATURA_EVRAK_TURLERI;
  const [dosyalar, setDosyalar] = useState({});
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [ilerleme, setIlerleme] = useState(null);
  const istekId = useRef(null);
  const panel = useRef(null);
  const adet = Object.values(dosyalar).reduce((toplam, liste) => toplam + liste.length, 0);

  useEffect(() => { panel.current?.scrollIntoView?.({ block: 'nearest' }); }, []);

  const secimiGuncelle = (alan, liste) => {
    setDosyalar((onceki) => ({ ...onceki, [alan]: liste }));
    istekId.current = null;
    setHata('');
    setBilgi('');
  };

  const dosyaSec = (tur, e) => {
    const secilen = Array.from(e.target.files || []);
    e.target.value = '';
    if (islem || !secilen.length) return;
    if (adet + secilen.length > EVRAK_SAYI_SINIRI) {
      setHata(`Bir seferde en fazla ${EVRAK_SAYI_SINIRI} dosya yükleyebilirsiniz.`);
      return;
    }
    const yanlisUzanti = secilen.find((dosya) => !dosya.name.toLowerCase().endsWith(tur.uzanti));
    if (yanlisUzanti) {
      setHata(`${tur.etiket} için ${tur.uzanti.toUpperCase()} dosyası seçin.`);
      return;
    }
    const buyukDosya = secilen.find((dosya) => dosya.size > EVRAK_BOYUT_SINIRI);
    if (buyukDosya) {
      setHata(`${buyukDosya.name} 10 MB sınırını aşıyor.`);
      return;
    }
    secimiGuncelle(tur.alan, [...(dosyalar[tur.alan] || []), ...secilen]);
  };

  const yukle = async () => {
    if (islem || !adet) return;
    setHata('');
    setBilgi('');
    setIlerleme({ pct: 0 });
    const fd = new FormData();
    if (rowId !== undefined) fd.append('rowId', rowId);
    // Aynı seçimle tekrar denendiğinde, yanıt kaybolsa bile yükleme yinelenmez.
    if (!istekId.current) istekId.current = yeniIstekId();
    fd.append('istekId', istekId.current);
    evrakTurleri.forEach(({ alan }) => (dosyalar[alan] || []).forEach((dosya) => fd.append(alan, dosya)));
    try {
      if (!await onYukle(kalem._id, fd, setIlerleme)) return;
      setDosyalar({});
      istekId.current = null;
      setBilgi('Evraklar yüklendi.');
    } catch (e) {
      setHata(e?.kullaniciMesaji || e?.response?.data?.message || e?.message || 'Evraklar yüklenemedi. Lütfen tekrar deneyin.');
    } finally { setIlerleme(null); }
  };

  return (
    <Box ref={panel} sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{belgeTuru} Evrakları · {kalem.no || belgeTuru}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Bir seferde en fazla 6 dosya, dosya başına en fazla 10 MB yükleyebilirsiniz.
      </Typography>
      <Grid container spacing={1}>
        {evrakTurleri.map((tur) => {
          const yuklenenler = (kalem.evraklar || []).filter((evrak) => evrak.tur === tur.tur);
          return (
            <Grid item key={tur.alan} xs={12} sm={4}>
              <Button component="label" size="small" variant="outlined" startIcon={<AttachFileIcon />} disabled={!!islem}>
                {tur.etiket}
                <input hidden type="file" multiple accept={tur.uzanti} aria-label={tur.etiket}
                  disabled={!!islem} onChange={(e) => dosyaSec(tur, e)} />
              </Button>
              {yuklenenleriGoster && yuklenenler.length > 0 && (
                <Box component="ul" aria-label={`${tur.etiket} yüklenen dosyalar`} sx={{ m: 0, mt: 0.5, pl: 2 }}>
                  {yuklenenler.map((evrak) => (
                    <Typography key={evrak._id} component="li" variant="caption" sx={{ overflowWrap: 'anywhere' }}>{evrak.dosyaAdi}</Typography>
                  ))}
                </Box>
              )}
              {(dosyalar[tur.alan] || []).map((dosya, indeks) => (
                <Chip key={`${dosya.name}:${indeks}`} size="small" label={dosya.name} title={dosya.name} sx={{ mt: 0.5, mr: 0.5, maxWidth: '100%' }}
                  onDelete={islem ? undefined : () => secimiGuncelle(tur.alan, dosyalar[tur.alan].filter((_, i) => i !== indeks))} />
              ))}
            </Grid>
          );
        })}
      </Grid>
      <Button size="small" variant="contained" onClick={yukle} disabled={!!islem || !adet} sx={{ mt: 1 }}>
        Dosyaları Yükle
      </Button>
      <UploadProgress active={islem === 'evrak'} {...(ilerleme || {})} fileName={`${adet} dosya`} />
      {hata && <Alert severity="error" sx={{ mt: 1 }}>{hata}</Alert>}
      {bilgi && <Alert severity="success" sx={{ mt: 1 }}>{bilgi}</Alert>}
    </Box>
  );
}
