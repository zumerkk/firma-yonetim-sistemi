// 📋 Panodan dosya yapıştırma (müşteri: "kopyaladığımız görselleri direkt yapıştıralım, WhatsApp gibi")
//
// Neden ortak hook?
// - Yapıştırma olayı yalnızca odaklanabilir öğelerde tetiklenir; bir <div> bırakma
//   bölgesine onPaste koymak çalışmaz. Bu yüzden dinleyici document seviyesinde olmalı.
// - Aynı sayfada birden fazla yükleme bölgesi olabiliyor (Dashboard'da SmartUpload ile
//   ScreenshotImport yan yana). Tek Ctrl+V'nin iki yükleme başlatmaması için burada
//   koordinasyon yapılır: her bölge `kabul` filtresiyle ilgilendiği dosyayı alır ve
//   olayı işleyen ilk bölge onu işaretler.

import { useEffect, useRef } from 'react';

const RESIM_UZANTILARI = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const MIME_UZANTI = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg',
    'image/gif': '.gif', 'image/webp': '.webp', 'image/bmp': '.bmp'
};

// 'sv-SE' yerel biçimi "2025-01-31 14:32:05" verir → rakamları alıp 20250131143205 yapılır
const panoZamanDamgasi = () => new Date().toLocaleString('sv-SE').replace(/\D/g, '');

// Tarayıcı, panodaki ekran görüntüsünü neredeyse her zaman "image.png" adıyla verir.
// Aynı adla üst üste yüklenirse dosya listesinde hangisi hangisi ayırt edilemiyor;
// bu yüzden genel adlı pano görsellerini zaman damgalı ada çeviriyoruz.
// Masaüstünden kopyalanan "fatura.png" gibi anlamlı adlara dokunulmaz.
export const panoDosyasiniAdlandir = (file, sira, damga) => {
    const ad = file.name || '';
    const uzanti = (ad.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    const taban = ad.slice(0, ad.length - uzanti.length);
    const bilinenUzanti = RESIM_UZANTILARI.includes(uzanti);
    const genelAd = !taban || /^(image|resim|screenshot|ekran)/i.test(taban);
    if (bilinenUzanti && !genelAd) return file; // anlamlı ad korunur
    const yeniUzanti = bilinenUzanti ? uzanti : (MIME_UZANTI[(file.type || '').toLowerCase()] || '.png');
    const yeniAd = `ekran-goruntusu-${damga}${sira > 0 ? `-${sira + 1}` : ''}${yeniUzanti}`;
    try {
        return new File([file], yeniAd, { type: file.type || 'image/png' });
    } catch (_) {
        return file; // File yapıcısı desteklenmiyorsa orijinali gönder
    }
};

export const panoDosyalariniAdlandir = (dosyalar) => {
    const damga = panoZamanDamgasi();
    return dosyalar.map((f, i) => panoDosyasiniAdlandir(f, i, damga));
};

/**
 * Panodan yapıştırılan dosyaları yakalar.
 *
 * @param {(dosyalar: File[]) => void} onDosyalar  Yapıştırılan (adlandırılmış) dosyalar
 * @param {object}   [secenekler]
 * @param {boolean}  [secenekler.aktif=true]  Bölge görünür/kullanılabilir mi
 * @param {(file: File) => boolean} [secenekler.kabul]  Bu bölgenin ilgilendiği dosya filtresi
 */
const usePanoDosyaYapistir = (onDosyalar, { aktif = true, kabul } = {}) => {
    // Geri çağrı her render'da yeniden üretiliyor; ref'te tutulursa dinleyici
    // her render'da sökülüp yeniden kurulmaz.
    const onDosyalarRef = useRef(onDosyalar);
    const kabulRef = useRef(kabul);
    useEffect(() => {
        onDosyalarRef.current = onDosyalar;
        kabulRef.current = kabul;
    });

    useEffect(() => {
        if (!aktif) return undefined;

        const handlePaste = (e) => {
            if (e.__panoDosyaIslendi) return; // aynı olayı başka bir bölge zaten aldı

            // Metin kutusundayken karışma: not/açıklama alanlarına normal yapıştırma sürsün
            const hedef = e.target;
            if (hedef && (hedef.isContentEditable || ['INPUT', 'TEXTAREA'].includes(hedef.tagName))) return;

            let dosyalar = Array.from(e.clipboardData?.files || []);
            if (kabulRef.current) dosyalar = dosyalar.filter(kabulRef.current);
            if (!dosyalar.length) return; // sadece metin yapıştırıldıysa ya da bize göre değilse

            e.__panoDosyaIslendi = true;
            e.preventDefault();
            onDosyalarRef.current(panoDosyalariniAdlandir(dosyalar));
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [aktif]);
};

export default usePanoDosyaYapistir;
