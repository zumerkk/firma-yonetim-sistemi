// 💳 Cari defter tablosu
//
// Müşteri: "kaydettiklerimizi alt tarafa eklesin, yine klasik mini cari tablo gibi
// gelen(banka tutar)-gideni(ödenen tutar) yeşil/kırmızı yapabiliriz."
// Firma görünümünde müşterinin Excel'indeki gibi borç/alacak ve satır satır
// "ALACAK / BORÇ BAKİYESİ" sütunu da var.

import React from 'react';
import {
    Box, Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography
} from '@mui/material';
import {
    Delete as DeleteIcon, Download as DownloadIcon, Edit as EditIcon, OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import {
    HAREKET_TURU, bakiyeRengi, farkRengi, hareketBasligi, paraYaz, talepEtiketi, tarihYaz
} from '../../utils/cariFormat';

const baslikSx = {
    fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase',
    whiteSpace: 'nowrap', background: '#f8fafc'
};
const tutarSx = { whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const toplamSatirSx = { background: '#f8fafc', '& td': { fontWeight: 700, borderBottom: 0 } };

function TurEtiketi({ tur }) {
    const m = HAREKET_TURU[tur];
    if (!m) return null;
    return (
        <Chip
            size="small" label={m.etiket}
            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, color: m.renk, background: m.zemin, border: `1px solid ${m.kenar}` }}
        />
    );
}

