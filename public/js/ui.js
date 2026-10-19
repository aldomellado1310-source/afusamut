// Helpers de interfaz compartidos por el portal y sus paneles.
// Se extrajeron de portal.js para que otros módulos (panel de permisos)
// puedan reutilizarlos sin duplicar código ni provocar imports circulares.

export function fmt(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
export function hoy() { return new Date().toISOString().slice(0, 10); }
// Escapa para HTML en contenido Y en atributos (incluye comillas dobles).
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"'`]/g, c => ESC_MAP[c]);
}

// Para un valor dentro de un string JS de un handler inline: onclick="f('${escJs(x)}')".
// El navegador decodifica las entidades HTML antes de ejecutar el JS, así que
// primero se escapa para JS (\ y ') y después para HTML.
export function escJs(s) {
  return esc(String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'));
}

// Solo URLs https del bucket de este proyecto en Firebase Storage; cualquier
// otra cosa (otro bucket, otro host, javascript:, data:) se descarta.
const BUCKET = 'afusamuth.firebasestorage.app';
const PREFIJOS_STORAGE = [
  'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/',
  'https://storage.googleapis.com/' + BUCKET + '/',
];
export function safeUrl(u) {
  const s = String(u || '');
  return PREFIJOS_STORAGE.some(p => s.startsWith(p)) ? s : '';
}

// Acepta Timestamp de Firestore, Date o string 'YYYY-MM-DD'
export function fechaStr(v) {
  if (!v) return '—';
  if (typeof v === 'string') return v;
  const d = v.toDate ? v.toDate() : v;
  return d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : '—';
}

// Estado vacío con carácter (reemplaza los "Sin registros" planos en listas)
// Ícono del set SVG de portal.html (#i-<nombre>): reemplaza a los emojis,
// que cada teléfono dibujaba distinto.
export function icono(nombre) {
  return '<svg class="ic" aria-hidden="true"><use href="#i-' + nombre + '"/></svg>';
}

export function emptyState(icon, titulo, desc) {
  const simbolo = /^[a-z]+$/.test(icon) ? icono(icon) : esc(icon);
  return '<div class="empty-state"><div class="empty-icon">' + simbolo + '</div>' +
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


/* ═══════════ SANITIZADOR DE HTML (lista blanca) ═══════════ */
const TAGS_OK = new Set(['div', 'span', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'small',
  'label', 'input', 'select', 'option', 'optgroup', 'textarea', 'button',
  'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'a', 'img', 'svg', 'use']);
const TAGS_DESCARTAR = new Set(['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed',
  'form', 'meta', 'link', 'base', 'template', 'noscript', 'math', 'foreignobject', 'audio', 'video']);
const ATTRS_OK = new Set(['class', 'id', 'style', 'title', 'placeholder', 'value', 'type', 'name',
  'min', 'max', 'step', 'maxlength', 'minlength', 'rows', 'cols', 'disabled', 'checked', 'selected',
  'readonly', 'required', 'role', 'tabindex', 'colspan', 'rowspan', 'autocomplete', 'inputmode',
  'pattern', 'for', 'alt', 'width', 'height', 'viewbox', 'fill', 'href', 'src']);

function urlAtributoOk(tag, nombre, valor) {
  const v = valor.replace(/[\x00-\x20]/g, '').toLowerCase();
  if (tag === 'use') return nombre === 'href' && v.startsWith('#');
  if (tag === 'a' && nombre === 'href') return /^(#|https:|mailto:)/.test(v);
  if (tag === 'img' && nombre === 'src') return /^(https:|data:image\/(png|jpeg|jpg|gif|webp);)/.test(v);
  return false;
}

export function sanitizarHTML(html) {
  const doc = new DOMParser().parseFromString(String(html == null ? '' : html), 'text/html');
  const limpiar = (nodo) => {
    [...nodo.childNodes].forEach(hijo => {
      if (hijo.nodeType === 3) return;                 // texto
      if (hijo.nodeType !== 1) { hijo.remove(); return; } // comentarios, etc.
      const tag = hijo.localName.toLowerCase();
      if (TAGS_DESCARTAR.has(tag)) { hijo.remove(); return; }
      if (!TAGS_OK.has(tag)) {                         // desconocida: se conserva solo el texto
        hijo.replaceWith(document.createTextNode(hijo.textContent));
        return;
      }
      [...hijo.attributes].forEach(a => {
        const n = a.name.toLowerCase();
        const ok = (ATTRS_OK.has(n) || n.startsWith('aria-') || n.startsWith('data-'))
          && !n.startsWith('on')
          && (n !== 'href' && n !== 'src' || urlAtributoOk(tag, n, a.value))
          && (n !== 'style' || !/url\s*\(|expression|javascript:|@import/i.test(a.value));
        if (!ok) hijo.removeAttribute(a.name);
      });
      limpiar(hijo);
    });
  };
  limpiar(doc.body);
  const frag = document.createDocumentFragment();
  [...doc.body.childNodes].forEach(n => frag.appendChild(document.importNode(n, true)));
  return frag;
}

/* ═══════════ TOASTS Y MODALES (reemplazo de alert/confirm/prompt) ═══════════ */
export function showToast(msg, tipo = 'ok') {
  const colores = { ok: '#0B4A2F', error: '#B3402F', warn: '#7A5A0F', info: '#2F6284' };
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
  // Sanitizar body con lista blanca de etiquetas y atributos. Los on* inline
  // se descartan siempre (los modales enlazan sus eventos con addEventListener).
  overlay.querySelector('.am-body').appendChild(sanitizarHTML(body));
  document.body.appendChild(overlay);
  initModalA11y(overlay);
  overlay.querySelector('.am-cancel').onclick = () => overlay.remove();
  overlay.querySelector('.am-confirm').onclick = () => {
    const cerrar = onConfirm();
    if (cerrar !== false) overlay.remove();
  };
  return overlay;
}
