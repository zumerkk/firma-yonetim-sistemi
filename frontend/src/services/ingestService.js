// 📥 Ingest Service
// /ingest/preview ve /ingest/commit endpoint'leri için servis katmanı
// Mevcut axios instance: src/utils/axios.js

import api from '../utils/axios';

// 🎯 Response Handler - Standardized Error Handling
const handleResponse = (response) => {
  if (response?.data?.success) {
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  }

  throw new Error(response?.data?.message || 'Beklenmeyen bir hata oluştu');
};

const handleError = (error) => {
  console.error('🚨 Ingest Service Error:', error);

  if (error.response) {
    const errorData = error.response.data;
    return {
      success: false,
      message: errorData?.message || 'Sunucu hatası',
      errors: errorData?.errors || null,
      status: error.response.status,
      response: errorData,
    };
  }

  if (error.request) {
    return {
      success: false,
      message: 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.',
      status: 0,
    };
  }

  return {
    success: false,
    message: error.message || 'Beklenmeyen bir hata oluştu',
  };
};

const isFormData = (payload) =>
  typeof FormData !== 'undefined' && payload instanceof FormData;

/**
 * Önizleme: dosya veya payload ile preview üretir.
 * - file verilirse multipart/form-data olarak gönderir (field: file)
 * - payload verilirse JSON veya FormData kabul eder
 */
export const previewIngest = async ({ file, payload, params } = {}) => {
  try {
    let body = payload;
    let config = {};

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      body = formData;
    }

    if (params) config.params = params;

    // FormData gönderirken Content-Type'ı axios'a bırak
    if (isFormData(body)) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }

    const response = await api.post('/ingest/preview', body, config);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Commit: önizleme sonucunu kalıcılaştırır.
 * - ingestSessionId verilirse { ingestSessionId } JSON gönderir
 * - payload verilirse olduğu gibi gönderir
 */
export const commitIngest = async ({ ingestSessionId, mappingOverrides = {}, mode = 'upsert', payload } = {}) => {
  try {
    const body =
      payload ??
      (ingestSessionId
        ? {
            ingestSessionId,
            mappingOverrides,
            mode,
          }
        : {});
    const response = await api.post('/ingest/commit', body);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

const ingestService = { previewIngest, commitIngest };

export default ingestService;
