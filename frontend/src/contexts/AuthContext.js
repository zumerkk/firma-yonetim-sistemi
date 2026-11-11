import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { Alert, Snackbar } from '@mui/material';
import api, { clearConnectionIssues } from '../utils/axios';
import { yerelYaz } from '../utils/yerelDepo';
import {
  EXPIRED_MESSAGE, IDLE_MESSAGE, LAST_ACTIVITY_KEY, SESSION_EVENT, SESSION_MESSAGE_KEY,
  getLastActivity, isSessionIdle, saveActivity, watchSessionIdle
} from '../utils/authSession';

const initialState = {
  user: null, token: null, isAuthenticated: false, loading: true, error: null,
  sessionMessage: '', connectionIssue: ''
};
const CACHED_USER_TOKEN_KEY = 'auth:cachedUserFor';

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_USER_START':
      return {
        ...state, token: action.token, user: null, isAuthenticated: false,
        loading: true, error: null, connectionIssue: ''
      };
    case 'LOGIN_SUCCESS':
    case 'LOAD_USER_SUCCESS':
      return {
        ...state, user: action.user, token: action.token, isAuthenticated: true,
        loading: false, error: null, sessionMessage: '',
        connectionIssue: action.connectionIssue || ''
      };
    case 'LOGIN_FAILURE':
      return { ...state, user: null, isAuthenticated: false, loading: false, error: action.message };
    case 'LOAD_USER_FAILURE':
      return { ...state, loading: false, sessionMessage: action.message };
    case 'LOGOUT':
      return { ...initialState, loading: false, sessionMessage: action.message || '' };
    case 'UPDATE_PROFILE':
      return { ...state, user: { ...state.user, ...action.user }, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'CLEAR_SESSION_MESSAGE':
      return { ...state, sessionMessage: '' };
    case 'CONNECTION_ISSUE':
      return state.connectionIssue === action.message ? state : { ...state, connectionIssue: action.message };
    default:
      return state;
  }
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const readCachedUser = (token, allowLegacyCache) => {
  const cachedToken = localStorage.getItem(CACHED_USER_TOKEN_KEY);
  if (cachedToken !== token && (cachedToken || !allowLegacyCache)) return null;
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (_) {
    return null;
  }
};

