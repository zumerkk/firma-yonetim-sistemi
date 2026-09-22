// 🪶 MAKİNE LİSTESİ — HAFİF IZGARA HÜCRELERİ
//
// Müşteri (21.09.2026): "Makine listesi biraz yavaş çalışıyor; özellikle 50'den fazla makinesi olan
// firmalarda işlem yaparken zorlanıyoruz."
//
// Ölçüldü (yerel önizleme, geliştirme derlemesi, 53 yerli makineli test belgesi): tek bir satırı
// işaretlemek ızgarayı art arda 2-10 kez yeniden çizdiriyor ve her çizim ~120 ms sürüyordu (1,25 sn'ye
// varan donma). Aynı işlem hücreler düz metne çevrilince çizim başına ~25 ms'ye indi: yükün ~%80'i hücre
// içeriğiydi. DataGrid v6 kendisi her çizildiğinde görünen bütün satırları baştan çiziyor (kök props
// bağlamı her çizimde değişiyor); bu yüzden asıl kazanç hücreleri hafifletmekten geliyor:
//   - MUI Select / TextField (FormControl + InputBase + çentikli çerçeve + Menu altyapısı) → yerel
//     <select>/<input>; düzenleme kapalıyken yalnızca düz metin.
//   - Her hücredeki MUI Tooltip → yerel `title`.
//   - Birim/döviz arama bileşeni (6 durum, açılışta localStorage okuyup kendini yeniden çizen 2 etki)
//     → düz etiket; arama penceresi yalnız tıklanınca kurulur.
//   - MUI IconButton (dalga efekti vb.) → yerel <button>.
// Bileşenler modül düzeyinde ve memo'lu: renderCell içinde bileşen TANIMLANMIYOR (her çizimde yeni tip
// üretip hücreyi söküp kurardı — bkz. IzgaraTarihHucresi notu).

import React, { memo, useEffect, useRef, useState } from 'react';
import UnitCurrencySearch, { etiketCoz } from '../UnitCurrencySearch';

const YAZI = '0.68rem';

const metinStili = {
    display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', fontSize: YAZI
};

const kutuStili = {
    width: '100%', minWidth: 0, height: 22, boxSizing: 'border-box', fontSize: YAZI, fontFamily: 'inherit',
    color: '#202124', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 3, padding: '0 4px', outline: 'none'
};

// Yazarken DataGrid'in hücre klavye kısayolları (boşluk = satır seç, oklar = hücre değiştir) çalışmasın
const tusuIzgarayaVerme = (e) => {
    if (e.key !== 'Tab' && e.key !== 'Escape') e.stopPropagation();
};

/** Uzun metin — tamamı fareyle üstüne gelince (yerel title) */
export const MetinHucresi = memo(function MetinHucresi({ deger, stil }) {
    const m = deger === null || deger === undefined ? '' : String(deger);
    return <div title={m} style={stil ? { ...metinStili, ...stil } : metinStili}>{m}</div>;
});

/**
 * Seçim hücresi: düzenleme kapalıyken düz etiket, açıkken yerel <select>.
 * @param {Array<{deger:string, etiket:string, uzun?:string}>} secenekler  ilk seçenek boş ('') olmalı
 */
export const SecimHucresi = memo(function SecimHucresi({ deger, secenekler, duzenlenebilir, onDegis }) {
    const v = deger === null || deger === undefined ? '' : String(deger);
    const secili = secenekler.find((s) => s.deger === v);
    if (!duzenlenebilir) {
        return (
            <span title={secili?.uzun || secili?.etiket || v} style={{ fontSize: YAZI, color: v ? '#202124' : '#94a3b8' }}>
                {secili ? secili.etiket : (v || '-')}
            </span>
        );
    }
    return (
        <select
            value={v}
            title={secili?.uzun || secili?.etiket || v}
            onChange={(e) => onDegis(e.target.value)}
            onKeyDown={tusuIzgarayaVerme}
            style={{ ...kutuStili, padding: '0 2px', cursor: 'pointer' }}
        >
            {secenekler.map((s) => <option key={s.deger} value={s.deger}>{s.etiket}</option>)}
            {/* Listede olmayan eski değer sessizce "-" görünmesin */}
            {v && !secili && <option value={v}>{v}</option>}
        </select>
    );
});

/**
 * Metin/sayı girişi: yazarken yalnız hücrenin kendi durumu değişir, satıra (ve ızgaraya) alandan çıkınca
 * ya da Enter'da BİR KEZ yazılır — her tuşta bütün ızgara yeniden çizilmez.
 */
