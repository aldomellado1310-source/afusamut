// ════════════════════════════════════════════════════════════════════════════
// PANEL DE PERMISOS Y DERECHOS DEL DIRECTORIO
// ────────────────────────────────────────────────────────────────────────────
// Responde a dos preguntas que antes no tenían respuesta en el portal:
//   ¿QUIÉN puede hacer QUÉ?  y  ¿por qué?
// Muestra la matriz cargo × permiso, la ficha de derechos efectivos de cada
// directivo, las alertas de gobernanza (funciones sin titular, atribuciones
// concentradas, directivos sin cargo) y la bitácora de cambios de permisos.
// Editar la matriz es prerrogativa del superadmin; el resto la audita.
// ════════════════════════════════════════════════════════════════════════════
import {
  db, doc, getDocs, updateDoc, collection, query, where, orderBy, limit,
} from './firebase.js';
import { currentUser, currentUserData } from './auth.js';
import { logAudit } from './db.js';
import { esc, showToast, showConfirm, emptyState, icono } from './ui.js';
import {
  PERMISOS, AREAS, CARGOS_BASE, PERMISOS_EXCLUSIVOS,
  slugCargo, etiquetaCargo, permisoInfo,
  cargarPermisos, configPermisos, controlActivo, matrizActual, matrizPorDefecto,
  permisosDeCargo, guardarConfigPermisos,
} from './permisos.js';

const ACCIONES_PERMISOS = [
  'GUARDAR_PERMISOS', 'ACTIVAR_CONTROL_PERMISOS', 'DESACTIVAR_CONTROL_PERMISOS',
  'RESTAURAR_PERMISOS_DEFECTO', 'ASIGNAR_CARGO', 'PROMOVER_DIRECTORIO',
  'DEGRADAR_SOCIO', 'CAMBIAR_ROL', 'PREASIGNAR_DIRECTORIO', 'QUITAR_PREASIGNACION',
  'ACTIVAR_USUARIO', 'DESACTIVAR_USUARIO',
];

// Estado del editor: copia de trabajo de la matriz mientras no se guarda.
let borrador   = null;
let sucio      = false;
let ctxActual  = {};
let directivos = [];

/* ═══════════ DATOS ═══════════ */
async function cargarDirectivos() {
  const [snap, pendSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('rol', 'in', ['directorio', 'superadmin']))),
    getDocs(collection(db, 'padronPendiente')).catch(() => ({ docs: [] })),
  ]);

  const vinculados = snap.docs.map(d => {
    const u = d.data();
    return {
      id: d.id,
      nombre: u.nombre || '—',
      email: u.email || '—',
      rol: u.rol,
      cargo: u.cargo || '',
      cargoKey: u.cargoKey || slugCargo(u.cargo),
      cargoKeyGuardado: u.cargoKey || null,
      estamento: u.estamento || '—',
      activo: u.activo !== false,
      ultimoLogin: u.ultimoLogin || null,
      pendiente: false,
    };
  });

  const pendientes = pendSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.rolAsignado === 'directorio')
    .map(p => ({
      id: p.id,
      nombre: p.nombre || '—',
      email: p.email || p.id,
      rol: 'directorio',
      cargo: p.cargo || '',
      cargoKey: slugCargo(p.cargo),
      cargoKeyGuardado: null,
      estamento: p.estamento || '—',
      activo: true,
      ultimoLogin: null,
      pendiente: true,
    }));

  return [...vinculados, ...pendientes]
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
}

// Los directivos antiguos tienen `cargo` pero no `cargoKey` (el campo que leen
// las Security Rules). Se rellena una sola vez, en silencio, cuando entra el
// superadmin: sin esto, las reglas los tratarían como "sin cargo".
async function normalizarCargoKeys(lista) {
  if (!ctxActual.puedeEditar) return 0;
  const faltantes = lista.filter(d => !d.pendiente && d.rol === 'directorio'
    && d.cargo && d.cargoKeyGuardado !== d.cargoKey);
  let ok = 0;
  for (const d of faltantes) {
    try { await updateDoc(doc(db, 'users', d.id), { cargoKey: d.cargoKey }); d.cargoKeyGuardado = d.cargoKey; ok++; }
    catch (e) { console.warn('cargoKey', d.id, e.code || e.message); }
  }
  return ok;
}

