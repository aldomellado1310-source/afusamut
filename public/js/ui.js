// Helpers de interfaz compartidos por el portal y sus paneles.
// Se extrajeron de portal.js para que otros módulos (panel de permisos)
// puedan reutilizarlos sin duplicar código ni provocar imports circulares.

export function fmt(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
export function hoy() { return new Date().toISOString().slice(0, 10); }
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML.replace(/'/g, '&#39;');
}

// Acepta Timestamp de Firestore, Date o string 'YYYY-MM-DD'
export function fechaStr(v) {
  if (!v) return '—';
  if (typeof v === 'string') return v;
  const d = v.toDate ? v.toDate() : v;
  return d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : '—';
}

// Estado vacío con carácter (reemplaza los "Sin registros" planos en listas)
export function emptyState(icon, titulo, desc) {
  return '<div class="empty-state"><div class="empty-icon">' + icon + '</div>' +
    '<h4>' + esc(titulo) + '</h4><p>' + esc(desc) + '</p></div>';
}

// Tamaño legible para pesos de archivo (respaldos, PDF comprimidos…)
export function fmtBytes(n) {
  if (!n && n !== 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

/* ═══════════ ACCESIBILIDAD DE MODALES (Escape, foco inicial, trampa de Tab) ═══════════ */
export function initModalA11y(overlay, onClose) {
  overlay.tabIndex = -1;
  const focusables = () => overlay.querySelectorAll(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
  setTimeout(() => {
    const primero = overlay.querySelector('input, select, textarea')
      || overlay.querySelector('.am-confirm') || focusables()[0];
    primero?.focus();
  }, 30);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      (onClose || (() => overlay.remove()))();
    } else if (e.key === 'Tab') {
      const lista = [...focusables()];
      if (!lista.length) return;
      const primero = lista[0], ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }
  });
}

/* ═══════════ TOASTS Y MODALES (reemplazo de alert/confirm/prompt) ═══════════ */
export function showToast(msg, tipo = 'ok') {
  const colores = { ok: '#0F5132', error: '#dc2626', warn: '#D1A126', info: '#1d6fa5' };
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = colores[tipo] || colores.ok;
  if (tipo === 'ok') {
    const check = document.createElement('span');
    check.className = 'success-check';
    check.textContent = '✓';
    toast.appendChild(check);
  }
  toast.appendChild(document.createTextNode(msg));
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function showConfirm({ titulo, desc, confirmText = 'Confirmar', danger = true, onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay';
  overlay.innerHTML = `
    <div class="app-modal">
      <h4>${esc(titulo)}</h4>
      <p class="am-desc">${esc(desc)}</p>
      <div class="am-btns">
        <button class="am-cancel">Cancelar</button>
        <button class="am-confirm${danger ? ' danger' : ''}">${esc(confirmText)}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
  overlay.querySelector('.am-cancel').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.am-confirm').onclick = () => { overlay.remove(); onConfirm(); };
}

export function showModal({ titulo, body, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay';
  overlay.innerHTML = `
    <div class="app-modal">
      <h4 style="margin-bottom:16px;">${esc(titulo)}</h4>
      <div class="am-body"></div>
      <div class="am-btns">
        <button class="am-cancel">${esc(cancelText)}</button>
        <button class="am-confirm">${esc(confirmText)}</button>
      </div>
    </div>`;
  // Sanitizar body: eliminar scripts y event handlers antes de inyectar
  const doc = new DOMParser().parseFromString(body, 'text/html');
  doc.querySelectorAll('script').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => { if (a.name.startsWith('on')) el.removeAttribute(a.name); });
  });
  overlay.querySelector('.am-body').innerHTML = doc.body.innerHTML;
  document.body.appendChild(overlay);
  initModalA11y(overlay);
  overlay.querySelector('.am-cancel').onclick = () => overlay.remove();
  overlay.querySelector('.am-confirm').onclick = () => {
    const cerrar = onConfirm();
    if (cerrar !== false) overlay.remove();
  };
  return overlay;
}
