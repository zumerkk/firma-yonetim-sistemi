#!/usr/bin/env node
// 🔑 Google Drive yetkisi al (tek seferlik)
//
// Otomatik yedeğin Drive'a yazabilmesi için bir "yenileme tokenı" gerekir. Servis hesabı
// yerine KULLANICI yetkisi kullanılıyor: servis hesaplarının kendi depolama kotası yoktur ve
// kişisel bir Drive klasörüne yüklerken "Service Accounts do not have storage quota" hatası
// verirler. Kullanıcı yetkisiyle dosyalar sizin 15 GB'lık alanınıza yazılır.
//
// KULLANIM
//   1) console.cloud.google.com → yeni proje → "Google Drive API"yi etkinleştir
//   2) OAuth consent screen → External → kendi e-postanı test kullanıcısı olarak ekle
//   3) Credentials → Create credentials → OAuth client ID → "Desktop app"
//   4) Client ID ve Client Secret'ı aşağıdaki gibi verip bu betiği çalıştır:
//
//      GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/driveYetkiAl.js
//
//   5) Ekrandaki adresi tarayıcıda aç, hesabınla onayla, çıkan kodu yapıştır.
//   6) Betiğin bastığı GOOGLE_OAUTH_REFRESH_TOKEN değerini Render → Environment'a ekle.

const https = require('https');
const readline = require('readline');

const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
const sir = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
if (!id || !sir) {
  console.error('❌ GOOGLE_OAUTH_CLIENT_ID ve GOOGLE_OAUTH_CLIENT_SECRET gerekli.');
  console.error('   Örnek: GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy node scripts/driveYetkiAl.js');
  process.exit(1);
}

const YONLENDIRME = 'urn:ietf:wg:oauth:2.0:oob';
const adres = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: id,
  redirect_uri: YONLENDIRME,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/drive',
  access_type: 'offline',
  prompt: 'consent'
}).toString();

console.log('\n1) Şu adresi tarayıcıda aç ve yedeğin yazılacağı Google hesabıyla onayla:\n');
console.log(adres);
console.log('\n2) Google\'ın verdiği kodu buraya yapıştır.\n');

const sor = readline.createInterface({ input: process.stdin, output: process.stdout });
sor.question('Kod: ', (kod) => {
  sor.close();
  const govde = new URLSearchParams({
    code: kod.trim(), client_id: id, client_secret: sir,
    redirect_uri: YONLENDIRME, grant_type: 'authorization_code'
  }).toString();

  const istek = https.request({
    method: 'POST', hostname: 'oauth2.googleapis.com', path: '/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(govde) }
  }, (res) => {
    let metin = '';
    res.on('data', (p) => { metin += p; });
    res.on('end', () => {
      let veri = {};
      try { veri = JSON.parse(metin); } catch (_) { /* ham metin basılacak */ }
      if (!veri.refresh_token) {
        console.error('\n❌ Yenileme tokenı alınamadı:', veri.error_description || metin.slice(0, 300));
        console.error('   İpucu: aynı hesapta daha önce onay verdiyseniz Google yenileme tokenı döndürmez.');
        console.error('   myaccount.google.com/permissions adresinden uygulamanın erişimini kaldırıp tekrar deneyin.');
        process.exit(1);
      }
      console.log('\n✅ Alındı. Render → backend → Environment altına şunları ekleyin:\n');
      console.log('GOOGLE_OAUTH_CLIENT_ID=' + id);
      console.log('GOOGLE_OAUTH_CLIENT_SECRET=' + sir);
      console.log('GOOGLE_OAUTH_REFRESH_TOKEN=' + veri.refresh_token);
      console.log('YEDEK_DRIVE_KLASOR_ID=<Drive klasörünüzün adresindeki kimlik>');
      console.log('\nKlasör kimliği: Drive\'da klasörü açın, adres çubuğundaki');
      console.log('  https://drive.google.com/drive/folders/BURASI  → "BURASI" kısmı.\n');
    });
  });
  istek.on('error', (e) => { console.error('❌ İstek hatası:', e.message); process.exit(1); });
  istek.write(govde);
  istek.end();
});