function Islemler({ h, onDuzenle, onSil, onDosya }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25 }}>
            {h.dosya && onDosya && (
                <>
                    <Tooltip title={`Belgeyi aç: ${h.dosya.dosyaAdi || ''}`}>
                        <IconButton size="small" onClick={() => onDosya(h, false)} aria-label="Belgeyi aç">
                            <OpenInNewIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Belgeyi indir">
                        <IconButton size="small" onClick={() => onDosya(h, true)} aria-label="Belgeyi indir">
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </>
            )}
            {onDuzenle && (
                <Tooltip title="Düzenle">
                    <IconButton size="small" onClick={() => onDuzenle(h)} aria-label="Düzenle">
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
            {onSil && (
                <Tooltip title="Sil">
                    <IconButton size="small" onClick={() => onSil(h)} aria-label="Sil" sx={{ color: '#dc2626' }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
}

/**
 * @param {'talep'|'firma'} gorunum  talep: Gelen/Giden sütunları + fark · firma: Borç/Alacak/Bakiye
 */
export default function CariDefterTablosu({ hareketler = [], ozet, gorunum = 'talep', onDuzenle, onSil, onDosya }) {
    const firmaGorunumu = gorunum === 'firma';
    const sutunSayisi = firmaGorunumu ? 9 : 6;

    return (
        <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 1, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: firmaGorunumu ? 960 : 640 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={baslikSx}>Tarih</TableCell>
                        <TableCell sx={baslikSx}>Tür</TableCell>
                        <TableCell sx={baslikSx}>{firmaGorunumu ? 'Fatura / Belge / Banka' : 'Açıklama'}</TableCell>
                        {firmaGorunumu && <TableCell sx={baslikSx}>Talep</TableCell>}
                        <TableCell sx={{ ...baslikSx, textAlign: 'right' }}>{firmaGorunumu ? 'Borç' : 'Gelen'}</TableCell>
                        <TableCell sx={{ ...baslikSx, textAlign: 'right' }}>{firmaGorunumu ? 'Alacak' : 'Giden'}</TableCell>
                        {firmaGorunumu && <TableCell sx={{ ...baslikSx, textAlign: 'right' }}>Bakiye</TableCell>}
                        {firmaGorunumu && <TableCell sx={baslikSx}>Not</TableCell>}
                        <TableCell sx={baslikSx} />
                    </TableRow>
                </TableHead>

                <TableBody>
                    {hareketler.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={sutunSayisi} sx={{ textAlign: 'center', color: '#94a3b8', py: 3 }}>
                                Henüz hareket yok — yukarıdaki kutulardan ekleyebilirsiniz.
                            </TableCell>
                        </TableRow>
                    )}

                    {hareketler.map((h) => {
                        const m = HAREKET_TURU[h.tur] || {};
                        const gelen = h.tur === 'gelen';
                        const tutar = (
                            <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: m.renk }}>
                                {paraYaz(h.tutar)}
                            </Typography>
                        );
                        return (
                            <TableRow key={h._id} hover sx={{ boxShadow: `inset 3px 0 0 ${m.renk}` }}>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{tarihYaz(h.tarih)}</TableCell>
                                <TableCell><TurEtiketi tur={h.tur} /></TableCell>
                                <TableCell sx={{ minWidth: 160 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{hareketBasligi(h)}</Typography>
                                    {/* Talep görünümünde faturanın gelen/giden sütunu yok; tutarı burada */}
                                    {!firmaGorunumu && h.tur === 'fatura' && (
                                        <Typography variant="caption" sx={{ display: 'block', color: m.renk, fontWeight: 600 }}>
                                            {paraYaz(h.tutar)}
                                        </Typography>
                                    )}
                                    {h.olusturanAdi && (
                                        <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8' }}>
                                            {h.olusturanAdi}
                                        </Typography>
                                    )}
                                </TableCell>

                                {firmaGorunumu ? (
                                    <>
                                        <TableCell sx={{ minWidth: 140 }}>
                                            <Typography variant="caption" sx={{ color: '#475569' }}>
                                                {talepEtiketi(h.dosyaTakip) || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={tutarSx}>{gelen ? '' : tutar}</TableCell>
                                        <TableCell sx={tutarSx}>{gelen ? tutar : ''}</TableCell>
                                        <TableCell sx={{ ...tutarSx, fontWeight: 700, color: bakiyeRengi(h.bakiye) }}>
                                            {paraYaz(h.bakiye)}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 220 }}>
                                            <Typography variant="caption" sx={{ color: '#475569', whiteSpace: 'pre-wrap' }}>
                                                {h.aciklama || ''}
                                            </Typography>
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell sx={tutarSx}>{gelen ? tutar : ''}</TableCell>
                                        <TableCell sx={tutarSx}>{h.tur === 'odenen' ? tutar : ''}</TableCell>
                                    </>
                                )}

                                <TableCell sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                                    <Islemler h={h} onDuzenle={onDuzenle} onSil={onSil} onDosya={onDosya} />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>

                {ozet && hareketler.length > 0 && (
                    <TableBody>
                        {firmaGorunumu ? (
                            <TableRow sx={toplamSatirSx}>
                                <TableCell colSpan={4} sx={{ textAlign: 'right', color: '#475569' }}>Toplam</TableCell>
                                <TableCell sx={{ ...tutarSx, color: HAREKET_TURU.odenen.renk }}>
                                    {paraYaz((ozet.toplamFatura || 0) + (ozet.toplamOdenen || 0))}
                                </TableCell>
                                <TableCell sx={{ ...tutarSx, color: HAREKET_TURU.gelen.renk }}>{paraYaz(ozet.toplamGelen)}</TableCell>
                                <TableCell sx={{ ...tutarSx, color: bakiyeRengi(ozet.bakiye) }}>{paraYaz(ozet.bakiye)}</TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        ) : (
                            <>
                                <TableRow sx={toplamSatirSx}>
                                    <TableCell colSpan={3} sx={{ textAlign: 'right', color: '#475569' }}>Toplam</TableCell>
                                    <TableCell sx={{ ...tutarSx, color: HAREKET_TURU.gelen.renk }}>{paraYaz(ozet.toplamGelen)}</TableCell>
                                    <TableCell sx={{ ...tutarSx, color: HAREKET_TURU.odenen.renk }}>{paraYaz(ozet.toplamOdenen)}</TableCell>
                                    <TableCell />
                                </TableRow>
                                <TableRow sx={toplamSatirSx}>
                                    <TableCell colSpan={3} sx={{ textAlign: 'right', color: '#475569' }}>Fark (Gelen − Giden)</TableCell>
                                    <TableCell colSpan={2} sx={{ ...tutarSx, fontSize: '0.95rem', color: farkRengi(ozet.fark) }}>
                                        {paraYaz(ozet.fark)}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                )}
            </Table>
        </TableContainer>
    );
}
