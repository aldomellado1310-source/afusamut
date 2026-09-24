// ════════════════════════════════════════════════════════════════════════════
// NAVEGACIÓN INFERIOR (TELÉFONO)
// ────────────────────────────────────────────────────────────────────────────
// En pantallas angostas la fila de 13 pestañas se reemplaza por una barra con
// cuatro destinos fijos y "Más", que abre una hoja con el resto. La barra no
// duplica lógica: lee las pestañas de #pTabs (que ya ocultan lo que el cargo
// no puede ver) y navega con el mismo showTab() del portal.
// ════════════════════════════════════════════════════════════════════════════

const nav    = document.getElementById('pBottomNav');
const hoja   = document.getElementById('pSheet');
const fondo  = document.getElementById('pSheetFondo');
const grilla = document.getElementById('pSheetGrid');
const tabs   = document.getElementById('pTabs');

if (nav && hoja && fondo && grilla && tabs) {
  const FIJAS = [...nav.querySelectorAll('[data-tab]')].map(b => b.dataset.tab);
  const botonMas = nav.querySelector('[data-mas]');
  const ir = (tab) => { if (typeof window.showTab === 'function') window.showTab(tab); };

  const visible = (el) => el.style.display !== 'none' && !el.hidden;

  // Estado activo: la barra refleja la pestaña activa de #pTabs
  function sincronizar() {
    const activa = tabs.querySelector('.p-tab.active')?.dataset.tab;
    nav.querySelectorAll('button').forEach(b => {
      const esActiva = b.dataset.tab ? b.dataset.tab === activa : !FIJAS.includes(activa);
      if (esActiva) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    // Un destino fijo que el cargo no ve (p. ej. oculto por permisos) sale de la barra
    FIJAS.forEach(tab => {
      const original = tabs.querySelector('[data-tab="' + tab + '"]');
      const boton = nav.querySelector('[data-tab="' + tab + '"]');
      if (original && boton) boton.hidden = !visible(original);
    });
  }
  new MutationObserver(sincronizar).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  sincronizar();

  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-mas')) { abrir(); return; }
    ir(b.dataset.tab);
  });

  /* ── Hoja "Más" ── */
  function armarGrilla() {
    grilla.innerHTML = '';
    tabs.querySelectorAll('.p-tab').forEach(t => {
      if (FIJAS.includes(t.dataset.tab) || !visible(t)) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.tab = t.dataset.tab;
      const icono = t.querySelector('svg');
      if (icono) b.appendChild(icono.cloneNode(true));
      const texto = document.createElement('span');
      texto.textContent = t.textContent.trim();
      b.appendChild(texto);
      if (t.classList.contains('active')) b.setAttribute('aria-current', 'page');
      grilla.appendChild(b);
    });
  }

  let abierta = false;
  function abrir() {
    armarGrilla();
    fondo.hidden = false; hoja.hidden = false;
    hoja.style.transform = '';
    requestAnimationFrame(() => { fondo.classList.add('on'); hoja.classList.add('on'); });
    abierta = true;
    botonMas.setAttribute('aria-expanded', 'true');
    grilla.querySelector('button')?.focus({ preventScroll: true });
  }
  function cerrar({ devolverFoco = true } = {}) {
    if (!abierta) return;
    abierta = false;
    fondo.classList.remove('on'); hoja.classList.remove('on');
    hoja.style.transform = '';
    botonMas.setAttribute('aria-expanded', 'false');
    const fin = () => { if (!abierta) { fondo.hidden = true; hoja.hidden = true; } };
    hoja.addEventListener('transitionend', fin, { once: true });
    setTimeout(fin, 400); // por si no hay transición (reducir movimiento)
    if (devolverFoco) botonMas.focus({ preventScroll: true });
  }

  grilla.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    cerrar({ devolverFoco: false });
    ir(b.dataset.tab);
  });
  fondo.addEventListener('click', () => cerrar());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta) cerrar(); });

  // Arrastrar la hoja hacia abajo la cierra
  let y0 = null, dy = 0;
  hoja.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    y0 = e.clientY; dy = 0;
    hoja.setPointerCapture(e.pointerId);
    hoja.classList.add('arrastrando');
  });
  hoja.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    hoja.style.transform = 'translateY(' + dy + 'px)';
  });
  const soltar = () => {
    if (y0 === null) return;
    y0 = null;
    hoja.classList.remove('arrastrando');
    if (dy > 90) cerrar(); else hoja.style.transform = '';
  };
  hoja.addEventListener('pointerup', soltar);
  hoja.addEventListener('pointercancel', soltar);
}
