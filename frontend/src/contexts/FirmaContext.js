// 🏢 Firma Context
// Firma verilerini yönetir - Excel sisteminin modern React karşılığı

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import firmaService from '../services/firmaService';

// 🎯 Initial State
const initialState = {
  // Data States
  firmalar: [],
  firma: null,
  searchResults: [],
  
  // Loading States
  loading: false,
  searchLoading: false,
  submitLoading: false,
  
  // Error States
  error: null,
  lastError: null,
  
  // Pagination
  pagination: {
    mevcutSayfa: 1,
    toplamSayfa: 1,
    toplamSayisi: 0,
    sayfaBasinaLimit: 2000, // Tüm verileri çek (1185+ için yeterli)
    oncekiSayfa: null,
    sonrakiSayfa: null
  },
  
  // Filters
  filters: {
    arama: '',
    firmaIl: '',
    firmaIlce: '',
    aktif: 'true',
    yabanciSermayeli: '',
    anaFaaliyetKonusu: '',
    siralamaSekli: 'createdAt',
    siralamaYonu: 'desc'
  },
  
  // Stats & Meta Data
  stats: null,
  ilIlceListesi: {
    iller: [],
    ilceler: [],
    anaFaaliyetler: []
  },
  
  // UI States
  isDataStale: false,
  lastFetchTime: null
};

// 🔄 Action Types
const ACTION_TYPES = {
  // Loading Actions
  SET_LOADING: 'SET_LOADING',
  SET_SEARCH_LOADING: 'SET_SEARCH_LOADING',
  SET_SUBMIT_LOADING: 'SET_SUBMIT_LOADING',
  
  // Error Actions
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Data Actions
  SET_FIRMALAR: 'SET_FIRMALAR',
  SET_FIRMA: 'SET_FIRMA',
  CLEAR_FIRMA: 'CLEAR_FIRMA',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  CLEAR_SEARCH_RESULTS: 'CLEAR_SEARCH_RESULTS',
  
  // CRUD Success Actions
  CREATE_FIRMA_SUCCESS: 'CREATE_FIRMA_SUCCESS',
  UPDATE_FIRMA_SUCCESS: 'UPDATE_FIRMA_SUCCESS',
  DELETE_FIRMA_SUCCESS: 'DELETE_FIRMA_SUCCESS',
  
  // Pagination & Filters
  SET_PAGINATION: 'SET_PAGINATION',
  SET_FILTERS: 'SET_FILTERS',
  RESET_FILTERS: 'RESET_FILTERS',
  
  // Stats & Meta
  SET_STATS: 'SET_STATS',
  SET_IL_ILCE_LISTESI: 'SET_IL_ILCE_LISTESI',
  
  // UI States
  SET_DATA_STALE: 'SET_DATA_STALE',
  MARK_DATA_FRESH: 'MARK_DATA_FRESH'
};

// 🎯 Reducer
const firmaReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error
      };

    case ACTION_TYPES.SET_SEARCH_LOADING:
      return {
        ...state,
        searchLoading: action.payload
      };

    case ACTION_TYPES.SET_SUBMIT_LOADING:
      return {
        ...state,
        submitLoading: action.payload
      };

    case ACTION_TYPES.SET_ERROR:
      return {
        ...state,
        loading: false,
        searchLoading: false,
        submitLoading: false,
        error: action.payload,
        lastError: action.payload
      };

    case ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case ACTION_TYPES.SET_FIRMALAR:
      return {
        ...state,
        loading: false,
        firmalar: action.payload.firmalar || [],
        pagination: action.payload.pagination || state.pagination,
        error: null,
        lastFetchTime: new Date().toISOString(),
        isDataStale: false
      };

    case ACTION_TYPES.SET_FIRMA:
      return {
        ...state,
        loading: false,
        firma: action.payload,
        error: null
      };

    case ACTION_TYPES.CLEAR_FIRMA:
      return {
        ...state,
        firma: null
      };

    case ACTION_TYPES.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchLoading: false,
        searchResults: action.payload || [],
        error: null
      };

    case ACTION_TYPES.CLEAR_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: []
      };

    case ACTION_TYPES.CREATE_FIRMA_SUCCESS:
      return {
        ...state,
        submitLoading: false,
        firmalar: [action.payload, ...state.firmalar],
        error: null,
        isDataStale: true
      };

    case ACTION_TYPES.UPDATE_FIRMA_SUCCESS:
      return {
        ...state,
        submitLoading: false,
        firma: action.payload,
        firmalar: state.firmalar.map(f => 
          f._id === action.payload._id ? action.payload : f
        ),
        error: null,
        isDataStale: true
      };

    case ACTION_TYPES.DELETE_FIRMA_SUCCESS:
      return {
        ...state,
        submitLoading: false,
        firmalar: state.firmalar.filter(f => f._id !== action.payload),
        firma: state.firma && state.firma._id === action.payload ? null : state.firma,
        error: null,
        isDataStale: true
      };

    case ACTION_TYPES.SET_PAGINATION:
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload }
      };

    case ACTION_TYPES.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        isDataStale: true
      };

    case ACTION_TYPES.RESET_FILTERS:
      return {
        ...state,
        filters: { ...initialState.filters },
        pagination: { ...initialState.pagination },
        isDataStale: true
      };

    case ACTION_TYPES.SET_STATS:
      return {
        ...state,
        stats: action.payload,
        error: null
      };

    case ACTION_TYPES.SET_IL_ILCE_LISTESI:
      return {
        ...state,
        ilIlceListesi: action.payload,
        error: null
      };

    case ACTION_TYPES.SET_DATA_STALE:
      return {
        ...state,
        isDataStale: true
      };

    case ACTION_TYPES.MARK_DATA_FRESH:
      return {
        ...state,
        isDataStale: false,
        lastFetchTime: new Date().toISOString()
      };

    default:
      return state;
  }
};

