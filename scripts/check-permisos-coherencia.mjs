/**
 * Verificación estática del control de permisos por cargo.
 *
 * El catálogo de permisos vive en public/js/permisos.js, pero se consume desde
 * seis sitios distintos: el HTML del portal, la lógica del portal, el panel,
 * firestore.rules, storage.rules (con códigos cortos) y los sincronizadores de
 * custom claims. Si uno se desalinea, el fallo aparece en producción como un
 * permiso que no se aplica — justo lo que este control debe evitar.
 *
 * Comprueba además que no queden referencias muertas al DOM ni funciones
 * invocadas desde onclick que nadie exponga en window.
 *
 * Uso: npm run check:permisos
 */
import { readFileSync } from 'fs';

const leer = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const html    = leer('public/portal.html');
const FICHEROS = ['portal.js', 'panel-permisos.js', 'permisos.js', 'ui.js',
                  'storage.js', 'pdf-compress.js', 'auth.js', 'db.js', 'firebase.js'];
const js = Object.fromEntries(FICHEROS.map(f => [f, leer('public/js/' + f)]));
const reglasFs = leer('firestore.rules');
const reglasSt = leer('storage.rules');
const funcion  = leer('functions/src/index.ts');
const sync     = leer('scripts/sync-role-claims.mjs');
const seed     = leer('scripts/seed-permisos.mjs');
const pruebaFs = leer('tests/rules/permisos.test.mjs');

const problemas = [];
const anotar = (msg) => problemas.push(msg);
const todas = (texto, re) => [...texto.matchAll(re)].map(m => m[1]);

