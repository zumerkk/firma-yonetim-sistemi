// 🔐 Authentication Context
// JWT tabanlı kimlik doğrulama ve kullanıcı durumu yönetimi

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import axios from 'axios';

// API base URL - Production/Development uyumlu
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// 🔧 Axios konfigürasyonu
axios.defaults.baseURL = API_BASE_URL;

// Token'ı axios headers'ına ekle
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// 📊 Initial State
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

// 🔄 Action Types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_PROFILE: 'UPDATE_PROFILE'
};

// 🎯 Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        error: null
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// 🏗️ Context oluştur
const AuthContext = createContext();

// 🎣 Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 🌟 Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 🚀 Uygulama başladığında token kontrolü
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      loadUser();
    } else {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: 'Token bulunamadı' });
    }
  }, []);

  // 👤 Kullanıcı bilgilerini yükle
  const loadUser = async () => {
    dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
    
    try {
      const response = await axios.get('/auth/profile');
      dispatch({ 
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS, 
        payload: response.data.data.user 
      });
    } catch (error) {
      console.error('❌ Load user error:', error);
      dispatch({ 
        type: AUTH_ACTIONS.LOAD_USER_FAILURE, 
        payload: error.response?.data?.message || 'Kullanıcı bilgileri yüklenemedi' 
      });
      setAuthToken(null); // Token geçersizse temizle
    }
  };

  // 🔑 Giriş yapma
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await axios.post('/auth/login', credentials);
      const { user, token } = response.data.data;
      
      setAuthToken(token);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: { user, token } 
      });
      
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error.response?.data?.message || 'Giriş yapılamadı';
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: errorMessage 
      });
      return { success: false, message: errorMessage };
    }
  };

  // 📝 Kayıt olma
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await axios.post('/auth/register', userData);
      const { user, token } = response.data.data;
      
      setAuthToken(token);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: { user, token } 
      });
      
      return { success: true, message: 'Kayıt başarılı' };
    } catch (error) {
      console.error('❌ Register error:', error);
      const errorMessage = error.response?.data?.message || 'Kayıt oluşturulamadı';
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: errorMessage 
      });
      return { success: false, message: errorMessage };
    }
  };

  // 🚪 Çıkış yapma
  const logout = () => {
    setAuthToken(null);
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // ✏️ Profil güncelleme
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      dispatch({ 
        type: AUTH_ACTIONS.UPDATE_PROFILE, 
        payload: response.data.data.user 
      });
      return { success: true, message: 'Profil güncellendi' };
    } catch (error) {
      console.error('❌ Update profile error:', error);
      const errorMessage = error.response?.data?.message || 'Profil güncellenemedi';
      return { success: false, message: errorMessage };
    }
  };

  // 🔒 Şifre değiştirme
  const changePassword = async (passwordData) => {
    try {
      const response = await axios.put('/auth/change-password', passwordData);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('❌ Change password error:', error);
      const errorMessage = error.response?.data?.message || 'Şifre değiştirilemedi';
      return { success: false, message: errorMessage };
    }
  };

  // 🧹 Hataları temizle
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // 🎯 Context value
  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    
    // Actions
    login,
    register,
    logout,
    loadUser,
    updateProfile,
    changePassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 