export function firmaRotaEslesiyor(firma, id) {
  return Boolean(firma?._id && id && (
    String(firma._id).toLowerCase() === String(id).toLowerCase() || firma.firmaId === id
  ));
}

export function firmaListesineDon(navigate, state, bildirim = {}) {
  const donus = state?.firmaListeDonusu;
  navigate({ pathname: '/firmalar', search: donus?.search || '', hash: donus?.hash || '' }, {
    replace: Boolean(donus),
    state: { ...bildirim, firmaListeGorunumu: donus?.gorunum }
  });
}
