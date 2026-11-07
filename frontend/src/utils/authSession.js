import { yerelYaz } from './yerelDepo';

export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'auth:lastActivityAt';
export const SESSION_MESSAGE_KEY = 'auth:logoutMessage';
export const SESSION_EVENT = 'app:auth-session';
export const IDLE_MESSAGE = 'Bir saat işlem yapmadığınız için oturumunuz kapatıldı. Lütfen tekrar giriş yapın.';
export const EXPIRED_MESSAGE = 'Oturumunuz artık geçerli değil. Lütfen tekrar giriş yapın.';

export const getLastActivity = () => {
  const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
};

export const saveActivity = (time = Date.now()) => yerelYaz(LAST_ACTIVITY_KEY, String(time));

export const isSessionIdle = (time = getLastActivity()) =>
  time !== null && Date.now() - time >= IDLE_TIMEOUT_MS;

export const notifySession = (type, token, message) => {
  if (token && token === localStorage.getItem('token')) {
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { type, token, message } }));
  }
};

const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'input'];
const activityOptions = { capture: true, passive: true };
const ACTIVITY_WRITE_INTERVAL = 1000;

export const watchSessionIdle = (token, { onExpire, onTokenChange }) => {
  let timer;
  let activityTimer;
  let lastWrite = getLastActivity() ?? 0;
  let lastActivity = lastWrite || Date.now();
  let stopped = false;

  const persistActivity = () => {
    clearTimeout(activityTimer);
    activityTimer = undefined;
    if (stopped || localStorage.getItem('token') !== token) return;
    if (lastActivity <= (getLastActivity() ?? 0)) return;
    if (saveActivity(lastActivity)) lastWrite = Date.now();
  };

  const stopTimers = () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(activityTimer);
  };

  const check = (isActivity = false) => {
    if (stopped) return;
    if (localStorage.getItem('token') !== token) {
      stopTimers();
      onTokenChange();
      return;
    }

    // Askıda kalan sekmeler storage olayını henüz işlememiş olabilir.
    // Karar vermeden önce diğer sekmelerin son hareketini depodan da oku.
    const now = Date.now();
    lastActivity = Math.max(lastActivity, getLastActivity() ?? 0);
    if (lastActivity > now) {
      lastActivity = now;
      saveActivity(lastActivity);
      lastWrite = now;
    }
    if (isSessionIdle(lastActivity)) {
      stopTimers();
      onExpire(token);
      return;
    }
    if (isActivity && now > lastActivity) {
      lastActivity = now;
      const wait = ACTIVITY_WRITE_INTERVAL - (now - lastWrite);
      if (wait <= 0) persistActivity();
      else if (activityTimer === undefined) activityTimer = setTimeout(persistActivity, wait);
    }
    // Hareket yoğunken mevcut süre kontrolü kalır. Zamanı dolduğunda son
    // hareketi yeniden okuyup sonraki kontrolü hesaplar.
    if (timer === undefined) {
      timer = setTimeout(() => {
        timer = undefined;
        check();
      }, IDLE_TIMEOUT_MS - (now - lastActivity));
    }
  };

  const onActivity = () => check(true);
  const onWake = () => check();
  const onHide = () => {
    check();
    if (document.hidden) persistActivity();
  };
  const onPageHide = () => {
    check();
    persistActivity();
  };
  const onStorage = (event) => {
    if (event.key === LAST_ACTIVITY_KEY) check();
  };

  activityEvents.forEach((event) => window.addEventListener(event, onActivity, activityOptions));
  window.addEventListener('focus', onWake);
  window.addEventListener('pageshow', onWake);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onHide);
  check();

  return () => {
    stopTimers();
    activityEvents.forEach((event) => window.removeEventListener(event, onActivity, activityOptions));
    window.removeEventListener('focus', onWake);
    window.removeEventListener('pageshow', onWake);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onHide);
  };
};
