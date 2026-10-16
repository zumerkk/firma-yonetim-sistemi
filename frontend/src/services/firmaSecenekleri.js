import axios from '../utils/axios';

// Firma seçimi bir liste sayfası değildir: ilk 20 eşleşmeden sonra kalan aynı
// adlı firmalar da seçilebilmeli. Sunucunun bütün eşleşme sayfalarını birleştir.
export const firmaSecenekleriniAra = async (terim, { signal } = {}) => {
    const arama = String(terim || '').trim();
    if (arama.length < 2) return [];
    const firmalar = new Map();
    let sayfa = 1;
    let toplamSayfa = 1;
    do {
        if (signal?.aborted) return [];
        const { data } = await axios.get('/firma', { params: { arama, sayfa, limit: 100 }, signal });
        const sonuc = data?.data;
        const liste = sonuc?.firmalar || data?.firmalar || (Array.isArray(sonuc) ? sonuc : []);
        for (const firma of liste) firmalar.set(String(firma._id), firma);
        toplamSayfa = Number(sonuc?.pagination?.toplamSayfa) || 1;
        sayfa++;
    } while (sayfa <= toplamSayfa);
    return [...firmalar.values()];
};
