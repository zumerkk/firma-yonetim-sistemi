// 🔐 Authentication Context - FIXED VERSION
// JWT tabanlı kimlik doğrulama ve kullanıcı durumu yönetimi
// Centralized axios instance kullanımı

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../utils/axios'; // 🎯 Centralized axios instance kullan

// 🔧 Token'ı localStorage ve axios headers'ına ekle
const setAuthToken = (token) => {
  if (token) {
    // Centralized axios instance'a token ekle
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // User data da temizle
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

  // 🚀 Uygulama başladığında token kontrolü - ENHANCED
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('🚀 AuthContext initializing...', { hasToken: !!token, hasUser: !!userData });
    
    if (token) {
      try {
        setAuthToken(token);
        // Stored user data varsa kullan, yoksa API'den yükle
        if (userData) {
          const user = JSON.parse(userData);
          dispatch({ 
            type: AUTH_ACTIONS.LOAD_USER_SUCCESS, 
            payload: user 
          });
          console.log('✅ User loaded from localStorage');
        } else {
          loadUser();
        }
      } catch (error) {
        console.error('❌ Token initialization error:', error);
        setAuthToken(null);
        dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: 'Token hatası' });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: 'Token bulunamadı' });
    }
  }, []);

  // 👤 Kullanıcı bilgilerini yükle - ENHANCED
  const loadUser = async () => {
    dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
    
    try {
      const response = await api.get('/auth/profile');
      const user = response.data.data.user;
      
      // User data'yı localStorage'a da kaydet
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({ 
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS, 
        payload: user 
      });
      
      console.log('✅ User profile loaded and saved');
    } catch (error) {
      console.error('❌ Load user error:', error);
      const errorMessage = error.response?.data?.message || 'Kullanıcı bilgileri yüklenemedi';
      
      dispatch({ 
        type: AUTH_ACTIONS.LOAD_USER_FAILURE, 
        payload: errorMessage 
      });
      
      // Token geçersizse temizle
      if (error.response?.status === 401) {
        setAuthToken(null);
      }
    }
  };

  // 🔑 Giriş yapma - ENHANCED
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, token } = response.data.data;
      
      // Token ve user data'yı set et
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user)); // User data'yı da kaydet
      
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: { user, token } 
      });
      
      console.log('✅ Login successful, user data saved');
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

  // 📝 Kayıt olma - ENHANCED
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    
    try {
      const response = await api.post('/auth/register', userData);
      const { user, token } = response.data.data;
      
      // Token ve user data'yı set et
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user)); // User data'yı da kaydet
      
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: { user, token } 
      });
      
      console.log('✅ Registration successful, user data saved');
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

  // 🚪 Çıkış yapma - ENHANCED
  const logout = () => {
    console.log('🚪 User logging out, cleaning up...');
    setAuthToken(null); // Bu localStorage ve headers'ı temizleyecek
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // ✏️ Profil güncelleme - ENHANCED
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      const updatedUser = response.data.data.user;
      
      // Updated user data'yı localStorage'a da kaydet
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      dispatch({ 
        type: AUTH_ACTIONS.UPDATE_PROFILE, 
        payload: updatedUser 
      });
      
      console.log('✅ Profile updated and saved');
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
      const response = await api.put('/auth/change-password', passwordData);
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