// 🏆 TEŞVIK CONTEXT - ENTERPRISE STATE MANAGEMENT
// Teşvik sistemi için merkezi state yönetimi
// CRUD operations, filtering, caching

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import api from '../utils/axios';

// 📊 Initial State
const initialState = {
  tesvikler: [],
  currentTesvik: null,
  loading: false,
  error: null,
  stats: {
    toplamTesvik: 0,
    aktifTesvik: 0,
    bekleyenTesvik: 0,
    onaylananTesvik: 0,
    basariOrani: 0
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20
  },
  filters: {
    search: '',
    durum: '',
    il: '',
    dateFrom: '',
    dateTo: ''
  }
};

// 🔄 Action Types
const TESVIK_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_TESVIKLER: 'SET_TESVIKLER',
  SET_CURRENT_TESVIK: 'SET_CURRENT_TESVIK',
  ADD_TESVIK: 'ADD_TESVIK',
  UPDATE_TESVIK: 'UPDATE_TESVIK',
  DELETE_TESVIK: 'DELETE_TESVIK',
  SET_STATS: 'SET_STATS',
  SET_PAGINATION: 'SET_PAGINATION',
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_CURRENT_TESVIK: 'CLEAR_CURRENT_TESVIK'
};

// 🎯 Reducer
const tesvikReducer = (state, action) => {
  switch (action.type) {
    case TESVIK_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case TESVIK_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case TESVIK_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case TESVIK_ACTIONS.SET_TESVIKLER:
      return {
        ...state,
        tesvikler: action.payload,
        loading: false,
        error: null
      };

    case TESVIK_ACTIONS.SET_CURRENT_TESVIK:
      return {
        ...state,
        currentTesvik: action.payload,
        loading: false,
        error: null
      };

    case TESVIK_ACTIONS.ADD_TESVIK:
      return {
        ...state,
        tesvikler: [action.payload, ...state.tesvikler],
        stats: {
          ...state.stats,
          toplamTesvik: state.stats.toplamTesvik + 1
        }
      };

    case TESVIK_ACTIONS.UPDATE_TESVIK:
      return {
        ...state,
        tesvikler: state.tesvikler.map(tesvik => 
          tesvik._id === action.payload._id ? action.payload : tesvik
        ),
        currentTesvik: state.currentTesvik?._id === action.payload._id ? action.payload : state.currentTesvik
      };

    case TESVIK_ACTIONS.DELETE_TESVIK:
      return {
        ...state,
        tesvikler: state.tesvikler.filter(tesvik => tesvik._id !== action.payload),
        stats: {
          ...state.stats,
          toplamTesvik: Math.max(0, state.stats.toplamTesvik - 1)
        }
      };

    case TESVIK_ACTIONS.SET_STATS:
      return {
        ...state,
        stats: action.payload
      };

    case TESVIK_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: action.payload
      };

    case TESVIK_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case TESVIK_ACTIONS.CLEAR_CURRENT_TESVIK:
      return {
        ...state,
        currentTesvik: null
      };

    default:
      return state;
  }
};

// 🏗️ Context oluştur
const TesvikContext = createContext();

// 🎣 Custom hook
export const useTesvik = () => {
  const context = useContext(TesvikContext);
  if (!context) {
    throw new Error('useTesvik must be used within a TesvikProvider');
  }
  return context;
};

