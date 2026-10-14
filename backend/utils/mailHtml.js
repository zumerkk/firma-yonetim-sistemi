// ✉️ Biçimli (HTML) mail gövdesi — sunucu tarafı.
//
// Müşteri (13.10.2026): "Buraya mail düzenleme aparatı koyabilir miyiz?" İşlem & Evrak mail editörü HTML
// üretir (frontend utils/mailHtml.js gerçek ayrıştırıcıyla izinli etiketlere göre temizler). Sunucu
// istemciye güvenmez: betik/stil/çerçeve blokları, olay öznitelikleri (on…) ve javascript:/data:
// bağlantıları burada da ayıklanır; düz metin karşılığı (text/plain) üretilir — spam süzgeçleri
// yalnız HTML'li maile kötü puan veriyor.

const HTML_ISARETI = /<(br|p|div|span|b|strong|i|em|u|s|ul|ol|li|font|a|blockquote|h[1-3])\b[^>]*>/i;

const htmlMi = (metin) => HTML_ISARETI.test(String(metin || ''));

function htmlTemizle(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|title|head)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|noscript|template|svg|math|form|input|button|textarea|select|link|meta|base|img|video|audio|source|frame|frameset)\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src|action|formaction|xlink:href)\s*=\s*("\s*(javascript|data|vbscript):[^"]*"|'\s*(javascript|data|vbscript):[^']*'|(javascript|data|vbscript):[^\s>]*)/gi, '')
    .replace(/expression\s*\(/gi, '');
}

const VARLIKLAR = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };

/** HTML → okunur düz metin (satır sonları, liste işaretleri, bağlantı adresleri korunur) */
function htmlMetneCevir(html) {
  return htmlTemizle(html)
    .replace(/<a\b[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, yazi) => {
      const metin = yazi.replace(/<[^>]+>/g, '').trim();
      return metin && metin !== href ? `${metin} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<\/(p|div|li|h[1-3]|blockquote|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (v) => VARLIKLAR[v] || v)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Gönderilecek gövde: editörden gelen HTML ise temiz HTML + düz metin; şablondan gelen düz metinse
 * yalnız metin (mailService onu kendi HTML kalıbına sarar).
 * @returns {{ text: string, html?: string }}
 */
function mailIcerigi(govde) {
  if (!htmlMi(govde)) return { text: String(govde || '') };
  return { text: htmlMetneCevir(govde), html: htmlTemizle(govde) };
}

module.exports = { htmlMi, htmlTemizle, htmlMetneCevir, mailIcerigi };
