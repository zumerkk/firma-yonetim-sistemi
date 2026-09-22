// 💳 Cari hareket giriş formu (tek tür)
//
// Müşteri: "2 sütun olarak SOL tarafta, Ödenen Belge (biz yazabilelim içine), Tarih, Tutar,
// Belge Yükleme. SAĞ tarafta, Banka (Enpara, Garanti, Vakıf, Ziraat, Diğer - seçmeli),
// Tarih, Tutar". Aynı form düzenleme dialogunda başlangıç değerleriyle kullanılıyor.
//
// Müşteri (21.09.2026): "Ödenen Belge" adı "Hizmet ve Yatırım Ödemeleri" oldu; yazılan adlar
// tamamen büyük harfe çevriliyor; "Kesilen Fatura" girişi kaldırıldı (tür yalnız eski kayıtları
// düzenlemek için destekleniyor).

import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { Add as AddIcon, AttachFile as AttachFileIcon, Save as SaveIcon } from '@mui/icons-material';
import {
    BANKALAR, HAREKET_TURU, ODENEN_BASLIK, bugun, buyukHarf, isoGun, talepEtiketi, tutarCoz, tutarYaz
} from '../../utils/cariFormat';
import { createDatePasteHandler } from '../../utils/dateUtils';

const BASLIKLAR = {
    odenen: `Giden — ${ODENEN_BASLIK}`,
    gelen: 'Gelen — Banka',
    fatura: 'Kesilen Fatura'
};

const KABUL_EDILEN = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.ppt,.pptx';

const formKur = (baslangic) => ({
    belgeAdi: baslangic?.belgeAdi || '',
    faturaNo: baslangic?.faturaNo || '',
    banka: baslangic?.banka || '',
    tarih: baslangic?.tarih ? isoGun(baslangic.tarih) : bugun(),
    tutar: baslangic?.tutar != null ? tutarYaz(baslangic.tutar) : '',
    aciklama: baslangic?.aciklama || '',
    dosyaTakip: baslangic?.dosyaTakip?._id || (typeof baslangic?.dosyaTakip === 'string' ? baslangic.dosyaTakip : '')
});

/**
 * @param {'odenen'|'gelen'|'fatura'} tur
 * @param {(alanlar, dosya) => Promise<boolean>} onKaydet  true dönerse yeni kayıt formu sıfırlanır
 * @param {object} [baslangic]  düzenlenen hareket
 * @param {Array}  [talepler]   verilirse "talebe bağla" seçimi gösterilir (cari modülü)
 * @param {boolean} [notAlani]  serbest not alanı (cari modülü)
 * @param {boolean} [cerceve]   false → yalnızca alanlar (dialog içinde)
 */
