// Sentry Browser — se carga como primer módulo en cada página.
// El bundle CDN de Sentry es IIFE (window.Sentry); lo inyectamos dinámicamente
// para no bloquear la página si la CDN no responde.
const SENTRY_SRC = 'https://browser.sentry-cdn.com/7.119.0/bundle.min.js';
const SENTRY_DSN = 'https://2cc586f10f557c12844422d4502e669f@o4511547664105472.ingest.us.sentry.io/4511547670265856';

let Sentry = null;

try {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SENTRY_SRC;
    s.integrity = 'sha384-N/+t7zuoySxu9rbUlySpn5qv9w/rBT0D7HE35N2dXNy/1W68iV8i6hc13TPJnKOB';
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar Sentry'));
    document.head.appendChild(s);
  });
  Sentry = window.Sentry;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'development' : 'production',
    tracesSampleRate: location.hostname === 'localhost' ? 1.0 : 0.1,
    beforeSend(event) {
      if (event.exception?.values?.[0]?.value?.includes('NetworkError')) return null;
      return event;
    },
  });
} catch (e) {
  console.warn('Sentry no disponible:', e.message);
}

export function setSentryUser(userData) {
  if (!Sentry) return;
  Sentry.setUser({ id: userData.uid, role: userData.rol });
}
export function clearSentryUser() {
  if (Sentry) Sentry.setUser(null);
}
export function captureError(e) {
  if (Sentry) Sentry.captureException(e);
  console.error(e);
}
export { Sentry };