// 🌟 Provider Component
export const TesvikProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tesvikReducer, initialState);

  // 📊 Teşvikleri getir
  const fetchTesvikler = useCallback(async (page = 1, filters = {}) => {
    try {
      dispatch({ type: TESVIK_ACTIONS.SET_LOADING, payload: true });
      
      const params = new URLSearchParams({
        sayfa: page,
        limit: state.pagination.limit,
        ...state.filters,
        ...filters
      });

      const response = await api.get(`/tesvik?${params}`);
      
      if (response.data.success) {
        dispatch({ type: TESVIK_ACTIONS.SET_TESVIKLER, payload: response.data.data.tesvikler });
        dispatch({ type: TESVIK_ACTIONS.SET_PAGINATION, payload: response.data.data.pagination });
      } else {
        dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: 'Teşvikler yüklenemedi' });
      }
    } catch (error) {
      console.error('🚨 Teşvik fetch hatası:', error);
      dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: error.response?.data?.message || 'Veriler yüklenirken hata oluştu' });
    }
  }, [state.filters, state.pagination.limit]);

  // 📊 Teşvik istatistiklerini getir
  const fetchTesvikStats = useCallback(async () => {
    try {
      const response = await api.get('/tesvik/dashboard/widgets');
      
      if (response.data.success) {
        dispatch({ type: TESVIK_ACTIONS.SET_STATS, payload: response.data.data.ozet });
      }
    } catch (error) {
      console.error('🚨 Teşvik stats hatası:', error);
    }
  }, []);

  // 🔍 Tek teşvik getir
  const fetchTesvik = useCallback(async (id) => {
    try {
      dispatch({ type: TESVIK_ACTIONS.SET_LOADING, payload: true });
      
      const response = await api.get(`/tesvik/${id}`);
      
      if (response.data.success) {
        dispatch({ type: TESVIK_ACTIONS.SET_CURRENT_TESVIK, payload: response.data.data.tesvik });
      } else {
        dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: 'Teşvik bulunamadı' });
      }
    } catch (error) {
      console.error('🚨 Teşvik detail hatası:', error);
      dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: error.response?.data?.message || 'Teşvik yüklenirken hata oluştu' });
    }
  }, []);

  // ➕ Yeni teşvik oluştur
  const createTesvik = useCallback(async (tesvikData) => {
    try {
      dispatch({ type: TESVIK_ACTIONS.SET_LOADING, payload: true });
      
      const response = await api.post('/tesvik', tesvikData);
      
      if (response.data.success) {
        dispatch({ type: TESVIK_ACTIONS.ADD_TESVIK, payload: response.data.data.tesvik });
        return { success: true, data: response.data.data.tesvik };
      } else {
        dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: 'Teşvik oluşturulamadı' });
        return { success: false, error: 'Teşvik oluşturulamadı' };
      }
    } catch (error) {
      console.error('🚨 Teşvik create hatası:', error);
      const errorMessage = error.response?.data?.message || 'Teşvik oluşturulurken hata oluştu';
      dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // ✏️ Teşvik güncelle
  const updateTesvik = useCallback(async (id, tesvikData) => {
    try {
      dispatch({ type: TESVIK_ACTIONS.SET_LOADING, payload: true });
      
      const response = await api.put(`/tesvik/${id}`, tesvikData);
      
      if (response.data.success) {
        dispatch({ type: TESVIK_ACTIONS.UPDATE_TESVIK, payload: response.data.data.tesvik });
        return { success: true, data: response.data.data.tesvik };
      } else {
        dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: 'Teşvik güncellenemedi' });
        return { success: false, error: 'Teşvik güncellenemedi' };
      }
    } catch (error) {
      console.error('🚨 Teşvik update hatası:', error);
      const errorMessage = error.response?.data?.message || 'Teşvik güncellenirken hata oluştu';
      dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // 🗑️ Teşvik sil
  const deleteTesvik = useCallback(async (id) => {
    try {
      dispatch({ type: TESVIK_ACTIONS.SET_LOADING, payload: true });
      
      const response = await api.delete(`/tesvik/${id}`);
      
      if (response.data.success) {
        dispatch({ type: TESVIK_ACTIONS.DELETE_TESVIK, payload: id });
        return { success: true };
      } else {
        dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: 'Teşvik silinemedi' });
        return { success: false, error: 'Teşvik silinemedi' };
      }
    } catch (error) {
      console.error('🚨 Teşvik delete hatası:', error);
      const errorMessage = error.response?.data?.message || 'Teşvik silinirken hata oluştu';
      dispatch({ type: TESVIK_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // 🔍 Filtreleri güncelle
  const updateFilters = useCallback((newFilters) => {
    dispatch({ type: TESVIK_ACTIONS.SET_FILTERS, payload: newFilters });
  }, []);

  // 🧹 Hataları temizle
  const clearError = useCallback(() => {
    dispatch({ type: TESVIK_ACTIONS.CLEAR_ERROR });
  }, []);

  // 🧹 Mevcut teşviki temizle
  const clearCurrentTesvik = useCallback(() => {
    dispatch({ type: TESVIK_ACTIONS.CLEAR_CURRENT_TESVIK });
  }, []);

  const value = {
    // State
    ...state,
    
    // Actions
    fetchTesvikler,
    fetchTesvikStats,
    fetchTesvik,
    createTesvik,
    updateTesvik,
    deleteTesvik,
    updateFilters,
    clearError,
    clearCurrentTesvik
  };

  return (
    <TesvikContext.Provider value={value}>
      {children}
    </TesvikContext.Provider>
  );
};

export default TesvikContext;