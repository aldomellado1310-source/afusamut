// Lógica principal del Portal AFUSAMUT — Firebase Edition.
// Conserva el comportamiento y el HTML del demo; cambia la fuente de datos
// (localStorage → Firestore) y los respaldos (base64 → Storage).
import './sentry.js';
import {
  db,
  doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  serverTimestamp, runTransaction, getCountFromServer, writeBatch,
} from './firebase.js';
import { watchAuth, logout, currentUser, currentUserData, refreshUserData } from './auth.js';
import {
  logAudit, seedBeneficios,
  getCuotas, getCuotaPorEstamento, getCategoriaCuota, cuotaPorEstamentoSync, invalidarCuotasCache,
} from './db.js';
import { uploadImagen } from './storage.js';
import { captureError } from './sentry.js';

/* ═══════════ HELPERS ═══════════ */
function fmt(n) { return '$' + (n || 0).toLocaleString('es-CL'); }
function hoy() { return new Date().toISOString().slice(0, 10); }
function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML.replace(/'/g, '&#39;'); }
// Acepta Timestamp de Firestore, Date o string 'YYYY-MM-DD'
function fechaStr(v) {
  if (!v) return '—';
  if (typeof v === 'string') return v;
  const d = v.toDate ? v.toDate() : v;
  return d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : '—';
}

// Estado vacío con carácter (reemplaza los "Sin registros" planos en listas)
function emptyState(icon, titulo, desc) {
  return '<div class="empty-state"><div class="empty-icon">' + icon + '</div>' +
    '<h4>' + esc(titulo) + '</h4><p>' + esc(desc) + '</p></div>';
}

// ── Rol efectivo vs rol real (Tarea 3) ──
// El superadmin puede cambiar su VISTA a socio/directorio para recorrer el
// journey de cada rol. Es puramente cosmético: el rol real en Firestore y los
// permisos de las Security Rules no cambian.
let vistaEfectiva = 'superadmin'; // 'socio' | 'directorio' | 'superadmin'

function rolEfectivo() {
  if (!currentUserData) return null;
  return currentUserData.rol === 'superadmin' ? vistaEfectiva : currentUserData.rol;
}
function esDirectorio() {
  const rol = rolEfectivo();
  return rol === 'directorio' || rol === 'superadmin';
}
function esSuperadmin() {
  return rolEfectivo() === 'superadmin'
    && currentUserData?.rol === 'superadmin'
    && currentUserData?.email?.endsWith('@micorriza.bio');
}

/* ═══════════ TOASTS Y MODALES (reemplazo de alert/confirm/prompt) ═══════════ */
function showToast(msg, tipo = 'ok') {
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

function showConfirm({ titulo, desc, confirmText = 'Confirmar', danger = true, onConfirm }) {
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
  overlay.querySelector('.am-cancel').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.am-confirm').onclick = () => { overlay.remove(); onConfirm(); };
}

function showModal({ titulo, body, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm }) {
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
  overlay.querySelector('.am-cancel').onclick = () => overlay.remove();
  overlay.querySelector('.am-confirm').onclick = () => {
    const cerrar = onConfirm();
    if (cerrar !== false) overlay.remove();
  };
  return overlay;
}

/* ═══════════ ARRANQUE — VERIFICACIÓN DE SESIÓN ═══════════ */
watchAuth(
  async (user, userData) => {
    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('portalApp').style.display = 'block';
    applyRoleUI(userData);
    initSelectorVista();
    if (esDirectorio()) {
      try { await seedBeneficios(); } catch (e) { console.warn('seedBeneficios:', e.code || e.message); }
      await enviarRecordatoriosCumpleanos();
    }
    renderAll();
    showTab('inicio');
    if (!userData.onboardingOk && !esDirectorio()) showOnboarding();
  },
  () => {
    window.location.href = '/login.html';
  }
);

async function cerrarSesion() {
  await logAudit('LOGOUT');
  await logout();
}

function showTab(name) {
  const actual = document.querySelector('.p-section.active');
  const nueva  = document.getElementById('tab-' + name);
  if (!nueva || actual === nueva) {
    document.querySelectorAll('.p-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    return;
  }

  document.querySelectorAll('.p-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));

  if (actual) {
    // Cross-fade: salida breve de la sección actual, entrada animada de la nueva
    actual.style.animation = 'sectionExit .2s var(--ease-out) forwards';
    setTimeout(() => {
      actual.classList.remove('active');
      actual.style.animation = '';
      nueva.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 180);
    // Refrescar los datos del tab al entrar: los cambios hechos en otro tab
    // (p. ej. inscripciones del padrón) se reflejan sin recargar la página
    refreshTab(name);
  } else {
    nueva.classList.add('active');
  }
}

function refreshTab(name) {
  const renders = {
    inicio: renderInicio,
    padron: renderPadron,
    finanzas: renderFinanzas,
    votaciones: renderVotaciones,
    poder: renderPoder,
    actas: renderActas,
    buzon: renderBuzon,
    notificaciones: renderNotificaciones,
    calendario: renderCalendario,
    beneficios: renderBeneficios,
    admin: renderAdmin,
  };
  const fn = renders[name];
  if (fn) Promise.resolve(fn()).catch(e => captureError(e));
}

/* ═══════════ UI SEGÚN ROL ═══════════ */
function applyRoleUI(userData) {
  const isSuper = esSuperadmin();
  const isDir   = esDirectorio();

  const pill = document.getElementById('rolePill');
  pill.textContent = isSuper ? '🛡️ Micorriza Admin'
    : isDir ? '🛡️ Directorio'
    : '👤 ' + (userData.nombre?.split(' ')[0] || 'Socio/a');
  pill.className = 'role-pill ' + (isDir ? 'directorio' : 'socio');

  document.querySelectorAll('.solo-directorio').forEach(el => {
    el.style.display = isDir ? '' : 'none';
  });
  document.querySelectorAll('.solo-socio').forEach(el => {
    el.style.display = isDir ? 'none' : '';
  });

  const tabAdmin = document.getElementById('tabAdmin');
  if (tabAdmin) tabAdmin.style.display = isSuper ? '' : 'none';

  document.getElementById('finAccTh').style.display = isDir ? '' : 'none';
  document.getElementById('welcomeTitle').textContent =
    isDir ? 'Panel del Directorio' : 'Bienvenido/a, ' + (userData.nombre || '');
  document.getElementById('welcomeSub').textContent = isDir
    ? 'Resumen ejecutivo de la asociación.'
    : 'RUT ' + (userData.rut || '—') + ' · ' + (userData.estamento || '—');
  document.getElementById('fichaPanel').style.display = isDir ? 'none' : 'block';
  document.getElementById('padronSub').textContent = isDir
    ? 'Gestión completa del registro de socios. Los datos quedan guardados en Firestore.'
    : 'Vista de transparencia: registro público del padrón (solo lectura).';
  document.getElementById('finanzasSub').textContent = isDir
    ? 'Registra movimientos y adjunta fotografía de boletas para rendición y auditoría.'
    : 'Transparencia financiera: todo socio puede revisar el libro de caja y las boletas de respaldo.';
  document.getElementById('poderSub').textContent = isDir
    ? 'Listado de funcionarios que han habilitado su autorización de descuento por planilla.'
    : 'Autoriza el descuento de tu cuota por planilla con firma digital o foto del documento firmado.';
  document.getElementById('actasSub').textContent = isDir
    ? 'Redacta y publica actas a los socios, o registra los documentos originales como respaldo.'
    : 'Actas gremiales publicadas por el Directorio para transparencia institucional.';
  document.getElementById('notifSub').textContent = isDir
    ? 'Publica avisos, convocatorias e información importante visible para todos los socios.'
    : 'Información oficial publicada por el Directorio AFUSAMUT.';
  document.getElementById('calSub').textContent = isDir
    ? 'Agrega y gestiona eventos. Los cumpleaños se toman del padrón (campo fecha de cumpleaños).'
    : 'Calendario gremial con eventos, feriados nacionales y cumpleaños del equipo.';

  // Campana de mensajes del directorio: solo en vista socio
  const bell = document.getElementById('bellIcon');
  if (bell) bell.style.display = isDir ? 'none' : '';
}

/* ═══════════ VISTA EFECTIVA DEL SUPERADMIN — "Ver como" (Tarea 3) ═══════════ */
function initSelectorVista() {
  // Solo el superadmin REAL ve este selector (independiente de la vista)
  if (currentUserData?.rol !== 'superadmin') return;
  if (document.querySelector('.vista-selector')) return;

  const selector = document.createElement('div');
  selector.className = 'vista-selector';
  selector.innerHTML = `
    <span class="vista-label">👁️ Ver como:</span>
    <button class="vista-btn active" data-vista="superadmin">Admin</button>
    <button class="vista-btn" data-vista="directorio">Directorio</button>
    <button class="vista-btn" data-vista="socio">Socio</button>
  `;
  const headerRight = document.getElementById('pHeaderRight');
  headerRight.insertBefore(selector, headerRight.firstChild);

  selector.querySelectorAll('.vista-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      vistaEfectiva = btn.dataset.vista;
      selector.querySelectorAll('.vista-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
      aplicarVistaEfectiva();
      showToast(`Viendo el portal como: ${btn.textContent}`, 'info');
    });
  });
}

function aplicarVistaEfectiva() {
  // Cambio puramente visual: el rol real (Firestore/Rules) no se toca
  applyRoleUI(currentUserData);

  const banner = document.getElementById('vistaBanner');
  if (currentUserData?.rol === 'superadmin' && vistaEfectiva !== 'superadmin') {
    banner.style.display = 'flex';
    banner.innerHTML = `
      👁️ Estás viendo el portal como <strong>${esc(vistaEfectiva)}</strong> (tu rol real no cambia).
      <button onclick="volverAVistaAdmin()">Volver a vista Admin</button>
    `;
  } else {
    banner.style.display = 'none';
  }

  // Si estaba en el tab Admin y la vista ya no lo incluye, volver a inicio
  if (rolEfectivo() !== 'superadmin'
      && document.querySelector('.p-section.active')?.id === 'tab-admin') {
    showTab('inicio');
  }

  renderAll();
}

function volverAVistaAdmin() {
  vistaEfectiva = 'superadmin';
  document.querySelectorAll('.vista-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.vista === 'superadmin'));
  aplicarVistaEfectiva();
}

/* ═══════════ ONBOARDING (primera sesión) ═══════════ */
function showOnboarding() {
  const pasos = [
    {
      titulo: '¡Bienvenido/a a AFUSAMUT!',
      desc: 'Aquí encuentras todo lo de tu gremio: finanzas, votaciones, actas y convenios.',
      icon: '👋',
    },
    {
      titulo: 'Tu primera acción importante',
      desc: 'Habilita tu Poder Simple para autorizar el descuento de cuota por planilla.',
      icon: '📄',
      accion: () => showTab('poder'),
    },
    {
      titulo: '¿Tienes dudas?',
      desc: 'Escríbele al Directorio por el Buzón Gremial. Te responden dentro del portal.',
      icon: '📬',
      accion: () => showTab('buzon'),
    },
  ];

  let i = 0;
  const mostrarPaso = () => {
    const p = pasos[i];
    const ultimo = i === pasos.length - 1;
    const dots = pasos.map((_, j) => `<span class="onb-dot${j === i ? ' on' : ''}"></span>`).join('');
    showModal({
      titulo: p.titulo,
      body: `<div class="onb-icon">${p.icon}</div>
             <p class="am-desc" style="text-align:center;">${esc(p.desc)}</p>
             <div class="onb-dots">${dots}</div>`,
      confirmText: ultimo ? 'Comenzar' : 'Siguiente →',
      cancelText: 'Saltar tour',
      onConfirm: () => {
        if (p.accion && ultimo) p.accion();
        i++;
        if (i < pasos.length) setTimeout(mostrarPaso, 120);
        else marcarOnboarding();
      },
    });
  };
  mostrarPaso();

  async function marcarOnboarding() {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { onboardingOk: true });
      refreshUserData({ onboardingOk: true });
    } catch (e) { console.warn('onboarding:', e.code); }
  }
}

/* ═══════════ RENDER GENERAL ═══════════ */
function renderAll() {
  const tareas = [
    renderInicio(), renderPadron(), renderFinanzas(), renderVotaciones(),
    renderBuzon(), renderPoder(), renderActas(), renderEstatutos(),
    renderNotificaciones(), renderCalendario(), renderBeneficios(),
  ];
  if (esSuperadmin()) tareas.push(renderAdmin());
  Promise.allSettled(tareas).then(res => {
    res.filter(r => r.status === 'rejected').forEach(r => captureError(r.reason));
  });
}

/* ═══════════ INICIO ═══════════ */
async function renderInicio() {
  const isDir = esDirectorio();
  const movSnap = await getDocs(collection(db, 'movimientos'));
  let ing = 0, egr = 0;
  movSnap.docs.forEach(d => {
    const m = d.data();
    if (m.tipo === 'ingreso') ing += m.monto; else egr += m.monto;
  });
  const abiertasSnap = await getCountFromServer(
    query(collection(db, 'votaciones'), where('estado', '==', 'abierta')));
  const abiertas = abiertasSnap.data().count;

  const k = document.getElementById('inicioKpis');
  if (isDir) {
    const [sociosSnap, pendMsgSnap, actasSnap] = await Promise.all([
      getCountFromServer(query(collection(db, 'users'), where('activo', '==', true))),
      getCountFromServer(query(collection(db, 'mensajes'), where('respuesta', '==', null))),
      getCountFromServer(collection(db, 'actas')),
    ]);
    k.innerHTML =
      '<div class="kpi k-azul"><span class="kpi-icon">👥</span><strong>' + sociosSnap.data().count + '</strong><span>Socios inscritos</span></div>' +
      '<div class="kpi k-dorado"><span class="kpi-icon">💰</span><strong>' + fmt(ing - egr) + '</strong><span>Saldo en caja</span></div>' +
      '<div class="kpi k-verde"><span class="kpi-icon">🗳️</span><strong>' + abiertas + '</strong><span>Votaciones abiertas</span></div>' +
      '<div class="kpi k-rojo"><span class="kpi-icon">📬</span><strong>' + pendMsgSnap.data().count + '</strong><span>Consultas sin responder</span></div>' +
      '<div class="kpi k-azul"><span class="kpi-icon">📋</span><strong>' + actasSnap.data().count + '</strong><span>Actas registradas</span></div>';
    renderCuotasConfig();
  } else {
    const benefSnap = await getCountFromServer(
      query(collection(db, 'beneficios'), where('activo', '==', true)));
    const cuotaOk = currentUserData.estadoCuota === 'Al día';
    k.innerHTML =
      '<div class="kpi ' + (cuotaOk ? 'k-verde' : 'k-rojo') + '"><span class="kpi-icon">' + (cuotaOk ? '✅' : '⚠️') + '</span><strong>' + esc(currentUserData.estadoCuota || '—') + '</strong><span>Estado de mi cuota</span></div>' +
      '<div class="kpi k-dorado"><span class="kpi-icon">💰</span><strong>' + fmt(ing - egr) + '</strong><span>Saldo gremial (transparencia)</span></div>' +
      '<div class="kpi k-azul"><span class="kpi-icon">🗳️</span><strong>' + abiertas + '</strong><span>Votaciones abiertas</span></div>' +
      '<div class="kpi"><span class="kpi-icon">🎁</span><strong>' + benefSnap.data().count + '</strong><span>Convenios vigentes</span></div>';
    const montoCuota = await getCuotaPorEstamento(currentUserData.estamento);
    renderFichaSocio(currentUserData, montoCuota);
  }
}

/* ═══════════ CONFIGURACIÓN DE CUOTAS (directorio/superadmin) ═══════════ */
async function renderCuotasConfig() {
  const cont = document.getElementById('cuotasCategorias');
  if (!cont) return;
  const config = await getCuotas();
  if (!config) {
    cont.innerHTML = '<p style="font-size:.78rem;color:var(--gris3);">No hay configuración de cuotas. Ejecuta scripts/seed-cuotas.mjs.</p>';
    return;
  }
  cont.innerHTML = config.categorias.map((cat, idx) => `
    <div style="border:1px solid var(--border);border-radius:var(--r-md);padding:14px 16px;margin-bottom:10px;">
      <h5 style="font-weight:700;margin-bottom:10px;">${esc(cat.nombre)}</h5>
      <div class="form-grid">
        <div>
          <label>Monto mensual (CLP)</label>
          <input type="number" id="cuota-monto-${idx}"
                 value="${cat.montoCLP}" min="0" step="500"
                 style="font-size:1rem;font-weight:700;"/>
        </div>
        <div>
          <label>Estamentos incluidos</label>
          <p style="font-size:.78rem;color:var(--gris3);padding-top:8px;">
            ${cat.estamentos.map(esc).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  `).join('');
}

async function guardarCuotas() {
  const config = await getCuotas();
  if (!config) return;
  const updatedCategorias = config.categorias.map((cat, idx) => {
    const v = parseInt(document.getElementById(`cuota-monto-${idx}`)?.value, 10);
    return { ...cat, montoCLP: (Number.isFinite(v) && v >= 0) ? v : cat.montoCLP };
  });

  const btn = document.getElementById('btnGuardarCuotas');
  btn?.classList.add('loading');
  try {
    await setDoc(doc(db, 'config', 'cuotas'), {
      categorias: updatedCategorias,
      actualizadoPor: currentUser.uid,
      actualizadoEn: serverTimestamp(),
    });
    invalidarCuotasCache();
    await logAudit('ACTUALIZAR_CUOTAS', 'config', 'cuotas', {
      categorias: updatedCategorias.map(c => ({ nombre: c.nombre, monto: c.montoCLP })),
    });
    showToast('Cuotas actualizadas correctamente', 'ok');
    renderCuotasConfig();
    renderPadron();
  } catch (e) {
    captureError(e);
    showToast('No se pudieron guardar las cuotas.', 'error');
  } finally {
    btn?.classList.remove('loading');
  }
}

function renderFichaSocio(userData, montoCuota) {
  const cuotaOk = userData.estadoCuota === 'Al día';
  document.getElementById('fichaGrid').innerHTML = `
    <div class="ficha-item"><small>RUT</small><span>${esc(userData.rut || '—')}</span></div>
    <div class="ficha-item"><small>Nombre</small><span>${esc(userData.nombre || '—')}</span></div>
    <div class="ficha-item"><small>Estamento</small><span>${esc(userData.estamento || '—')}</span></div>
    <div class="ficha-item"><small>Calidad jurídica</small><span>${esc(userData.calidad || '—')}</span></div>
    <div class="ficha-item"><small>Cuota mensual</small>
      <span>${fmt(montoCuota)} · ${esc(userData.estadoCuota || '—')} ${cuotaOk ? '✓' : '⚠️'}</span>
    </div>
    <div class="ficha-item"><small>Afiliación</small><span>${esc(fechaStr(userData.fechaIngreso))}</span></div>
    ${Object.entries(userData.camposExtra || {}).map(([k, v]) =>
      `<div class="ficha-item"><small>${esc(k)}</small><span>${esc(v)}</span></div>`
    ).join('')}
  `;
}

/* ═══════════ PADRÓN ═══════════ */
let camposExtraActivos = [];
let cachePadron = { activos: [], pendientes: [] };

function agregarCampoExtra() {
  showModal({
    titulo: 'Nuevo campo personalizado',
    body: `
      <label>Nombre del campo</label>
      <input id="modalCampoNombre" placeholder="Ej: Turno habitual, Zona, Observación"/>
    `,
    confirmText: 'Agregar campo',
    onConfirm: () => {
      const nombre = document.getElementById('modalCampoNombre').value.trim();
      if (!nombre) return false;
      if (camposExtraActivos.includes(nombre)) {
        showToast('Ese campo ya existe', 'error');
        return false;
      }
      camposExtraActivos.push(nombre);
      const div = document.createElement('div');
      div.innerHTML = `
        <label style="display:block;font-size:.66rem;font-weight:800;color:var(--gris3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;">${esc(nombre)}</label>
        <input data-campo="${esc(nombre)}" placeholder="Valor (opcional)"
               style="width:100%;padding:9px;border:1.5px solid var(--gris2);border-radius:10px;font-size:.82rem;"/>
      `;
      document.getElementById('camposExtra').appendChild(div);
      document.getElementById('camposExtraAviso').style.display = 'block';
    },
  });
}

let cacheCuotasConfig = null;

async function fetchPadron() {
  try { cacheCuotasConfig = await getCuotas(); } catch { cacheCuotasConfig = null; }
  if (esDirectorio()) {
    const [usersSnap, pendSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'padronPendiente')),
    ]);
    cachePadron.activos    = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    cachePadron.pendientes = pendSnap.docs.map(d => ({ id: d.id, pendiente: true, ...d.data() }));
  } else {
    const snap = await getDocs(query(collection(db, 'users'), where('activo', '==', true)));
    cachePadron.activos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cachePadron.pendientes = [];
  }
  cachePadron.activos.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
}