export const GirdiHucresi = memo(function GirdiHucresi({
    deger, duzenlenebilir, onKaydet, placeholder = '', tip = 'text', hizala = 'left', vurgula = false, yaziBoyutu = YAZI
}) {
    const dis = deger === null || deger === undefined ? '' : String(deger);
    const [yerel, setYerel] = useState(dis);
    const ref = useRef(null);
    useEffect(() => {
        if (document.activeElement !== ref.current) setYerel(dis);
    }, [dis]);

    if (!duzenlenebilir) {
        return (
            <span title={dis} style={{ ...metinStili, fontSize: yaziBoyutu, textAlign: hizala, fontWeight: vurgula ? 600 : 400, color: dis ? '#334155' : '#94a3b8' }}>
                {dis || '-'}
            </span>
        );
    }
    const kaydet = () => { if (yerel !== dis) onKaydet(yerel); };
    return (
        <input
            ref={ref}
            type={tip}
            value={yerel}
            placeholder={placeholder}
            onChange={(e) => setYerel(e.target.value)}
            onBlur={kaydet}
            onKeyDown={(e) => {
                tusuIzgarayaVerme(e);
                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                if (e.key === 'Escape') { setYerel(dis); }
            }}
            style={{ ...kutuStili, fontSize: yaziBoyutu, textAlign: hizala, fontWeight: vurgula ? 600 : 400 }}
        />
    );
});

/** Küçük ikon düğmesi — MUI IconButton yerine (dalga efekti, çoklu sarmalayıcı yok) */
export const HafifDugme = memo(function HafifDugme({ baslik, onClick, disabled = false, children, renk = '#475569' }) {
    return (
        <button
            type="button"
            title={baslik}
            aria-label={baslik}
            disabled={disabled}
            onClick={onClick}
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 2, margin: 0,
                border: 0, background: 'transparent', color: renk, cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.35 : 1, lineHeight: 0, borderRadius: 3
            }}
        >
            {children}
        </button>
    );
});

/** Küçük metin düğmesi — MUI Button (size="small", text) yerine */
export const HafifMetinDugme = memo(function HafifMetinDugme({ onClick, disabled = false, children, baslik }) {
    return (
        <button
            type="button"
            title={baslik}
            disabled={disabled}
            onClick={onClick}
            style={{
                padding: '1px 5px', margin: 0, minWidth: 28, border: 0, borderRadius: 3, background: 'transparent',
                color: disabled ? '#94a3b8' : '#1976d2', fontSize: '0.62rem', fontWeight: 600, fontFamily: 'inherit',
                cursor: disabled ? 'default' : 'pointer', textTransform: 'uppercase'
            }}
        >
            {children}
        </button>
    );
});

/** Küçük renkli rozet — MUI Chip yerine */
export const Rozet = memo(function Rozet({ metin, baslik, zemin = '#dbeafe', yazi = '#1d4ed8', cerceve = '#3b82f6' }) {
    return (
        <span
            title={baslik}
            style={{
                display: 'inline-flex', alignItems: 'center', height: 18, minWidth: 18, padding: '0 4px', boxSizing: 'border-box',
                justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, borderRadius: 9, background: zemin, color: yazi,
                border: `1px solid ${cerceve}`, whiteSpace: 'nowrap'
            }}
        >
            {metin}
        </span>
    );
});

/**
 * Birim / döviz hücresi: etiket düz metin; düzenlenebilirken tıklanınca arama penceresi AÇILIR.
 * Pencere (UnitCurrencySearch) yalnız açıkken kurulur — her hücrede hazır beklemez.
 */
export const BirimHucresi = memo(function BirimHucresi({ tip = 'unit', kod, aciklama, duzenlenebilir, onSec }) {
    const [acik, setAcik] = useState(false);
    const etiket = kod ? etiketCoz(tip, kod, aciklama) : '';
    const baslik = kod ? `${kod}${aciklama ? ` — ${aciklama}` : ''}` : (duzenlenebilir ? 'Seçmek için tıklayın' : '');
    return (
        <>
            <span
                role={duzenlenebilir ? 'button' : undefined}
                tabIndex={duzenlenebilir ? 0 : undefined}
                title={baslik}
                onClick={duzenlenebilir ? () => setAcik(true) : undefined}
                onKeyDown={duzenlenebilir ? (e) => { if (e.key === 'Enter') setAcik(true); tusuIzgarayaVerme(e); } : undefined}
                style={{
                    display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: YAZI, fontWeight: 600, padding: '1px 6px', borderRadius: 9,
                    background: kod ? '#1d4ed8' : 'transparent', color: kod ? '#fff' : '#94a3b8',
                    border: kod ? 0 : (duzenlenebilir ? '1px dashed #cbd5e1' : 0),
                    cursor: duzenlenebilir ? 'pointer' : 'default'
                }}
            >
                {etiket || (duzenlenebilir ? 'Seç…' : '-')}
            </span>
            {acik && (
                <UnitCurrencySearch
                    type={tip}
                    value={tip === 'unit' ? { kod, aciklama } : kod}
                    yalnizPencere
                    acikBasla
                    onKapat={() => setAcik(false)}
                    onChange={(yeniKod, yeniAciklama) => onSec(yeniKod, yeniAciklama)}
                />
            )}
        </>
    );
});
