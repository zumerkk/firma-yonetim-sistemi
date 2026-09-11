// 🧪 DataGrid v6 prop uyumu - sessiz kırılmaya karşı koruma
//
// Gerçek vaka (11 Eylül 2026, müşteri: "Toplu tarih girerken satırları seçemiyoruz
// ve hepsi seçili olsa bile 0 satır gösteriyor"):
//
// Depoda @mui/x-data-grid v6 kurulu ama makine listesi ekranları hâlâ v5 prop
// adlarını kullanıyordu. v6 bu prop'ları KALDIRDI — uyarı vermez, sessizce yok
// sayar. Sonuç: kullanıcı kutucukları işaretliyordu, grid kendi içinde seçiyordu,
// ama `onSelectionModelChange` hiç çağrılmadığı için üst bileşenin state'i hep boş
// kalıyordu. Ekranda "Uygula (0)" yazıyordu ve toplu işlem tamamen kullanılamazdı.
//
// Aynı hata gözle fark edilmiyor: derleme geçer, test geçer, konsol sessiz.
// Bu yüzden kaynak metnini tarayan bir koruma koyuyoruz.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');

// v6'da kaldırılan prop → yerine geleni
const KALDIRILAN_PROPLAR = {
  'onSelectionModelChange': 'onRowSelectionModelChange',
  'disableSelectionOnClick': 'disableRowSelectionOnClick',
  'rowsPerPageOptions': 'pageSizeOptions',
  'headerHeight': 'columnHeaderHeight',
  'onPageChange': 'onPaginationModelChange',
  'onPageSizeChange': 'onPaginationModelChange'
};

function jsDosyalari(dizin, toplam = []) {
  for (const ad of fs.readdirSync(dizin)) {
    if (ad === 'node_modules' || ad === 'build') continue;
    const tam = path.join(dizin, ad);
    const st = fs.statSync(tam);
    if (st.isDirectory()) jsDosyalari(tam, toplam);
    else if (/\.jsx?$/.test(ad) && !/\.test\.jsx?$/.test(ad)) toplam.push(tam);
  }
  return toplam;
}

// DataGrid kullanan dosyalar — kural yalnızca onlar için geçerli
const dataGridDosyalari = jsDosyalari(SRC)
  .filter((f) => fs.readFileSync(f, 'utf8').includes('<DataGrid'));

describe('DataGrid v6 - kaldırılmış v5 prop\'ları kullanılmamalı', () => {
  test('taranacak dosya bulundu (test boşa çalışmasın)', () => {
    expect(dataGridDosyalari.length).toBeGreaterThan(0);
  });

  test.each(Object.entries(KALDIRILAN_PROPLAR))(
    '%s kullanılmıyor (yerine %s)',
    (eski, yeni) => {
      const suclular = dataGridDosyalari.filter((f) => {
        const kod = fs.readFileSync(f, 'utf8');
        // `onSelectionModelChange=` gibi prop yazımını ara; `onRowSelectionModelChange`
        // gibi içinde geçen daha uzun adları yanlışlıkla yakalamamak için sınır koy
        return new RegExp(`(?<![A-Za-z])${eski}\\s*=`).test(kod);
      });
      const liste = suclular.map((f) => path.relative(SRC, f)).join(', ');
      expect(`${eski}: ${liste}`).toBe(`${eski}: `);
    }
  );

  // `selectionModel` v6'da `rowSelectionModel` oldu. Üst state'e bağlanan grid'lerde
  // bunun kaçması, seçimin hiç okunamaması demek.
  test('selectionModel yerine rowSelectionModel kullanılıyor', () => {
    const suclular = dataGridDosyalari.filter((f) => {
      const kod = fs.readFileSync(f, 'utf8');
      return /(?<![A-Za-z])selectionModel\s*=/.test(kod);
    });
    expect(suclular.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
