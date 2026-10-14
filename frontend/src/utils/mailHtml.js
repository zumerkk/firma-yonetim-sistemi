// ✉️ Mail gövdesi — düz metin ⇄ biçimli (HTML) metin.
//
// Müşteri (13.10.2026): "Buraya mail düzenleme aparatı koyabilir miyiz?" (Gmail'deki gibi kalın, renk,
// liste…). Şablonlar düz metin üretiyor; editörde düzenlenen mail HTML olarak saklanır ve gönderilir.
// HTML, ekrana basılmadan önce gerçek tarayıcı ayrıştırıcısıyla İZİNLİ etiket/özellik listesine göre
// temizlenir (yapıştırılan Word/Gmail metni, kayıtlı taslak). Sunucu ayrıca kendi süzgecinden geçirir.

const IZINLI = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'P', 'DIV', 'SPAN', 'FONT',
  'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'H1', 'H2', 'H3']);
// İçeriğiyle birlikte atılanlar (içindeki metin de gösterilmez)
const ATILAN = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE', 'SVG', 'MATH']);
const STIL_IZINLI = new Set(['color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style',
  'text-decoration', 'text-decoration-line', 'text-align', 'margin-left', 'padding-left']);

const HTML_ISARETI = /<(br|p|div|span|b|strong|i|em|u|s|ul|ol|li|font|a|blockquote|h[1-3])\b[^>]*>/i;

/** Metin editörde düzenlenmiş (HTML) mi, şablondan gelen düz metin mi? */
export const htmlMi = (metin) => HTML_ISARETI.test(String(metin || ''));

const kacis = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Düz metni HTML'e çevirir: satır sonları <br>, bağlantılar tıklanabilir */
export const metniHtmleCevir = (metin) => kacis(metin || '')
  .replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}">${url}</a>`)
  .replace(/\r\n|\r|\n/g, '<br>');

const stilTemizle = (stil) => String(stil || '').split(';').map((p) => p.trim()).filter(Boolean)
  .map((p) => { const i = p.indexOf(':'); return i > 0 ? [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim()] : null; })
  .filter((x) => x && STIL_IZINLI.has(x[0]) && !/url\(|expression|javascript:/i.test(x[1]))
  .map(([k, v]) => `${k}: ${v}`).join('; ');

function dugumTemizle(dugum) {
  [...dugum.childNodes].forEach((cocuk) => {
    if (cocuk.nodeType === 8) { cocuk.remove(); return; } // yorum
    if (cocuk.nodeType !== 1) return; // metin olduğu gibi
    const ad = cocuk.tagName.toUpperCase();
    if (ATILAN.has(ad)) { cocuk.remove(); return; }
    dugumTemizle(cocuk);
    if (!IZINLI.has(ad)) { cocuk.replaceWith(...cocuk.childNodes); return; } // etiketi aç, içeriği kalsın
    [...cocuk.attributes].forEach((o) => {
      const oAd = o.name.toLowerCase();
      if (oAd === 'style') {
        const temiz = stilTemizle(o.value);
        if (temiz) cocuk.setAttribute('style', temiz); else cocuk.removeAttribute('style');
      } else if (ad === 'A' && oAd === 'href') {
        if (!/^(https?:|mailto:)/i.test(o.value.trim())) cocuk.removeAttribute('href');
      } else if (!(ad === 'FONT' && ['color', 'face', 'size'].includes(oAd)) && !(oAd === 'align')) {
        cocuk.removeAttribute(o.name);
      }
    });
  });
}

/** İzinli etiket/özellik listesine göre temizler (DOMParser — betik çalıştırmaz) */
export const htmlTemizle = (html) => {
  const belge = new DOMParser().parseFromString(`<body>${String(html || '')}</body>`, 'text/html');
  dugumTemizle(belge.body);
  return belge.body.innerHTML;
};

/** Editöre yüklenecek hal: HTML ise temizlenir, düz metinse HTML'e çevrilir */
export const editoreHazirla = (deger) => (htmlMi(deger) ? htmlTemizle(deger) : metniHtmleCevir(deger));

/** HTML → okunur düz metin (karakter sayımı / boş kontrolü için) */
export const htmlMetin = (html) => {
  const belge = new DOMParser().parseFromString(`<body>${String(html || '')}</body>`, 'text/html');
  return (belge.body.textContent || '').replace(/ /g, ' ');
};
