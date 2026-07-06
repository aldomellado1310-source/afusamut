// public/js/debug.js — [DEBUG] logging temporal para diagnóstico
const DEBUG = false; // true solo en desarrollo local

const styles = {
  auth:  'background:#0F5132;color:#fff;padding:2px 8px;border-radius:4px;',
  rules: 'background:#D1A126;color:#000;padding:2px 8px;border-radius:4px;',
  error: 'background:#c0392b;color:#fff;padding:2px 8px;border-radius:4px;',
  ok:    'background:#16794f;color:#fff;padding:2px 8px;border-radius:4px;',
  info:  'background:#1d6fa5;color:#fff;padding:2px 8px;border-radius:4px;',
};

export function dlog(cat, msg, data = null) {
  if (!DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  const st = styles[cat] || styles.info;
  if (data !== null) console.log(`%c${cat.toUpperCase()}%c ${ts} · ${msg}`, st, 'color:inherit', data);
  else console.log(`%c${cat.toUpperCase()}%c ${ts} · ${msg}`, st, 'color:inherit');
}
export function dgroup(t) { if (DEBUG) console.group(`%c🔍 ${t}`, 'font-weight:bold;color:#0F5132;'); }
export function dgroupEnd() { if (DEBUG) console.groupEnd(); }

if (DEBUG) {
  window.addEventListener('error', e =>
    dlog('error', `Error global: ${e.message}`, { file: e.filename, line: e.lineno }));
  window.addEventListener('unhandledrejection', e =>
    dlog('error', 'Promise rechazada sin catch', e.reason));
}
