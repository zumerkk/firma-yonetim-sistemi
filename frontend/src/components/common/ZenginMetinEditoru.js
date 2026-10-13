// ✍️ ZENGİN METİN EDİTÖRÜ — mail gövdesi için Gmail benzeri araç çubuğu.
//
// Müşteri (13.10.2026): "Buraya mail düzenleme aparatı koyabilir miyiz? Alttaki gibi olabilir." (Gmail
// araç çubuğu: geri al/yinele, yazı tipi, boyut, kalın/italik/altı çizili, renk, hizalama, listeler,
// girinti). Kütüphane yok: tarayıcının contentEditable + execCommand'ı — her tarayıcıda var, Gmail de
// aynı yolu kullanıyor.
//
// Hız: editör DENETİMSİZ — yazarken React yeniden çizim yapmaz, değer üst bileşene kısa bir beklemeyle
// iletilir (eski "mail düzenlerken donma" şikâyeti). Dışarıdan yeni değer gelince (şablon yenilendi,
// taslak silindi) içerik baştan kurulur.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Menu, MenuItem, Divider, Typography, Select } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatIndentDecreaseIcon from '@mui/icons-material/FormatIndentDecrease';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import { editoreHazirla, htmlTemizle, metniHtmleCevir } from '../../utils/mailHtml';

const YAZI_TIPLERI = [
  { ad: 'Sans Serif', deger: 'Arial, Helvetica, sans-serif' },
  { ad: 'Serif', deger: 'Georgia, "Times New Roman", serif' },
  { ad: 'Sabit genişlik', deger: '"Courier New", monospace' }
];
const BOYUTLAR = [{ ad: 'Küçük', deger: '2' }, { ad: 'Normal', deger: '3' }, { ad: 'Büyük', deger: '5' }, { ad: 'Çok büyük', deger: '6' }];
const RENKLER = ['#000000', '#434343', '#666666', '#c00000', '#e69138', '#f1c232', '#38761d', '#1155cc', '#674ea7', '#a61c00'];
const BEKLEME_MS = 200;