async function renderPadron() {
  await fetchPadron();
  pintarPadron();
}

function pintarPadron() {
  const isDir = esDirectorio();
  if (isDir) {
    const q = (document.getElementById('padronSearch').value || '').toLowerCase();
    const f = document.getElementById('padronFiltro').value;
    const todos = [...cachePadron.activos, ...cachePadron.pendientes];

    const extraKeys = [];
    todos.forEach(s => {
      Object.keys(s.camposExtra || {}).forEach(k => { if (!extraKeys.includes(k)) extraKeys.push(k); });
    });
    const thExtra = extraKeys.map(k => '<th class="hide-mobile">' + esc(k) + '</th>').join('');
    document.getElementById('padronHead').innerHTML =
      '<tr><th>RUT</th><th>Nombre</th><th class="hide-mobile">Estamento</th><th class="hide-mobile">Calidad</th>' +
      '<th>Celular</th><th>Incorporación</th><th>Cuota</th><th>Estado</th><th>Rol</th>' + thExtra + '<th class="no-print">Acción</th></tr>';
    const cols = 10 + extraKeys.length;
    const soySuper = esSuperadmin();

    const rows = todos.filter(s => {
      const okQ = !q || (s.nombre || '').toLowerCase().includes(q) || (s.rut || '').includes(q) || (s.celular || '').includes(q);
      const okF = !f || s.estamento === f;
      return okQ && okF;
    }).map(s => {
      const montoCuota = cuotaPorEstamentoSync(s.estamento, cacheCuotasConfig);
      const chipCuota = (s.estadoCuota === 'Al día'
        ? '<span class="chip chip-ok">Al día</span>'
        : '<span class="chip chip-warn">' + esc(s.estadoCuota || 'Pendiente') + '</span>') +
        '<br><small style="color:var(--gris3);font-weight:700;">' + fmt(montoCuota) + '/mes</small>';
      const chipEstado = s.pendiente
        ? '<span class="chip chip-azul" title="Aún no ingresa con su cuenta Google">Por vincular</span>'
        : (s.activo ? '<span class="chip chip-ok">Activo</span>' : '<span class="chip chip-bad">Inactivo</span>');
      const tdExtra = extraKeys.map(k => '<td class="hide-mobile">' + esc((s.camposExtra && s.camposExtra[k]) || '—') + '</td>').join('');
      // Rol visible para el directorio; promover solo superadmin (rules lo refuerzan)
      const rolBadge = (s.pendiente
        ? (s.rolAsignado === 'directorio'
            ? '<span class="chip chip-ok">Directorio</span>'
            : '<span class="chip chip-gris">Socio</span>')
        : s.rol === 'superadmin' ? '<span class="chip chip-bad">🛡️ Admin</span>'
        : s.rol === 'directorio' ? '<span class="chip chip-ok">Directorio</span>'
        : '<span class="chip chip-gris">Socio</span>') +
        (s.cargo ? '<br><small style="color:var(--gris3);font-weight:700;">' + esc(s.cargo) + '</small>' : '');
      // Desactivar/activar y promover: prerrogativa exclusiva del superadmin
      const accionRol = (soySuper && !s.pendiente && s.rol === 'socio')
        ? '<br><button class="btn-sm b-verde" style="margin-top:4px;" onclick="promoverADirectorio(\'' + esc(s.id) + '\')" title="Promover a Directorio">↑ Promover</button>' : '';
      const btnActivo = soySuper
        ? '<button class="btn-sm b-rojo" onclick="desactivarSocio(\'' + esc(s.id) + '\',' + (s.activo ? 'true' : 'false') + ')" title="' + (s.activo ? 'Desactivar' : 'Reactivar') + '">' + (s.activo ? '✕' : '↺') + '</button>' : '';
      const btnEditar = '<button class="btn-sm b-verde" onclick="editarSocio(\'' + esc(s.id) + '\')" title="Editar datos del socio">✏️</button>';
      const acciones = s.pendiente
        ? btnEditar + '<button class="btn-sm b-rojo" onclick="delPendiente(\'' + esc(s.id) + '\')" title="Eliminar inscripción pendiente">✕</button>'
        : btnEditar + '<button class="btn-sm b-azul" onclick="toggleCuota(\'' + esc(s.id) + '\')" title="Cambiar estado de cuota">⇄</button>' + btnActivo;
      return '<tr>' +
        '<td><small>' + esc(s.rut || '—') + '</small></td>' +
        '<td><strong>' + esc(s.nombre) + '</strong><br><small style="color:var(--gris3);">' + esc(s.email || '') + '</small></td>' +
        '<td class="hide-mobile">' + esc(s.estamento || '—') + '</td>' +
        '<td class="hide-mobile">' + esc(s.calidad || '—') + '</td>' +
        '<td>' + esc(s.celular || '—') + '</td>' +
        '<td>' + esc(fechaStr(s.fechaIngreso)) + '</td>' +
        '<td>' + chipCuota + '</td>' +
        '<td>' + chipEstado + '</td>' +
        '<td>' + rolBadge + accionRol + '</td>' +
        tdExtra +
        '<td class="no-print" style="display:flex;gap:4px;flex-wrap:wrap;">' + acciones + '</td>' +
      '</tr>';
    }).join('');
    document.getElementById('padronBody').innerHTML =
      rows || '<tr><td colspan="' + cols + '" class="empty-msg">Sin resultados.</td></tr>';
  } else {
    const rowsSocio = cachePadron.activos.map(s => {
      const chip = s.estadoCuota === 'Al día'
        ? '<span class="chip chip-ok">Al día</span>'
        : '<span class="chip chip-warn">Pendiente</span>';
      return '<tr><td><strong>' + esc(s.nombre) + '</strong></td><td>' + esc(fechaStr(s.fechaIngreso)) + '</td><td>' + chip + '</td></tr>';
    }).join('');
    document.getElementById('padronBodySocio').innerHTML =
      rowsSocio || '<tr><td colspan="3" class="empty-msg">Sin socios registrados.</td></tr>';
  }
}

async function addSocio() {
  const rut    = document.getElementById('ns-rut').value.trim();
  const nombre = document.getElementById('ns-nombre').value.trim();
  const email  = document.getElementById('ns-email').value.trim().toLowerCase();
  if (!rut || !nombre) { showToast('RUT y nombre son obligatorios.', 'error'); return; }
  if (!email || !email.includes('@')) {
    showToast('El email Google es obligatorio: con él el socio entra al portal.', 'error'); return;
  }
  const existe = [...cachePadron.activos, ...cachePadron.pendientes]
    .some(s => s.rut === rut || (s.email || '').toLowerCase() === email);
  if (existe) { showToast('Ya existe un socio con ese RUT o email.', 'error'); return; }

  const camposExtra = {};
  document.querySelectorAll('#camposExtra [data-campo]').forEach(input => {
    if (input.value.trim()) camposExtra[input.dataset.campo] = input.value.trim();
  });

  const nuevoSocio = {
    rut,
    nombre,
    email,
    estamento:    document.getElementById('ns-estamento').value,
    calidad:      document.getElementById('ns-calidad').value,
    celular:      document.getElementById('ns-celular').value.trim(),
    fechaIngreso: document.getElementById('ns-fecha').value || hoy(),
    cumpleanos:   document.getElementById('ns-cumple').value || null,
    estadoCuota:  document.getElementById('ns-cuota').value,
    rol:          'socio',
    activo:       true,
    camposExtra,
    creadoEn:     serverTimestamp(),
    ultimoLogin:  null,
  };

  try {
    // La ficha queda "pendiente" hasta que el socio entra por primera vez con Google
    await setDoc(doc(db, 'padronPendiente', email), nuevoSocio);
    await logAudit('CREAR_SOCIO', 'padronPendiente', email, { rut });
    showToast('Socio inscrito correctamente. Podrá entrar con su cuenta Google.', 'ok');
    ['ns-rut', 'ns-nombre', 'ns-email', 'ns-celular', 'ns-fecha', 'ns-cumple'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.querySelectorAll('#camposExtra input').forEach(el => { el.value = ''; });
    renderPadron(); renderInicio();
  } catch (e) {
    captureError(e);
    showToast('No se pudo inscribir al socio. Intenta nuevamente.', 'error');
  }
}

function editarSocio(id) {
  const activo   = cachePadron.activos.find(x => x.id === id);
  const pendiente = cachePadron.pendientes.find(x => x.id === id);
  const s = activo || pendiente;
  if (!s) return;

  const optsEstamento = ['Reanimador/a', 'TENS', 'Conductor/a', 'Enfermero/a', 'Técnico/a', 'Administrativo/a', 'Regulación'];
  const optsCalidad   = ['Titular', 'Contrata', 'Reemplazo'];
  const optsCuota     = ['Pendiente', 'Al día'];

  const sel = (opts, val) => opts.map(o => `<option${val === o ? ' selected' : ''}>${esc(o)}</option>`).join('');

  showModal({
    titulo: 'Editar datos del socio/a',
    body: `
      <div class="form-grid" style="margin-top:8px;">
        <div><label>RUT</label>
          <input id="ed-rut" value="${esc(s.rut || '')}" placeholder="12.345.678-9"/></div>
        <div><label>Nombre completo</label>
          <input id="ed-nombre" value="${esc(s.nombre || '')}" placeholder="Nombre Apellido"/></div>
        <div><label>Email (no editable)</label>
          <input value="${esc(s.email || '')}" disabled style="background:var(--gris1);color:var(--gris3);cursor:not-allowed;"/></div>
        <div><label>Estamento</label>
          <select id="ed-estamento">${sel(optsEstamento, s.estamento)}</select></div>
        <div><label>Calidad</label>
          <select id="ed-calidad">${sel(optsCalidad, s.calidad)}</select></div>
        <div><label>Celular</label>
          <input id="ed-celular" value="${esc(s.celular || '')}" placeholder="+56 9 XXXX XXXX"/></div>
        <div><label>Fecha incorporación</label>
          <input type="date" id="ed-fecha" value="${fechaStr(s.fechaIngreso) !== '—' ? fechaStr(s.fechaIngreso) : ''}"/></div>
        <div><label>Cumpleaños</label>
          <input type="date" id="ed-cumple" value="${s.cumpleanos || ''}" title="Se mostrará en el calendario gremial"/></div>
        <div><label>Estado cuota</label>
          <select id="ed-cuota">${sel(optsCuota, s.estadoCuota || 'Pendiente')}</select></div>
      </div>`,
    confirmText: 'Guardar cambios',
    onConfirm: async () => {
      const rut    = document.getElementById('ed-rut').value.trim();
      const nombre = document.getElementById('ed-nombre').value.trim();
      if (!rut || !nombre) { showToast('RUT y nombre son obligatorios.', 'error'); return; }

      const cambios = {
        rut,
        nombre,
        estamento:    document.getElementById('ed-estamento').value,
        calidad:      document.getElementById('ed-calidad').value,
        celular:      document.getElementById('ed-celular').value.trim(),
        fechaIngreso: document.getElementById('ed-fecha').value || null,
        cumpleanos:   document.getElementById('ed-cumple').value || null,
        estadoCuota:  document.getElementById('ed-cuota').value,
      };

      try {
        if (s.pendiente) {
          await updateDoc(doc(db, 'padronPendiente', id), cambios);
          await logAudit('EDITAR_PENDIENTE', 'padronPendiente', id, { rut });
          const idx = cachePadron.pendientes.findIndex(x => x.id === id);
          if (idx >= 0) Object.assign(cachePadron.pendientes[idx], cambios);
        } else {
          await updateDoc(doc(db, 'users', id), cambios);
          await logAudit('EDITAR_SOCIO', 'users', id, { rut });
          const idx = cachePadron.activos.findIndex(x => x.id === id);
          if (idx >= 0) Object.assign(cachePadron.activos[idx], cambios);
        }
        showToast('Datos actualizados correctamente.', 'ok');
        pintarPadron();
        renderCalendarioGrid();
      } catch (e) {
        captureError(e);
        showToast('No se pudo guardar. Verifica los permisos.', 'error');
      }
    },
  });
}

function delPendiente(email) {
  showConfirm({
    titulo: '¿Eliminar inscripción pendiente?',
    desc: 'El socio aún no ha ingresado. Se eliminará su ficha de pre-inscripción.',
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      await deleteDoc(doc(db, 'padronPendiente', email));
      await logAudit('ELIMINAR_PENDIENTE', 'padronPendiente', email);
      renderPadron(); renderInicio();
      if (esSuperadmin()) renderAdmin();
    },
  });
}