/* ═══════════ CARGOS PRESENTES EN LA MATRIZ ═══════════ */
function cargosVisibles() {
  const claves = new Set(CARGOS_BASE.map(c => c.key));
  Object.keys(borrador || {}).forEach(k => claves.add(k));
  directivos.filter(d => d.rol === 'directorio').forEach(d => claves.add(d.cargoKey));
  const orden = CARGOS_BASE.map(c => c.key);
  return [...claves].sort((a, b) => {
    const ia = orden.indexOf(a), ib = orden.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
}

const tienePermisoBorrador = (cargoKey, permId) =>
  Array.isArray(borrador[cargoKey]) && borrador[cargoKey].includes(permId);

/* ═══════════ AUDITORÍA: HALLAZGOS ═══════════ */
function calcularAlertas() {
  const alertas = [];
  const activos = directivos.filter(d => d.rol === 'directorio' && d.activo);
  const cargos  = cargosVisibles();

  if (!controlActivo()) {
    alertas.push({
      nivel: 'warn', icono: 'candado',
      titulo: 'El control por cargo está desactivado',
      desc: 'Mientras siga apagado, cualquier miembro del Directorio puede administrar finanzas, ' +
            'padrón, actas y mural sin restricción. La matriz de abajo queda como propuesta.',
    });
  }

  // Funciones críticas sin titular o repartidas entre varios cargos.
  for (const permId of PERMISOS_EXCLUSIVOS) {
    const info = permisoInfo(permId);
    const titulares = cargos.filter(k => tienePermisoBorrador(k, permId));
    const personas  = activos.filter(d => titulares.includes(d.cargoKey));
    if (!titulares.length) {
      alertas.push({
        nivel: 'bad', icono: 'alerta',
        titulo: `Nadie puede «${info.label.toLowerCase()}»`,
        desc: 'Ningún cargo tiene esta atribución. Si activas el control, la función queda bloqueada para todo el Directorio.',
      });
    } else if (titulares.length > 1) {
      alertas.push({
        nivel: 'warn', icono: 'alerta',
        titulo: `«${info.label}» está en ${titulares.length} cargos`,
        desc: 'Atribución que conviene mantener en un solo cargo: ' +
              titulares.map(etiquetaCargo).join(', ') + '.',
      });
    } else if (!personas.length) {
      alertas.push({
        nivel: 'warn', icono: 'personas',
        titulo: `«${info.label}» no tiene a nadie ejerciéndolo`,
        desc: `Corresponde a ${etiquetaCargo(titulares[0])}, pero no hay ningún directivo activo con ese cargo.`,
      });
    }
  }

  // Permisos que nadie ejerce (más allá de los exclusivos).
  const huerfanos = PERMISOS.filter(p => !PERMISOS_EXCLUSIVOS.includes(p.id))
    .filter(p => !activos.some(d => tienePermisoBorrador(d.cargoKey, p.id)));
  if (huerfanos.length) {
    alertas.push({
      nivel: 'info', icono: 'ℹ️',
      titulo: `${huerfanos.length} ${huerfanos.length === 1 ? 'atribución sin' : 'atribuciones sin'} titular activo`,
      desc: huerfanos.map(p => p.label).join(' · '),
    });
  }

  // Directivos sin cargo: las reglas los tratan como "Sin cargo".
  const sinCargo = activos.filter(d => !d.cargo);
  if (sinCargo.length) {
    alertas.push({
      nivel: 'warn', icono: 'escudo',
      titulo: `${sinCargo.length} ${sinCargo.length === 1 ? 'directivo sin cargo asignado' : 'directivos sin cargo asignado'}`,
      desc: sinCargo.map(d => d.nombre).join(', ') +
            '. Reciben los permisos de la fila «Sin cargo»; asígnales su cargo real desde Admin → Gestión de Roles.',
    });
  }

  // Cargos unipersonales duplicados (dos presidentes, dos tesoreros…).
  for (const key of ['presidente', 'tesorero', 'secretario', 'vicepresidente']) {
    const cuantos = activos.filter(d => d.cargoKey === key);
    if (cuantos.length > 1) {
      alertas.push({
        nivel: 'warn', icono: 'personas',
        titulo: `Hay ${cuantos.length} personas con el cargo ${etiquetaCargo(key)}`,
        desc: cuantos.map(d => d.nombre).join(', ') + '. Revisa si corresponde a un cambio de directiva pendiente de cerrar.',
      });
    }
  }

  // Concentración de atribuciones sensibles en un mismo cargo.
  const sensibles = PERMISOS.filter(p => p.sensible).map(p => p.id);
  for (const key of cargos) {
    const cuantos = sensibles.filter(id => tienePermisoBorrador(key, id));
    if (cuantos.length >= 3 && key !== 'tesorero') {
      alertas.push({
        nivel: 'warn', icono: 'alerta',
        titulo: `${etiquetaCargo(key)} concentra ${cuantos.length} atribuciones sensibles`,
        desc: cuantos.map(id => permisoInfo(id).label).join(' · '),
      });
    }
  }

  // Directivos desactivados que conservan el cargo.
  const inactivos = directivos.filter(d => d.rol === 'directorio' && !d.activo && d.cargo);
  if (inactivos.length) {
    alertas.push({
      nivel: 'warn', icono: 'alerta',
      titulo: `${inactivos.length} ${inactivos.length === 1 ? 'cuenta desactivada conserva' : 'cuentas desactivadas conservan'} su cargo`,
      desc: inactivos.map(d => `${d.nombre} (${d.cargo})`).join(', ') +
            '. No pueden entrar al portal, pero el cargo sigue figurando como ocupado.',
    });
  }

  if (!alertas.length) {
    alertas.push({
      nivel: 'ok', icono: 'ok',
      titulo: 'Sin observaciones',
      desc: 'Cada función crítica tiene un único titular y todos los directivos tienen su cargo asignado.',
    });
  }
  return alertas;
}

/* ═══════════ RENDER: KPIs ═══════════ */
function pintarKpis() {
  const activos = directivos.filter(d => d.rol === 'directorio' && d.activo);
  const asignaciones = cargosVisibles()
    .reduce((n, k) => n + (borrador[k] || []).length, 0);
  const alertas = calcularAlertas().filter(a => a.nivel !== 'ok');
  const cargosOcupados = new Set(activos.filter(d => d.cargo).map(d => d.cargoKey)).size;

  document.getElementById('permKpis').innerHTML = `
    <div class="kpi k-verde"><strong>${activos.length}</strong><span>Directivos activos</span></div>
    <div class="kpi k-azul"><strong>${cargosOcupados}</strong><span>Cargos ocupados</span></div>
    <div class="kpi k-dorado"><strong>${asignaciones}</strong><span>Permisos otorgados</span></div>
    <div class="kpi ${alertas.length ? 'k-rojo' : 'k-verde'}"><strong>${alertas.length}</strong><span>Alertas de gobernanza</span></div>
  `;
}

/* ═══════════ RENDER: ESTADO DEL CONTROL ═══════════ */
function pintarEstado() {
  const activo = controlActivo();
  const cfg = configPermisos();
  const f = cfg?.actualizadoEn?.toDate?.();
  const cuando = f ? f.toLocaleDateString('es-CL') + ' ' + f.toLocaleTimeString('es-CL').slice(0, 5) : null;

  document.getElementById('permEstadoPanel').innerHTML = `
    <div class="perm-estado ${activo ? 'on' : 'off'}">
      <div class="pe-icono">${icono('candado')}</div>
      <div class="pe-texto">
        <h4>Control por cargo: ${activo ? 'ACTIVO' : 'INACTIVO'}</h4>
        <p>${activo
          ? 'Cada directivo solo puede ejecutar las acciones de su cargo. Las mismas reglas se aplican en el servidor (Firestore y Storage), no solo en la pantalla.'
          : 'Todo el Directorio conserva acceso completo, como hasta ahora. Activa el control para que la matriz de abajo empiece a regir.'}</p>
        ${cuando ? `<small>Última modificación: ${esc(cuando)}${cfg?.actualizadoPor ? ' · ' + esc(cfg.actualizadoPor) : ''}</small>` : ''}
      </div>
      ${ctxActual.puedeEditar ? `
        <div class="pe-acciones no-print">
          <button class="btn-action ${activo ? '' : 'gold'}" data-accion="${activo ? 'desactivar' : 'activar'}">
            ${activo ? 'Desactivar control' : 'Activar control por cargo'}
          </button>
          <button class="btn-sm b-azul" data-accion="restaurar">↺ Reparto sugerido</button>
        </div>` : ''}
    </div>
  `;
}

/* ═══════════ RENDER: ALERTAS ═══════════ */
function pintarAlertas() {
  const alertas = calcularAlertas();
  document.getElementById('permAlertasPanel').innerHTML = `
    <h4>Auditoría de gobernanza</h4>
    <p class="perm-sub">Revisión automática del reparto de atribuciones frente a la nómina real del Directorio.</p>
    <div class="alerta-lista">
      ${alertas.map(a => `
        <div class="alerta-item n-${a.nivel}">
          <span class="al-icono">${icono(a.icono)}</span>
          <div><strong>${esc(a.titulo)}</strong><p>${esc(a.desc)}</p></div>
        </div>`).join('')}
    </div>
  `;
}

/* ═══════════ RENDER: MATRIZ CARGO × PERMISO ═══════════ */
function pintarMatriz() {
  const cargos = cargosVisibles();
  const editable = ctxActual.puedeEditar;

  const encabezado = cargos.map(k => {
    const cuantos = directivos.filter(d => d.rol === 'directorio' && d.activo && d.cargoKey === k).length;
    return `<th class="pm-cargo">
      <span class="pm-icono" aria-hidden="true">${esc(etiquetaCargo(k).charAt(0))}</span>
      <span class="pm-nombre">${esc(etiquetaCargo(k))}</span>
      <span class="pm-cuenta ${cuantos ? '' : 'vacio'}">${cuantos ? cuantos + (cuantos === 1 ? ' persona' : ' personas') : 'vacante'}</span>
    </th>`;
  }).join('');

  const filas = AREAS.map(area => {
    const delArea = PERMISOS.filter(p => p.area === area);
    if (!delArea.length) return '';
    const grupo = `<tr class="pm-area"><td colspan="${cargos.length + 1}">${esc(area)}</td></tr>`;
    const celdas = delArea.map(p => {
      const cols = cargos.map(k => {
        const marcado = tienePermisoBorrador(k, p.id);
        return `<td class="pm-celda${marcado ? ' si' : ''}">
          ${editable
            ? `<label class="pm-check"><input type="checkbox" data-cargo="${esc(k)}" data-permiso="${esc(p.id)}"${marcado ? ' checked' : ''}
                 aria-label="${esc(p.label)} — ${esc(etiquetaCargo(k))}"/><span></span></label>`
            : `<span class="pm-ro" title="${marcado ? 'Concedido' : 'Denegado'}">${marcado ? '✔' : '·'}</span>`}
        </td>`;
      }).join('');
      return `<tr>
        <th scope="row" class="pm-perm">
          <strong>${esc(p.label)}${p.sensible ? ' <span class="chip chip-bad pm-tag">sensible</span>' : ''}</strong>
          <small>${esc(p.desc)}</small>
        </th>${cols}
      </tr>`;
    }).join('');
    return grupo + celdas;
  }).join('');

  document.getElementById('permMatrizPanel').innerHTML = `
    <div class="p-title-row" style="margin-bottom:6px;">
      <div>
        <h4>Matriz de atribuciones por cargo</h4>
        <p class="perm-sub">${editable
          ? 'Marca lo que cada cargo puede hacer. Los cambios rigen en el servidor apenas los guardes.'
          : 'Vista de solo lectura: la edición es prerrogativa exclusiva del administrador del sistema.'}</p>
      </div>
      ${editable ? `<div class="pm-barra no-print" id="permBarra">
        <span class="pm-estado" id="permDirty"></span>
        <button class="btn-sm b-gris" data-accion="descartar">Descartar</button>
        <button class="btn-action" data-accion="guardar">Guardar permisos</button>
      </div>` : ''}
    </div>
    <div class="pm-scroll">
      <table class="data perm-matriz">
        <thead><tr><th class="pm-esquina">Atribución</th>${encabezado}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
  marcarSucio();
}

function marcarSucio() {
  const el = document.getElementById('permDirty');
  if (el) {
    el.textContent = sucio ? '● Cambios sin guardar' : '';
    el.className = 'pm-estado' + (sucio ? ' activo' : '');
  }
}

/* ═══════════ RENDER: FICHA DE DERECHOS POR DIRECTIVO ═══════════ */
function pintarDirectivos() {
  const lista = directivos.filter(d => d.rol === 'directorio' || d.rol === 'superadmin');
  if (!lista.length) {
    document.getElementById('permDirectivosPanel').innerHTML =
      '<h4>Derechos efectivos por persona</h4>' +
      emptyState('escudo', 'Sin directivos registrados', 'Promueve socios a Directorio desde el panel de Administración.');
    return;
  }

  const tarjetas = lista.map(d => {
    const esSuper = d.rol === 'superadmin';
    const concedidos = esSuper ? PERMISOS.map(p => p.id)
      : (controlActivo() ? (borrador[d.cargoKey] || []) : PERMISOS.map(p => p.id));
    const denegados = PERMISOS.filter(p => !concedidos.includes(p.id));

    const badges = [];
    if (esSuper) badges.push('<span class="chip chip-bad">Superadmin</span>');
    if (d.pendiente) badges.push('<span class="chip chip-azul">Por vincular</span>');
    if (!d.activo) badges.push('<span class="chip chip-bad">Cuenta desactivada</span>');
    if (!d.cargo && !esSuper) badges.push('<span class="chip chip-warn">Sin cargo</span>');

    const listaPermisos = (ids, tipo) => ids.length
      ? `<ul class="dp-lista ${tipo}">${ids.map(id => {
          const p = typeof id === 'string' ? permisoInfo(id) : id;
          return p ? `<li><span aria-hidden="true">${tipo === 'si' ? '✔' : '✕'}</span> ${esc(p.label)}</li>` : '';
        }).join('')}</ul>`
      : `<p class="dp-vacio">${tipo === 'si' ? 'Ninguna atribución concedida.' : 'Ninguna restricción: acceso completo.'}</p>`;

    return `
      <div class="directivo-card">
        <div class="dc-head">
          <div class="dc-avatar" aria-hidden="true">${esSuper ? 'SA' : esc(etiquetaCargo(d.cargoKey).charAt(0))}</div>
          <div class="dc-id">
            <strong>${esc(d.nombre)}</strong>
            <small>${esc(d.email)}</small>
            <div class="dc-badges">
              <span class="chip chip-ok">${esc(esSuper ? 'Administrador del sistema' : (d.cargo || 'Directorio'))}</span>
              ${badges.join(' ')}
            </div>
          </div>
          <div class="dc-score" title="Atribuciones concedidas sobre el total">
            <strong>${concedidos.length}</strong><span>/ ${PERMISOS.length}</span>
          </div>
        </div>
        <div class="dc-cols">
          <div><h5>Puede</h5>${listaPermisos(concedidos, 'si')}</div>
          <div><h5>No puede</h5>${listaPermisos(denegados, 'no')}</div>
        </div>
        ${ctxActual.puedeEditar && !esSuper ? `<div class="dc-pie no-print">
          <button class="btn-sm b-azul" data-accion="previsualizar" data-cargo="${esc(d.cargoKey)}">Ver el portal con este cargo</button>
        </div>` : ''}
      </div>`;
  }).join('');

  document.getElementById('permDirectivosPanel').innerHTML = `
    <h4>Derechos efectivos por persona</h4>
    <p class="perm-sub">Lo que cada directivo puede y no puede hacer hoy${controlActivo() ? '' : ' (con el control apagado, todos tienen acceso completo)'}.</p>
    <div class="directivos-grid">${tarjetas}</div>
  `;
}

/* ═══════════ RENDER: BITÁCORA ═══════════ */
async function pintarBitacora() {
  const cont = document.getElementById('permBitacoraPanel');
  cont.innerHTML = '<h4>Bitácora de cambios de permisos</h4><p class="perm-sub">Cargando…</p>';
  let filas = '';
  try {
    const snap = await getDocs(query(collection(db, 'auditLog'), orderBy('creadoEn', 'desc'), limit(200)));
    filas = snap.docs
      .map(d => d.data())
      .filter(a => ACCIONES_PERMISOS.includes(a.accion))
      .slice(0, 40)
      .map(a => {
        const f = a.creadoEn?.toDate?.();
        const cuando = f ? f.toLocaleDateString('es-CL') + ' ' + f.toLocaleTimeString('es-CL').slice(0, 5) : '—';
        const detalle = a.detalle && Object.keys(a.detalle).length
          ? Object.entries(a.detalle).map(([k, v]) =>
              `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')
          : '—';
        return `<tr>
          <td><small>${esc(cuando)}</small></td>
          <td>${esc(a.userNombre || a.userEmail || '—')}</td>
          <td><span class="chip chip-azul">${esc(a.accion)}</span></td>
          <td class="hide-mobile"><small>${esc(detalle)}</small></td>
        </tr>`;
      }).join('');
  } catch (e) {
    cont.innerHTML = '<h4>Bitácora de cambios de permisos</h4>' +
      emptyState('candado', 'Bitácora no disponible',
        'Tu cargo no incluye el permiso «Ver auditoría y permisos» (' + (e.code || 'sin acceso') + ').');
    return;
  }

  cont.innerHTML = `
    <h4>Bitácora de cambios de permisos</h4>
    <p class="perm-sub">Toda modificación de roles, cargos y atribuciones queda registrada de forma inalterable.</p>
    <div style="overflow-x:auto;">
      <table class="data">
        <thead><tr><th>Fecha</th><th>Responsable</th><th>Acción</th><th class="hide-mobile">Detalle</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="4" class="empty-msg">Sin cambios de permisos registrados.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

/* ═══════════ ACCIONES ═══════════ */
async function guardar({ activo } = {}) {
  const nuevoActivo = activo === undefined ? controlActivo() : activo;
  try {
    await guardarConfigPermisos({
      matriz: borrador,
      activo: nuevoActivo,
      actualizadoPor: currentUserData?.nombre || currentUser?.email || null,
    });
    await cargarPermisos({ forzar: true });
    await logAudit(
      activo === undefined ? 'GUARDAR_PERMISOS'
        : activo ? 'ACTIVAR_CONTROL_PERMISOS' : 'DESACTIVAR_CONTROL_PERMISOS',
      'config', 'permisos',
      { cargos: Object.keys(borrador).length, activo: nuevoActivo }
    );
    sucio = false;
    showToast('Permisos guardados. Ya rigen para todo el Directorio.', 'ok');
    ctxActual.onCambio?.();
    await refrescar();
  } catch (e) {
    console.error('guardarPermisos', e);
    showToast('No se pudieron guardar los permisos (' + (e.code || e.message) + ').', 'error');
  }
}

function exportarCSV() {
  const cargos = cargosVisibles();
  const filas = [
    ['AFUSAMUT — Matriz de permisos del Directorio'],
    ['Control por cargo', controlActivo() ? 'ACTIVO' : 'INACTIVO'],
    ['Generado', new Date().toLocaleString('es-CL')],
    [],
    ['Área', 'Atribución', ...cargos.map(etiquetaCargo)],
    ...PERMISOS.map(p => [p.area, p.label, ...cargos.map(k => tienePermisoBorrador(k, p.id) ? 'SÍ' : 'NO')]),
    [],
    ['Directivo', 'Email', 'Cargo', 'Estado', 'Atribuciones'],
    ...directivos.map(d => [
      d.nombre, d.email, d.cargo || 'Sin cargo',
      d.rol === 'superadmin' ? 'Superadmin' : (d.activo ? 'Activo' : 'Desactivado') + (d.pendiente ? ' · por vincular' : ''),
      d.rol === 'superadmin' ? 'Todas'
        : (controlActivo() ? (borrador[d.cargoKey] || []) : PERMISOS.map(p => p.id))
            .map(id => permisoInfo(id)?.label).filter(Boolean).join(' | '),
    ]),
  ];
  ctxActual.descargarCSV?.('permisos_directorio', filas);
}

/* ═══════════ DELEGACIÓN DE EVENTOS ═══════════ */
function conectarEventos() {
  const seccion = document.getElementById('tab-permisos');
  if (!seccion || seccion.dataset.conectado === '1') return;
  seccion.dataset.conectado = '1';

  seccion.addEventListener('change', (ev) => {
    const chk = ev.target.closest('input[type=checkbox][data-permiso]');
    if (!chk) return;
    const { cargo, permiso } = chk.dataset;
    const lista = new Set(borrador[cargo] || []);
    if (chk.checked) lista.add(permiso); else lista.delete(permiso);
    borrador[cargo] = PERMISOS.map(p => p.id).filter(id => lista.has(id)); // orden estable
    chk.closest('td')?.classList.toggle('si', chk.checked);
    sucio = true;
    marcarSucio();
    pintarKpis(); pintarAlertas(); pintarDirectivos();
  });

  seccion.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-accion]');
    if (!btn) return;
    const accion = btn.dataset.accion;

    if (accion === 'guardar')   { guardar(); return; }
    if (accion === 'descartar') { sucio = false; refrescar(); return; }
    if (accion === 'csv')       { exportarCSV(); return; }

    if (accion === 'previsualizar') {
      ctxActual.previsualizar?.(btn.dataset.cargo);
      return;
    }

    if (accion === 'activar') {
      showConfirm({
        titulo: '¿Activar el control por cargo?',
        desc: 'Desde este momento cada directivo solo podrá ejecutar las acciones marcadas para su cargo, ' +
              'tanto en el portal como en el servidor. Puedes desactivarlo cuando quieras.',
        confirmText: 'Sí, activar',
        danger: false,
        onConfirm: () => guardar({ activo: true }),
      });
      return;
    }

    if (accion === 'desactivar') {
      showConfirm({
        titulo: '¿Desactivar el control por cargo?',
        desc: 'Todo el Directorio recuperará acceso completo a finanzas, padrón, actas y mural.',
        confirmText: 'Sí, desactivar',
        onConfirm: () => guardar({ activo: false }),
      });
      return;
    }

    if (accion === 'restaurar') {
      showConfirm({
        titulo: '¿Restaurar el reparto sugerido?',
        desc: 'Vuelve al reparto estatutario: Tesorería administra finanzas y padrón, Presidencia visualiza ' +
              'todo, y Presidencia, Tesorería y Secretaría publican en el mural. No se guarda hasta que confirmes con «Guardar permisos».',
        confirmText: 'Restaurar propuesta',
        danger: false,
        onConfirm: () => {
          borrador = { ...matrizPorDefecto(), ...Object.fromEntries(
            cargosVisibles().filter(k => !(k in matrizPorDefecto())).map(k => [k, borrador[k] || []])) };
          sucio = true;
          pintarKpis(); pintarEstado(); pintarAlertas(); pintarMatriz(); pintarDirectivos();
          showToast('Reparto sugerido cargado. Revísalo y guarda para aplicarlo.', 'info');
        },
      });
    }
  });
}

/* ═══════════ ENTRADA PÚBLICA ═══════════ */
async function refrescar() {
  await cargarPermisos({ forzar: true });
  directivos = await cargarDirectivos();
  await normalizarCargoKeys(directivos);
  if (!sucio) borrador = JSON.parse(JSON.stringify(matrizActual()));
  for (const k of cargosVisibles()) if (!Array.isArray(borrador[k])) borrador[k] = [];

  pintarKpis();
  pintarEstado();
  pintarAlertas();
  pintarMatriz();
  pintarDirectivos();
  pintarBitacora();
}

export async function renderPanelPermisos(ctx = {}) {
  ctxActual = ctx;
  const seccion = document.getElementById('tab-permisos');
  if (!seccion) return;
  const sub = document.getElementById('permSub');
  if (sub) {
    sub.textContent = ctx.puedeEditar
      ? 'Define y audita qué puede hacer cada cargo del Directorio. Las reglas rigen también en el servidor.'
      : 'Registro de transparencia: qué atribuciones tiene cada cargo y quién las ejerce hoy.';
  }
  conectarEventos();
  try {
    await refrescar();
  } catch (e) {
    console.error('renderPanelPermisos', e);
    document.getElementById('permAlertasPanel').innerHTML =
      emptyState('alerta', 'No se pudo cargar el panel', e.code || e.message || 'Error desconocido');
  }
}

export function panelPermisosTieneCambios() { return sucio; }
