// 🧩 BÜYÜK DOSYA → CLOUDINARY'DE PARÇALI SAKLAMA
//
// Müşteri (21.09.2026, belge takip): "0 dosya yüklendi, 1 başarısız. (File size too large. Got 20231360.
// Maximum is 10485760.) hatası alıyoruz ... genel olarak sistemdeki herhangi bir yere yükleme limitini
// 50-100 mb yapabilir miyiz ortalama."
//
// Sınır bizim sunucumuzda DEĞİL (multer zaten 100 MB'a izin veriyor): hata metni Cloudinary'nin. Hesabın
// planı dosya başına 10 MiB'a (10485760 bayt) izin veriyor; ücretli planlar da ham (raw) dosyada 20-40
// MB'ta kalıyor, yani plan yükseltmek 50-100 MB isteğini karşılamıyor.
//
// Çözüm: sınırı aşan dosya 9 MiB'lık ham parçalar olarak saklanır, parçaların listesi küçük bir JSON
// "manifest" dosyasına yazılır ve kayda (dosyaYolu / cloudinaryPublicId / fileUrl / providerFileId)
// manifestin adresi girer. Şemalar değişmez; bir dosyanın parçalı olduğu public_id'nin
// `.parcali.json` ile bitmesinden anlaşılır. İndirme uçları manifesti görünce parçaları sırayla çekip
// birleştirir — kullanıcı tek dosya görür. Sınırın altındaki dosyalar eskisi gibi tek parça yüklenir.
//
// Tüm Cloudinary/ağ işleri enjekte edilebilir (`kur`): testler gerçek hesaba dokunmadan çalışır.

const { Readable } = require('stream');
const { once } = require('events');

const MIB = 1024 * 1024;
// Cloudinary sınırı 10 MiB; çok parçalı yükleme gövdesinin payı için biraz altında kalınır
const TEK_DOSYA_SINIRI = 10 * MIB - 256 * 1024;
const PARCA_BOYUTU = 9 * MIB;
const MANIFEST_SONEKI = '.parcali.json';
const MANIFEST_TURU = 'gmplansis-parcali-dosya';

/** public_id ya da adres bir parçalı dosya manifestini mi gösteriyor? */
const manifestMi = (kimlik) => String(kimlik || '').split('?')[0].endsWith(MANIFEST_SONEKI);

const parcaKimligi = (tabanPid, sira) => `${tabanPid}.parca-${String(sira).padStart(3, '0')}`;