async function toggleCuota(uid) {
  const s = cachePadron.activos.find(x => x.id === uid);
  if (!s) return;
  const nuevo = s.estadoCuota === 'Al día' ? 'Pendiente' : 'Al día';
  await updateDoc(doc(db, 'users', uid), { estadoCuota: nuevo });
  await logAudit('CAMBIAR_CUOTA', 'users', uid, { estadoCuota: nuevo });
  renderPadron();
}

function desactivarSocio(uid, estaActivo) {
  showConfirm({
    titulo: estaActivo ? '¿Desactivar a este socio/a?' : '¿Reactivar a este socio/a?',
    desc: estaActivo
      ? 'No podrá ingresar al portal mientras esté desactivado. Su historial se conserva.'
      : 'El socio podrá volver a ingresar al portal.',
    confirmText: estaActivo ? 'Sí, desactivar' : 'Sí, reactivar',
    danger: estaActivo,
    onConfirm: async () => {
      await updateDoc(doc(db, 'users', uid), { activo: !estaActivo });
      await logAudit(estaActivo ? 'DESACTIVAR_SOCIO' : 'REACTIVAR_SOCIO', 'users', uid);
      renderPadron(); renderInicio();
    },
  });
}

async function exportPadronCSV() {
  await fetchPadron();
  const todos = [...cachePadron.activos, ...cachePadron.pendientes];
  const extraKeys = [];
  todos.forEach(s => Object.keys(s.camposExtra || {}).forEach(k => { if (!extraKeys.includes(k)) extraKeys.push(k); }));
  const rows = [['RUT', 'Nombre', 'Email', 'Estamento', 'Calidad', 'Celular', 'Fecha Incorporación', 'Estado Cuota', 'Estado'].concat(extraKeys)];
  todos.forEach(s => {
    const row = [s.rut, s.nombre, s.email || '', s.estamento || '', s.calidad || '', s.celular || '',
      fechaStr(s.fechaIngreso), s.estadoCuota || '', s.pendiente ? 'POR VINCULAR' : (s.activo ? 'ACTIVO' : 'INACTIVO')];
    extraKeys.forEach(k => row.push((s.camposExtra && s.camposExtra[k]) || ''));
    rows.push(row);
  });
  downloadCSV('AFUSAMUT_Padron_Socios_CONFIDENCIAL', rows);
  logAudit('EXPORT_PADRON_CSV');
}

/* ═══════════ FINANZAS ═══════════ */
let boletaFile = null;
let cacheMovimientos = [];

function loadBoleta(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  boletaFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('boletaPreviewImg').src = e.target.result;
    document.getElementById('boletaPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}
function clearBoleta(ev) {
  if (ev) ev.stopPropagation();
  boletaFile = null;
  document.getElementById('mv-foto').value = '';
  document.getElementById('boletaPreview').style.display = 'none';
}

async function addMovimiento() {
  const fecha = document.getElementById('mv-fecha').value || hoy();
  const monto = parseInt(document.getElementById('mv-monto').value, 10);
  const desc  = document.getElementById('mv-desc').value.trim();
  const tipo  = document.getElementById('mv-tipo').value;
  if (!monto || monto <= 0) { showToast('Ingresa un monto válido.', 'error'); return; }
  if (!desc) { showToast('Agrega una glosa o descripción.', 'error'); return; }
  if (tipo === 'egreso' && !boletaFile) {
    showConfirm({
      titulo: 'Egreso sin boleta',
      desc: 'Estás registrando un EGRESO sin fotografía de boleta. Para una rendición auditable se recomienda adjuntar el respaldo. ¿Guardar de todas formas?',
      confirmText: 'Guardar sin respaldo',
      danger: false,
      onConfirm: () => guardarMovimiento({ fecha, monto, desc, tipo }),
    });
    return;
  }
  await guardarMovimiento({ fecha, monto, desc, tipo });
}

async function guardarMovimiento({ fecha, monto, desc, tipo }) {
  try {
    let boletaUrl = null;
    if (boletaFile) {
      showToast('Subiendo boleta…', 'warn');
      boletaUrl = await uploadImagen(boletaFile, 'boletas');
    }
    const ref = await addDoc(collection(db, 'movimientos'), {
      fecha, tipo,
      categoria:     document.getElementById('mv-cat').value,
      descripcion:   desc,
      monto,
      boletaUrl,
      registradoPor: currentUser.uid,
      creadoEn:      serverTimestamp(),
    });
    await logAudit('CREAR_MOVIMIENTO', 'movimientos', ref.id, { tipo, monto });
    document.getElementById('mv-monto').value = '';
    document.getElementById('mv-desc').value = '';
    clearBoleta();
    showToast('Movimiento guardado correctamente.', 'ok');
    renderFinanzas(); renderInicio();
  } catch (e) {
    captureError(e);
    showToast('No se pudo guardar el movimiento.', 'error');
  }
}

function delMovimiento(id) {
  showConfirm({
    titulo: '¿Eliminar movimiento?',
    desc: 'Se eliminará del libro de caja. Esta acción no se puede deshacer.',
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      await deleteDoc(doc(db, 'movimientos', id));
      await logAudit('ELIMINAR_MOVIMIENTO', 'movimientos', id);
      renderFinanzas(); renderInicio();
    },
  });
}

function verBoleta(id) {
  const m = cacheMovimientos.find(x => x.id === id);
  if (!m || !m.boletaUrl) return;
  document.getElementById('lightboxImg').src = m.boletaUrl;
  document.getElementById('lightboxCap').textContent =
    fechaStr(m.fecha) + ' · ' + m.descripcion + ' · ' + fmt(m.monto);
  document.getElementById('lightbox').classList.add('open');
}

async function renderFinanzas() {
  const isDir = esDirectorio();
  const snap = await getDocs(query(collection(db, 'movimientos'), orderBy('fecha', 'desc')));
  cacheMovimientos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let ing = 0, egr = 0, nb = 0;
  const rows = cacheMovimientos.map(m => {
    if (m.tipo === 'ingreso') ing += m.monto; else egr += m.monto;
    if (m.boletaUrl) nb++;
    const tipoChip = m.tipo === 'ingreso'
      ? '<span class="chip chip-ok">Ingreso</span>'
      : '<span class="chip chip-bad">Egreso</span>';
    const bol = m.boletaUrl
      ? '<img class="boleta-thumb" src="' + esc(m.boletaUrl) + '" onclick="verBoleta(\'' + esc(m.id) + '\')" title="Ver boleta" alt="boleta"/>'
      : '<span class="no-boleta">Sin respaldo</span>';
    const acc = isDir
      ? '<td class="no-print"><button class="btn-sm b-rojo" onclick="delMovimiento(\'' + esc(m.id) + '\')">✕</button></td>' : '';
    const signo = m.tipo === 'ingreso' ? '+' : '−';
    return '<tr><td>' + esc(fechaStr(m.fecha)) + '</td><td>' + tipoChip + '</td><td class="hide-mobile">' + esc(m.categoria) + '</td><td>' + esc(m.descripcion) + '</td>' +
      '<td style="font-weight:800;color:' + (m.tipo === 'ingreso' ? 'var(--verde)' : 'var(--rojo)') + ';">' + signo + ' ' + fmt(m.monto) + '</td><td>' + bol + '</td>' + acc + '</tr>';
  }).join('');
  document.getElementById('finBody').innerHTML =
    rows || '<tr><td colspan="7" class="empty-msg">Sin movimientos registrados.</td></tr>';
  document.getElementById('kpiIngresos').textContent = fmt(ing);
  document.getElementById('kpiEgresos').textContent = fmt(egr);
  document.getElementById('kpiSaldo').textContent = fmt(ing - egr);
  document.getElementById('kpiBoletas').textContent = nb;
}

async function exportFinanzasCSV() {
  const snap = await getDocs(query(collection(db, 'movimientos'), orderBy('fecha', 'desc')));
  const rows = [['Fecha', 'Tipo', 'Categoría', 'Glosa', 'Monto CLP', 'Boleta respaldada']];
  let ing = 0, egr = 0;
  snap.docs.forEach(d => {
    const m = d.data();
    if (m.tipo === 'ingreso') ing += m.monto; else egr += m.monto;
    rows.push([fechaStr(m.fecha), m.tipo, m.categoria, m.descripcion, m.monto, m.boletaUrl ? 'SÍ' : 'NO']);
  });
  rows.push([], ['', '', '', 'TOTAL INGRESOS', ing],
            ['', '', '', 'TOTAL EGRESOS', egr],
            ['', '', '', 'SALDO', ing - egr]);
  downloadCSV('AFUSAMUT_Libro_Caja', rows);
  logAudit('EXPORT_FINANZAS_CSV');
}

/* ═══════════ VOTACIONES ═══════════ */
let cacheVotaciones = [];
let misVotos = {}; // votacionId -> true

async function renderVotaciones() {
  const isDir = esDirectorio();
  const snap = await getDocs(collection(db, 'votaciones'));
  cacheVotaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));

  // ¿En cuáles ya voté? (ID compuesto votacionId_uid)
  await Promise.all(cacheVotaciones.map(async v => {
    if (misVotos[v.id] !== undefined) return;
    try {
      const votoSnap = await getDoc(doc(db, 'votantes', v.id + '_' + currentUser.uid));
      misVotos[v.id] = votoSnap.exists();
    } catch { misVotos[v.id] = false; }
  }));

  const html = cacheVotaciones.map(v => {
    const total = (v.opciones || []).reduce((a, o) => a + (o.votos || 0), 0) || 1;
    const yaVoto = !!misVotos[v.id];
    const ops = (v.opciones || []).map((o, i) => {
      const pct = Math.round((o.votos || 0) / total * 100);
      const btn = (v.estado === 'abierta' && !isDir)
        ? '<button class="opt-btn" ' + (yaVoto ? 'disabled' : '') + ' onclick="votar(\'' + esc(v.id) + '\',' + i + ')">Votar</button>' : '';
      return '<div class="opt-row">' + btn +
        '<div class="opt-bar-wrap"><div class="opt-bar" style="width:' + pct + '%;"></div>' +
        '<div class="opt-bar-label">' + esc(o.texto) + ' — ' + (o.votos || 0) + ' votos (' + pct + '%)</div></div></div>';
    }).join('');
    const estadoChip = v.estado === 'abierta'
      ? '<span class="chip chip-ok">🟢 Abierta</span>'
      : '<span class="chip chip-gris">Cerrada</span>';
    const accDir = isDir && v.estado === 'abierta'
      ? '<button class="btn-sm b-rojo" onclick="cerrarVotacion(\'' + esc(v.id) + '\')">Cerrar votación</button>' : '';
    const aviso = yaVoto && v.estado === 'abierta'
      ? '<p style="font-size:.68rem;color:var(--verde);font-weight:700;margin-top:6px;">✓ Tu voto fue registrado (sufragio secreto)</p>' : '';
    return '<div class="vot-card ' + esc(v.estado) + '"><div class="vot-head"><h5>' + esc(v.titulo) + '</h5>' +
      '<div style="display:flex;gap:8px;align-items:center;">' + estadoChip + accDir + '</div></div>' +
      '<p class="vot-desc">' + esc(v.descripcion || '') + '</p>' + ops + aviso + '</div>';
  }).join('');
  document.getElementById('votList').innerHTML =
    html || emptyState('🗳️', 'Sin votaciones publicadas', 'Cuando el Directorio abra una consulta, aparecerá aquí para que emitas tu voto.');
}

async function votar(votacionId, opcionIdx) {
  const votoId  = votacionId + '_' + currentUser.uid;
  const votoRef = doc(db, 'votantes', votoId);

  const yaVoto = await getDoc(votoRef).catch(() => null);
  if (yaVoto?.exists()) {
    showToast('Ya registraste tu voto en esta consulta.', 'error');
    return;
  }

  const votRef  = doc(db, 'votaciones', votacionId);
  const votSnap = await getDoc(votRef);
  if (!votSnap.exists() || votSnap.data().estado !== 'abierta') return;

  try {
    // Transacción atómica: incrementar voto + registrar votante
    await runTransaction(db, async (tx) => {
      const vot = await tx.get(votRef);
      const opciones = [...vot.data().opciones];
      opciones[opcionIdx] = {
        ...opciones[opcionIdx],
        votos: (opciones[opcionIdx].votos || 0) + 1,
      };
      tx.update(votRef, { opciones });
      tx.set(votoRef, {
        votacionId,
        uid:      currentUser.uid,
        creadoEn: serverTimestamp(),
      });
    });
    misVotos[votacionId] = true;
    await logAudit('VOTAR', 'votaciones', votacionId);
    showToast('Tu voto fue registrado.', 'ok');
    renderVotaciones();
  } catch (e) {
    captureError(e);
    showToast('No se pudo registrar el voto. Intenta nuevamente.', 'error');
  }
}

async function addVotacion() {
  const t = document.getElementById('vt-titulo').value.trim();
  const d = document.getElementById('vt-desc').value.trim();
  const ops = document.getElementById('vt-ops').value.split(',').map(s => s.trim()).filter(Boolean);
  if (!t || ops.length < 2) {
    showToast('Ingresa título y al menos 2 opciones separadas por coma.', 'error');
    return;
  }
  const ref = await addDoc(collection(db, 'votaciones'), {
    titulo: t,
    descripcion: d,
    estado: 'abierta',
    opciones: ops.map((o, i) => ({ id: i, texto: o, votos: 0 })),
    fechaInicio: serverTimestamp(),
    fechaCierre: null,
    creadoPor: currentUser.uid,
    creadoEn: serverTimestamp(),
  });
  await logAudit('CREAR_VOTACION', 'votaciones', ref.id, { titulo: t });
  document.getElementById('vt-titulo').value = '';
  document.getElementById('vt-desc').value = '';
  document.getElementById('vt-ops').value = '';
  showToast('Votación publicada.', 'ok');
  renderVotaciones(); renderInicio();
}

function cerrarVotacion(id) {
  showConfirm({
    titulo: '¿Cerrar esta votación?',
    desc: 'El escrutinio quedará como definitivo.',
    confirmText: 'Sí, cerrar',
    onConfirm: async () => {
      await updateDoc(doc(db, 'votaciones', id), { estado: 'cerrada', fechaCierre: serverTimestamp() });
      await logAudit('CERRAR_VOTACION', 'votaciones', id);
      renderVotaciones(); renderInicio();
    },
  });
}

async function exportVotacionesCSV() {
  const rows = [['Votación', 'Estado', 'Opción', 'Votos', 'Porcentaje']];
  cacheVotaciones.forEach(v => {
    const total = (v.opciones || []).reduce((a, o) => a + (o.votos || 0), 0) || 1;
    (v.opciones || []).forEach(o => {
      rows.push([v.titulo, v.estado, o.texto, o.votos || 0, Math.round((o.votos || 0) / total * 100) + '%']);
    });
  });
  downloadCSV('AFUSAMUT_Votaciones', rows);
  logAudit('EXPORT_VOTACIONES_CSV');
}

/* ═══════════ PODER SIMPLE ═══════════ */
let poderFotoTemp = null;
let firmaDirty = false;
let cachePoderes = [];

function initFirmaCanvas() {
  const c = document.getElementById('firmaCanvas');
  if (!c || c._init) return;
  c._init = true;
  const ctx = c.getContext('2d');
  ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.strokeStyle = '#11304a';
  let drawing = false;
  function pos(e) {
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (c.width / r.width), y: (t.clientY - r.top) * (c.height / r.height) };
  }
  function start(e) { drawing = true; firmaDirty = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
  function move(e) { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); }
  function end() { drawing = false; }
  c.addEventListener('mousedown', start); c.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  c.addEventListener('touchstart', start, { passive: false }); c.addEventListener('touchmove', move, { passive: false });
  c.addEventListener('touchend', end);
}
function clearFirma() {
  const c = document.getElementById('firmaCanvas');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
  firmaDirty = false;
}
function syncPoderDoc() {
  document.getElementById('pd-nombre-out').textContent =
    document.getElementById('pd-nombre').value.trim() || '______________________';
  document.getElementById('pd-rut-out').textContent =
    document.getElementById('pd-rut').value.trim() || '____________';
  const m = parseInt(document.getElementById('pd-monto').value, 10);
  document.getElementById('pd-monto-out').textContent = m > 0 ? fmt(m) : '$______';
}

