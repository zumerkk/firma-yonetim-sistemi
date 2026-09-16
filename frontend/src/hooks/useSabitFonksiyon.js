// 🔒 Kimliği hiç değişmeyen olay işleyicisi (React'in "useEvent" kalıbı)
//
// React.memo ile sarılı bir alt bileşene verilen geri çağrı her render'da yeniden üretilirse memo
// hiçbir işe yaramaz. Bu kanca her zaman AYNI fonksiyonu döndürür; çağrıldığında son render'daki
// gerçek işleyiciyi çalıştırır. Yalnız olay işleyicilerinde kullanın — render sırasında çağırmayın.

import { useCallback, useLayoutEffect, useRef } from 'react';

export default function useSabitFonksiyon(fonksiyon) {
  const ref = useRef(fonksiyon);
  useLayoutEffect(() => {
    ref.current = fonksiyon;
  });
  return useCallback((...argumanlar) => ref.current(...argumanlar), []);
}