function kur({ cloudinary, getir = (...a) => fetch(...a) } = {}) {
    const cld = () => cloudinary || require('cloudinary').v2;

    // Ham (raw) yükleme: parçalar ve manifest her zaman raw — PDF teslimat kısıtı raw'a uygulanmıyor
    const rawYukle = (buffer, publicId) => new Promise((resolve, reject) => {
        const akis = cld().uploader.upload_stream(
            { public_id: publicId, resource_type: 'raw', overwrite: false },
            (hata, sonuc) => (hata ? reject(hata) : resolve(sonuc))
        );
        akis.end(buffer);
    });

    // Ham dosyanın indirilebileceği adresler: yetkili indirme API'si → imzalı adres → bilinen adres.
    // Sıra Belge Takip'teki dosyaGetir ile aynı (orada 900+ ham dosya bu yolla iniyor).
    const rawAdaylari = (publicId, bilinenUrl) => {
        const adaylar = [];
        if (publicId) {
            try { adaylar.push(cld().utils.private_download_url(publicId, '', { resource_type: 'raw', type: 'upload' })); } catch (_) { /* yoksay */ }
            try { adaylar.push(cld().url(publicId, { resource_type: 'raw', type: 'upload', secure: true, sign_url: true })); } catch (_) { /* yoksay */ }
        }
        if (/^https?:\/\//.test(String(bilinenUrl || ''))) adaylar.push(bilinenUrl);
        return adaylar;
    };

    const ilkBasarili = async (adaylar) => {
        const sebepler = [];
        for (const u of adaylar) {
            try {
                const r = await getir(u);
                if (r.ok) return r;
                sebepler.push(String(r.status));
            } catch (e) {
                sebepler.push(e && e.message ? e.message.slice(0, 60) : 'fetch-hatasi');
            }
        }
        console.error('🚨 [parcaliDosya] kaynak alınamadı:', sebepler.join(' | ') || 'aday-yok');
        return null;
    };

    async function parcaYukle(buffer, tabanPid, sira) {
        const sonuc = await rawYukle(buffer, parcaKimligi(tabanPid, sira));
        return { publicId: sonuc.public_id, url: sonuc.secure_url, boyut: buffer.length };
    }

    async function parcalariTemizle(parcalar) {
        await Promise.all((parcalar || []).map((p) => cld().uploader
            .destroy(p.publicId, { resource_type: 'raw' })
            .catch((e) => console.warn('⚠️ [parcaliDosya] parça silinemedi:', p.publicId, e && e.message))));
    }

    async function manifestYaz({ tabanPid, parcalar, boyut, mimeType, ad }) {
        const icerik = {
            tur: MANIFEST_TURU,
            surum: 1,
            ad: ad || '',
            mimeType: mimeType || 'application/octet-stream',
            boyut,
            parcaBoyutu: PARCA_BOYUTU,
            parcalar
        };
        return rawYukle(Buffer.from(JSON.stringify(icerik)), `${tabanPid}${MANIFEST_SONEKI}`);
    }

    /**
     * Akıştan yükle: dosya sınırın altındaysa `tekYukle(buffer)` ile BUGÜNKÜ gibi tek parça gider;
     * aşarsa 9 MiB'lık parçalar akış okundukça yüklenir (bellekte en fazla ~10 MiB tutulur).
     * @returns {{ secure_url, public_id, bytes, parcali }}
     */
    async function akistanYukle(akis, { tabanPid, tekYukle, mimeType, ad }) {
        const parcalar = [];
        let tampon = [];
        let tamponBoyu = 0;
        let toplam = 0;
        let parcali = false;
        try {
            for await (const parca of akis) {
                tampon.push(parca);
                tamponBoyu += parca.length;
                toplam += parca.length;
                if (!parcali && toplam > TEK_DOSYA_SINIRI) parcali = true;
                while (parcali && tamponBoyu >= PARCA_BOYUTU) {
                    const hepsi = Buffer.concat(tampon, tamponBoyu);
                    const kalan = Buffer.from(hepsi.subarray(PARCA_BOYUTU));
                    parcalar.push(await parcaYukle(hepsi.subarray(0, PARCA_BOYUTU), tabanPid, parcalar.length + 1));
                    tampon = kalan.length ? [kalan] : [];
                    tamponBoyu = kalan.length;
                }
            }
            const son = Buffer.concat(tampon, tamponBoyu);
            if (!parcali) {
                const r = await tekYukle(son);
                return { secure_url: r.secure_url, public_id: r.public_id, bytes: son.length, parcali: false };
            }
            if (son.length) parcalar.push(await parcaYukle(son, tabanPid, parcalar.length + 1));
            const m = await manifestYaz({ tabanPid, parcalar, boyut: toplam, mimeType, ad });
            return { secure_url: m.secure_url, public_id: m.public_id, bytes: toplam, parcali: true };
        } catch (e) {
            await parcalariTemizle(parcalar); // yarım kalan yükleme depoda yetim parça bırakmasın
            throw e;
        }
    }

    /** Bellekteki buffer için aynı kural (tesvikMakine depolaması buffer ile çalışıyor) */
    function bufferdanYukle(buffer, secenekler) {
        return akistanYukle(Readable.from([buffer]), secenekler);
    }

    /** Manifesti oku; public_id ya da adres verilebilir. Okunamazsa null. */
    async function manifestOku(publicId, bilinenUrl) {
        const r = await ilkBasarili(rawAdaylari(publicId, bilinenUrl));
        if (!r) return null;
        try {
            const m = JSON.parse(Buffer.from(await r.arrayBuffer()).toString('utf8'));
            if (m?.tur !== MANIFEST_TURU || !Array.isArray(m.parcalar) || !m.parcalar.length) return null;
            return m;
        } catch (_) {
            return null;
        }
    }

    const parcaCek = (p) => ilkBasarili(rawAdaylari(p.publicId, p.url));

    /** Parçalı dosyanın tamamı → { buffer, contentType, ad } | null (mail eki, ZIP gibi bellek içi işler) */
    async function indir(publicId, bilinenUrl) {
        const m = await manifestOku(publicId, bilinenUrl);
        if (!m) return null;
        const parcalar = [];
        for (const p of m.parcalar) {
            const r = await parcaCek(p);
            if (!r) return null;
            parcalar.push(Buffer.from(await r.arrayBuffer()));
        }
        const buffer = Buffer.concat(parcalar);
        if (m.boyut && buffer.length !== m.boyut) {
            console.error('🚨 [parcaliDosya] birleşen boyut tutmuyor:', publicId, buffer.length, '≠', m.boyut);
            return null;
        }
        return { buffer, contentType: m.mimeType, ad: m.ad };
    }

    /**
     * Parçalı dosyayı yanıta AKITIR — 100 MB'lık dosya belleğe alınmaz, parça parça yazılır.
     * `basliklar(manifest)` yanıt başlıklarını döner. İlk parça alınamazsa hiçbir şey yazılmadan
     * false döner (çağıran okunur bir hata gösterebilsin).
     */
    async function akit(publicId, res, { bilinenUrl, basliklar = () => ({}) } = {}) {
        const m = await manifestOku(publicId, bilinenUrl);
        if (!m) return false;
        let r = await parcaCek(m.parcalar[0]);
        if (!r) return false;
        Object.entries({ 'Content-Type': m.mimeType, 'Content-Length': m.boyut, ...basliklar(m) })
            .forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') res.setHeader(k, v); });
        for (let i = 0; i < m.parcalar.length; i += 1) {
            if (i > 0) r = await parcaCek(m.parcalar[i]);
            if (!r) {
                // Başlıklar gitti; yarım dosyanın "tamam" sanılmaması için bağlantı koparılır
                res.destroy(new Error(`Parça alınamadı: ${m.parcalar[i].publicId}`));
                return true;
            }
            const govde = r.body && typeof r.body.getReader === 'function' ? Readable.fromWeb(r.body) : [Buffer.from(await r.arrayBuffer())];
            for await (const parca of govde) {
                if (!res.write(parca)) await once(res, 'drain');
            }
        }
        res.end();
        return true;
    }

    /** Parçalı ya da tek dosyayı sil (hata akışı bozmaz, loglanır) */
    async function sil(publicId, { resourceType = 'raw' } = {}) {
        if (!publicId) return;
        try {
            if (manifestMi(publicId)) {
                const m = await manifestOku(publicId);
                if (m) await parcalariTemizle(m.parcalar);
                await cld().uploader.destroy(publicId, { resource_type: 'raw' });
                return;
            }
            await cld().uploader.destroy(publicId, { resource_type: resourceType });
        } catch (e) {
            console.error('Cloudinary silme hatası (devam ediliyor):', e && e.message);
        }
    }

    /**
     * multer depolama motoru — multer-storage-cloudinary'nin yerine. `params(req, file)` aynı biçimde
     * { folder, resource_type, public_id } döner; sınırın altındaki dosya BİREBİR eskisi gibi yüklenir
     * (file.path = adres, file.filename = public_id), üstündeki parçalı saklanır.
     */
    function depolama({ params }) {
        return {
            _handleFile(req, file, cb) {
                Promise.resolve()
                    .then(() => params(req, file))
                    .then((p) => {
                        const tabanPid = p.folder ? `${p.folder}/${p.public_id}` : p.public_id;
                        const tekYukle = (buffer) => new Promise((resolve, reject) => {
                            const akis = cld().uploader.upload_stream(p, (hata, sonuc) => (hata ? reject(hata) : resolve(sonuc)));
                            akis.end(buffer);
                        });
                        let ad = file.originalname || '';
                        try { ad = Buffer.from(ad, 'latin1').toString('utf8'); } catch (_) { /* yoksay */ }
                        return akistanYukle(file.stream, { tabanPid, tekYukle, mimeType: file.mimetype, ad });
                    })
                    .then((s) => cb(null, { path: s.secure_url, filename: s.public_id, size: s.bytes, parcali: s.parcali }))
                    .catch((e) => cb(e));
            },
            _removeFile(req, file, cb) {
                sil(file.filename, { resourceType: /^image\//.test(file.mimetype || '') ? 'image' : 'raw' })
                    .then(() => cb(null), cb);
            }
        };
    }

    return { akistanYukle, bufferdanYukle, manifestOku, indir, akit, sil, depolama, parcalariTemizle };
}

const varsayilan = kur();

module.exports = {
    ...varsayilan,
    kur,
    manifestMi,
    parcaKimligi,
    TEK_DOSYA_SINIRI,
    PARCA_BOYUTU,
    MANIFEST_SONEKI
};