// Auto-rellena el poder con los datos del socio y su cuota según estamento
// (config/cuotas). No pisa lo que el socio ya haya escrito.
async function prefillPoderSimple() {
  try {
    const nom = document.getElementById('pd-nombre');
    const rut = document.getElementById('pd-rut');
    const mon = document.getElementById('pd-monto');
    if (!nom.value) nom.value = currentUserData.nombre || '';
    if (!rut.value) rut.value = currentUserData.rut || '';
    if (!mon.value) mon.value = await getCuotaPorEstamento(currentUserData.estamento);
    syncPoderDoc();

    const cat = await getCategoriaCuota(currentUserData.estamento);
    const info = document.getElementById('pd-cat-info');
    if (cat && info) {
      info.textContent = `${cat.nombre} · ${fmt(cat.montoCLP)} / mes`;
      info.style.display = 'inline-flex';
    }
  } catch (e) { console.warn('prefillPoderSimple:', e.code || e.message); }
}

function loadPoderFoto(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  poderFotoTemp = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('poderFotoImg').src = e.target.result;
    document.getElementById('poderFotoPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}
function clearPoderFoto(ev) {
  if (ev) ev.stopPropagation();
  poderFotoTemp = null;
  document.getElementById('pd-foto').value = '';
  document.getElementById('poderFotoPreview').style.display = 'none';
}

async function enviarPoder() {
  const nombre = document.getElementById('pd-nombre').value.trim();
  const rut    = document.getElementById('pd-rut').value.trim();
  const monto  = parseInt(document.getElementById('pd-monto').value, 10);

  if (!nombre || !rut) { showToast('Completa tu nombre y RUT.', 'error'); return; }
  if (!monto || monto <= 0) { showToast('Ingresa la cuota autorizada.', 'error'); return; }

  let firmaUrl = null;
  let docUrl   = null;

  try {
    // Opción A: firma digital en canvas
    if (firmaDirty) {
      const c = document.getElementById('firmaCanvas');
      const out = document.createElement('canvas');
      out.width = c.width; out.height = c.height;
      const octx = out.getContext('2d');
      octx.fillStyle = '#fff'; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(c, 0, 0);
      const blob = await new Promise(res => out.toBlob(res, 'image/png'));
      firmaUrl = await uploadImagen(
        new File([blob], 'firma.png', { type: 'image/png' }),
        `poderes/${currentUser.uid}`
      );
    }

    // Opción B: foto del documento
    if (poderFotoTemp) {
      docUrl = await uploadImagen(poderFotoTemp, `poderes/${currentUser.uid}`, 900);
    }

    if (!firmaUrl && !docUrl) {
      showToast('Debes firmar digitalmente o adjuntar el documento firmado.', 'error');
      return;
    }

    const ref = await addDoc(collection(db, 'poderes'), {
      uid: currentUser.uid,
      nombre, rut, monto,
      fecha:    serverTimestamp(),
      tipo:     firmaUrl ? 'firma digital' : 'documento foto',
      firmaUrl, docUrl,
      anulado:  false,
      creadoEn: serverTimestamp(),
    });
    await logAudit('ENVIAR_PODER', 'poderes', ref.id, { rut });
    showToast('Poder Simple registrado correctamente ✅', 'ok');
    clearFirma(); clearPoderFoto();
    renderPoder();
  } catch (e) {
    captureError(e);
    showToast('No se pudo enviar el poder. Intenta nuevamente.', 'error');
  }
}

function anularMiPoder() {
  showConfirm({
    titulo: '¿Anular tu poder enviado?',
    desc: 'Podrás volver a completarlo y enviarlo nuevamente.',
    confirmText: 'Sí, anular',
    onConfirm: async () => {
      const mios = cachePoderes.filter(p => p.uid === currentUser.uid && !p.anulado);
      for (const p of mios) {
        await updateDoc(doc(db, 'poderes', p.id), { anulado: true });
      }
      await logAudit('ANULAR_PODER', 'poderes');
      renderPoder();
    },
  });
}

function verPoderImg(id) {
  const p = cachePoderes.find(x => x.id === id);
  const img = p && (p.firmaUrl || p.docUrl);
  if (!img) return;
  document.getElementById('lightboxImg').src = img;
  document.getElementById('lightboxCap').textContent =
    p.nombre + ' · ' + p.rut + ' · ' + p.tipo + ' · ' + fechaStr(p.fecha);
  document.getElementById('lightbox').classList.add('open');
}

function delPoder(id) {
  showConfirm({
    titulo: '¿Anular este poder del registro?',
    desc: 'El socio deberá enviarlo nuevamente.',
    confirmText: 'Sí, anular',
    onConfirm: async () => {
      await updateDoc(doc(db, 'poderes', id), { anulado: true });
      await logAudit('ANULAR_PODER_DIR', 'poderes', id);
      renderPoder();
    },
  });
}

async function renderPoder() {
  const isDir = esDirectorio();
  if (!isDir) {
    initFirmaCanvas();
    syncPoderDoc();
    const snap = await getDocs(query(
      collection(db, 'poderes'),
      where('uid', '==', currentUser.uid),
      where('anulado', '==', false),
    ));
    cachePoderes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const mio = cachePoderes[0];
    const kpi = document.getElementById('poderEstadoKpi');
    const txt = document.getElementById('poderEstadoTxt');
    if (mio) {
      txt.textContent = 'Habilitado ✓'; kpi.className = 'kpi k-verde';
      document.getElementById('poderFormPanel').style.display = 'none';
      document.getElementById('poderEnviadoPanel').style.display = 'block';
      const img = mio.firmaUrl || mio.docUrl;
      const thumb = img
        ? '<img class="boleta-thumb" style="width:120px;height:60px;object-fit:contain;" src="' + esc(img) + '" onclick="verPoderImg(\'' + esc(mio.id) + '\')" alt="poder"/>' : '';
      document.getElementById('poderEnviadoDetalle').innerHTML =
        '<div class="ficha-grid">' +
        '<div class="ficha-item"><small>Nombre</small><span>' + esc(mio.nombre) + '</span></div>' +
        '<div class="ficha-item"><small>RUT</small><span>' + esc(mio.rut) + '</span></div>' +
        '<div class="ficha-item"><small>Cuota autorizada</small><span>' + fmt(mio.monto) + '</span></div>' +
        '<div class="ficha-item"><small>Fecha de envío</small><span>' + esc(fechaStr(mio.fecha)) + '</span></div>' +
        '<div class="ficha-item"><small>Modalidad</small><span>' + esc(mio.tipo) + '</span></div>' +
        '<div class="ficha-item"><small>Respaldo</small><span>' + (thumb || '—') + '</span></div></div>';
    } else {
      txt.textContent = 'Pendiente'; kpi.className = 'kpi k-rojo';
      document.getElementById('poderFormPanel').style.display = 'block';
      document.getElementById('poderEnviadoPanel').style.display = 'none';
      await prefillPoderSimple();
    }
  } else {
    // Directorio: cruce padrón vs poderes vigentes
    const [podSnap] = await Promise.all([
      getDocs(query(collection(db, 'poderes'), where('anulado', '==', false))),
      cachePadron.activos.length ? Promise.resolve() : fetchPadron(),
    ]);
    cachePoderes = podSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const porUid = {};
    cachePoderes.forEach(p => { porUid[p.uid] = p; });
    const socios = cachePadron.activos.filter(s => s.activo !== false && s.rol !== 'superadmin');
    let ok = 0;
    const rows = socios.map(s => {
      const p = porUid[s.id];
      if (p) ok++;
      const estado = p ? '<span class="chip chip-ok">✓ Habilitado</span>' : '<span class="chip chip-bad">Pendiente</span>';
      const img = p && (p.firmaUrl || p.docUrl);
      const resp = p
        ? (img ? '<img class="firma-thumb" src="' + esc(img) + '" onclick="verPoderImg(\'' + esc(p.id) + '\')" title="Ver respaldo" alt="firma"/>'
               : '<span class="chip chip-azul">' + esc(p.tipo) + '</span>')
        : '<span class="no-boleta">—</span>';
      const acc = p
        ? '<td class="no-print"><button class="btn-sm b-rojo" onclick="delPoder(\'' + esc(p.id) + '\')">✕</button></td>'
        : '<td class="no-print"></td>';
      return '<tr><td>' + esc(s.rut || '—') + '</td><td><strong>' + esc(s.nombre) + '</strong></td><td class="hide-mobile">' + esc(s.estamento || '—') + '</td>' +
        '<td>' + (p ? fmt(p.monto) : '—') + '</td><td>' + (p ? esc(fechaStr(p.fecha)) : '—') + '</td><td>' + estado + '</td><td>' + resp + '</td>' + acc + '</tr>';
    });
    document.getElementById('poderBody').innerHTML =
      rows.join('') || '<tr><td colspan="8" class="empty-msg">Sin registros.</td></tr>';
    const totalRef = Math.max(socios.length, 1);
    document.getElementById('kpiPoderOk').textContent = ok;
    document.getElementById('kpiPoderPend').textContent = Math.max(socios.length - ok, 0);
    document.getElementById('kpiPoderPct').textContent = Math.round(ok / totalRef * 100) + '%';
  }
}

async function exportPoderCSV() {
  const porUid = {};
  cachePoderes.forEach(p => { porUid[p.uid] = p; });
  const rows = [['RUT', 'Nombre', 'Estamento', 'Poder Simple', 'Cuota Autorizada CLP', 'Fecha', 'Modalidad']];
  cachePadron.activos.filter(s => s.rol !== 'superadmin').forEach(s => {
    const p = porUid[s.id];
    rows.push([s.rut, s.nombre, s.estamento || '', p ? 'HABILITADO' : 'PENDIENTE',
      p ? p.monto : '', p ? fechaStr(p.fecha) : '', p ? p.tipo : '']);
  });
  downloadCSV('AFUSAMUT_Poderes_Simples', rows);
  logAudit('EXPORT_PODERES_CSV');
}

/* ═══════════ ACTAS ═══════════ */
let actaFotoTemp = null;
let cacheActas = [];

function loadActaFoto(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  actaFotoTemp = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('actaFotoImg').src = e.target.result;
    document.getElementById('actaFotoPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}
function clearActaFoto(ev) {
  if (ev) ev.stopPropagation();
  actaFotoTemp = null;
  document.getElementById('ac-foto').value = '';
  document.getElementById('actaFotoPreview').style.display = 'none';
}

async function guardarActa() {
  const fecha  = document.getElementById('ac-fecha').value || hoy();
  const tipo   = document.getElementById('ac-tipo').value;
  const modal  = document.getElementById('ac-modal').value;
  const titulo = document.getElementById('ac-titulo').value.trim();
  const texto  = document.getElementById('ac-texto').value.trim();
  if (!titulo) { showToast('Agrega un título para el acta.', 'error'); return; }
  if (!texto && !actaFotoTemp) {
    showToast('Escribe el contenido del acta (Opción A) o adjunta la fotografía (Opción B).', 'error');
    return;
  }
  try {
    let fotoUrl = null;
    if (actaFotoTemp) {
      showToast('Subiendo documento…', 'warn');
      fotoUrl = await uploadImagen(actaFotoTemp, 'actas', 900);
    }
    const ref = await addDoc(collection(db, 'actas'), {
      fecha, tipo,
      modalidad:     modal,
      titulo,
      texto:         texto || null,
      fotoUrl,
      publicada:     !!texto,
      registradoPor: currentUser.uid,
      creadoEn:      serverTimestamp(),
    });
    await logAudit('CREAR_ACTA', 'actas', ref.id, { titulo, publicada: !!texto });
    document.getElementById('ac-titulo').value = '';
    document.getElementById('ac-texto').value = '';
    clearActaFoto();
    showToast('✅ Acta guardada correctamente.', 'ok');
    renderActas(); renderInicio();
  } catch (e) {
    captureError(e);
    showToast('No se pudo guardar el acta.', 'error');
  }
}

function delActa(id) {
  showConfirm({
    titulo: '¿Eliminar esta acta del registro?',
    desc: 'Esta acción no se puede deshacer.',
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      await deleteDoc(doc(db, 'actas', id));
      await logAudit('ELIMINAR_ACTA', 'actas', id);
      renderActas(); renderInicio();
    },
  });
}

function verActaFoto(id) {
  const a = cacheActas.find(x => x.id === id);
  if (!a || !a.fotoUrl) return;
  document.getElementById('lightboxImg').src = a.fotoUrl;
  document.getElementById('lightboxCap').textContent = a.tipo + ' · ' + fechaStr(a.fecha) + ' · ' + a.titulo;
  document.getElementById('lightbox').classList.add('open');
}

async function renderActas() {
  const isDir = esDirectorio();
  const q = isDir
    ? collection(db, 'actas')
    : query(collection(db, 'actas'), where('publicada', '==', true));
  const snap = await getDocs(q);
  cacheActas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => fechaStr(b.fecha).localeCompare(fechaStr(a.fecha)));

  const lista = isDir ? cacheActas : cacheActas.filter(a => a.publicada && a.texto);
  const html = lista.map(a => {
    const badgePub = a.publicada && a.texto
      ? '<span class="acta-publica">📢 Publicada a socios</span>'
      : '<span class="acta-solo-reg">📁 Solo registro interno</span>';
    const chipModal = '<span class="chip chip-azul">' + esc(a.modalidad) + '</span>';
    const accDir = isDir
      ? '<button class="btn-sm b-rojo no-print" onclick="delActa(\'' + esc(a.id) + '\')">✕ Eliminar</button>' : '';
    let cuerpo = '';
    if (a.texto) {
      cuerpo += '<div class="acta-body"><p>' + esc(a.texto) + '</p></div>';
    }
    if (a.fotoUrl) {
      const fotoTag = '<div class="acta-foto-wrap">' + (isDir || a.publicada
        ? '<img src="' + esc(a.fotoUrl) + '" onclick="verActaFoto(\'' + esc(a.id) + '\')" alt="Acta fotográfica" title="Ver acta original"/>'
        : '<span style="font-size:.72rem;color:var(--gris3);">Documento adjunto (solo directorio)</span>') + '</div>';
      if (!a.texto) cuerpo += '<div class="acta-body">' + fotoTag + '</div>';
      else cuerpo += '<div style="padding:0 16px 16px;"><small style="font-size:.68rem;color:var(--gris3);font-weight:700;display:block;margin-bottom:6px;">DOCUMENTO ORIGINAL:</small>' + fotoTag + '</div>';
    }
    return '<div class="acta-card">' +
      '<div class="acta-head">' +
        '<div><h5>' + esc(a.titulo) + '</h5><div class="acta-meta">' + esc(fechaStr(a.fecha)) + ' · ' + esc(a.tipo) + ' · Registrada el ' + esc(fechaStr(a.creadoEn)) + '</div></div>' +
        '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' + chipModal + badgePub + accDir + '</div>' +
      '</div>' + cuerpo + '</div>';
  }).join('');
  document.getElementById('actasList').innerHTML = html ||
    (isDir
      ? emptyState('📋', 'Sin actas registradas', 'Redacta o fotografía la primera acta con el formulario de arriba.')
      : emptyState('📋', 'Aún no hay actas publicadas', 'El Directorio publicará aquí las actas de asambleas y sesiones.'));
}

/* ═══════════ BUZÓN (in-app, sin email) ═══════════ */
async function addMensaje() {
  const msg     = document.getElementById('bz-msg').value.trim();
  const anonimo = document.getElementById('bz-anonimo')?.checked || false;
  if (!msg) { showToast('Escribe un mensaje.', 'error'); return; }

  await addDoc(collection(db, 'mensajes'), {
    autorUid: currentUser.uid,
    // Si es anónimo: nombre real NO se guarda para garantizar privacidad
    autorNombre: anonimo ? 'Anónimo/a' : currentUserData.nombre,
    anonimo,
    mensaje:        msg,
    respuesta:      null,
    respondidoPor:  null,
    fechaRespuesta: null,
    creadoEn:       serverTimestamp(),
  });
  await logAudit('ENVIAR_MENSAJE', 'mensajes', null, { anonimo });
  document.getElementById('bz-msg').value = '';
  const chk = document.getElementById('bz-anonimo');
  if (chk) chk.checked = false;
  showToast('Mensaje enviado al Directorio.', 'ok');
  renderBuzon(); renderInicio();
}

async function responder(id) {
  const ta = document.getElementById('resp-' + id);
  if (!ta || !ta.value.trim()) { showToast('Escribe la respuesta.', 'error'); return; }
  await updateDoc(doc(db, 'mensajes', id), {
    respuesta:      ta.value.trim(),
    respondidoPor:  currentUser.uid,
    fechaRespuesta: serverTimestamp(),
  });
  await logAudit('RESPONDER_MENSAJE', 'mensajes', id);
  renderBuzon(); renderInicio();
}

async function renderBuzon() {
  const esDir = esDirectorio();
  const q = esDir
    ? collection(db, 'mensajes')
    : query(collection(db, 'mensajes'), where('autorUid', '==', currentUser.uid));
  const snap = await getDocs(q);
  const mensajes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));

  const html = mensajes.map(b => {
    const fecha = b.creadoEn?.toDate?.()?.toLocaleDateString('es-CL') || '';
    // Recordatorios automáticos (cumpleaños): informativos, sin caja de respuesta
    if (b.esRecordatorio) {
      return `<div class="msg-card" style="border-left-color:var(--dorado);background:var(--dorado-wash);">
        <div class="msg-meta">${esc(b.autorNombre || 'RECORDATORIO').toUpperCase()} · ${esc(fecha)} <span class="chip chip-warn">🎂 Recordatorio</span></div>
        <div class="msg-body">${esc(b.mensaje)}</div>
      </div>`;
    }
    const resp = b.respuesta
      ? `<div class="msg-resp">
           <div class="msg-meta">RESPUESTA DEL DIRECTORIO · ${esc(b.fechaRespuesta?.toDate?.()?.toLocaleDateString('es-CL') || '')}</div>
           <div class="msg-body">${esc(b.respuesta)}</div>
         </div>`
      : esDir
        ? `<div class="no-print" style="margin-top:10px;">
             <textarea id="resp-${esc(b.id)}" rows="2" placeholder="Escribir respuesta oficial…"
               style="width:100%;padding:9px;border:1.5px solid var(--gris2);border-radius:9px;font-size:.76rem;font-family:inherit;"></textarea>
             <button class="btn-sm b-verde" style="margin-top:6px;" onclick="responder('${esc(b.id)}')">Responder</button>
           </div>`
        : `<p style="font-size:.66rem;color:var(--gris3);margin-top:8px;font-style:italic;">⏳ Pendiente de respuesta del directorio</p>`;
    return `<div class="msg-card">
      <div class="msg-meta">${esc(b.autorNombre || '').toUpperCase()} · ${fecha}</div>
      <div class="msg-body">${esc(b.mensaje)}</div>
      ${resp}
    </div>`;
  }).join('');

  document.getElementById('buzonList').innerHTML =
    html || emptyState('📭', 'El buzón está vacío', esDir
      ? 'Cuando un socio escriba una consulta, aparecerá aquí.'
      : 'Escribe tu primera consulta o propuesta al Directorio con el formulario de arriba.');

  // Mensajería del directorio (Tarea 4)
  if (esDir) cargarDestinatarios();
  else renderMensajesRecibidos();
}

