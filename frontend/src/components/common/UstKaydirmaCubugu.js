// ↔️ Geniş tabloların ÜSTÜNE ikinci bir yatay kaydırma çubuğu koyar.
// müşteri: "şu kaydırma kısmından listelerin en üst tarafına da ekleyebilir miyiz"
// Tablo uzun olduğunda sağa kaydırmak için sayfanın en altına inmek gerekiyordu.
//
// Kullanımı: <UstKaydirmaCubugu><DataGrid ... /></UstKaydirmaCubugu>
// Kaydırılan asıl öğe DataGrid'in kendi .MuiDataGrid-virtualScroller'ıdır;
// buradaki çubuk yalnızca onun aynası.

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

// Çubuğun yüksekliği (aşağıdaki ::-webkit-scrollbar yüksekliğinden biraz fazla)
const CUBUK_YUKSEKLIGI = '12px';

const UstKaydirmaCubugu = ({ children }) => {
    const sarmalayiciRef = useRef(null); // DataGrid'i saran kap
    const cubukRef = useRef(null);       // üstteki sahte kaydırma çubuğu
    const icerikRef = useRef(null);      // genişliği tabloya eşitlenen boş şerit

    useEffect(() => {
        const sarmalayici = sarmalayiciRef.current;
        const cubuk = cubukRef.current;
        const icerik = icerikRef.current;
        if (!sarmalayici || !cubuk || !icerik) return undefined;

        let scroller = null;
        let gozlemci = null;
        const temizleyiciler = [];

        // İki yönlü senkron. Değer zaten eşitse yazmıyoruz: tarayıcı scrollLeft'e
        // aynı değeri yazınca scroll olayı üretmediği için bu, ayrı bir "kilit"
        // değişkenine gerek kalmadan sonsuz döngüyü kesiyor.
        const cubuktanGride = () => {
            if (scroller && scroller.scrollLeft !== cubuk.scrollLeft) {
                scroller.scrollLeft = cubuk.scrollLeft;
            }
        };
        const gridtenCubuga = () => {
            if (scroller && cubuk.scrollLeft !== scroller.scrollLeft) {
                cubuk.scrollLeft = scroller.scrollLeft;
            }
        };

        const olcuyuGuncelle = () => {
            if (!scroller) return;
            icerik.style.width = `${scroller.scrollWidth}px`;
            // Tablo ekrana sığıyorsa üstte gereksiz bir çubuk durmasın.
            // visibility kullanılıyor (display değil): yer kaplamaya devam edince
            // tablo sığar/sığmaz durumları arasında başlık zıplamıyor.
            const kaydirilabilir = scroller.scrollWidth > scroller.clientWidth + 1;
            cubuk.style.visibility = kaydirilabilir ? 'visible' : 'hidden';
        };

        // Yatay kaydırılan öğeyi bul. Sistemde iki tablo tekniği var:
        // DataGrid (sanal kaydırıcı) ve klasik <Table> (MUI TableContainer).
        // Hiçbiri tutmazsa CSS'ten overflow-x'i taşan ilk öğeye düşülür.
        const kaydiriciBul = () => sarmalayici.querySelector('.MuiDataGrid-virtualScroller')
            || sarmalayici.querySelector('.MuiTableContainer-root')
            || Array.from(sarmalayici.querySelectorAll('*')).find((el) => {
                const tasma = window.getComputedStyle(el).overflowX;
                return (tasma === 'auto' || tasma === 'scroll') && el.scrollWidth > el.clientWidth;
            })
            || null;

        const bagla = () => {
            scroller = kaydiriciBul();
            if (!scroller) return false;
            // Genişliği izlenecek iç öğe: DataGrid'de sanal içerik, <Table>'da tablonun
            // kendisi. Bulunamazsa yalnız kaydırıcı izlenir (scrollWidth yine doğru).
            const icerikEl = scroller.querySelector('.MuiDataGrid-virtualScrollerContent')
                || scroller.querySelector('table')
                || scroller.firstElementChild;

            cubuk.addEventListener('scroll', cubuktanGride, { passive: true });
            scroller.addEventListener('scroll', gridtenCubuga, { passive: true });
            temizleyiciler.push(() => cubuk.removeEventListener('scroll', cubuktanGride));
            temizleyiciler.push(() => scroller.removeEventListener('scroll', gridtenCubuga));

            // Sütun genişliği, satır sayısı veya pencere boyutu değişince toplam
            // genişlik de değişir; iki öğeyi de izliyoruz.
            gozlemci = new ResizeObserver(olcuyuGuncelle);
            if (icerikEl) gozlemci.observe(icerikEl);
            gozlemci.observe(scroller);
            olcuyuGuncelle();
            return true;
        };

        // DataGrid sanal kaydırıcısını ilk boyamada henüz basmamış olabiliyor.
        // Sınırlı sayıda tekrar denenir; bulunamazsa sayfa çubuksuz ama çalışır kalır.
        if (!bagla()) {
            let deneme = 0;
            const zamanlayici = setInterval(() => {
                deneme += 1;
                if (bagla() || deneme > 40) clearInterval(zamanlayici);
            }, 100);
            temizleyiciler.push(() => clearInterval(zamanlayici));
        }

        return () => {
            temizleyiciler.forEach((f) => f());
            if (gozlemci) gozlemci.disconnect();
        };
    }, []);

    return (
        <>
            <Box
                ref={cubukRef}
                sx={{
                    height: CUBUK_YUKSEKLIGI,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    // macOS'ta kaydırma çubukları varsayılan olarak gizlidir; üstteki
                    // çubuk görünmezse kullanıcı varlığını hiç fark etmez. Bu yüzden
                    // hem WebKit hem Firefox için açıkça çizdiriliyor.
                    '&::-webkit-scrollbar': { height: 10, WebkitAppearance: 'none' },
                    '&::-webkit-scrollbar-track': { background: '#f1f5f9' },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#cbd5e1',
                        '&:hover': { background: '#94a3b8' }
                    },
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9'
                }}
            >
                {/* Genişliği tablonun toplam genişliğine eşitlenir; yüksekliği '1px'
                    STRING olmalı — MUI sizing'de 0-1 arası sayılar yüzdeye çevrilir,
                    height: 1 verilseydi %100 olurdu. */}
                <Box ref={icerikRef} sx={{ height: '1px' }} />
            </Box>
            <Box ref={sarmalayiciRef} sx={{ width: '100%', minWidth: 0 }}>
                {children}
            </Box>
        </>
    );
};

export default UstKaydirmaCubugu;
