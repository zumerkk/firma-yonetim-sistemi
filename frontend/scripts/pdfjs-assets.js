// PDF içeriği ve görüntüleyici üçüncü taraf servislere gönderilmez. ESM/worker
// dosyaları üretimde de uygulamanın kendi origin'inden, sürümlü yoldan sunulur.
const fs = require('fs');
const path = require('path');

const paket = require.resolve('pdfjs-dist/package.json');
const kaynak = path.dirname(paket);
const { version } = require(paket);
const hedefKok = path.join(__dirname, '../public/pdfjs');
const hedef = path.join(hedefKok, version);
fs.mkdirSync(hedef, { recursive: true });
for (const ad of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.copyFileSync(path.join(kaynak, 'legacy/build', ad), path.join(hedef, ad));
}
for (const ad of ['cmaps', 'standard_fonts']) {
  fs.cpSync(path.join(kaynak, ad), path.join(hedef, ad), { recursive: true });
}
fs.copyFileSync(path.join(kaynak, 'LICENSE'), path.join(hedef, 'LICENSE'));
console.log(`Yerel PDF görüntüleyici hazır: pdfjs/${version}`);
