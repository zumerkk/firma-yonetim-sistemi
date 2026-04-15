/**
 * Gemini mapper (opsiyonel)
 *
 * Amaç: düşük güven durumunda kolon eşleştirmesi için "öneri" üretmek.
 * Kural: Gemini çıktısı otomatik commit ETMEZ; sadece preview ekranında gösterilir.
 *
 * Not: Bu dosya MVP için iskelet olarak bırakılmıştır. GEMINI_API_KEY yoksa sessizce devre dışı kalır.
 */

async function suggestGeminiMapping({ module, headers, sampleRows, baseMapping }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Skeleton: gerçek entegrasyon daha sonra yapılacak.
  // Burada yalnızca "devreye girebilir" sinyali dönüyoruz.
  return {
    available: true,
    implemented: false,
    module,
    note: 'Gemini mapping iskeleti: entegrasyon henüz uygulanmadı. Sadece fallback için placeholder.',
    baseMapping: baseMapping || {},
    headers,
    sampleRows: (sampleRows || []).slice(0, 3),
  };
}

module.exports = { suggestGeminiMapping };

