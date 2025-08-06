// 🏪 SERBEST BÖLGELER VERİTABANI
// GM Teşvik Sistemi - 19 adet Serbest Bölge Müdürlüğü

export const serbestBolgeler = [
  { id: 1, bolge: 'Adana-Yumurtalık Serbest Bölge Müdürlüğü', il: 'Adana', kategori: 'Endüstri' },
  { id: 2, bolge: 'Antalya Serbest Bölge Müdürlüğü', il: 'Antalya', kategori: 'Turizm' },
  { id: 3, bolge: 'Avrupa Serbest Bölge Müdürlüğü', il: 'İstanbul', kategori: 'Ticaret' },
  { id: 4, bolge: 'Bursa Serbest Bölge Müdürlüğü', il: 'Bursa', kategori: 'Endüstri' },
  { id: 5, bolge: 'Denizli Serbest Bölge Müdürlüğü', il: 'Denizli', kategori: 'Tekstil' },
  { id: 6, bolge: 'Ege Serbest Bölge Müdürlüğü', il: 'İzmir', kategori: 'Endüstri' },
  { id: 7, bolge: 'Gaziantep Serbest Bölge Müdürlüğü', il: 'Gaziantep', kategori: 'Gıda' },
  { id: 8, bolge: 'İstanbul Atatürk Havalimanı Serbest Bölge Müdürlüğü', il: 'İstanbul', kategori: 'Havayolu' },
  { id: 9, bolge: 'İstanbul Endüstri ve Ticaret Serbest Bölge Müdürlüğü', il: 'İstanbul', kategori: 'Endüstri' },
  { id: 10, bolge: 'İstanbul Trakya Serbest Bölge Müdürlüğü', il: 'İstanbul', kategori: 'Lojistik' },
  { id: 11, bolge: 'İzmir Serbest Bölge Müdürlüğü', il: 'İzmir', kategori: 'Endüstri' },
  { id: 12, bolge: 'Kayseri Serbest Bölge Müdürlüğü', il: 'Kayseri', kategori: 'Endüstri' },
  { id: 13, bolge: 'Kocaeli Serbest Bölge Müdürlüğü', il: 'Kocaeli', kategori: 'Kimya' },
  { id: 14, bolge: 'Mersin Serbest Bölge Müdürlüğü', il: 'Mersin', kategori: 'Liman' },
  { id: 15, bolge: 'Rize Serbest Bölge Müdürlüğü', il: 'Rize', kategori: 'Tarım' },
  { id: 16, bolge: 'Samsun Serbest Bölge Müdürlüğü', il: 'Samsun', kategori: 'Liman' },
  { id: 17, bolge: 'Trabzon Serbest Bölge Müdürlüğü', il: 'Trabzon', kategori: 'Liman' },
  { id: 18, bolge: 'TÜBİTAK Mam Teknoloji Serbest Bölge Müdürlüğü', il: 'Kocaeli', kategori: 'Teknoloji' }
];

// 📊 Kategoriler
export const serbestBolgeKategorileri = [
  'Endüstri', 'Ticaret', 'Lojistik', 'Teknoloji', 'Kimya', 'Tekstil', 'Gıda', 'Turizm', 'Tarım', 'Liman', 'Havayolu'
];

// 📍 İller (Serbest Bölge bulunan)
export const serbestBolgeIlleri = [
  'Adana', 'Antalya', 'Bursa', 'Denizli', 'Gaziantep', 'İstanbul', 'İzmir', 'Kayseri', 'Kocaeli', 'Mersin', 'Rize', 'Samsun', 'Trabzon'
];

// 🔍 Arama ve filtreleme fonksiyonları
export const searchSerbestBolge = (query) => {
  if (!query) return serbestBolgeler;
  
  const lowerQuery = query.toLowerCase();
  return serbestBolgeler.filter(item => 
    item.bolge.toLowerCase().includes(lowerQuery) ||
    item.il.toLowerCase().includes(lowerQuery) ||
    item.kategori.toLowerCase().includes(lowerQuery)
  );
};

export const getSerbestBolgeByIl = (il) => {
  return serbestBolgeler.filter(item => item.il === il);
};

export const getSerbestBolgeByKategori = (kategori) => {
  return serbestBolgeler.filter(item => item.kategori === kategori);
};

export const getSerbestBolgeCount = () => serbestBolgeler.length;

export default serbestBolgeler;