/* ═══════════ RECORDATORIOS DE CUMPLEAÑOS AL DIRECTORIO (vía buzón) ═══════════ */
// Sin Cloud Functions, el recordatorio se genera desde el cliente: cuando un
// directivo abre el portal y hay cumpleaños en los próximos 3 días, se crea un
// mensaje en el buzón. ID determinístico cumple_{uid}_{año} = sin duplicados
// aunque entren varios directivos.
async function enviarRecordatoriosCumpleanos() {
  // Solo el rol REAL directorio/superadmin (no la vista "Ver como")
  if (!['directorio', 'superadmin'].includes(currentUserData?.rol)) return;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('activo', '==', true)));
    const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);

    for (const d of snap.docs) {
      const s = d.data();
      if (!s.cumpleanos) continue;
      const parts = String(s.cumpleanos).split('-');
      if (parts.length < 3) continue;
      const anio = hoy0.getFullYear();
      const fecha = new Date(anio, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const diff = Math.round((fecha - hoy0) / 86400000);
      if (diff < 0 || diff > 3) continue; // ventana: hoy a +3 días

      const refRecordatorio = doc(db, 'mensajes', `cumple_${d.id}_${anio}`);
      if ((await getDoc(refRecordatorio)).exists()) continue;

      const fechaTxt = parts[2] + '/' + parts[1];
      const texto = diff === 0
        ? `¡Hoy ${fechaTxt} está de cumpleaños ${s.nombre} (${s.estamento || 'socio/a'})! 🎉 No olviden saludarle a nombre de AFUSAMUT.`
        : `El ${fechaTxt} (en ${diff} día${diff > 1 ? 's' : ''}) está de cumpleaños ${s.nombre} (${s.estamento || 'socio/a'}). 🎈 Recordatorio para saludarle a nombre de AFUSAMUT.`;

      await setDoc(refRecordatorio, {
        autorUid: currentUser.uid,
        autorNombre: '🎂 Recordatorio automático',
        anonimo: false,
        esRecordatorio: true,
        mensaje: texto,
        respuesta: null,
        respondidoPor: null,
        fechaRespuesta: null,
        creadoEn: serverTimestamp(),
      });
    }
  } catch (e) { console.warn('recordatorios cumpleaños:', e.code || e.message); }
}

/* ═══════════ MENSAJERÍA DEL DIRECTORIO A SOCIOS (in-app, sin email) ═══════════ */
let cacheMensajesRecibidos = [];