/* ── 1. Referencias al DOM ── */
// Los ids válidos son los del HTML más los que el propio JS genera (modales,
// tarjetas del panel), que aparecen como id="algo" dentro de una plantilla.
const ids = new Set(todas(html, /id="([\w-]+)"/g));
for (const texto of Object.values(js)) {
  for (const id of todas(texto, /id=["']([\w-]+)["']/g)) ids.add(id);
  for (const id of todas(texto, /\.id\s*=\s*["']([\w-]+)["']/g)) ids.add(id);
}
for (const fichero of ['portal.js', 'panel-permisos.js']) {
  for (const id of todas(js[fichero], /getElementById\('([\w-]+)'\)/g)) {
    if (!ids.has(id)) anotar(`[${fichero}] getElementById('${id}') no existe ni en el HTML ni generado por JS`);
  }
}

/* ── 2. Funciones invocadas desde onclick ── */
const asignadas = /Object\.assign\(window,\s*\{([\s\S]*?)\n\}\);/.exec(js['portal.js']);
const expuestas = new Set(asignadas ? todas(asignadas[1], /\b([A-Za-z_$][\w$]*)\s*(?:,|$)/gm) : []);
const enLinea = new Set(todas(html.replace(/[\s\S]*?<body>/, ''), /function\s+([A-Za-z_$][\w$]*)/g));

// Solo llamadas a función suelta: se descartan los métodos (algo.metodo()).
const invocadas = (texto) => {
  const out = new Set();
  for (const m of texto.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) out.add(m[2]);
  return out;
};
const PALABRAS = new Set(['if', 'for', 'while', 'return', 'typeof', 'catch', 'switch']);

for (const attr of todas(html, /on(?:click|change)="([^"]+)"/g)) {
  for (const fn of invocadas(attr)) {
    if (!PALABRAS.has(fn) && !expuestas.has(fn) && !enLinea.has(fn)) {
      anotar(`[portal.html] onclick invoca ${fn}() pero nadie lo expone en window`);
    }
  }
}
// onclick construidos como cadena desde el JS. Solo interesa el identificador
// que abre la expresión: lo que sigue suele ser concatenación de JavaScript
// (`onclick="verBoleta(\'' + esc(id) + '\')"`), no parte del HTML emitido.
for (const fichero of ['portal.js', 'panel-permisos.js']) {
  for (const m of js[fichero].matchAll(/onclick="([A-Za-z_$][\w$]*)\s*\(/g)) {
    const fn = m[1];
    if (!PALABRAS.has(fn) && !expuestas.has(fn) && !enLinea.has(fn)) {
      anotar(`[${fichero}] genera onclick=${fn}() pero nadie lo expone en window`);
    }
  }
}
for (const fn of expuestas) {
  if (!new RegExp(`\\b(?:async\\s+)?function\\s+${fn}\\b`).test(js['portal.js'])) {
    anotar(`[portal.js] expone ${fn} en window pero no lo define`);
  }
}

/* ── 3. Imports contra exports reales ── */
for (const [fichero, texto] of Object.entries(js)) {
  for (const m of texto.matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/([\w-]+\.js)'/g)) {
    const origen = m[2];
    if (!js[origen]) continue;
    for (const bruto of m[1].split(',')) {
      const nombre = bruto.trim().split(' as ')[0].trim();
      if (!nombre) continue;
      const exportado =
        new RegExp(`export\\s+(?:const|let|function|async function|class)\\s+${nombre}\\b`).test(js[origen])
        || new RegExp(`export\\s*\\{[^}]*\\b${nombre}\\b`).test(js[origen]);
      if (!exportado) anotar(`[${fichero}] importa '${nombre}' de ${origen}, que no lo exporta`);
    }
  }
}

/* ── 4. El catálogo de permisos, consumido desde todas partes ── */
const catalogo = new Set(todas(js['permisos.js'], /id:\s*'([\w.]+)',\s*codigo/g));
if (catalogo.size !== 16) anotar(`[permisos.js] se esperaban 16 permisos y hay ${catalogo.size}`);

for (const p of todas(html, /data-permiso="([\w.]+)"/g)) {
  if (!catalogo.has(p)) anotar(`[portal.html] data-permiso="${p}" no está en el catálogo`);
}
for (const p of [...todas(js['portal.js'], /puede\('([\w.]+)'\)/g),
                 ...todas(js['portal.js'], /exigir\('([\w.]+)'\)/g)]) {
  if (!catalogo.has(p)) anotar(`[portal.js] consulta el permiso '${p}', ausente del catálogo`);
}
for (const p of todas(reglasFs, /puede\('([\w.]+)'\)/g)) {
  if (!catalogo.has(p)) anotar(`[firestore.rules] usa el permiso '${p}', ausente del catálogo`);
}

/* ── 5. Códigos cortos del custom claim ── */
const mapa = (texto, re) => Object.fromEntries([...texto.matchAll(re)].map(m => [m[1], m[2]]));
const codigos = mapa(js['permisos.js'], /id:\s*'([\w.]+)',\s*codigo:\s*'(\w+)'/g);
const iguales = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

if (!iguales(codigos, mapa(funcion, /'([\w.]+)':\s*'(\w+)'/g))) {
  anotar('[functions/src/index.ts] su mapa de códigos no coincide con permisos.js');
}
if (!iguales(codigos, mapa(sync, /'([\w.]+)':\s*'(\w+)'/g))) {
  anotar('[scripts/sync-role-claims.mjs] su mapa de códigos no coincide con permisos.js');
}
const validos = new Set(Object.values(codigos));
for (const c of todas(reglasSt, /tienePerm\('(\w+)'\)/g)) {
  if (!validos.has(c)) anotar(`[storage.rules] usa el código '${c}', que no corresponde a ningún permiso`);
}

/* ── 6. Las tres copias de la matriz por defecto ── */
function extraerMatriz(texto, ancla) {
  const re = new RegExp(ancla + '\\s*=\\s*(?:Object\\.freeze\\()?\\{([\\s\\S]*?)\\n\\}\\)?;');
  const bloque = re.exec(texto);
  if (!bloque) return null;
  const out = {};
  for (const m of bloque[1].matchAll(/'?([\w-]+)'?:\s*\[([\s\S]*?)\]/g)) {
    out[m[1]] = todas(m[2], /'([\w.]+)'/g).sort();
  }
  return out;
}
const base = extraerMatriz(js['permisos.js'], 'MATRIZ_DEFAULT');
for (const [etiqueta, texto, ancla] of [
  ['scripts/seed-permisos.mjs', seed, 'MATRIZ_DEFAULT'],
  ['tests/rules/permisos.test.mjs', pruebaFs, 'const MATRIZ'],
]) {
  const otra = extraerMatriz(texto, ancla);
  if (!otra) { anotar(`[${etiqueta}] no se pudo leer su matriz por defecto`); continue; }
  if (JSON.stringify(base) !== JSON.stringify(otra)) {
    anotar(`[${etiqueta}] su matriz por defecto difiere de la de permisos.js`);
  }
}
for (const permisos of Object.values(base || {})) {
  for (const p of permisos) {
    if (!catalogo.has(p)) anotar(`[permisos.js] MATRIZ_DEFAULT cita '${p}', ausente del catálogo`);
  }
}

/* ── Resultado ── */
console.log(`Catálogo: ${catalogo.size} permisos · ids conocidos: ${ids.size} · funciones en window: ${expuestas.size}`);
if (problemas.length) {
  console.log(`\n${problemas.length} INCOHERENCIAS:`);
  problemas.forEach(p => console.log('  · ' + p));
  process.exit(1);
}
console.log('\nCoherencia verificada: DOM, exports, onclick, catálogo, códigos y las tres copias de la matriz.');