// 🏗️ Context Creation
const FirmaContext = createContext();

// 🎣 Custom Hook with Error Handling
export const useFirma = () => {
  const context = useContext(FirmaContext);
  if (!context) {
    throw new Error('useFirma must be used within a FirmaProvider');
  }
  return context;
};

// 🌟 Provider Component
export const FirmaProvider = ({ children }) => {
  const [state, dispatch] = useReducer(firmaReducer, initialState);

  // 🧹 Error Management
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  }, []);

  // 📋 Fetch Firmalar - Enterprise Level
  const fetchFirmalar = useCallback(async (customParams = {}) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
    
    try {
      const params = {
        ...state.filters,
        sayfa: state.pagination.mevcutSayfa,
        limit: state.pagination.sayfaBasinaLimit,
        ...customParams
      };
      
      const result = await firmaService.getFirmalar(params);
      
      if (result.success) {
        dispatch({
          type: ACTION_TYPES.SET_FIRMALAR,
          payload: result.data
        });
        return { success: true, data: result.data };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Firma listesi yüklenemedi';
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  }, [state.filters, state.pagination.mevcutSayfa, state.pagination.sayfaBasinaLimit]);

  // 👁️ Enhanced Fetch Single Firma
  const fetchFirma = useCallback(async (id) => {
    if (!id) {
      setError('Firma ID gereklidir');
      return { success: false, message: 'Firma ID gereklidir' };
    }

    console.log('🔄 Fetching firma with ID:', id);
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
    
    try {
      const result = await firmaService.getFirma(id);
      
      console.log('📥 Fetch Firma Result:', result);
      
      if (result.success && result.data && result.data.firma) {
        const firma = result.data.firma;
        console.log('✅ Setting firma data:', firma);
        
        dispatch({
          type: ACTION_TYPES.SET_FIRMA,
          payload: firma
        });
        return { success: true, data: firma };
      } else {
        console.error('❌ No firma data in response:', result);
        throw new Error(result.message || 'Firma verisi bulunamadı');
      }
    } catch (error) {
      console.error('🚨 Fetch Firma Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Firma detayı yüklenemedi';
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  }, [setError]);

  // 📝 Create Firma
  const createFirma = useCallback(async (firmaData) => {
    if (!firmaData) {
      setError('Firma verileri gereklidir');
      return { success: false, message: 'Firma verileri gereklidir' };
    }

    dispatch({ type: ACTION_TYPES.SET_SUBMIT_LOADING, payload: true });
    
    try {
      const result = await firmaService.createFirma(firmaData);
      
      if (result.success) {
        dispatch({
          type: ACTION_TYPES.CREATE_FIRMA_SUCCESS,
          payload: result.data.firma
        });
        return { success: true, data: result.data.firma, message: result.message };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Firma oluşturulamadı';
      const errors = error.response?.data?.errors || null;
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage, errors };
    }
  }, [setError]);

  // ✏️ Update Firma
  const updateFirma = useCallback(async (id, firmaData) => {
    if (!id || !firmaData) {
      setError('Firma ID ve verileri gereklidir');
      return { success: false, message: 'Firma ID ve verileri gereklidir' };
    }

    dispatch({ type: ACTION_TYPES.SET_SUBMIT_LOADING, payload: true });
    
    try {
      const result = await firmaService.updateFirma(id, firmaData);
      
      if (result.success) {
        dispatch({
          type: ACTION_TYPES.UPDATE_FIRMA_SUCCESS,
          payload: result.data.firma
        });
        return { success: true, data: result.data.firma, message: result.message };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Firma güncellenemedi';
      const errors = error.response?.data?.errors || null;
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage, errors };
    }
  }, [setError]);

  // 🗑️ Delete Firma
  const deleteFirma = useCallback(async (id) => {
    if (!id) {
      setError('Firma ID gereklidir');
      return { success: false, message: 'Firma ID gereklidir' };
    }

    dispatch({ type: ACTION_TYPES.SET_SUBMIT_LOADING, payload: true });
    
    try {
      const result = await firmaService.deleteFirma(id);
      
      if (result.success) {
        dispatch({
          type: ACTION_TYPES.DELETE_FIRMA_SUCCESS,
          payload: id
        });
        return { success: true, message: result.message };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Firma silinemedi';
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  }, [setError]);

  // 🔍 Enhanced Search Firmalar
  const searchFirmalar = useCallback(async (searchTerm, field = null) => {
    const trimmedSearchTerm = searchTerm?.trim();
    
    if (!trimmedSearchTerm || trimmedSearchTerm.length < 2) {
      setError('Arama için en az 2 karakter giriniz');
      return [];
    }

    dispatch({ type: ACTION_TYPES.SET_SEARCH_LOADING, payload: true });
    
    try {
      const result = await firmaService.searchFirmalar(trimmedSearchTerm, field);
      
      console.log('🔍 Context Search Result:', result);
      
      if (result.success) {
        const firmalar = result.data || [];
        dispatch({
          type: ACTION_TYPES.SET_SEARCH_RESULTS,
          payload: firmalar
        });
        return firmalar;
      } else {
        dispatch({
          type: ACTION_TYPES.SET_SEARCH_RESULTS,
          payload: []
        });
        return [];
      }
    } catch (error) {
      console.error('🚨 Context Search Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Arama yapılamadı';
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return [];
    }
  }, [setError]);

  // 📊 Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await firmaService.getFirmaStats();
      
      if (result.success) {
        dispatch({
          type: ACTION_TYPES.SET_STATS,
          payload: result.data
        });
        return { success: true, data: result.data };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'İstatistikler yüklenemedi';
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  }, []);

  // 📍 Fetch İl/İlçe Listesi
  const fetchIlIlceListesi = useCallback(async () => {
    try {
      const result = await firmaService.getIlIlceListesi();
      
      if (result.success) {
        dispatch({
          type: ACTION_TYPES.SET_IL_ILCE_LISTESI,
          payload: result.data
        });
        return { success: true, data: result.data };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'İl/İlçe listesi yüklenemedi';
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  }, []);

  // 🔧 Filter Management
  const setFilters = useCallback((newFilters) => {
    dispatch({
      type: ACTION_TYPES.SET_FILTERS,
      payload: newFilters
    });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET_FILTERS });
  }, []);

  // 📄 Pagination Management
  const setPagination = useCallback((newPagination) => {
    dispatch({
      type: ACTION_TYPES.SET_PAGINATION,
      payload: newPagination
    });
  }, []);

  const goToPage = useCallback((page) => {
    setPagination({ mevcutSayfa: page });
  }, [setPagination]);

  const nextPage = useCallback(() => {
    if (state.pagination.sonrakiSayfa) {
      goToPage(state.pagination.sonrakiSayfa);
    }
  }, [state.pagination.sonrakiSayfa, goToPage]);

  const prevPage = useCallback(() => {
    if (state.pagination.oncekiSayfa) {
      goToPage(state.pagination.oncekiSayfa);
    }
  }, [state.pagination.oncekiSayfa, goToPage]);

  // 🧹 Utility Functions
  const clearFirma = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_FIRMA });
  }, []);

  const clearSearchResults = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_SEARCH_RESULTS });
  }, []);

  const markDataStale = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_DATA_STALE });
  }, []);

  const markDataFresh = useCallback(() => {
    dispatch({ type: ACTION_TYPES.MARK_DATA_FRESH });
  }, []);

  // 🎯 Context Value
  const contextValue = {
    // State
    ...state,
    
    // Data Actions
    fetchFirmalar,
    fetchFirma,
    createFirma,
    updateFirma,
    deleteFirma,
    searchFirmalar,
    fetchStats,
    fetchIlIlceListesi,
    
    // Filter & Pagination Actions
    setFilters,
    resetFilters,
    setPagination,
    goToPage,
    nextPage,
    prevPage,
    
    // Utility Actions
    clearError,
    clearFirma,
    clearSearchResults,
    markDataStale,
    markDataFresh,
    
    // Computed Values
    hasError: Boolean(state.error),
    hasData: state.firmalar.length > 0,
    isEmpty: !state.loading && state.firmalar.length === 0,
    needsRefresh: state.isDataStale,
    
    // Loading States
    isLoading: state.loading,
    isSearching: state.searchLoading,
    isSubmitting: state.submitLoading,
    isBusy: state.loading || state.searchLoading || state.submitLoading
  };

  return (
    <FirmaContext.Provider value={contextValue}>
      {children}
    </FirmaContext.Provider>
  );
};

export default FirmaContext;