const bekleyenler = new Map();

async function icerikOzeti(icerik) {
  const metin = JSON.stringify(icerik);
  if (window.crypto?.subtle && typeof TextEncoder !== 'undefined') {
    const ozet = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(metin));
    return Array.from(new Uint8Array(ozet), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let ozet = 2166136261;
  for (let i = 0; i < metin.length; i += 1) ozet = Math.imul(ozet ^ metin.charCodeAt(i), 16777619);
  return `${metin.length}-${ozet >>> 0}`;
}

export async function mailGonderimIstegi(kapsam, talepId, icerik) {
  const anahtar = `mailGonderim:${kapsam}:${talepId}:${await icerikOzeti(icerik)}`;
  let istekId = bekleyenler.get(anahtar);
  try { istekId ||= sessionStorage.getItem(anahtar); } catch (_) { /* sekme belleği yeterli */ }
  if (!istekId) {
    istekId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    bekleyenler.set(anahtar, istekId);
    try { sessionStorage.setItem(anahtar, istekId); } catch (_) { /* sekme belleği yeterli */ }
  }
  return {
    istekId,
    tamamla(sonuc) {
      if (sonuc?.gecmisKaydedildi === false) return;
      bekleyenler.delete(anahtar);
      try { sessionStorage.removeItem(anahtar); } catch (_) { /* sekme belleği yeterli */ }
    }
  };
}

export function mailGonderimUyarilari(sonuc) {
  const uyarilar = [];
  if (sonuc?.reddedilenler?.length) {
    uyarilar.push(`SMTP ${sonuc.kabulEdilenler?.length || 0} adresi kabul etti. Reddedilenler: ${sonuc.reddedilenler.join(', ')}.`);
  }
  if (sonuc?.atlananEkler?.length) uyarilar.push(`Maile eklenemeyen dosyalar: ${sonuc.atlananEkler.join(', ')}.`);
  if (sonuc?.linkeEklenemeyen?.length) uyarilar.push(`Yükleme linkine eklenemeyen dosyalar: ${sonuc.linkeEklenemeyen.join(', ')}.`);
  if (sonuc?.gecmisKaydedildi === false) {
    uyarilar.push('SMTP maili kabul etti. Gönderim geçmişine kayıt doğrulanamadı. Aynı maili yeniden göndermeyin.');
  }
  return uyarilar.join(' ');
}