const cacheUser = (token, user) => {
  if (!yerelYaz(CACHED_USER_TOKEN_KEY, token)) return;
  if (!yerelYaz('user', JSON.stringify(user))) {
    localStorage.removeItem('user');
    localStorage.removeItem(CACHED_USER_TOKEN_KEY);
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const authRequest = useRef(0);

  const endSession = useCallback((message, expectedToken) => {
    if (expectedToken && localStorage.getItem('token') !== expectedToken) return;

    authRequest.current += 1;
    clearConnectionIssues();
    if (message) yerelYaz(SESSION_MESSAGE_KEY, message);
    else localStorage.removeItem(SESSION_MESSAGE_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem(CACHED_USER_TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT', message });
  }, []);

  const loadUser = useCallback(async (token = localStorage.getItem('token'), cachedUser = null) => {
    if (!token) return;
    const request = ++authRequest.current;
    dispatch({ type: 'LOAD_USER_START', token });
    const isCurrent = () => request === authRequest.current && token === localStorage.getItem('token');

    try {
      const response = await api.get('/auth/profile');
      if (!isCurrent()) return;
      const user = response.data.data.user;
      if (!user) throw new Error('Kullanıcı bilgileri alınamadı. Lütfen tekrar deneyin.');
      cacheUser(token, user);
      dispatch({ type: 'LOAD_USER_SUCCESS', user, token });
    } catch (error) {
      if (!isCurrent()) return;
      if (error.response?.status === 401) {
        endSession(EXPIRED_MESSAGE, token);
        return;
      }

      const message = error.kullaniciMesaji || error.response?.data?.message || 'Kullanıcı bilgileri yüklenemedi. Lütfen tekrar deneyin.';
      // Geçici bağlantı hatası, bu tarayıcıda açık ve önbellekte olan oturumu bitirmez.
      if (cachedUser) {
        dispatch({ type: 'LOAD_USER_SUCCESS', user: cachedUser, token, connectionIssue: message });
      } else {
        dispatch({ type: 'LOAD_USER_FAILURE', message });
      }
    }
  }, [endSession]);

  const restoreSession = useCallback((allowLegacyCache = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      authRequest.current += 1;
      dispatch({ type: 'LOGOUT', message: localStorage.getItem(SESSION_MESSAGE_KEY) });
      return;
    }

    const lastActivity = getLastActivity();
    if (isSessionIdle(lastActivity)) {
      endSession(IDLE_MESSAGE, token);
      return;
    }
    // İlk açılışta eski sürümden kalan oturum için bir kez başlangıç noktası koy.
    if (lastActivity === null) saveActivity();
    loadUser(token, readCachedUser(token, allowLegacyCache));
  }, [endSession, loadUser]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'token' || event.key === null) restoreSession();
    };
    const onSessionEvent = ({ detail }) => {
      if (!detail?.token || detail.token !== localStorage.getItem('token')) return;
      if (detail.type === 'expired') endSession(EXPIRED_MESSAGE, detail.token);
      if (detail.type === 'idle') endSession(IDLE_MESSAGE, detail.token);
      if (detail.type === 'connection') dispatch({ type: 'CONNECTION_ISSUE', message: detail.message });
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(SESSION_EVENT, onSessionEvent);
    restoreSession(true);
    return () => {
      authRequest.current += 1;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SESSION_EVENT, onSessionEvent);
    };
  }, [endSession, restoreSession]);

  useEffect(() => {
    if (!state.token) return undefined;
    return watchSessionIdle(state.token, {
      onExpire: (token) => endSession(IDLE_MESSAGE, token),
      onTokenChange: restoreSession
    });
  }, [state.token, endSession, restoreSession]);

  const login = useCallback(async (credentials) => {
    const request = ++authRequest.current;
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await api.post('/auth/login', credentials);
      if (request !== authRequest.current) return { success: false };
      const { user, token } = response.data.data;
      if (!user || !token) throw new Error('Oturum bilgileri alınamadı. Lütfen tekrar deneyin.');
      saveActivity();
      cacheUser(token, user);
      if (!yerelYaz('token', token)) throw new Error('Tarayıcı oturum bilgisini kaydedemedi. Lütfen tekrar deneyin.');
      localStorage.removeItem(SESSION_MESSAGE_KEY);
      dispatch({ type: 'LOGIN_SUCCESS', user, token });
      return { success: true, message: 'Giriş başarılı' };
    } catch (error) {
      if (request !== authRequest.current) return { success: false };
      const message = error.response?.data?.message || error.kullaniciMesaji || error.message || 'Giriş yapılamadı';
      dispatch({ type: 'LOGIN_FAILURE', message });
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    endSession();
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Çıkış, sunucuya ulaşılamadığında da tamamlanır.
    }
  }, [endSession]);

  const updateUser = useCallback((user) => {
    if (!state.token || state.token !== localStorage.getItem('token')) return;
    cacheUser(state.token, user);
    dispatch({ type: 'UPDATE_PROFILE', user });
  }, [state.token]);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const clearSessionMessage = useCallback(() => {
    localStorage.removeItem(SESSION_MESSAGE_KEY);
    dispatch({ type: 'CLEAR_SESSION_MESSAGE' });
  }, []);
  const dismissConnectionIssue = () => {
    clearConnectionIssues();
    dispatch({ type: 'CONNECTION_ISSUE', message: '' });
  };

  const contextValue = {
    ...state,
    login, logout, loadUser, updateUser, clearError, clearSessionMessage,
    hasUser: Boolean(state.user),
    isLoggedIn: state.isAuthenticated && Boolean(state.user),
    hasError: Boolean(state.error)
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <Snackbar
        open={state.isAuthenticated && Boolean(state.connectionIssue)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" onClose={dismissConnectionIssue}>{state.connectionIssue}</Alert>
      </Snackbar>
    </AuthContext.Provider>
  );
};

export default AuthContext;
