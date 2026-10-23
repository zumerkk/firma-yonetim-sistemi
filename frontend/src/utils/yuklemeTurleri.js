// 📎 Ekipman Takip / İşlem & Evrak yüklemelerinde izinli uzantılar — sunucudaki liste ile AYNI
// (backend/middleware/tesvikUpload.js → ALLOWED_EXT). Müşteri (23.10.2026): ".txt, .zip, .rar" eklendi.
export const EVRAK_UZANTILARI = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.docx', '.doc', '.xml', '.txt', '.zip', '.rar', '.7z'];
export const EVRAK_ACCEPT = EVRAK_UZANTILARI.join(',');