export default function ZenginMetinEditoru({ value, onChange, etiket = 'İçerik', minYukseklik = 260, yardim }) {
  const kutuRef = useRef(null);
  const sonGonderilenRef = useRef(null);
  const zamanlayiciRef = useRef(null);
  const [renkMenusu, setRenkMenusu] = useState(null);
  const [boyutMenusu, setBoyutMenusu] = useState(null);
  const [yaziTipi, setYaziTipi] = useState(YAZI_TIPLERI[0].deger);

  // Dışarıdan gelen değer (ilk açılış, şablon yenileme, taslak silme) — kendi yazdığımız değer geri
  // dönünce içerik yeniden kurulmaz, yoksa imleç başa atlardı
  useEffect(() => {
    if (!kutuRef.current || value === sonGonderilenRef.current) return;
    kutuRef.current.innerHTML = editoreHazirla(value || '');
    sonGonderilenRef.current = value;
  }, [value]);

  const ilet = useCallback((hemen = false) => {
    clearTimeout(zamanlayiciRef.current);
    const gonder = () => {
      if (!kutuRef.current) return;
      const html = kutuRef.current.innerHTML;
      sonGonderilenRef.current = html;
      onChange(html);
    };
    if (hemen) gonder(); else zamanlayiciRef.current = setTimeout(gonder, BEKLEME_MS);
  }, [onChange]);
  useEffect(() => () => clearTimeout(zamanlayiciRef.current), []);

  // Seçim saklanır: yazı tipi/renk menüsü açılınca odak editörden çıkıyor ve tarayıcı seçimi unutuyor
  const secimRef = useRef(null);
  const secimiSakla = () => {
    const sec = window.getSelection();
    if (sec && sec.rangeCount && kutuRef.current?.contains(sec.anchorNode)) secimRef.current = sec.getRangeAt(0).cloneRange();
  };
  const secimiGeriYukle = () => {
    kutuRef.current?.focus();
    const sec = window.getSelection();
    if (secimRef.current && sec) { sec.removeAllRanges(); sec.addRange(secimRef.current); }
  };

  const komut = (ad, deger = null) => {
    secimiGeriYukle();
    document.execCommand('styleWithCSS', false, ad === 'foreColor' || ad === 'fontName');
    document.execCommand(ad, false, deger);
    ilet(true);
  };

  // Yapıştırılan biçimli metin (Word, Gmail, web) temizlenip eklenir; düz metin satır sonlarıyla
  const yapistir = (e) => {
    const html = e.clipboardData?.getData('text/html');
    const duz = e.clipboardData?.getData('text/plain');
    if (!html && !duz) return; // dosya/görsel — tarayıcıya bırak (eklenmez)
    e.preventDefault();
    document.execCommand('insertHTML', false, html ? htmlTemizle(html) : metniHtmleCevir(duz));
    ilet(true);
  };

  const dugme = (baslik, simge, ad, deger) => (
    <Tooltip title={baslik} key={baslik}>
      {/* mousedown'da odak editörde kalsın (seçim kaybolmasın) */}
      <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => komut(ad, deger)} aria-label={baslik}>
        {simge}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>{etiket}</Typography>
      <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 1, '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 1px #1976d2' } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.25, px: 0.5, py: 0.25, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}
          role="toolbar" aria-label="Biçimlendirme">
          {dugme('Geri al', <UndoIcon fontSize="small" />, 'undo')}
          {dugme('Yinele', <RedoIcon fontSize="small" />, 'redo')}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Select size="small" variant="standard" disableUnderline value={yaziTipi} aria-label="Yazı tipi"
            onChange={(e) => { setYaziTipi(e.target.value); komut('fontName', e.target.value); }}
            sx={{ fontSize: 13, minWidth: 110, px: 0.5 }}>
            {YAZI_TIPLERI.map((y) => <MenuItem key={y.deger} value={y.deger} sx={{ fontFamily: y.deger }}>{y.ad}</MenuItem>)}
          </Select>
          <Tooltip title="Boyut">
            <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={(e) => setBoyutMenusu(e.currentTarget)} aria-label="Boyut">
              <FormatSizeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {dugme('Kalın', <FormatBoldIcon fontSize="small" />, 'bold')}
          {dugme('İtalik', <FormatItalicIcon fontSize="small" />, 'italic')}
          {dugme('Altı çizili', <FormatUnderlinedIcon fontSize="small" />, 'underline')}
          <Tooltip title="Yazı rengi">
            <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={(e) => setRenkMenusu(e.currentTarget)} aria-label="Yazı rengi">
              <FormatColorTextIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {dugme('Sola hizala', <FormatAlignLeftIcon fontSize="small" />, 'justifyLeft')}
          {dugme('Ortala', <FormatAlignCenterIcon fontSize="small" />, 'justifyCenter')}
          {dugme('Sağa hizala', <FormatAlignRightIcon fontSize="small" />, 'justifyRight')}
          {dugme('Numaralı liste', <FormatListNumberedIcon fontSize="small" />, 'insertOrderedList')}
          {dugme('Madde işaretli liste', <FormatListBulletedIcon fontSize="small" />, 'insertUnorderedList')}
          {dugme('Girintiyi azalt', <FormatIndentDecreaseIcon fontSize="small" />, 'outdent')}
          {dugme('Girintiyi artır', <FormatIndentIncreaseIcon fontSize="small" />, 'indent')}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {dugme('Biçimi temizle', <FormatClearIcon fontSize="small" />, 'removeFormat')}
        </Box>
        <Box
          ref={kutuRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={etiket}
          spellCheck
          onInput={() => { secimiSakla(); ilet(false); }}
          onKeyUp={secimiSakla}
          onMouseUp={secimiSakla}
          onBlur={() => { secimiSakla(); ilet(true); }}
          onPaste={yapistir}
          sx={{
            minHeight: minYukseklik, maxHeight: 560, overflowY: 'auto', p: 1.5, outline: 'none',
            fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14, lineHeight: 1.6, color: '#222',
            '& a': { color: '#1155cc' }, '& p': { my: 0.5 }, '& ul, & ol': { my: 0.5, pl: 3 }
          }}
        />
      </Box>
      {yardim && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 1.5 }}>{yardim}</Typography>}

      <Menu anchorEl={renkMenusu} open={!!renkMenusu} onClose={() => setRenkMenusu(null)}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 24px)', gap: 0.5, p: 1 }}>
          {RENKLER.map((r) => (
            <Box key={r} component="button" type="button" aria-label={`Renk ${r}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { komut('foreColor', r); setRenkMenusu(null); }}
              sx={{ width: 24, height: 24, bgcolor: r, border: '1px solid #cbd5e1', borderRadius: 0.5, cursor: 'pointer', p: 0 }} />
          ))}
        </Box>
      </Menu>
      <Menu anchorEl={boyutMenusu} open={!!boyutMenusu} onClose={() => setBoyutMenusu(null)}>
        {BOYUTLAR.map((b) => (
          <MenuItem key={b.deger} onMouseDown={(e) => e.preventDefault()}
            onClick={() => { komut('fontSize', b.deger); setBoyutMenusu(null); }}>{b.ad}</MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