async function cargarDestinatarios() {
  const select = document.getElementById('msgDestinatario');
  if (!select) return;
  // Limpiar opciones previas (conservar "Todos los socios")
  while (select.options.length > 1) select.remove(1);
  const snap = await getDocs(query(collection(db, 'users'), where('activo', '==', true)));
  snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.id !== currentUser.uid)
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    .forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.nombre} (${u.estamento || 'Socio'})`;
      select.appendChild(opt);
    });
}

async function enviarMensajeDirectorio() {
  const paraUid = document.getElementById('msgDestinatario').value;
  const asunto  = document.getElementById('msgAsunto').value.trim();
  const cuerpo  = document.getElementById('msgCuerpo').value.trim();

  if (!asunto || !cuerpo) {
    showToast('Completa asunto y mensaje.', 'error');
    return;
  }

  const btn = document.getElementById('btnEnviarMsgDir');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    if (paraUid === 'todos') {
      // Broadcast: una copia por cada socio activo (excepto quien envía)
      const socios = await getDocs(query(collection(db, 'users'), where('activo', '==', true)));
      const destinatarios = socios.docs.filter(d => d.id !== currentUser.uid);
      const batch = writeBatch(db);
      destinatarios.forEach(d => {
        const notifRef = doc(collection(db, 'mensajesDirectorio'));
        batch.set(notifRef, {
          deUid: currentUser.uid,
          deNombre: currentUserData.nombre,
          paraUid: d.id,
          paraNombre: d.data().nombre,
          asunto, mensaje: cuerpo, leido: false,
          esBroadcast: true,
          creadoEn: serverTimestamp(),
        });
      });
      await batch.commit();
      await logAudit('MENSAJE_BROADCAST', 'mensajesDirectorio', null,
        { asunto, destinatarios: destinatarios.length });
      showToast(`Mensaje enviado a ${destinatarios.length} socios`, 'ok');
    } else {
      // Individual
      const paraSnap = await getDoc(doc(db, 'users', paraUid));
      await addDoc(collection(db, 'mensajesDirectorio'), {
        deUid: currentUser.uid,
        deNombre: currentUserData.nombre,
        paraUid,
        paraNombre: paraSnap.data()?.nombre || '',
        asunto, mensaje: cuerpo, leido: false,
        esBroadcast: false,
        creadoEn: serverTimestamp(),
      });
      await logAudit('MENSAJE_INDIVIDUAL', 'mensajesDirectorio', paraUid, { asunto });
      showToast('Mensaje enviado', 'ok');
    }

    document.getElementById('msgAsunto').value = '';
    document.getElementById('msgCuerpo').value = '';
  } catch (err) {
    captureError(err);
    showToast('Error al enviar el mensaje.', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function renderMensajesRecibidos() {
  const cont = document.getElementById('mensajesRecibidosList');
  if (!cont || !currentUser) return;
  const snap = await getDocs(query(
    collection(db, 'mensajesDirectorio'),
    where('paraUid', '==', currentUser.uid),
  ));
  cacheMensajesRecibidos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));

  actualizarCampana(cacheMensajesRecibidos.filter(m => !m.leido).length);

  const html = cacheMensajesRecibidos.map(m => {
    const fecha = m.creadoEn?.toDate?.()?.toLocaleDateString('es-CL') || '';
    const noLeido = !m.leido ? ' <span class="chip chip-azul">Nuevo</span>' : '';
    return `
      <div class="msg-card ${!m.leido ? 'msg-nuevo' : ''}" ${!m.leido ? `onclick="marcarLeido('${esc(m.id)}')" title="Clic para marcar como leído"` : ''}>
        <div class="msg-meta">DE: ${esc(m.deNombre)} · ${esc(fecha)}${noLeido}</div>
        <div class="msg-asunto"><strong>${esc(m.asunto)}</strong></div>
        <div class="msg-body">${esc(m.mensaje)}</div>
      </div>`;
  }).join('');

  cont.innerHTML = html ||
    emptyState('📭', 'Sin mensajes del directorio', 'Cuando el Directorio te escriba, el mensaje aparecerá aquí.');
}

async function marcarLeido(id) {
  try {
    await updateDoc(doc(db, 'mensajesDirectorio', id), { leido: true });
  } catch (e) { console.warn('marcarLeido:', e.code); }
  renderMensajesRecibidos();
}

// Campana del header: vibra (3 ciclos) y muestra contador si hay no leídos
function actualizarCampana(noLeidos) {
  const bell = document.getElementById('bellIcon');
  const badge = document.getElementById('bellBadge');
  if (!bell || !badge) return;
  if (noLeidos > 0) {
    bell.classList.add('has-unread');
    badge.textContent = noLeidos > 9 ? '9+' : String(noLeidos);
    badge.style.display = '';
  } else {
    bell.classList.remove('has-unread');
    badge.style.display = 'none';
  }
}

/* ═══════════ NOTIFICACIONES ═══════════ */
const CAT_COLOR = { urgente: '#dc2626', asamblea: '#2563eb', administrativo: '#94a3b8', beneficio: '#d97706', bienestar: '#16a34a', informativo: '#64748b' };
const CAT_LABEL = { urgente: '🚨 URGENTE', asamblea: '🏛️ Asamblea', administrativo: '📋 Administrativo', beneficio: '🎁 Beneficio', bienestar: '💚 Bienestar', informativo: 'ℹ️ Informativo' };

async function publicarNotif(forceUrgente) {
  const cat    = forceUrgente || document.getElementById('nf-cat').value;
  const fecha  = document.getElementById('nf-fecha').value || hoy();
  const titulo = document.getElementById('nf-titulo').value.trim();
  const cuerpo = document.getElementById('nf-cuerpo').value.trim();
  if (!titulo || !cuerpo) { showToast('Completa título y contenido.', 'error'); return; }
  const ref = await addDoc(collection(db, 'notificaciones'), {
    fecha, cat, titulo, cuerpo,
    urgente: cat === 'urgente',
    creadoPor: currentUser.uid,
    creadoEn: serverTimestamp(),
  });
  await logAudit('PUBLICAR_NOTIFICACION', 'notificaciones', ref.id, { titulo });
  document.getElementById('nf-titulo').value = '';
  document.getElementById('nf-cuerpo').value = '';
  showToast('✅ Notificación publicada a todos los socios.', 'ok');
  renderNotificaciones(); renderInicio();
}

function delNotif(id) {
  showConfirm({
    titulo: '¿Eliminar esta notificación?',
    desc: 'Dejará de ser visible para los socios.',
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      await deleteDoc(doc(db, 'notificaciones', id));
      await logAudit('ELIMINAR_NOTIFICACION', 'notificaciones', id);
      renderNotificaciones(); renderInicio();
    },
  });
}

async function renderNotificaciones() {
  const esDir = esDirectorio();
  const snap = await getDocs(collection(db, 'notificaciones'));
  const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));

  const html = lista.length ? lista.map(n => {
    const acc = esDir
      ? '<button class="btn-sm b-rojo no-print" onclick="delNotif(\'' + esc(n.id) + '\')">✕</button>' : '';
    const urgBadge = n.urgente
      ? '<span style="background:#dc2626;color:#fff;font-size:.58rem;font-weight:900;padding:2px 7px;border-radius:999px;margin-left:6px;">URGENTE</span>' : '';
    return '<div class="notif-card ' + esc(n.cat) + '">' +
      '<div class="nf-head">' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;">' +
          '<span class="notif-cat" style="background:' + esc(CAT_COLOR[n.cat] || '#64748b') + '20;color:' + esc(CAT_COLOR[n.cat] || '#64748b') + ';">' + esc(CAT_LABEL[n.cat] || n.cat) + '</span>' +
          urgBadge +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;"><span class="nf-meta">' + esc(n.fecha) + '</span>' + acc + '</div>' +
      '</div>' +
      '<div class="nf-titulo">' + esc(n.titulo) + '</div>' +
      '<div class="nf-body" style="margin-top:6px;">' + esc(n.cuerpo) + '</div>' +
    '</div>';
  }).join('') : emptyState('🔔', 'Sin notificaciones publicadas', 'Los avisos y convocatorias del Directorio aparecerán aquí.');
  document.getElementById('notifList').innerHTML = html;

  // Preview en inicio (últimas 3)
  const prev = lista.slice(0, 3);
  const phtml = prev.length ? prev.map(n =>
    '<div class="notif-card ' + esc(n.cat) + '" style="margin-bottom:8px;">' +
      '<div class="nf-head"><span class="notif-cat" style="background:' + esc(CAT_COLOR[n.cat] || '#64748b') + '20;color:' + esc(CAT_COLOR[n.cat] || '#64748b') + ';">' + esc(CAT_LABEL[n.cat] || n.cat) + '</span><span class="nf-meta">' + esc(n.fecha) + '</span></div>' +
      '<div class="nf-titulo">' + esc(n.titulo) + '</div>' +
    '</div>'
  ).join('') : emptyState('🔔', 'Sin notificaciones aún', 'Las últimas novedades del gremio aparecerán aquí.');
  const pEl = document.getElementById('notifPreview');
  if (pEl) pEl.innerHTML = phtml;
}

/* ═══════════ CALENDARIO ═══════════ */
let CAL_YEAR  = new Date().getFullYear();
let CAL_MONTH = new Date().getMonth();
let cacheEventos = [];

const FERIADOS_FIJOS = {
  '01-01': 'Año Nuevo', '05-01': 'Día del Trabajo', '05-21': 'Día de las Glorias Navales',
  '06-29': 'San Pedro y San Pablo', '07-16': 'Virgen del Carmen', '08-15': 'Asunción de la Virgen',
  '09-18': 'Fiestas Patrias', '09-19': 'Día de las Glorias del Ejército', '10-12': 'Día del Encuentro de dos Mundos',
  '10-31': 'Día de las Iglesias Evangélicas', '11-01': 'Día de Todos los Santos', '12-08': 'Inmaculada Concepción', '12-25': 'Navidad',
};
const FERIADOS_VAR_2026 = { '04-03': 'Viernes Santo', '04-04': 'Sábado Santo', '04-05': 'Pascua de Resurrección' };

function esFeriado(y, m, d) {
  const key = String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  if (y === 2026 && FERIADOS_VAR_2026[key]) return FERIADOS_VAR_2026[key];
  return FERIADOS_FIJOS[key] || null;
}

function cumplesMes(y, m) {
  const res = [];
  cachePadron.activos.forEach(s => {
    if (!s.cumpleanos) return;
    const parts = String(s.cumpleanos).split('-');
    if (parseInt(parts[1], 10) - 1 === m) res.push({ dia: parseInt(parts[2], 10), nombre: s.nombre });
  });
  return res;
}

function eventosDia(y, m, d) {
  const dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  return cacheEventos.filter(e => e.fecha === dateStr);
}

// Cumpleaños del padrón en los próximos `dias` días, como pseudo-eventos
// para las listas de "Próximos eventos" (sin id: no se pueden eliminar).
function cumpleanosProximos(dias = 60) {
  const res = [];
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  cachePadron.activos.forEach(s => {
    if (!s.cumpleanos) return;
    const parts = String(s.cumpleanos).split('-');
    if (parts.length < 3) return;
    for (const y of [hoy0.getFullYear(), hoy0.getFullYear() + 1]) {
      const f = new Date(y, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const diff = (f - hoy0) / 86400000;
      if (diff >= 0 && diff <= dias) {
        res.push({
          id: null,
          fecha: y + '-' + parts[1] + '-' + parts[2],
          hora: '',
          tipo: 'cumpleaños',
          desc: '🎂 Cumpleaños de ' + s.nombre,
        });
      }
    }
  });
  return res;
}

const EV_COLOR = { asamblea: '#2563eb', directorio: '#0f5132', capacitacion: '#d97706', bienestar: '#16a34a', plazo: '#dc2626', otro: '#64748b' };

function cambiarMes(delta) {
  CAL_MONTH += delta;
  if (CAL_MONTH > 11) { CAL_MONTH = 0; CAL_YEAR++; }
  if (CAL_MONTH < 0) { CAL_MONTH = 11; CAL_YEAR--; }
  renderCalendarioGrid();
}

async function agregarEvento() {
  const fecha = document.getElementById('ev-fecha').value;
  const hora  = document.getElementById('ev-hora').value;
  const tipo  = document.getElementById('ev-tipo').value;
  const desc  = document.getElementById('ev-desc').value.trim();
  if (!fecha || !desc) { showToast('Fecha y descripción son obligatorias.', 'error'); return; }
  const ref = await addDoc(collection(db, 'eventos'), {
    fecha, hora, tipo, desc,
    creadoPor: currentUser.uid,
    creadoEn: serverTimestamp(),
  });
  await logAudit('CREAR_EVENTO', 'eventos', ref.id, { fecha, desc });
  document.getElementById('ev-desc').value = '';
  document.getElementById('ev-hora').value = '';
  showToast('Evento agregado al calendario.', 'ok');
  await fetchEventos();
  renderCalendarioGrid();
}

function delEvento(id) {
  showConfirm({
    titulo: '¿Eliminar este evento?',
    desc: 'Dejará de aparecer en el calendario gremial.',
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      await deleteDoc(doc(db, 'eventos', id));
      await logAudit('ELIMINAR_EVENTO', 'eventos', id);
      await fetchEventos();
      renderCalendarioGrid();
    },
  });
}

function showDayDetail(y, m, d) {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  document.getElementById('calDayTitle').textContent = d + ' de ' + meses[m] + ' ' + y;
  const items = [];
  const fer = esFeriado(y, m, d);
  if (fer) items.push('<div class="cal-day-detail-item"><div class="cal-ev-badge" style="background:#dc2626;"></div><div><strong style="font-size:.8rem;">Feriado nacional:</strong><br><span style="font-size:.76rem;">' + esc(fer) + '</span></div></div>');
  cumplesMes(y, m).filter(c => c.dia === d).forEach(c => {
    items.push('<div class="cal-day-detail-item"><div class="cal-ev-badge" style="background:' + EV_COLOR.bienestar + ';"></div><div><strong style="font-size:.8rem;">🎂 Cumpleaños:</strong><br><span style="font-size:.76rem;">' + esc(c.nombre) + '</span></div></div>');
  });
  eventosDia(y, m, d).forEach(e => {
    const acc = esDirectorio()
      ? ' <button class="btn-sm b-rojo no-print" style="margin-left:6px;" onclick="delEvento(\'' + esc(e.id) + '\')">✕</button>' : '';
    items.push('<div class="cal-day-detail-item"><div class="cal-ev-badge" style="background:' + (EV_COLOR[e.tipo] || EV_COLOR.otro) + ';"></div><div><strong style="font-size:.8rem;">' + (e.hora ? e.hora + ' — ' : '') + esc(e.desc) + '</strong>' + acc + '</div></div>');
  });
  document.getElementById('calDayItems').innerHTML =
    items.join('') || '<p style="font-size:.76rem;color:var(--gris3);">Sin eventos este día.</p>';
  document.getElementById('calDayDetail').style.display = 'block';
}

async function fetchEventos() {
  const snap = await getDocs(collection(db, 'eventos'));
  cacheEventos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderCalendarioGrid() {
  const y = CAL_YEAR, m = CAL_MONTH;
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  document.getElementById('calMesLabel').textContent = meses[m] + ' ' + y;
  const dows = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date(); const td = today.getDate(), tm = today.getMonth(), ty = today.getFullYear();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const cumples = cumplesMes(y, m);
  let html = '<div class="cal-grid">';
  dows.forEach(d => { html += '<div class="cal-dow">' + d + '</div>'; });
  for (let i = 0; i < firstDay; i++) {
    const pd = daysInPrev - firstDay + 1 + i;
    html += '<div class="cal-day other-month"><span class="cal-dn">' + pd + '</span></div>';
  }
  for (let d2 = 1; d2 <= daysInMonth; d2++) {
    const isToday = d2 === td && m === tm && y === ty;
    const fer = esFeriado(y, m, d2);
    const evs = eventosDia(y, m, d2);
    const cups = cumples.filter(c => c.dia === d2);
    const cls = 'cal-day' + (isToday ? ' today' : '') + (fer ? ' has-feriado' : '');
    let dots = '';
    if (fer) dots += '<div class="cal-ev-dot" style="background:#dc2626;" title="' + esc(fer) + '"></div>';
    cups.forEach(() => { dots += '<div class="cal-ev-dot" style="background:var(--dorado);" title="Cumpleaños"></div>'; });
    evs.forEach(e => { dots += '<div class="cal-ev-dot" style="background:' + (EV_COLOR[e.tipo] || EV_COLOR.otro) + ';"></div>'; });
    html += '<div class="' + cls + '" onclick="showDayDetail(' + y + ',' + m + ',' + d2 + ')">' +
      '<span class="cal-dn">' + d2 + '</span>' +
      (dots ? '<div class="cal-dots">' + dots + '</div>' : '') +
    '</div>';
  }
  const total = firstDay + daysInMonth; const rem = (7 - total % 7) % 7;
  for (let i2 = 1; i2 <= rem; i2++) html += '<div class="cal-day other-month"><span class="cal-dn">' + i2 + '</span></div>';
  html += '</div>';
  document.getElementById('calGrid').innerHTML = html;

  // Próximos eventos (desde hoy) — incluye los cumpleaños del padrón
  const meses3 = meses;
  const todayStr = ty + '-' + String(tm + 1).padStart(2, '0') + '-' + String(td).padStart(2, '0');
  const prox = [...cacheEventos.filter(e => e.fecha >= todayStr), ...cumpleanosProximos(60)]
    .sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);
  const phtml = prox.length ? prox.map(e => {
    const parts = e.fecha.split('-');
    const acc = (esDirectorio() && e.id)
      ? '<button class="btn-sm b-rojo no-print" onclick="delEvento(\'' + esc(e.id) + '\')" style="margin-top:4px;">✕ Eliminar</button>' : '';
    return '<div class="cal-prox-item"><div class="cal-prox-date"><strong>' + parts[2] + '</strong><span>' + meses3[parseInt(parts[1], 10) - 1].slice(0, 3) + '</span></div><div class="cal-prox-info"><p>' + (e.hora ? e.hora + ' · ' : '') + esc(e.desc) + '</p><small>' + esc(e.tipo) + '</small>' + acc + '</div></div>';
  }).join('') : emptyState('📅', 'Sin eventos próximos', 'Las asambleas, plazos y actividades del gremio aparecerán aquí.');
  document.getElementById('calProximosList').innerHTML = phtml;

  // próximos en inicio
  const pEl = document.getElementById('proximosEventos');
  if (pEl) pEl.innerHTML = prox.slice(0, 3).length ? prox.slice(0, 3).map(e => {
    const parts = e.fecha.split('-');
    return '<div class="cal-prox-item"><div class="cal-prox-date"><strong>' + parts[2] + '</strong><span>' + meses3[parseInt(parts[1], 10) - 1].slice(0, 3) + '</span></div><div class="cal-prox-info"><p>' + esc(e.desc) + '</p><small>' + esc(e.tipo) + '</small></div></div>';
  }).join('') : emptyState('📅', 'Sin eventos próximos', 'Tu calendario gremial está despejado por ahora.');
}

async function renderCalendario() {
  await fetchEventos();
  if (!cachePadron.activos.length) {
    try { await fetchPadron(); } catch (e) { console.warn('padron para cumpleaños:', e.code); }
  }
  renderCalendarioGrid();
}

/* ═══════════ ESTATUTOS (texto estático visado) ═══════════ */
const ESTATUTOS = [
  { titulo: 'TÍTULO I — FINALIDADES Y PRINCIPIOS', arts: [
    { n: 'Art. 1°', t: 'Denominación y domicilio', txt: 'Asociación de Funcionarios SAMU Talcahuano (AFUSAMUT), con domicilio en la comuna de Talcahuano, jurisdicción en Talcahuano, Hualpén, Penco y Tomé, Región del Biobío. Constituida el 9 de abril de 2026.' },
    { n: 'Art. 2°', t: 'Objeto y finalidades', txt: 'Promover el mejoramiento económico y condiciones de vida de los afiliados; procurar perfeccionamiento material y espiritual; recabar información sobre planes y resoluciones del servicio; representar a los funcionarios ante organismos competentes; realizar acciones de bienestar, capacitación y formación gremial; prestar asistencia técnica a socios y sus familias; constituirse en mutualidades y fondos; velar por políticas sin fines de lucro bajo la Ley 19.296. (letras a–n)' },
    { n: 'Art. 2° l)', t: 'Principios rectores', txt: 'Democracia interna, participación, transparencia, probidad, no discriminación, respeto interprofesional, protección de derechos laborales, seguridad del trabajador sanitario, salud mental laboral y fortalecimiento del sistema prehospitalario.' },
  ]},
  { titulo: 'TÍTULO II — DE LAS ASAMBLEAS', arts: [
    { n: 'Art. 3°', t: 'Órgano resolutivo superior', txt: 'La asamblea constituye el órgano resolutivo superior. Habrá asambleas ordinarias y extraordinarias. Quórum: 40% de socios en primera citación; en segunda, los que asistan. Acuerdos por mayoría simple de asistentes.' },
    { n: 'Art. 4°', t: 'Citaciones', txt: 'Por carteles colocados con 3 días de anticipación en lugares de trabajo y/o sede, con indicación del día, hora, materia y local. Deben publicarse también en medios digitales de la asociación. Pueden realizarse telemáticamente cuando el caso lo amerite.' },
    { n: 'Art. 5°', t: 'Asambleas ordinarias', txt: 'Se reunirán al menos 1 vez cada 4 meses (cuatrimestralmente) para resolver los asuntos que estime conveniente para la mejor marcha de la institución.' },
    { n: 'Art. 6°', t: 'Asambleas extraordinarias', txt: 'Cada vez que lo exijan las necesidades de la organización, citadas por el presidente, el directorio, o el 10% de los afiliados. Solo pueden tomarse acuerdos relacionados con las materias de la convocatoria.' },
  ]},
  { titulo: 'TÍTULO III — DEL DIRECTORIO', arts: [
    { n: 'Art. 7°', t: 'Representación', txt: 'El directorio representa judicial y extrajudicialmente a la asociación. Al presidente le aplica el Art. 8° del Código de Procedimiento Civil. En ningún caso el presidente puede arrogarse esta representación en forma exclusiva.' },
    { n: 'Art. 8°', t: 'Composición', txt: 'Compuesto por el número de directores que establece el Art. 17 de la Ley N° 19.296 según el número de afiliados vigente a cada elección. Permanecen 2 años en sus cargos; pueden ser reelegidos.' },
    { n: 'Art. 9°', t: 'Postulaciones', txt: 'Por escrito en duplicado al Secretario, no antes de 20 días ni después de 5 días anteriores a la elección. El dirigente estampará la fecha de recepción y entregará copia al interesado.' },
    { n: 'Art. 10°', t: 'Requisitos para ser director', txt: 'a) No haber sido condenado por crimen o simple delito que merezca pena aflictiva; b) Antigüedad mínima de 6 meses como socio; c) No haber participado en hechos que originaron censura del directorio del que haya formado parte; d) Estar en calificación de desempeño Lista 1 o 2 en los últimos 2 años.' },
    { n: 'Art. 11°', t: 'Elección', txt: 'Resultan elegidos quienes obtengan las más altas mayorías relativas. En caso de empate, preferencia por antigüedad como socio; si persiste, por sorteo ante ministro de fe.' },
    { n: 'Art. 14°', t: 'Reuniones del directorio', txt: 'Al menos una vez cada 4 meses ordinariamente. Citaciones por escrito, personales, con 3 días hábiles de anticipación. Los acuerdos requieren mayoría absoluta de sus integrantes.' },
    { n: 'Art. 15°', t: 'Presupuesto anual', txt: 'El directorio confeccionará anualmente un proyecto de presupuesto (gastos administrativos, viáticos, servicios a socios, capacitación, inversiones e imprevistos) y lo presentará a la asamblea dentro de los primeros 90 días de cada año. Viáticos no pueden exceder 4 UTM; imprevistos, 1 UTM.' },
  ]},
  { titulo: 'TÍTULO IV — DEL PRESIDENTE, SECRETARIO Y TESORERO', arts: [
    { n: 'Art. 18°', t: 'Facultades del Presidente', txt: 'Ordenar la convocatoria a asamblea y directorio; presidir sesiones; firmar actas y documentos; clausurar debates; dar cuenta verbal de la labor del directorio en cada asamblea ordinaria y del informe anual.' },
    { n: 'Art. 20°', t: 'Obligaciones del Secretario', txt: 'Redactar y leer las actas para su aprobación; recibir y despachar correspondencia; llevar al día los libros de actas y el Registro de Socios (nombre, domicilio, fecha de ingreso, firma, RUT); hacer las citaciones que disponga el Presidente.' },
    { n: 'Art. 21°', t: 'Obligaciones del Tesorero', txt: 'Custodiar fondos y bienes de la organización; recaudar cuotas otorgando recibo numerado correlativamente; llevar libro de ingresos/egresos e inventario; confeccionar estado de caja mensual firmado por Presidente y Tesorero; depositar fondos en cuenta corriente o de ahorro a nombre de la asociación; máximo 1 UTM en caja.' },
  ]},
  { titulo: 'TÍTULO V — DEL DIRECTORIO REGIONAL O PROVINCIAL', arts: [
    { n: 'Arts. 23°–28°', t: 'Directorio regional o provincial', txt: 'Procede cuando exista asociación nacional constituida. Estará compuesto según la ley vigente. Los directores duran 2 años y gozan de fuero. Tendrán permiso básico de 11 horas semanales y los adicionales que contemple la ley.' },
  ]},
  { titulo: 'TÍTULO VI — DE LOS SOCIOS', arts: [
    { n: 'Art. 29°', t: 'Requisito de afiliación', txt: 'Podrán pertenecer los funcionarios del Servicio de Salud de Talcahuano que desempeñen funciones en el Servicio de Atención Médica de Urgencia (SAMU) y que cumplan los requisitos estatutarios. Solicitud escrita ante cualquier miembro del directorio.' },
    { n: 'Art. 30°', t: 'Derechos de los socios', txt: 'a) Votar y ser votado para cargos; b) Exponer y defender libremente sus ideas en asambleas; c) Recibir apoyo de la directiva en la protección de sus derechos funcionarios; d) Percibir los beneficios sociales de la asociación.' },
    { n: 'Art. 31°', t: 'Obligaciones de los socios', txt: 'a) Conocer y respetar los estatutos; b) Concurrir a sesiones y cooperar con la asociación; c) Pagar cuota mensual (entre 7,2% y 25% de 1 UTM, aprobada cada año por mayoría simple); d) Firmar el Registro de Socios y avisar cambios de domicilio o datos personales.' },
    { n: 'Art. 33°', t: 'Pérdida de calidad de socio', txt: 'a) Por desafiliación voluntaria comunicada por escrito al directorio; b) Por fallecimiento; c) Cuando deje de trabajar en el Servicio de Salud de Talcahuano; d) Por acuerdo de expulsión en asamblea; e) Por no pagar cuotas ordinarias durante más de 6 meses continuos.' },
  ]},
  { titulo: 'TÍTULO VII — DE LAS COMISIONES', arts: [
    { n: 'Art. 34°', t: 'Comisión Revisora de Cuentas', txt: 'Se designa en la primera asamblea ordinaria posterior a la elección de directorio. Compuesta por 3 socios no directores. Facultades: comprobar que gastos e inversiones se ajusten al presupuesto; fiscalizar el correcto ingreso y la inversión de fondos; velar por los libros de ingreso/egreso e inventario. Dura 2 años, independiente del directorio.' },
    { n: 'Art. 35°', t: 'Órgano Calificador de Votaciones', txt: 'Para cada proceso eleccionario o votación se constituye un órgano de 3 socios elegidos por mayoría simple en asamblea extraordinaria. Lleva a efecto la votación, efectúa el escrutinio y levanta acta del proceso.' },
  ]},
  { titulo: 'TÍTULO VIII — DEL PATRIMONIO', arts: [
    { n: 'Art. 37°', t: 'Composición del patrimonio', txt: 'Cuotas de los socios; erogaciones voluntarias; bienes muebles e inmuebles adquiridos; productos de bienes y actividades comerciales; multas aplicadas conforme al estatuto.' },
    { n: 'Art. 41°', t: 'Manejo de fondos', txt: 'Depositados en cuenta corriente o de ahorro a nombre de la asociación. Los fondos girarán conjuntamente por el Presidente y el Tesorero, quienes son solidariamente responsables. También puede girar el Secretario y el miembro más antiguo, con acuerdo unánime del directorio.' },
    { n: 'Art. 42°', t: 'Libros contables', txt: 'La asociación llevará un libro de ingresos/egresos y uno de inventario. No está obligada a confeccionar balance, sin perjuicio de las funciones de la Comisión Revisora de Cuentas.' },
    { n: 'Art. 43°', t: 'Acceso a libros', txt: 'Los libros de actas y contabilidad deberán llevarse permanentemente al día. Todos los afiliados y la Dirección del Trabajo tendrán acceso a ellos; la DT tiene la más amplia facultad inspectiva, de oficio o a petición de parte.' },
  ]},
  { titulo: 'TÍTULO IX — DE LAS CENSURAS', arts: [
    { n: 'Art. 44°', t: 'Censura al directorio', txt: 'Puede ser solicitada por al menos el 20% del total de socios, con cargos fundados y concretos. El órgano calificador tiene 10 días para llevar a efecto la votación de censura. Debe realizarse con presencia de Ministro de Fe.' },
    { n: 'Art. 46°', t: 'Votación de censura', txt: 'Secreta, ante ministro de fe. Se aprueba por mayoría absoluta de los socios con derecho a voto y antigüedad mínima de 90 días en la organización. Si se aprueba, el directorio cesa de inmediato y se procede a nueva elección.' },
  ]},
  { titulo: 'TÍTULO X — RÉGIMEN DISCIPLINARIO', arts: [
    { n: 'Art. 49°', t: 'Medidas disciplinarias', txt: 'a) Multa no superior a 2 cuotas ordinarias (primera vez) o 5 cuotas en reincidencia; b) Suspensión de beneficios sociales por 1 año; c) Expulsión de la asociación.' },
    { n: 'Art. 51°', t: 'Mora en cuotas', txt: 'El socio con 2 o más cuotas atrasadas sin justificación dejará automáticamente de percibir beneficios sociales. Recupera el derecho al pagar íntegramente. Saldar la deuda no otorga beneficios con efecto retroactivo.' },
    { n: 'Art. 52°', t: 'Expulsión', txt: 'Medida extrema aprobada por mayoría absoluta de socios. El expulsado siempre tiene derecho a defenderse. No puede solicitar reingreso sino después de 1 año. Se aplica también a directores por notable abandono de funciones.' },
  ]},
  { titulo: 'TÍTULO XI — REFORMA DE ESTATUTOS', arts: [
    { n: 'Art. 53°', t: 'Reforma estatutaria', txt: 'Debe acordarse por mayoría absoluta de los afiliados al día en cuotas, en asamblea extraordinaria citada especialmente, con votación secreta y unipersonal ante ministro de fe. El directorio debe depositar el acta en la Inspección del Trabajo dentro de 15 días.' },
  ]},
  { titulo: 'TÍTULO XII — DISOLUCIÓN', arts: [
    { n: 'Art. 56°', t: 'Causales de disolución', txt: 'a) Mayoría absoluta de afiliados en asamblea; b) Incumplimiento grave de disposiciones legales; c) Disminución de socios bajo el mínimo legal por 6 meses; d) Receso superior a 1 año; e) Supresión del servicio al que pertenecen los socios.' },
    { n: 'Art. 59°', t: 'Destino de los bienes', txt: 'En caso de disolución, todos los fondos, bienes y útiles serán traspasados al Departamento SAMU dependiente de la Dirección del Servicio de Salud de Talcahuano. La asociación tendrá duración indefinida mientras no se disuelva conforme a la ley.' },
  ]},
];

function renderEstatutos() {
  const html = ESTATUTOS.map((bloque, bi) => {
    const arts = bloque.arts.map(a =>
      '<div class="art-card"><div class="art-badge">' + esc(a.n) + '</div><h4>' + esc(a.t) + '</h4><p style="font-size:.76rem;color:var(--gris3);line-height:1.6;">' + esc(a.txt) + '</p></div>'
    ).join('');
    const open = bi === 0;
    return '<div class="est-bloque">' +
      '<div class="est-bloque-head" onclick="toggleBloque(' + bi + ')" id="eb-head-' + bi + '">' +
        '<span>' + esc(bloque.titulo) + '</span>' +
        '<span class="eb-arrow" id="eb-arr-' + bi + '">' + (open ? '▲' : '▼') + '</span>' +
      '</div>' +
      '<div class="est-bloque-body" id="eb-body-' + bi + '" style="display:' + (open ? 'block' : 'none') + ';">' +
        arts +
      '</div>' +
    '</div>';
  }).join('');
  document.getElementById('estatutosAccordion').innerHTML = html;
}
function toggleBloque(i) {
  const body = document.getElementById('eb-body-' + i);
  const arr = document.getElementById('eb-arr-' + i);
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  arr.textContent = open ? '▼' : '▲';
}

/* ═══════════ BENEFICIOS (desde Firestore) ═══════════ */
let cacheBeneficios = [];

async function renderBeneficios() {
  const isDir = esDirectorio();
  const snap = await getDocs(collection(db, 'beneficios'));
  cacheBeneficios = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));

  const activos   = cacheBeneficios.filter(b => b.activo !== false);
  const inactivos = cacheBeneficios.filter(b => b.activo === false);

  function tarjeta(b, mostrarAdmin) {
    const detalleBtn = b.detalle
      ? '<button class="btn-sm b-azul no-print" style="margin-top:10px;" onclick="verDetalleBeneficio(\'' + esc(b.id) + '\')">Ver detalle del convenio →</button>'
      : '';
    const adminBtns = mostrarAdmin
      ? '<div class="no-print" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">' +
          '<button class="btn-sm b-azul" onclick="editarBeneficio(\'' + esc(b.id) + '\')">✏️ Editar</button>' +
          '<button class="btn-sm ' + (b.activo === false ? 'b-verde' : 'b-rojo') + '" onclick="toggleBeneficio(\'' + esc(b.id) + '\',' + (b.activo === false ? 'false' : 'true') + ')">' +
            (b.activo === false ? '↺ Reactivar' : '✕ Desactivar') + '</button>' +
        '</div>'
      : '';
    return '<div class="card" style="border-top:3px solid ' + esc(b.colorAcento || 'var(--dorado)') + ';">' +
      '<div class="card-icon" style="background:var(--gris1);">' + esc(b.icono || '🎁') + '</div>' +
      '<h3>' + esc(b.titulo) + '</h3>' +
      '<p>' + esc(b.descripcion) + '</p>' +
      '<p style="margin-top:8px;font-size:.72rem;color:#1f2937;font-weight:700;">Código: <strong>' + esc(b.codigo) + '</strong></p>' +
      detalleBtn + adminBtns +
    '</div>';
  }

  const gridActivos = activos.map(b => tarjeta(b, isDir)).join('');
  let htmlInactivos = '';
  if (isDir && inactivos.length > 0) {
    htmlInactivos =
      '<details style="margin-top:18px;" class="no-print">' +
      '<summary style="cursor:pointer;font-size:.78rem;color:var(--gris3);font-weight:600;user-select:none;">' +
        'Convenios archivados (' + inactivos.length + ')</summary>' +
      '<div style="display:grid;gap:14px;margin-top:12px;opacity:.55;">' +
        inactivos.map(b => tarjeta(b, true)).join('') +
      '</div></details>';
  }

  document.getElementById('beneficiosGrid').innerHTML =
    (gridActivos || emptyState('🎁', 'Sin convenios vigentes', 'Los beneficios y alianzas para socios aparecerán aquí.')) +
    htmlInactivos;
}

// Modal de detalle del convenio (beneficiarios, prestaciones, garantías, contacto)
function verDetalleBeneficio(id) {
  const b = cacheBeneficios.find(x => x.id === id);
  if (!b || !b.detalle) return;
  const d = b.detalle;

  const beneficiarios = (d.beneficiarios || []).length
    ? '<div class="detalle-seccion"><h5>👥 Beneficiarios</h5><ul>' +
      d.beneficiarios.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '';
  const prestaciones = (d.prestaciones || []).length
    ? '<div class="detalle-seccion"><h5>✨ Prestaciones</h5>' +
      d.prestaciones.map(p =>
        '<div class="detalle-prestacion"><strong>' + esc(p.item) + '</strong><span>' + esc(p.desc) + '</span></div>'
      ).join('') + '</div>' : '';
  const garantias = (d.garantias || []).length
    ? '<div class="detalle-seccion"><h5>🛡️ Garantías</h5><ul>' +
      d.garantias.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '';
  const contacto = d.contacto
    ? '<div class="detalle-seccion"><h5>📞 Contacto</h5><div class="detalle-contacto">' +
      (d.contacto.representante ? '<strong>' + esc(d.contacto.representante) + '</strong><br>' : '') +
      (d.contacto.direccion ? esc(d.contacto.direccion) + '<br>' : '') +
      (d.contacto.celular ? '☎ ' + esc(d.contacto.celular) : '') +
      '</div></div>' : '';
  const vigencia = d.vigencia
    ? '<div class="detalle-seccion"><h5>📅 Vigencia</h5><p style="font-size:.78rem;color:var(--gris3);">' + esc(d.vigencia) + '</p></div>' : '';

  const overlay = document.createElement('div');
  overlay.className = 'app-modal-overlay';
  overlay.innerHTML = `
    <div class="app-modal wide">
      <h4 style="margin-bottom:4px;">${esc(b.icono || '🎁')} ${esc(b.titulo)}</h4>
      <p class="am-desc" style="margin-bottom:16px;">Código convenio: <strong>${esc(b.codigo)}</strong></p>
      ${beneficiarios}${prestaciones}${garantias}${contacto}${vigencia}
      <div class="am-btns">
        <button class="am-confirm">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.am-confirm').onclick = () => overlay.remove();
}

