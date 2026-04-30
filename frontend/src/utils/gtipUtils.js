export const findObjectKey = (obj, searchStrings) => {
  if (!obj) return null;
  const keys = Object.keys(obj);
  for (const s of searchStrings) {
    const sClean = s.toLowerCase().replace(/[\s\.\-]/g, '');
    const found = keys.find(k => k.toLowerCase().replace(/[\s\.\-]/g, '').includes(sClean));
    if (found) return found;
  }
  return null;
};
