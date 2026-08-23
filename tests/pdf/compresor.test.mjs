/**
 * Pruebas del compresor de PDF (public/js/pdf-compress.js).
 *
 * Lo delicado del compresor no es reencodar el JPEG — eso lo hace el canvas —
 * sino reescribir la estructura del PDF sin corromperlo. Estas pruebas
 * construyen PDFs de laboratorio (tabla de referencias clásica, flujo XRef y
 * flujo de objetos comprimido), inyectan un reencodador de mentira y verifican
 * que el documento resultante es más liviano Y estructuralmente coherente:
 * los bytes de la imagen vieja desaparecen, cada desplazamiento de la tabla
 * apunta a su objeto y el catálogo sigue resolviendo.
 *
 * Uso: npm run test:pdf
 */
import { comprimirPDF, _internos } from '../../public/js/pdf-compress.js';

const { aTexto, indexarObjetos, leerDiccionario, verificar } = _internos;

let ok = 0;
const fallos = [];
function afirmar(cond, desc, extra) {
  if (cond) { ok++; console.log('  ✔ ' + desc); }
  else { fallos.push(desc + (extra ? ' → ' + extra : '')); console.log('  ✘ ' + desc + (extra ? ' → ' + extra : '')); }
}

/* ─────────────── Construcción de PDFs de laboratorio ─────────────── */
const enc = (t) => { const a = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i) & 0xff; return a; };
const unir = (trozos) => {
  const out = new Uint8Array(trozos.reduce((n, t) => n + t.length, 0));
  let k = 0;
  for (const t of trozos) { out.set(t, k); k += t.length; }
  return out;
};
async function desinflar(datos) {
  const flujo = new Blob([datos]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

// Relleno determinístico que jamás forma la secuencia "N G obj"
function jpegFalso(n, semilla = 7) {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = (i * semilla + 33) % 251;
  a[0] = 0xff; a[1] = 0xd8;             // SOI
  a[n - 2] = 0xff; a[n - 1] = 0xd9;     // EOI
  return a;
}
const IMG_BYTES = jpegFalso(40000);
const FIRMA_IMG = IMG_BYTES.subarray(20000, 20048); // rastro para comprobar que desaparece

const OBJ_IMAGEN = (num) => ({
  cabecera: `${num} 0 obj\n<< /Type /XObject /Subtype /Image /Width 3000 /Height 4000 ` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${IMG_BYTES.length} >>\nstream\n`,
  cola: '\nendstream\nendobj\n',
});

// PDF de una página con una imagen /DCTDecode y tabla de referencias clásica
// o en flujo, según se pida.
function construirPDF({ xref = 'tabla' } = {}) {
  const cuerpos = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
      '/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Length 44 >>\nstream\nq 612 0 0 792 0 0 cm /Im0 Do Q         \nendstream\nendobj\n',
  ];

  const trozos = [enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  const offsets = {};
  let pos = trozos[0].length;
  cuerpos.forEach((c, i) => {
    offsets[i + 1] = pos;
    const b = enc(c);
    trozos.push(b);
    pos += b.length;
  });

  offsets[5] = pos;
  const img = OBJ_IMAGEN(5);
  trozos.push(enc(img.cabecera), IMG_BYTES, enc(img.cola));
  pos += img.cabecera.length + IMG_BYTES.length + img.cola.length;

  if (xref === 'tabla') {
    const inicioXref = pos;
    let tabla = 'xref\n0 6\n0000000000 65535 f\r\n';
    for (let n = 1; n <= 5; n++) tabla += String(offsets[n]).padStart(10, '0') + ' 00000 n\r\n';
    tabla += 'trailer\n<< /Size 6 /Root 1 0 R /ID [<AABB> <AABB>] >>\nstartxref\n' + inicioXref + '\n%%EOF\n';
    trozos.push(enc(tabla));
  } else {
    const inicioXref = pos;
    const entradas = [[0, 0, 65535], [1, offsets[1], 0], [2, offsets[2], 0], [3, offsets[3], 0],
                      [4, offsets[4], 0], [5, offsets[5], 0], [1, inicioXref, 0]];
    const datos = new Uint8Array(entradas.length * 7);
    entradas.forEach(([tipo, a, b], k) => {
      const o = k * 7;
      datos[o] = k === 0 ? 0 : 1;
      datos[o + 1] = (a >>> 24) & 0xff; datos[o + 2] = (a >>> 16) & 0xff;
      datos[o + 3] = (a >>> 8) & 0xff;  datos[o + 4] = a & 0xff;
      datos[o + 5] = (b >>> 8) & 0xff;  datos[o + 6] = b & 0xff;
    });
    trozos.push(enc('6 0 obj\n<< /Type /XRef /Size 7 /Index [0 7] /W [1 4 2] /Root 1 0 R ' +
      '/ID [<AABB> <AABB>] /Length ' + datos.length + ' >>\nstream\n'));
    trozos.push(datos);
    trozos.push(enc('\nendstream\nendobj\nstartxref\n' + inicioXref + '\n%%EOF\n'));
  }
  return unir(trozos);
}

// PDF 1.5 con catálogo, páginas y página dentro de un /ObjStm comprimido:
// el caso que producen los escáneres y "imprimir a PDF" modernos.
async function construirPDFConFlujoDeObjetos() {
  const internos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
      '/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
  ];
  let cuerpo = '';
  const pares = [];
  internos.forEach((txt, i) => {
    pares.push((i + 1) + ' ' + cuerpo.length);
    cuerpo += txt + '\n';
  });
  const cabecera = pares.join(' ') + '\n';
  const plano = enc(cabecera + cuerpo);
  const comprimido = await desinflar(plano);

  const trozos = [enc('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n')];
  const offsets = {};
  let pos = trozos[0].length;

  offsets[4] = pos;
  const contenido = enc('4 0 obj\n<< /Length 44 >>\nstream\nq 612 0 0 792 0 0 cm /Im0 Do Q         \nendstream\nendobj\n');
  trozos.push(contenido); pos += contenido.length;

  offsets[5] = pos;
  const img = OBJ_IMAGEN(5);
  trozos.push(enc(img.cabecera), IMG_BYTES, enc(img.cola));
  pos += img.cabecera.length + IMG_BYTES.length + img.cola.length;

  offsets[6] = pos;
  const cabObjStm = enc(`6 0 obj\n<< /Type /ObjStm /N 3 /First ${cabecera.length} ` +
    `/Filter /FlateDecode /Length ${comprimido.length} >>\nstream\n`);
  const colaObjStm = enc('\nendstream\nendobj\n');
  trozos.push(cabObjStm, comprimido, colaObjStm);
  pos += cabObjStm.length + comprimido.length + colaObjStm.length;

  const inicioXref = pos;
  const entradas = [
    { t: 0, a: 0, b: 65535 },
    { t: 2, a: 6, b: 0 }, { t: 2, a: 6, b: 1 }, { t: 2, a: 6, b: 2 },
    { t: 1, a: offsets[4], b: 0 }, { t: 1, a: offsets[5], b: 0 }, { t: 1, a: offsets[6], b: 0 },
    { t: 1, a: inicioXref, b: 0 },
  ];
  const datos = new Uint8Array(entradas.length * 7);
  entradas.forEach((e, k) => {
    const o = k * 7;
    datos[o] = e.t;
    datos[o + 1] = (e.a >>> 24) & 0xff; datos[o + 2] = (e.a >>> 16) & 0xff;
    datos[o + 3] = (e.a >>> 8) & 0xff;  datos[o + 4] = e.a & 0xff;
    datos[o + 5] = (e.b >>> 8) & 0xff;  datos[o + 6] = e.b & 0xff;
  });
  trozos.push(enc(`7 0 obj\n<< /Type /XRef /Size 8 /Index [0 8] /W [1 4 2] /Root 1 0 R ` +
    `/ID [<AABB> <AABB>] /Length ${datos.length} >>\nstream\n`));
  trozos.push(datos);
  trozos.push(enc('\nendstream\nendobj\nstartxref\n' + inicioXref + '\n%%EOF\n'));
  return unir(trozos);
}

const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });

// Reencodador de mentira: devuelve una imagen mucho más pequeña, sin canvas.
const reencodarFalso = async (datos, ladoMaximo) => ({
  bytes: jpegFalso(Math.max(64, Math.round(datos.length / 8)), 11),
  ancho: Math.min(1700, ladoMaximo),
  alto: Math.round(Math.min(1700, ladoMaximo) * 4 / 3),
});

/* ─────────────── Utilidades de verificación ─────────────── */
function contiene(bytes, aguja) {
  buscar: for (let i = 0; i <= bytes.length - aguja.length; i++) {
    for (let k = 0; k < aguja.length; k++) if (bytes[i + k] !== aguja[k]) continue buscar;
    return true;
  }
  return false;
}

async function revisarSalida(r, original, etiqueta) {
  afirmar(r.comprimido === true, etiqueta + ': se comprime', r.motivo);
  afirmar(r.imagenes === 1, etiqueta + ': detecta la única imagen JPEG', 'imagenes=' + r.imagenes);
  afirmar(r.pesoFinal < r.pesoOriginal * 0.5,
    etiqueta + ': el archivo pesa menos de la mitad',
    r.pesoOriginal + ' → ' + r.pesoFinal);

  const salida = new Uint8Array(await r.blob.arrayBuffer());
  const texto  = aTexto(salida);

  afirmar(contiene(original, FIRMA_IMG), etiqueta + ': (control) la imagen original estaba en el archivo de partida');
  afirmar(!contiene(salida, FIRMA_IMG),
    etiqueta + ': los bytes de la imagen original ya no están en el archivo');

  const objetos = indexarObjetos(texto);
  const obj5 = objetos.get(5);
  const dic5 = leerDiccionario(texto, obj5.cuerpo).mapa;
  afirmar(dic5['/Width'] === '1700', etiqueta + ': el ancho se actualizó a la nueva resolución', dic5['/Width']);
  afirmar(dic5['/Filter'] === '/DCTDecode', etiqueta + ': sigue siendo un JPEG incrustado', dic5['/Filter']);

  const largo5 = parseInt(dic5['/Length'], 10);
  let iniStream = texto.indexOf('stream', obj5.cuerpo) + 6;
  if (texto[iniStream] === '\r') iniStream++;
  if (texto[iniStream] === '\n') iniStream++;
  afirmar(texto.slice(iniStream + largo5, iniStream + largo5 + 12).trim().startsWith('endstream'),
    etiqueta + ': /Length coincide exactamente con los bytes del flujo');

  let verificado = true, error = '';
  try { verificar(salida); } catch (e) { verificado = false; error = e.message; }
  afirmar(verificado, etiqueta + ': la tabla de referencias apunta a los objetos reales', error);

  afirmar(/\/Root\s+1\s+0\s+R/.test(texto.slice(-400)), etiqueta + ': se conserva /Root');
  afirmar(/\/ID\s*\[/.test(texto.slice(-400)), etiqueta + ': se conserva /ID');
  afirmar(texto.trimEnd().endsWith('%%EOF'), etiqueta + ': el archivo termina en %%EOF');
  return { salida, texto, objetos };
}

/* ═══════════════ PRUEBAS ═══════════════ */
for (const tipo of ['tabla', 'flujo']) {
  console.log(`\n── PDF con tabla de referencias tipo "${tipo}" ──`);
  const original = construirPDF({ xref: tipo });
  const r = await comprimirPDF(pdfBlob(original), { reencodar: reencodarFalso });
  const { texto } = await revisarSalida(r, original, tipo);
  // Sin /ObjStm siempre se escribe una tabla clásica: es la más simple de leer
  afirmar(/startxref\s+(\d+)/.test(texto), tipo + ': hay un startxref final');
  const inicio = parseInt(/startxref\s+(\d+)\s*%%EOF\s*$/.exec(texto.trimEnd() + '\n')[1], 10);
  afirmar(/^\s*xref\b/.test(texto.slice(inicio, inicio + 12)),
    tipo + ': el documento compactado usa tabla clásica');
}

{
  console.log('\n── PDF 1.5 con flujo de objetos (/ObjStm) comprimido ──');
  const original = await construirPDFConFlujoDeObjetos();
  const r = await comprimirPDF(pdfBlob(original), { reencodar: reencodarFalso });
  const { texto, salida } = await revisarSalida(r, original, 'objstm');

  const inicio = parseInt(/startxref\s+(\d+)\s*%%EOF\s*$/.exec(texto.trimEnd() + '\n')[1], 10);
  afirmar(/^\s*\d+\s+0\s+obj/.test(texto.slice(inicio, inicio + 16)),
    'objstm: la tabla nueva es un flujo XRef (única forma de declarar objetos comprimidos)');
  const dicX = leerDiccionario(texto, texto.indexOf('<<', inicio)).mapa;
  afirmar(dicX['/Type'] === '/XRef', 'objstm: el objeto final es /Type /XRef');

  // Los objetos 1, 2 y 3 deben seguir declarados como tipo 2 dentro del /ObjStm
  let iniX = texto.indexOf('stream', inicio) + 6;
  if (texto[iniX] === '\r') iniX++;
  if (texto[iniX] === '\n') iniX++;
  const indice = dicX['/Index'].replace(/[[\]]/g, '').trim().split(/\s+/).map(Number);
  const porNumero = new Map();
  let k = 0;
  for (let p = 0; p < indice.length; p += 2) {
    for (let n = indice[p]; n < indice[p] + indice[p + 1]; n++, k++) {
      porNumero.set(n, { tipo: salida[iniX + k * 7], a: salida[iniX + k * 7 + 4] });
    }
  }
  afirmar([1, 2, 3].every(n => porNumero.get(n)?.tipo === 2),
    'objstm: catálogo, páginas y página siguen declarados dentro del flujo de objetos');
  afirmar([1, 2, 3].every(n => porNumero.get(n)?.a === 6),
    'objstm: apuntan al objeto 6, que es el /ObjStm');
  afirmar(porNumero.get(5)?.tipo === 1, 'objstm: la imagen sigue siendo un objeto de primer nivel');
}

/* ─────────────── Salvaguardas ─────────────── */
console.log('\n── Salvaguardas: ante la duda, el original ──');

{
  const base = construirPDF({ xref: 'tabla' });
  const sinImagenes = enc(aTexto(base).replace('/Subtype /Image', '/Subtype /Forma'));
  const r = await comprimirPDF(pdfBlob(sinImagenes), { reencodar: reencodarFalso });
  afirmar(!r.comprimido && r.pesoFinal === sinImagenes.length,
    'un PDF sin imágenes recomprimibles se devuelve tal cual');
  afirmar(/optimizado/.test(r.motivo), 'y explica por qué', r.motivo);
}

{
  const cifrado = enc(aTexto(construirPDF({ xref: 'tabla' }))
    .replace('/Size 6 /Root', '/Encrypt 9 0 R /Size 6 /Root'));
  const r = await comprimirPDF(pdfBlob(cifrado), { reencodar: reencodarFalso });
  afirmar(!r.comprimido && /contraseña/.test(r.motivo), 'un PDF cifrado no se toca', r.motivo);
}

{
  const r = await comprimirPDF(pdfBlob(enc('esto no es un pdf en absoluto')), { reencodar: reencodarFalso });
  afirmar(!r.comprimido && /no es un PDF/.test(r.motivo),
    'un archivo que no es PDF se rechaza con mensaje claro');
}

{
  const roto = enc(aTexto(construirPDF({ xref: 'tabla' })).replace(/startxref\s+\d+/, 'startxref 999999999'));
  const r = await comprimirPDF(pdfBlob(roto), { reencodar: reencodarFalso });
  afirmar(!r.comprimido && r.pesoFinal === roto.length,
    'un PDF con la tabla de referencias corrupta se devuelve intacto', r.motivo);
}

{
  const base = construirPDF({ xref: 'tabla' });
  const r = await comprimirPDF(pdfBlob(base), {
    reencodar: async (datos) => ({ bytes: jpegFalso(datos.length, 13), ancho: 100, alto: 100 }),
  });
  afirmar(!r.comprimido, 'si la recompresión no reduce el tamaño, se conserva el original', r.motivo);
}

{
  const base = construirPDF({ xref: 'tabla' });
  const r = await comprimirPDF(pdfBlob(base), {
    reencodar: async () => { throw new Error('canvas no disponible'); },
  });
  afirmar(!r.comprimido && /optimizado/.test(r.motivo),
    'si el navegador no puede decodificar la imagen, el PDF se sube sin tocar');
}

console.log('\n════════════════════════════════════════');
console.log(`Comprobaciones superadas: ${ok} · fallidas: ${fallos.length}`);
if (fallos.length) {
  console.log('\nFALLOS:');
  fallos.forEach(f => console.log('  · ' + f));
  process.exit(1);
}
console.log('El compresor de PDF produce archivos más livianos y estructuralmente correctos.');