// Gestión de convenios por el directorio (no depende de sembrado manual)
async function nuevoBeneficio() {
  const titulo = document.getElementById('bf-titulo').value.trim();
  const codigo = document.getElementById('bf-codigo').value.trim();
  const desc   = document.getElementById('bf-desc').value.trim();
  if (!titulo || !codigo || !desc) {
    showToast('Completa título, código y descripción.', 'error');
    return;
  }
  const ref = await addDoc(collection(db, 'beneficios'), {
    titulo,
    codigo,
    descripcion: desc,
    icono:       document.getElementById('bf-icono').value.trim() || '🎁',
    colorAcento: document.getElementById('bf-color').value || '#0F5132',
    activo:      true,
    creadoEn:    serverTimestamp(),
  });
  await logAudit('CREAR_BENEFICIO', 'beneficios', ref.id, { titulo, codigo });
  ['bf-titulo', 'bf-codigo', 'bf-icono', 'bf-desc'].forEach(id => { document.getElementById(id).value = ''; });
  showToast('Convenio publicado.', 'ok');
  renderBeneficios();
}

function editarBeneficio(id) {
  const b = cacheBeneficios.find(x => x.id === id);
  if (!b) return;
  showModal({
    titulo: 'Editar convenio',
    body: `
      <label>Título</label>
      <input id="eb-titulo" value="${esc(b.titulo)}"/>
      <label style="margin-top:10px;">Código</label>
      <input id="eb-codigo" value="${esc(b.codigo)}"/>
      <label style="margin-top:10px;">Ícono (emoji)</label>
      <input id="eb-icono" value="${esc(b.icono || '')}" maxlength="4"/>
      <label style="margin-top:10px;">Descripción</label>
      <textarea id="eb-desc" rows="3">${esc(b.descripcion)}</textarea>
    `,
    confirmText: 'Guardar cambios',
    onConfirm: () => {
      const titulo = document.getElementById('eb-titulo').value.trim();
      const codigo = document.getElementById('eb-codigo').value.trim();
      const desc   = document.getElementById('eb-desc').value.trim();
      const icono  = document.getElementById('eb-icono').value.trim() || '🎁';
      if (!titulo || !codigo || !desc) {
        showToast('Completa título, código y descripción.', 'error');
        return false;
      }
      (async () => {
        await updateDoc(doc(db, 'beneficios', id), {
          titulo, codigo,
          descripcion: desc,
          icono,
        });
        await logAudit('EDITAR_BENEFICIO', 'beneficios', id, { titulo });
        showToast('Convenio actualizado.', 'ok');
        renderBeneficios();
      })();
    },
  });
}

function toggleBeneficio(id, estaActivo) {
  showConfirm({
    titulo: estaActivo ? '¿Desactivar este convenio?' : '¿Reactivar este convenio?',
    desc: estaActivo
      ? 'Dejará de mostrarse a los socios. Podrás reactivarlo cuando quieras.'
      : 'Volverá a mostrarse en el Club de Beneficios.',
    confirmText: 'Confirmar',
    danger: estaActivo,
    onConfirm: async () => {
      await updateDoc(doc(db, 'beneficios', id), { activo: !estaActivo });
      await logAudit(estaActivo ? 'DESACTIVAR_BENEFICIO' : 'ACTIVAR_BENEFICIO', 'beneficios', id);
      renderBeneficios();
    },
  });
}

/* ═══════════ ADMIN (solo superadmin) ═══════════ */
// Rol REAL (ignora la vista "Ver como") — para decidir acciones con permisos reales
function isSuperadminActual() {
  return currentUserData?.rol === 'superadmin'
    && currentUserData?.email?.endsWith('@micorriza.bio');
}

/* ── Gestión de roles: prerrogativa exclusiva del superadmin ── */
// Cargos del directorio (Ley 19.296). "Otro…" permite ingresar cargos personalizados.
const CARGOS_DIRECTORIO = ['Presidente', 'Vicepresidente', 'Secretario/a', 'Tesorero/a', 'Director/a'];

function selectorCargoHTML(seleccionado = '') {
  const esOtro = seleccionado && !CARGOS_DIRECTORIO.includes(seleccionado);
  const opciones = CARGOS_DIRECTORIO.map(c =>
    '<option value="' + esc(c) + '"' + (c === seleccionado ? ' selected' : '') + '>' + esc(c) + '</option>'
  ).join('');
  return `
    <label style="margin-top:10px;">Cargo</label>
    <select id="modalCargo" style="width:100%;padding:9px;border:1.5px solid var(--gris2);border-radius:10px;font-size:.82rem;margin-top:6px;"
      onchange="document.getElementById('modalCargoOtro').style.display = this.value === '__otro' ? 'block' : 'none'">
      <option value=""${!seleccionado ? ' selected' : ''}>— Sin cargo específico —</option>
      ${opciones}
      <option value="__otro"${esOtro ? ' selected' : ''}>➕ Otro…</option>
    </select>
    <input id="modalCargoOtro" placeholder="Nombre del cargo (ej: Delegado/a de Bienestar)"
      value="${esOtro ? esc(seleccionado) : ''}"
      style="display:${esOtro ? 'block' : 'none'};width:100%;padding:9px;border:1.5px solid var(--gris2);border-radius:10px;font-size:.82rem;margin-top:8px;"/>
  `;
}

