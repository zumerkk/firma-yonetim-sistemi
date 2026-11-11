const EVRAK_BOYUTU = 10 * 1024 * 1024;
const EVRAK_SAYISI = 6;

const pdf = (tur) => ({ tur, uzanti: '.pdf', mimeType: 'application/pdf' });
const EVRAK_ALANLARI = {
  local: {
    faturaPdf: pdf('fatura_pdf'),
    faturaXml: { tur: 'fatura_xml', uzanti: '.xml', mimeType: 'application/xml' },
    yevmiyePdf: pdf('yevmiye_pdf')
  },
  import: {
    beyannamePdf: pdf('beyanname_pdf'),
    yurtdisiFaturaPdf: pdf('yurtdisi_fatura_pdf'),
    yevmiyePdf: pdf('yevmiye_pdf')
  }
};

const EVRAK_TURLERI = [...new Set(Object.values(EVRAK_ALANLARI).flatMap((alanlar) => Object.values(alanlar).map((e) => e.tur)))];

module.exports = { EVRAK_BOYUTU, EVRAK_SAYISI, EVRAK_ALANLARI, EVRAK_TURLERI };
