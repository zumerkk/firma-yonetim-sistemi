import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ILK_FILTRELER = { search: '', durum: '', il: '', arsiv: '0' };
const ILK_SIRALAMA = { alan: 'belgeYonetimi.uzatimTarihi', yon: 'asc' };

export default function useTesvikListeGorunumu(loading, birlesik = false) {
  const location = useLocation();
  const navigate = useNavigate();
  const onceki = location.state?.tesvikListe;
  const [gorunum, setGorunum] = useState(() => onceki?.gorunum || {
    filters: birlesik ? { ...ILK_FILTRELER, sureDurumu: '' } : ILK_FILTRELER,
    siralama: ILK_SIRALAMA,
    sistemFiltre: '',
    sayfa: 1
  });
  const anaAlanRef = useRef(null);
  const tabloRef = useRef(null);
  const geriYuklenecekKaydirma = useRef(onceki?.kaydirma);

  useLayoutEffect(() => {
    const kaydirma = geriYuklenecekKaydirma.current;
    if (loading || !kaydirma || !anaAlanRef.current || !tabloRef.current) return;
    anaAlanRef.current.scrollTop = kaydirma.ust;
    tabloRef.current.scrollLeft = kaydirma.sol;
    geriYuklenecekKaydirma.current = null;
  }, [loading]);

  const filtreleriGuncelle = (degisiklik) => setGorunum((onceki) => ({
    ...onceki,
    filters: { ...onceki.filters, ...degisiklik },
    sayfa: 1
  }));
  const siralamayaGec = (alan) => setGorunum((onceki) => ({
    ...onceki,
    siralama: { alan, yon: onceki.siralama.alan === alan && onceki.siralama.yon === 'asc' ? 'desc' : 'asc' },
    sayfa: 1
  }));
  const sistemeGec = (sistemFiltre) => setGorunum((onceki) => ({ ...onceki, sistemFiltre, sayfa: 1 }));
  const sayfayaGec = useCallback((sayfa) => setGorunum((onceki) => onceki.sayfa === sayfa ? onceki : { ...onceki, sayfa }), []);

  const listedenGit = (hedef) => {
    const { pathname, search, hash } = location;
    // Geri düğmesi bu liste kaydına döner. Görünümü aynı geçmiş girdisine yaz.
    navigate({ pathname, search, hash }, {
      replace: true,
      state: {
        ...location.state,
        tesvikListe: {
          gorunum,
          kaydirma: { ust: anaAlanRef.current?.scrollTop ?? 0, sol: tabloRef.current?.scrollLeft ?? 0 }
        }
      }
    });
    navigate(hedef);
  };

  return { ...gorunum, anaAlanRef, tabloRef, filtreleriGuncelle, siralamayaGec, sistemeGec, sayfayaGec, listedenGit };
}
