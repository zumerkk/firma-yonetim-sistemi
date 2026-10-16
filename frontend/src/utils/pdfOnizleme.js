import pdfjsPaket from 'pdfjs-dist/package.json';

// webpackIgnore: PDF.js'in legacy ESM dosyasını kendi origin'imizden yükle.
// Böylece CRA 5/Node 18 derlemesi yeni PDF.js sözdizimini dönüştürmez.
export const pdfVarlikYolu = `${process.env.PUBLIC_URL || ''}/pdfjs/${pdfjsPaket.version}/`;
let kutuphane;
export const pdfKutuphaneAl = () => {
  if (!kutuphane) {
    const adres = `${pdfVarlikYolu}pdf.min.mjs`;
    kutuphane = import(/* webpackIgnore: true */ adres).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `${pdfVarlikYolu}pdf.worker.min.mjs`;
      return pdfjs;
    }).catch((error) => { kutuphane = null; throw error; });
  }
  return kutuphane;
};

export const blobVerisi = (blob) => new Promise((resolve, reject) => {
  const okuyucu = new FileReader();
  okuyucu.onload = () => resolve(new Uint8Array(okuyucu.result));
  okuyucu.onerror = () => reject(new Error('Dosya okunamadı.'));
  okuyucu.readAsArrayBuffer(blob);
});
