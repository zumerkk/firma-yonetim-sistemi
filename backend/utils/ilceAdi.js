const ANKARA = /^\s*ankara\s*$/i;
const KAZAN = /^\s*kazan\s*$/i;
const KAHRAMANKAZAN = 'KAHRAMANKAZAN';

function guncelIlceAdi(il, ilce) {
  return typeof il === 'string' && typeof ilce === 'string' && ANKARA.test(il) && KAZAN.test(ilce)
    ? KAHRAMANKAZAN
    : ilce;
}

function ilceAdiNormalizasyonu(schema, { il, ilce }) {
  schema.pre('validate', function () {
    const onceki = this.get(ilce);
    const guncel = guncelIlceAdi(this.get(il), onceki);
    if (guncel !== onceki) this.set(ilce, guncel);
  });
}

module.exports = { ANKARA, KAZAN, KAHRAMANKAZAN, guncelIlceAdi, ilceAdiNormalizasyonu };