function leerCargoDelModal() {
  const sel = document.getElementById('modalCargo').value;
  if (sel === '__otro') return document.getElementById('modalCargoOtro').value.trim();
  return sel;
}

async function renderGestionRoles() {
  const cont = document.getElementById('adminsBody');
  if (!cont || !isSuperadminActual()) return;

  const [snap, pendSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('rol', 'in', ['directorio', 'superadmin']))),
    getDocs(collection(db, 'padronPendiente')),
  ]);
  const admins = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  // Pre-inscritos con rol directorio pre-asignado (entrarán así al vincularse)
  const preasignados = pendSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.rolAsignado === 'directorio')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  const filasAdmins = admins.map(u => {
    const esSuper = u.rol === 'superadmin';
    const cargo = u.cargo
      ? '<span class="chip chip-azul">' + esc(u.cargo) + '</span>'
      : '<span style="font-size:.72rem;color:var(--gris3);">—</span>';
    const accion =
      '<button class="btn-sm b-azul" onclick="editarCargo(\'' + esc(u.id) + '\')" title="Asignar o cambiar cargo">🎖️ Cargo</button>' +
      (!esSuper
        ? ' <button class="btn-sm b-rojo" onclick="degradarAsocio(\'' + esc(u.id) + '\', \'' + esc(u.nombre) + '\')">Cambiar a Socio</button>'
        : ' <span style="font-size:.7rem;color:var(--gris3);">Cuenta Micorriza</span>');
    return '<tr>' +
      '<td><strong>' + esc(u.nombre) + '</strong></td>' +
      '<td><small>' + esc(u.email) + '</small></td>' +
      '<td><span class="chip ' + (esSuper ? 'chip-bad' : 'chip-ok') + '">' + (esSuper ? '🛡️ Superadmin' : '🎖️ Directorio') + '</span></td>' +
      '<td>' + cargo + '</td>' +
      '<td>' + esc(u.estamento || '—') + '</td>' +
      '<td class="no-print">' + accion + '</td>' +
    '</tr>';
  }).join('');

  const filasPre = preasignados.map(p =>
    '<tr style="opacity:.8;">' +
      '<td><strong>' + esc(p.nombre) + '</strong></td>' +
      '<td><small>' + esc(p.email || p.id) + '</small></td>' +
      '<td><span class="chip chip-ok">🎖️ Directorio</span> <span class="chip chip-azul">Por vincular</span></td>' +
      '<td>' + (p.cargo ? '<span class="chip chip-azul">' + esc(p.cargo) + '</span>' : '<span style="font-size:.72rem;color:var(--gris3);">—</span>') + '</td>' +
      '<td>' + esc(p.estamento || '—') + '</td>' +
      '<td class="no-print"><button class="btn-sm b-rojo" onclick="quitarPreasignacion(\'' + esc(p.id) + '\', \'' + esc(p.nombre) + '\')">Quitar pre-asignación</button></td>' +
    '</tr>'
  ).join('');

  cont.innerHTML = (filasAdmins + filasPre) ||
    '<tr><td colspan="6" class="empty-msg">Sin directivos registrados.</td></tr>';
}

async function abrirModalNuevoAdmin() {
  if (!isSuperadminActual()) return;
  const [usersSnap, pendSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('rol', '==', 'socio'), where('activo', '==', true))),
    getDocs(collection(db, 'padronPendiente')),
  ]);
  const socios = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  // Pre-inscritos que aún no inician sesión (se les puede pre-asignar el rol)
  const pendientes = pendSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.rolAsignado !== 'directorio')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  const opciones =
    socios.map(s =>
      '<option value="' + esc(s.id) + '">' + esc(s.nombre) + ' (' + esc(s.estamento || '—') + ')</option>'
    ).join('') +
    pendientes.map(p =>
      '<option value="pend:' + esc(p.id) + '">' + esc(p.nombre) + ' (' + esc(p.estamento || '—') + ') · por vincular</option>'
    ).join('');

  showModal({
    titulo: 'Promover socio a Directorio',
    body: `
      <label>Seleccionar socio</label>
      <select id="modalSocioPromover" style="width:100%;padding:9px;border:1.5px solid var(--gris2);border-radius:10px;font-size:.82rem;margin-top:6px;">
        <option value="">— Seleccionar —</option>
        ${opciones}
      </select>
      ${selectorCargoHTML()}
      <p style="font-size:.72rem;color:var(--gris3);margin-top:10px;">
        ⚠️ Esta acción da acceso al panel del directorio. Solo el superadmin puede revertirla.<br>
        Si la persona aún no ha iniciado sesión ("por vincular"), el rol queda pre-asignado
        y entrará directo a su perfil de Directorio en su primer login.
      </p>
    `,
    confirmText: 'Promover a Directorio',
    onConfirm: () => {
      const valor = document.getElementById('modalSocioPromover').value;
      if (!valor) { showToast('Selecciona un socio.', 'error'); return false; }
      const cargo = leerCargoDelModal();
      if (valor.startsWith('pend:')) asignarRolPendiente(valor.slice(5), cargo);
      else promoverADirectorio(valor, cargo);
    },
  });
}

// Pre-asigna rol directorio (y cargo) a una ficha aún no vinculada
async function asignarRolPendiente(email, cargo = '') {
  if (!isSuperadminActual()) return;
  try {
    await updateDoc(doc(db, 'padronPendiente', email), {
      rolAsignado: 'directorio',
      cargo: cargo || null,
    });
    await logAudit('PREASIGNAR_DIRECTORIO', 'padronPendiente', email, { cargo: cargo || null });
    showToast('Rol pre-asignado: entrará como Directorio en su primer inicio de sesión', 'ok');
    renderGestionRoles(); renderAdmin(); renderPadron();
  } catch (e) {
    captureError(e);
    showToast('No se pudo pre-asignar el rol.', 'error');
  }
}

function quitarPreasignacion(email, nombre) {
  showConfirm({
    titulo: `¿Quitar la pre-asignación de ${nombre}?`,
    desc: 'Entrará como Socio/a en su primer inicio de sesión.',
    confirmText: 'Sí, quitar',
    onConfirm: async () => {
      try {
        await updateDoc(doc(db, 'padronPendiente', email), { rolAsignado: 'socio', cargo: null });
        await logAudit('QUITAR_PREASIGNACION', 'padronPendiente', email, { nombre });
        showToast(`${nombre} entrará como Socio/a.`, 'ok');
        renderGestionRoles(); renderAdmin(); renderPadron();
      } catch (e) {
        captureError(e);
        showToast('No se pudo quitar la pre-asignación.', 'error');
      }
    },
  });
}

async function promoverADirectorio(uid, cargo = '') {
  if (!isSuperadminActual()) {
    showToast('Solo el superadmin puede asignar roles.', 'error');
    return;
  }
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    await updateDoc(doc(db, 'users', uid), { rol: 'directorio', cargo: cargo || null });
    await logAudit('PROMOVER_DIRECTORIO', 'users', uid, {
      nombre: snap.data().nombre,
      email: snap.data().email,
      cargo: cargo || null,
    });
    showToast(`${snap.data().nombre} es ahora ${cargo || 'miembro del Directorio'}`, 'ok');
    renderGestionRoles(); renderAdmin(); renderPadron();
  } catch (e) {
    captureError(e);
    showToast('No se pudo cambiar el rol.', 'error');
  }
}

// Asignar o cambiar el cargo de un directivo (Presidente, Tesorero/a, etc.)
async function editarCargo(uid) {
  if (!isSuperadminActual()) return;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return;
  const u = snap.data();
  showModal({
    titulo: `Cargo de ${u.nombre}`,
    body: selectorCargoHTML(u.cargo || ''),
    confirmText: 'Guardar cargo',
    onConfirm: () => {
      const cargo = leerCargoDelModal();
      (async () => {
        try {
          await updateDoc(doc(db, 'users', uid), { cargo: cargo || null });
          await logAudit('ASIGNAR_CARGO', 'users', uid, { nombre: u.nombre, cargo: cargo || null });
          showToast(cargo ? `Cargo asignado: ${cargo}` : 'Cargo eliminado.', 'ok');
          renderGestionRoles();
        } catch (e) {
          captureError(e);
          showToast('No se pudo guardar el cargo.', 'error');
        }
      })();
    },
  });
}

function degradarAsocio(uid, nombre) {
  showConfirm({
    titulo: `¿Cambiar a ${nombre} a rol Socio?`,
    desc: 'Perderá acceso al panel del directorio y su cargo quedará vacante.',
    confirmText: 'Sí, cambiar a Socio',
    onConfirm: async () => {
      try {
        await updateDoc(doc(db, 'users', uid), { rol: 'socio', cargo: null });
        await logAudit('DEGRADAR_SOCIO', 'users', uid, { nombre });
        showToast(`${nombre} ahora es Socio/a.`, 'ok');
        renderGestionRoles(); renderAdmin(); renderPadron();
      } catch (e) {
        captureError(e);
        showToast('No se pudo cambiar el rol.', 'error');
      }
    },
  });
}

async function renderAdmin() {
  if (!esSuperadmin()) return;
  renderGestionRoles();
  // Usuarios con cuenta + pre-inscritos del padrón aún sin primer login
  const [usersSnap, pendSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'padronPendiente')),
  ]);
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  const pendientes = pendSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  const filasUsers = users.map(u => {
    const esMicorriza = (u.email || '').endsWith('@micorriza.bio');
    const opciones = ['socio', 'directorio'].concat(esMicorriza ? ['superadmin'] : [])
      .map(r => '<option value="' + r + '"' + (u.rol === r ? ' selected' : '') + '>' + r + '</option>').join('');
    return '<tr>' +
      '<td><strong>' + esc(u.nombre || '—') + '</strong></td>' +
      '<td>' + esc(u.email || '—') + '</td>' +
      '<td><select onchange="adminSetRol(\'' + esc(u.id) + '\', this.value)" style="padding:6px;border:1.5px solid var(--gris2);border-radius:8px;font-size:.74rem;">' + opciones + '</select></td>' +
      '<td>' + (u.activo ? '<span class="chip chip-ok">Sí</span>' : '<span class="chip chip-bad">No</span>') + '</td>' +
      '<td class="no-print"><button class="btn-sm ' + (u.activo ? 'b-rojo' : 'b-verde') + '" onclick="adminToggleActivo(\'' + esc(u.id) + '\',' + (u.activo ? 'true' : 'false') + ')">' + (u.activo ? 'Desactivar' : 'Activar') + '</button></td>' +
    '</tr>';
  }).join('');

  // Inscritos en el padrón que aún no entran con su cuenta (el rol pre-asignado
  // se aplica al vincularse; por defecto entran como socio)
  const filasPendientes = pendientes.map(p => {
    const rolPre = p.rolAsignado === 'directorio'
      ? '<span class="chip chip-ok">Directorio</span> <span class="chip chip-azul">Por vincular</span>'
      : '<span class="chip chip-azul" title="Será socio al hacer su primer login">Por vincular · Socio</span>';
    return '<tr style="opacity:.75;">' +
      '<td><strong>' + esc(p.nombre || '—') + '</strong></td>' +
      '<td>' + esc(p.email || p.id) + '</td>' +
      '<td>' + rolPre + '</td>' +
      '<td><span class="chip chip-gris">—</span></td>' +
      '<td class="no-print"><button class="btn-sm b-rojo" onclick="delPendiente(\'' + esc(p.id) + '\')" title="Eliminar pre-inscripción">✕ Eliminar</button></td>' +
    '</tr>';
  }).join('');

  document.getElementById('adminUsersBody').innerHTML =
    (filasUsers + filasPendientes) || '<tr><td colspan="5" class="empty-msg">Sin usuarios.</td></tr>';

  const auditSnap = await getDocs(query(collection(db, 'auditLog'), orderBy('creadoEn', 'desc'), limit(100)));
  document.getElementById('auditBody').innerHTML = auditSnap.docs.map(d => {
    const a = d.data();
    const f = a.creadoEn?.toDate?.();
    const fechaTxt = f ? f.toLocaleDateString('es-CL') + ' ' + f.toLocaleTimeString('es-CL') : '—';
    return '<tr>' +
      '<td><small>' + esc(fechaTxt) + '</small></td>' +
      '<td>' + esc(a.userNombre || a.userEmail || '—') + '</td>' +
      '<td><span class="chip chip-azul">' + esc(a.accion) + '</span></td>' +
      '<td class="hide-mobile">' + esc(a.coleccion || '—') + '</td>' +
      '<td class="hide-mobile"><small>' + esc(JSON.stringify(a.detalle || {})) + '</small></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="5" class="empty-msg">Sin registros de auditoría.</td></tr>';
}

async function adminSetRol(uid, rol) {
  const u = (await getDoc(doc(db, 'users', uid))).data();
  // Superadmin exclusivo @micorriza.bio — validado también en rules
  if (rol === 'superadmin' && !(u.email || '').endsWith('@micorriza.bio')) {
    showToast('El rol superadmin es exclusivo para cuentas @micorriza.bio.', 'error');
    renderAdmin();
    return;
  }
  await updateDoc(doc(db, 'users', uid), { rol });
  await logAudit('CAMBIAR_ROL', 'users', uid, { rol });
  showToast('Rol actualizado.', 'ok');
  renderAdmin();
}

function adminToggleActivo(uid, estaActivo) {
  showConfirm({
    titulo: estaActivo ? '¿Desactivar esta cuenta?' : '¿Activar esta cuenta?',
    desc: estaActivo ? 'El usuario no podrá ingresar al portal.' : 'El usuario podrá volver a ingresar.',
    confirmText: 'Confirmar',
    danger: estaActivo,
    onConfirm: async () => {
      await updateDoc(doc(db, 'users', uid), { activo: !estaActivo });
      await logAudit(estaActivo ? 'DESACTIVAR_USUARIO' : 'ACTIVAR_USUARIO', 'users', uid);
      renderAdmin();
    },
  });
}

/* ═══════════ EXPORTACIONES Y PRINT ═══════════ */
function downloadCSV(nombre, rows) {
  // Separador ; compatible con Excel en español (Chile)
  const csv = '\u{FEFF}' + rows.map(r =>
    r.map(c => '"' + (c == null ? '' : String(c)).replace(/"/g, '""') + '"').join(';')
  ).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre + '_' + hoy() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

function printSection(tab, titulo) {
  showTab(tab);
  const sec = document.getElementById('tab-' + tab);
  document.querySelectorAll('.p-section').forEach(s => s.classList.remove('printing'));
  sec.classList.add('printing');
  document.title = 'AFUSAMUT — ' + titulo;
  // 400ms: deja terminar la transición de tabs (180ms) antes de abrir el diálogo
  setTimeout(() => window.print(), 400);
}

/* ═══════════ DEFAULTS Y GLOBALES ═══════════ */
window.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('mv-fecha'); if (f) f.value = hoy();
  const nf = document.getElementById('ns-fecha'); if (nf) nf.value = hoy();
});

// Los onclick del HTML (heredados del demo) necesitan acceso global:
Object.assign(window, {
  showTab, cerrarSesion, printSection,
  renderPadron, agregarCampoExtra, addSocio, editarSocio, toggleCuota, desactivarSocio, delPendiente, exportPadronCSV,
  loadBoleta, clearBoleta, addMovimiento, delMovimiento, verBoleta, exportFinanzasCSV,
  addVotacion, votar, cerrarVotacion, exportVotacionesCSV,
  syncPoderDoc, clearFirma, loadPoderFoto, clearPoderFoto, enviarPoder, anularMiPoder, verPoderImg, delPoder, exportPoderCSV,
  loadActaFoto, clearActaFoto, guardarActa, delActa, verActaFoto,
  addMensaje, responder,
  publicarNotif, delNotif,
  agregarEvento, delEvento, cambiarMes, showDayDetail,
  toggleBloque,
  adminSetRol, adminToggleActivo,
  volverAVistaAdmin,
  verDetalleBeneficio, nuevoBeneficio, editarBeneficio, toggleBeneficio,
  enviarMensajeDirectorio, marcarLeido,
  guardarCuotas,
  abrirModalNuevoAdmin, promoverADirectorio, degradarAsocio, editarCargo, quitarPreasignacion,
});