export default function CariHareketFormu({
    tur, onKaydet, baslangic = null, talepler = null, notAlani = false, cerceve = true
}) {
    const [form, setForm] = useState(() => formKur(baslangic));
    const [dosya, setDosya] = useState(null);
    const [hatalar, setHatalar] = useState({});
    const [kaydediliyor, setKaydediliyor] = useState(false);
    const dosyaRef = useRef(null);
    const meta = HAREKET_TURU[tur];
    const dosyaVar = tur !== 'gelen';

    // Bağlı talep listede yoksa (ör. arşivlenmiş) seçim kutusu boş görünmesin
    const talepSecenekleri = useMemo(() => {
        const liste = Array.isArray(talepler) ? talepler : [];
        const bagli = baslangic?.dosyaTakip;
        return bagli?._id && !liste.some((t) => t._id === bagli._id) ? [bagli, ...liste] : liste;
    }, [talepler, baslangic]);

    const yaz = (alan) => (e) => {
        const deger = e.target.value;
        setForm((p) => ({ ...p, [alan]: deger }));
        if (hatalar[alan]) setHatalar((h) => ({ ...h, [alan]: undefined }));
    };

    // Alandan çıkınca biçimlenir ("24000" → "24.000,00"): yanlış anlaşılan tutar
    // kaydedilmeden görülür
    const tutarBicimle = () => {
        const t = tutarCoz(form.tutar);
        if (t !== null) setForm((p) => ({ ...p, tutar: tutarYaz(t) }));
    };

    const dogrula = () => {
        const h = {};
        if (tur === 'odenen' && !form.belgeAdi.trim()) h.belgeAdi = 'Ödemenin adını yazın';
        if (tur === 'gelen' && !form.banka) h.banka = 'Banka seçin';
        if (!form.tarih) h.tarih = 'Tarih girin';
        const tutar = tutarCoz(form.tutar);
        if (tutar === null) h.tutar = String(form.tutar).trim() ? 'Tutar anlaşılamadı (örn. 24.000,50)' : 'Tutar girin';
        else if (tutar <= 0) h.tutar = 'Tutar sıfırdan büyük olmalı';
        setHatalar(h);
        return Object.keys(h).length ? null : tutar;
    };

    const gonder = async (e) => {
        e.preventDefault();
        if (kaydediliyor) return;
        const tutar = dogrula();
        if (tutar === null) return;

        const alanlar = { tur, tarih: form.tarih, tutar };
        if (tur === 'odenen') alanlar.belgeAdi = buyukHarf(form.belgeAdi.trim());
        if (tur === 'gelen') alanlar.banka = form.banka;
        if (tur === 'fatura') alanlar.faturaNo = form.faturaNo.trim();
        if (notAlani) alanlar.aciklama = form.aciklama.trim();
        if (talepler) alanlar.dosyaTakip = form.dosyaTakip || '';

        setKaydediliyor(true);
        try {
            const tamam = await onKaydet(alanlar, dosya);
            if (tamam && !baslangic) {
                // Sıradaki kayıt için hazır; aynı gün aynı talebe art arda girilebilsin
                setForm((p) => ({ ...formKur(null), tarih: p.tarih, dosyaTakip: p.dosyaTakip }));
                setDosya(null);
                if (dosyaRef.current) dosyaRef.current.value = '';
            }
        } finally {
            setKaydediliyor(false);
        }
    };

    const alanlar = (
        <Box component="form" onSubmit={gonder} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {tur === 'odenen' && (
                // Yazarken büyük harf görünür (CSS, lang="tr" ile i → İ); değer kayıtta çevrilir.
                // Her tuşta değeri değiştirmek, metnin ortasına yazarken imleci sona atardı.
                <TextField
                    size="small" fullWidth label={ODENEN_BASLIK} placeholder="Örn. BELGE HARCI MAKBUZU"
                    value={form.belgeAdi} onChange={yaz('belgeAdi')}
                    onBlur={() => setForm((p) => ({ ...p, belgeAdi: buyukHarf(p.belgeAdi) }))}
                    error={!!hatalar.belgeAdi} helperText={hatalar.belgeAdi}
                    inputProps={{ maxLength: 300, lang: 'tr', style: { textTransform: 'uppercase' } }}
                />
            )}
            {tur === 'gelen' && (
                <TextField
                    select size="small" fullWidth label="Banka"
                    value={form.banka} onChange={yaz('banka')}
                    error={!!hatalar.banka} helperText={hatalar.banka}
                >
                    {BANKALAR.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
            )}
            {tur === 'fatura' && (
                <TextField
                    size="small" fullWidth label="Fatura No"
                    value={form.faturaNo} onChange={yaz('faturaNo')}
                    inputProps={{ maxLength: 60 }}
                />
            )}

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField
                    size="small" type="date" label="Tarih"
                    value={form.tarih} onChange={yaz('tarih')}
                    onPaste={createDatePasteHandler((iso) => setForm((p) => ({ ...p, tarih: iso })))}
                    InputLabelProps={{ shrink: true }}
                    error={!!hatalar.tarih} helperText={hatalar.tarih}
                    sx={{ flex: '1 1 140px' }}
                />
                <TextField
                    size="small" label={tur === 'fatura' ? 'Tutar (KDV Dahil)' : 'Tutar'} placeholder="0,00"
                    value={form.tutar} onChange={yaz('tutar')} onBlur={tutarBicimle}
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{ endAdornment: <Typography variant="body2" sx={{ color: '#94a3b8', ml: 0.5 }}>₺</Typography> }}
                    error={!!hatalar.tutar} helperText={hatalar.tutar}
                    sx={{ flex: '1 1 140px' }}
                />
            </Box>

            {talepler && (
                <TextField
                    select size="small" fullWidth label="Belge Takip Talebi (isteğe bağlı)"
                    value={form.dosyaTakip} onChange={yaz('dosyaTakip')}
                >
                    <MenuItem value=""><em>Talebe bağlama</em></MenuItem>
                    {talepSecenekleri.map((t) => (
                        <MenuItem key={t._id} value={t._id}>{talepEtiketi(t) || t._id}</MenuItem>
                    ))}
                </TextField>
            )}

            {notAlani && (
                <TextField
                    size="small" fullWidth label="Not" placeholder="Örn. 24.000 fatura iptal"
                    value={form.aciklama} onChange={yaz('aciklama')}
                    inputProps={{ maxLength: 500 }}
                />
            )}

            {dosyaVar && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <input
                        ref={dosyaRef} type="file" hidden accept={KABUL_EDILEN}
                        onChange={(e) => setDosya(e.target.files?.[0] || null)}
                    />
                    <Button
                        size="small" variant="outlined" startIcon={<AttachFileIcon />}
                        onClick={() => dosyaRef.current?.click()}
                        sx={{ textTransform: 'none', flexShrink: 0 }}
                    >
                        {baslangic?.dosya ? 'Belgeyi Değiştir' : 'Belge Yükle'}
                    </Button>
                    <Typography variant="caption" noWrap sx={{ color: dosya ? '#334155' : '#94a3b8', minWidth: 0 }}>
                        {dosya ? dosya.name : (baslangic?.dosya?.dosyaAdi || 'Seçilmedi (isteğe bağlı)')}
                    </Typography>
                </Box>
            )}

            <Button
                type="submit" variant="contained" disabled={kaydediliyor}
                startIcon={kaydediliyor ? <CircularProgress size={16} color="inherit" /> : (baslangic ? <SaveIcon /> : <AddIcon />)}
                sx={{
                    textTransform: 'none', alignSelf: 'flex-end', background: meta.renk,
                    '&:hover': { background: meta.renk, filter: 'brightness(0.92)' }
                }}
            >
                {baslangic ? 'Kaydet' : 'Ekle'}
            </Button>
        </Box>
    );

    if (!cerceve) return alanlar;

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', borderTop: `3px solid ${meta.renk}` }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: meta.renk, mb: 1.5 }}>
                {BASLIKLAR[tur]}
            </Typography>
            {alanlar}
        </Paper>
    );
}
