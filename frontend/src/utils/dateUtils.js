/**
 * Merkezi tarih yapıştırma (paste) handler'ı
 * Desteklenen formatlar: dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
 * 
 * Kullanım:
 *   import { createDatePasteHandler } from '../../utils/dateUtils';
 *   <TextField type="date" onPaste={createDatePasteHandler((isoDate) => setFormData(prev => ({ ...prev, tarih: isoDate })))} />
 */

/**
 * Yapıştırılan metinden ISO date (yyyy-mm-dd) formatına dönüştürür.
 * @param {string} text - Yapıştırılan metin
 * @returns {string|null} ISO date string veya null
 */
export function parseDateText(text) {
    if (!text) return null;
    const trimmed = text.trim();

    // yyyy-mm-dd (zaten ISO format)
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        const month = m.padStart(2, '0');
        const day = d.padStart(2, '0');
        if (isValidDate(y, month, day)) return `${y}-${month}-${day}`;
    }

    // dd.mm.yyyy veya dd/mm/yyyy veya dd-mm-yyyy
    const trMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (trMatch) {
        const [, d, m, y] = trMatch;
        const month = m.padStart(2, '0');
        const day = d.padStart(2, '0');
        if (isValidDate(y, month, day)) return `${y}-${month}-${day}`;
    }

    return null;
}

/**
 * Basit tarih doğrulama
 */
function isValidDate(year, month, day) {
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900 || y > 2100) return false;
    return true;
}

/**
 * Bir setter fonksiyonu ile kullanılabilecek onPaste handler oluşturur.
 * @param {function} setter - ISO date string alan callback
 * @returns {function} onPaste event handler
 */
export function createDatePasteHandler(setter) {
    return (e) => {
        const pasted = e.clipboardData?.getData('text');
        if (!pasted) return;

        const isoDate = parseDateText(pasted);
        if (isoDate) {
            e.preventDefault();
            setter(isoDate);
        }
    };
}

/**
 * Belirli bir form field için onPaste handler (dot-notation field path destekli).
 * @param {function} setFormData - React state setter (prev => ({ ...prev, [field]: value }))
 * @param {string} fieldName - Field adı (örn. 'ytbBaslamaTarihi')
 * @returns {function} onPaste event handler
 */
export function createFormDatePasteHandler(setFormData, fieldName) {
    return createDatePasteHandler((isoDate) => {
        setFormData(prev => ({ ...prev, [fieldName]: isoDate }));
    });
}
