// ════════════════════════════════════════════════════════════════════════════
// COMPRESIÓN DE PDF EN EL NAVEGADOR — sin dependencias externas
// ────────────────────────────────────────────────────────────────────────────
// Los respaldos de rendición son casi siempre boletas escaneadas o
// fotografiadas: PDFs cuyo peso está concentrado en una o dos imágenes JPEG
// incrustadas a la resolución máxima de la cámara. Este módulo las reencoda a
// una resolución legible y COMPACTA el documento: reescribe el archivo
// completo dejando solo la última versión de cada objeto, de modo que los
// bytes de las imágenes originales desaparecen de verdad.
//
// Algoritmo:
//   1. Localizar `startxref` y el trailer para conocer /Root, /Info, /ID y el
//      tipo de tabla de referencias (clásica o flujo XRef).
//   2. Indexar los objetos indirectos `N G obj … endobj` y sus límites exactos.
//   3. Mapear los objetos que viven dentro de flujos de objetos (/ObjStm),
//      inflando su cabecera para conocer qué número ocupa cada posición.
//   4. Reencodar los XObject de imagen con filtro /DCTDecode (JPEG): se
//      decodifican con createImageBitmap, se redibujan a escala reducida en un
//      canvas y se vuelven a codificar como JPEG.
//   5. Reescribir el archivo entero con una tabla de referencias nueva.
//   6. VERIFICAR el resultado (todos los desplazamientos apuntan a su objeto,
//      /Root sigue resolviendo a un /Catalog) antes de darlo por bueno.
//
// Salvaguardas: PDFs cifrados, filtros encadenados, máscaras, CMYK, cualquier
// excepción y cualquier resultado que no supere la verificación hacen que se
// devuelva el archivo ORIGINAL sin tocar. Comprimir nunca debe costar un
// respaldo contable.
// ════════════════════════════════════════════════════════════════════════════

export const PDF_OPCIONES_DEFAULT = {
  ladoMaximo: 1700,     // px del lado largo (~150 dpi en carta: texto legible)
  calidad: 0.62,        // calidad JPEG del reencodado
  gananciaMinima: 0.03, // no vale la pena reescribir por menos de un 3 %
};

const DELIMITADORES = '()<>[]{}/%';
const esBlanco = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0';
const esDelim  = (c) => DELIMITADORES.indexOf(c) >= 0;

/* ─────────────── Conversión bytes ↔ texto latin1 (índice 1:1) ─────────────── */
// latin1 asigna exactamente un carácter por byte, así que los índices del
// string coinciden con los desplazamientos del archivo. El texto solo se usa
// para ubicar posiciones; los datos binarios siempre se cortan del Uint8Array.
function aTexto(bytes) {
  return new TextDecoder('latin1').decode(bytes);
}
function aBytes(texto) {
  const out = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) out[i] = texto.charCodeAt(i) & 0xff;
  return out;
}

/* ─────────────── Analizador léxico mínimo de objetos PDF ─────────────── */
function saltarBlancos(s, i) {
  for (;;) {
    while (i < s.length && esBlanco(s[i])) i++;
    if (s[i] === '%') { while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i++; continue; }
    return i;
  }
}

function leerNombre(s, i) {          // i apunta a '/'
  let j = i + 1;
  while (j < s.length && !esBlanco(s[j]) && !esDelim(s[j])) j++;
  return { raw: s.slice(i, j), fin: j };
}

function finDeCadena(s, i) {         // i apunta a '('
  let nivel = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') { j++; continue; }
    if (c === '(') nivel++;
    else if (c === ')') { nivel--; if (nivel === 0) return j + 1; }
  }
  return s.length;
}

function finDeBloque(s, i, abre, cierra) {
  let nivel = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '(') { j = finDeCadena(s, j) - 1; continue; }
    if (s.startsWith(abre, j))  { nivel++; j += abre.length - 1; continue; }
    if (s.startsWith(cierra, j)) { nivel--; if (nivel === 0) return j + cierra.length; j += cierra.length - 1; }
  }
  return -1;
}

function leerValor(s, i) {
  i = saltarBlancos(s, i);
  const c = s[i];
  if (c === '<' && s[i + 1] === '<') {
    const fin = finDeBloque(s, i, '<<', '>>');
    if (fin < 0) throw new Error('diccionario sin cerrar');
    return { raw: s.slice(i, fin), fin };
  }
  if (c === '[') {
    const fin = finDeBloque(s, i, '[', ']');
    if (fin < 0) throw new Error('arreglo sin cerrar');
    return { raw: s.slice(i, fin), fin };
  }
  if (c === '(') { const fin = finDeCadena(s, i); return { raw: s.slice(i, fin), fin }; }
  if (c === '<') { const fin = s.indexOf('>', i) + 1; return { raw: s.slice(i, fin), fin }; }
  if (c === '/') { const n = leerNombre(s, i); return { raw: n.raw, fin: n.fin }; }

  // Token simple; puede ser el inicio de una referencia indirecta "N G R".
  let j = i;
  while (j < s.length && !esBlanco(s[j]) && !esDelim(s[j])) j++;
  const token = s.slice(i, j);
  if (/^\d+$/.test(token)) {
    const m = /^(\s+\d+\s+R)\b/.exec(s.slice(j));
    if (m) return { raw: token + m[1], fin: j + m[1].length };
  }
  return { raw: token, fin: j };
}

// Devuelve { mapa: { '/Clave': 'valor crudo' }, fin }
function leerDiccionario(s, i) {
  if (!s.startsWith('<<', i)) throw new Error('no es un diccionario');
  let j = i + 2;
  const mapa = {};
  for (;;) {
    j = saltarBlancos(s, j);
    if (s.startsWith('>>', j)) return { mapa, fin: j + 2 };
    if (j >= s.length) throw new Error('diccionario truncado');
    if (s[j] !== '/') throw new Error('clave inesperada');
    const clave = leerNombre(s, j);
    const valor = leerValor(s, clave.fin);
    mapa[clave.raw] = valor.raw.trim();
    j = valor.fin;
  }
}

/* ─────────────── Índice de objetos indirectos ─────────────── */
function indexarObjetos(s) {
  const objetos = new Map();
  const re = /(?:^|[^0-9])(\d{1,9})\s+(\d{1,5})\s+obj\b/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const num = parseInt(m[1], 10);
    const gen = parseInt(m[2], 10);
    // m[0] puede empezar con un carácter previo que no forma parte del objeto
    const inicio = m.index + (/^\d/.test(m[0]) ? 0 : 1);
    const cuerpo = saltarBlancos(s, m.index + m[0].length);
    // Las versiones posteriores del mismo objeto (updates incrementales) ganan.
    objetos.set(num, { num, gen, inicio, cuerpo });
    re.lastIndex = m.index + m[0].length;
  }
  return objetos;
}

function valorEntero(s, objetos, raw) {
  if (raw == null) return NaN;
  const directo = /^-?\d+$/.exec(String(raw).trim());
  if (directo) return parseInt(directo[0], 10);
  const ref = /^(\d+)\s+\d+\s+R$/.exec(String(raw).trim());
  if (!ref) return NaN;
  const obj = objetos.get(parseInt(ref[1], 10));
  if (!obj) return NaN;
  const num = /^\s*(-?\d+)/.exec(s.slice(obj.cuerpo, obj.cuerpo + 40));
  return num ? parseInt(num[1], 10) : NaN;
}

// Rellena dic, flujo (inicio/fin) y fin del objeto. Muta `obj`.
function analizarObjeto(s, objetos, obj) {
  if (obj.analizado) return obj;
  obj.analizado = true;
  obj.dic = null;
  obj.flujo = null;

  let i = obj.cuerpo;
  if (s.startsWith('<<', i)) {
    const d = leerDiccionario(s, i);
    obj.dic = d.mapa;
    i = saltarBlancos(s, d.fin);
    if (s.startsWith('stream', i)) {
      i += 6;
      if (s[i] === '\r') i++;
      if (s[i] === '\n') i++;
      const largo = valorEntero(s, objetos, d.mapa['/Length']);
      let fin = Number.isFinite(largo) && largo >= 0 ? i + largo : -1;
      if (fin < 0 || fin > s.length || !/^\s*endstream/.test(s.slice(fin, fin + 24))) {
        fin = s.indexOf('endstream', i);
        if (fin < 0) throw new Error('flujo sin cerrar en el objeto ' + obj.num);
        while (fin > i && (s[fin - 1] === '\n' || s[fin - 1] === '\r')) fin--;
      }
      obj.flujo = { inicio: i, fin };
      i = fin;
    }
  }
  const e = s.indexOf('endobj', i);
  if (e < 0) throw new Error('objeto ' + obj.num + ' sin endobj');
  obj.fin = e + 6;
  return obj;
}

/* ─────────────── Trailer y tipo de tabla de referencias ─────────────── */
function leerTrailer(s, objetos) {
  const idx = s.lastIndexOf('startxref');
  if (idx < 0) throw new Error('sin startxref');
  const m = /startxref\s+(\d+)/.exec(s.slice(idx, idx + 60));
  if (!m) throw new Error('startxref ilegible');
  const prev = parseInt(m[1], 10);
  if (!(prev > 0) || prev >= s.length) throw new Error('startxref fuera de rango');

  const cabecera = s.slice(prev, prev + 40);
  if (/^\s*xref\b/.test(cabecera)) {
    const t = s.indexOf('trailer', prev);
    if (t < 0) throw new Error('sin trailer');
    const d = leerDiccionario(s, saltarBlancos(s, t + 7));
    return { prev, tipo: 'tabla', dic: d.mapa };
  }
  // PDF 1.5+: la tabla es un objeto de flujo (/Type /XRef)
  const om = /^\s*(\d+)\s+(\d+)\s+obj/.exec(cabecera);
  if (!om) throw new Error('xref irreconocible');
  const obj = objetos.get(parseInt(om[1], 10));
  if (!obj) throw new Error('objeto xref ausente');
  const d = leerDiccionario(s, obj.cuerpo);
  return { prev, tipo: 'flujo', dic: d.mapa };
}

/* ─────────────── Flujos de objetos (/ObjStm) ─────────────── */
async function inflar(datos) {
  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

// Devuelve Map(numeroDeObjeto → { objstm, indice }) para todo lo que vive
// dentro de un /ObjStm: esos objetos no se pueden reescribir, pero sí hay que
// declararlos en la tabla de referencias nueva.
async function mapearFlujosDeObjetos(s, bytes, objetos) {
  const dentro = new Map();
  for (const obj of objetos.values()) {
    analizarObjeto(s, objetos, obj);
    if (!obj.dic || obj.dic['/Type'] !== '/ObjStm' || !obj.flujo) continue;
    if (obj.dic['/DecodeParms'] || obj.dic['/DP']) {
      throw new Error('flujo de objetos con predictor no soportado');
    }
    const crudo = bytes.subarray(obj.flujo.inicio, obj.flujo.fin);
    const filtro = String(obj.dic['/Filter'] || '').replace(/[[\]\s]/g, '');
    let plano;
    if (!filtro) plano = crudo;
    else if (filtro === '/FlateDecode') plano = await inflar(crudo);
    else throw new Error('flujo de objetos con filtro ' + filtro);

    const n     = valorEntero(s, objetos, obj.dic['/N']);
    const first = valorEntero(s, objetos, obj.dic['/First']);
    if (!Number.isFinite(n) || !Number.isFinite(first)) throw new Error('/ObjStm incompleto');
    const nums = aTexto(plano.subarray(0, first)).trim().split(/\s+/).map(Number);
    for (let k = 0; k < n; k++) {
      const numero = nums[2 * k];
      if (Number.isFinite(numero)) dentro.set(numero, { objstm: obj.num, indice: k });
    }
  }
  return dentro;
}

/* ─────────────── Reencodado de una imagen JPEG ─────────────── */
async function reencodarJPEG(datos, ladoMaximo, calidad) {
  const bitmap = await createImageBitmap(new Blob([datos], { type: 'image/jpeg' }));
  try {
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width  * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));

    let blob;
    if (typeof OffscreenCanvas === 'function') {
      const lienzo = new OffscreenCanvas(w, h);
      const ctx = lienzo.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await lienzo.convertToBlob({ type: 'image/jpeg', quality: calidad });
    } else {
      const lienzo = document.createElement('canvas');
      lienzo.width = w; lienzo.height = h;
      lienzo.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      blob = await new Promise((res, rej) => lienzo.toBlob(
        (b) => b ? res(b) : rej(new Error('canvas vacío')), 'image/jpeg', calidad));
    }
    return { bytes: new Uint8Array(await blob.arrayBuffer()), ancho: w, alto: h };
  } finally {
    bitmap.close?.();
  }
}

/* ─────────────── Escritura del documento compactado ─────────────── */
function agruparConsecutivos(nums) {
  const grupos = [];
  let ini = null, ult = null;
  for (const n of nums) {
    if (ini === null) { ini = ult = n; continue; }
    if (n === ult + 1) { ult = n; continue; }
    grupos.push([ini, ult - ini + 1]);
    ini = ult = n;
  }
  if (ini !== null) grupos.push([ini, ult - ini + 1]);
  return grupos;
}

function tokenTrailer(dic, clave) {
  return dic[clave] ? ` ${clave} ${dic[clave]}` : '';
}

// Reescribe el archivo completo: cabecera + cada objeto (con las imágenes ya
// reencodadas) + tabla de referencias nueva. Aquí es donde se recupera el
// espacio: los flujos viejos simplemente no se copian.
function escribirCompactado({ bytes, s, objetos, reemplazos, dentroDeFlujos, trailer }) {
  const partes = [];
  let pos = 0;
  const push  = (chunk) => { partes.push(chunk); pos += chunk.length; };
  const texto = (t) => push(aBytes(t));

  // Cabecera original (incluye el comentario binario que marca el archivo)
  const primerObjeto = Math.min(...[...objetos.values()].map(o => o.inicio));
  push(bytes.subarray(0, primerObjeto));

  const nums = [...objetos.keys()].sort((a, b) => a - b);
  const offsets = new Map();
  const gens    = new Map();

  for (const num of nums) {
    const obj = objetos.get(num);
    // Las tablas de referencias antiguas no se copian: se escribe una nueva.
    if (obj.dic && obj.dic['/Type'] === '/XRef') continue;
    offsets.set(num, pos);
    gens.set(num, obj.gen);
    const rep = reemplazos.get(num);
    if (rep) {
      texto(`${num} ${obj.gen} obj\n${rep.dic}\nstream\n`);
      push(rep.datos);
      texto('\nendstream\nendobj\n');
    } else {
      push(bytes.subarray(obj.inicio, obj.fin));
      texto('\n');
    }
  }

  const maximo   = nums[nums.length - 1];
  const comunes  = tokenTrailer(trailer.dic, '/Root') + tokenTrailer(trailer.dic, '/Info')
                 + tokenTrailer(trailer.dic, '/ID');
  const hayFlujos = dentroDeFlujos.size > 0;

  if (!hayFlujos) {
    // Tabla clásica: legal en cualquier versión de PDF y trivial de verificar.
    const inicioXref = pos;
    const listados = [0, ...nums.filter(n => offsets.has(n))];
    texto('xref\n');
    for (const [ini, cuenta] of agruparConsecutivos(listados)) {
      texto(`${ini} ${cuenta}\n`);
      for (let n = ini; n < ini + cuenta; n++) {
        // Cada entrada mide EXACTAMENTE 20 bytes: 10 de desplazamiento, un
        // espacio, 5 de generación, un espacio, el tipo y un fin de línea de
        // dos bytes. Un byte de más y la tabla entera se desalinea.
        texto(n === 0
          ? '0000000000 65535 f\r\n'
          : String(offsets.get(n)).padStart(10, '0') + ' ' +
            String(gens.get(n)).padStart(5, '0') + ' n\r\n');
      }
    }
    texto(`trailer\n<< /Size ${maximo + 1}${comunes} >>\nstartxref\n${inicioXref}\n%%EOF\n`);
  } else {
    // Con /ObjStm hace falta un flujo XRef: solo él admite entradas de tipo 2.
    const numXref = maximo + 1;
    const entradas = [{ num: 0, tipo: 0, a: 0, b: 65535 }];
    for (const n of nums) {
      if (offsets.has(n)) entradas.push({ num: n, tipo: 1, a: offsets.get(n), b: gens.get(n) });
    }
    for (const [n, ref] of dentroDeFlujos) {
      if (!offsets.has(n)) entradas.push({ num: n, tipo: 2, a: ref.objstm, b: ref.indice });
    }
    entradas.sort((x, y) => x.num - y.num);

    const inicioXref = pos;
    entradas.push({ num: numXref, tipo: 1, a: inicioXref, b: 0 });
    entradas.sort((x, y) => x.num - y.num);

    const indice = agruparConsecutivos(entradas.map(e => e.num)).flat();
    const datos = new Uint8Array(entradas.length * 7);
    entradas.forEach((e, k) => {
      const o = k * 7;
      datos[o]     = e.tipo;
      datos[o + 1] = (e.a >>> 24) & 0xff;
      datos[o + 2] = (e.a >>> 16) & 0xff;
      datos[o + 3] = (e.a >>> 8)  & 0xff;
      datos[o + 4] =  e.a         & 0xff;
      datos[o + 5] = (e.b >>> 8)  & 0xff;
      datos[o + 6] =  e.b         & 0xff;
    });
    texto(`${numXref} 0 obj\n<< /Type /XRef /Size ${numXref + 1} ` +
          `/Index [${indice.join(' ')}] /W [1 4 2]${comunes} ` +
          `/Length ${datos.length} >>\nstream\n`);
    push(datos);
    texto(`\nendstream\nendobj\nstartxref\n${inicioXref}\n%%EOF\n`);
  }

  const salida = new Uint8Array(pos);
  let cursor = 0;
  for (const p of partes) { salida.set(p, cursor); cursor += p.length; }
  return salida;
}

/* ─────────────── Verificación del resultado ─────────────── */
// Un respaldo contable corrupto es peor que uno pesado: antes de dar el
// archivo por bueno se comprueba que la tabla de referencias apunta a los
// objetos reales y que el catálogo del documento sigue resolviendo.
// Lee la tabla de referencias final y devuelve Map(numero → { tipo, a, b }).
// tipo 1 = objeto suelto en `a` (desplazamiento); tipo 2 = objeto dentro del
// /ObjStm número `a`, en la posición `b`.
function entradasXref(salida, s, objetos, trailer) {
  const entradas = new Map();
  const inicio = trailer.prev;

  if (trailer.tipo === 'tabla') {
    let i = inicio + 4;
    for (;;) {
      const cab = /^\s*(\d+)\s+(\d+)\s*[\r\n]+/.exec(s.slice(i, i + 40));
      if (!cab) break;
      const desde = parseInt(cab[1], 10), cuenta = parseInt(cab[2], 10);
      i += cab[0].length;
      for (let k = 0; k < cuenta; k++) {
        const entrada = s.slice(i, i + 20);
        if (entrada[17] === 'n') {
          entradas.set(desde + k, { tipo: 1, a: parseInt(entrada.slice(0, 10), 10), b: 0 });
        }
        i += 20;
      }
    }
    return entradas;
  }

  const obj = objetos.get(parseInt(/^\s*(\d+)/.exec(s.slice(inicio, inicio + 20))[1], 10));
  if (!obj) throw new Error('flujo XRef ausente');
  analizarObjeto(s, objetos, obj);
  if (!obj.flujo) throw new Error('flujo XRef sin datos');
  const indice = String(obj.dic['/Index'] || '').replace(/[[\]]/g, '').trim().split(/\s+/).map(Number);
  let k = 0;
  for (let p = 0; p < indice.length; p += 2) {
    for (let n = indice[p]; n < indice[p] + indice[p + 1]; n++, k++) {
      const o = obj.flujo.inicio + k * 7;
      const tipo = salida[o];
      if (tipo === 0) continue;
      const a = (salida[o + 1] * 16777216) + (salida[o + 2] << 16) + (salida[o + 3] << 8) + salida[o + 4];
      const b = (salida[o + 5] << 8) + salida[o + 6];
      entradas.set(n, { tipo, a, b });
    }
  }
  return entradas;
}

function verificar(salida) {
  const s = aTexto(salida);
  const objetos = indexarObjetos(s);
  const trailer = leerTrailer(s, objetos);
  const entradas = entradasXref(salida, s, objetos, trailer);
  if (!entradas.size) throw new Error('la tabla de referencias quedó vacía');

  for (const [num, e] of entradas) {
    if (e.tipo === 1) {
      if (!new RegExp('^' + num + '\\s+\\d+\\s+obj').test(s.slice(e.a, e.a + 24))) {
        throw new Error('la entrada xref del objeto ' + num + ' no apunta a su objeto');
      }
    } else if (e.tipo === 2) {
      // Objeto comprimido: su contenedor debe seguir existiendo y ser un /ObjStm
      const cont = entradas.get(e.a);
      if (!cont || cont.tipo !== 1) {
        throw new Error('el objeto ' + num + ' apunta a un flujo de objetos inexistente');
      }
      const stm = objetos.get(e.a);
      if (!stm || leerDiccionario(s, stm.cuerpo).mapa['/Type'] !== '/ObjStm') {
        throw new Error('el contenedor del objeto ' + num + ' no es un /ObjStm');
      }
    }
  }

  // /Root debe seguir resolviendo: suelto (y ser un /Catalog) o comprimido
  const raiz = /^(\d+)\s+\d+\s+R$/.exec(String(trailer.dic['/Root'] || '').trim());
  if (!raiz) throw new Error('trailer sin /Root');
  const numRaiz = parseInt(raiz[1], 10);
  const entradaRaiz = entradas.get(numRaiz);
  if (!entradaRaiz) throw new Error('/Root no figura en la tabla de referencias');
  if (entradaRaiz.tipo === 1) {
    const cat = objetos.get(numRaiz);
    if (!cat) throw new Error('/Root apunta a un objeto inexistente');
    if (leerDiccionario(s, cat.cuerpo).mapa['/Type'] !== '/Catalog') {
      throw new Error('/Root no es un /Catalog');
    }
  }
  return true;
}

/* ═══════════════════════ API PÚBLICA ═══════════════════════ */

/**
 * Comprime un PDF reencodando sus imágenes JPEG incrustadas y compactando el
 * documento. Nunca lanza por un PDF "raro": devuelve el original con el motivo.
 *
 * @returns {Promise<{blob: Blob, pesoOriginal: number, pesoFinal: number,
 *                    ahorro: number, imagenes: number, comprimido: boolean,
 *                    motivo: string}>}
 */
export async function comprimirPDF(archivo, opciones = {}) {
  const cfg = { ...PDF_OPCIONES_DEFAULT, ...opciones };
  // Costura para las pruebas: fuera del navegador no hay canvas, así que el
  // reencodador se puede sustituir sin tocar la lógica de estructura del PDF.
  const reencodar = cfg.reencodar || reencodarJPEG;

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const original = {
    blob: archivo instanceof Blob ? archivo : new Blob([bytes], { type: 'application/pdf' }),
    pesoOriginal: bytes.length,
    pesoFinal: bytes.length,
    ahorro: 0,
    imagenes: 0,
    comprimido: false,
    motivo: '',
  };

  try {
    const s = aTexto(bytes);
    if (!s.startsWith('%PDF-')) return { ...original, motivo: 'El archivo no es un PDF válido.' };

    const objetos = indexarObjetos(s);
    if (!objetos.size) return { ...original, motivo: 'No se encontraron objetos en el PDF.' };

    const trailer = leerTrailer(s, objetos);
    if (trailer.dic['/Encrypt']) {
      return { ...original, motivo: 'PDF protegido con contraseña: se guarda sin modificar.' };
    }

    const dentroDeFlujos = await mapearFlujosDeObjetos(s, bytes, objetos);

    const reemplazos = new Map();
    for (const obj of objetos.values()) {
      analizarObjeto(s, objetos, obj);
      const dic = obj.dic;
      if (!dic || dic['/Subtype'] !== '/Image' || !obj.flujo) continue;

      // Solo JPEG puro: filtros encadenados, JPEG2000 y máscaras 1-bit se dejan.
      const filtro = String(dic['/Filter'] || '').replace(/[[\]\s]/g, '');
      if (filtro !== '/DCTDecode') continue;
      if (String(dic['/ImageMask'] || '').trim() === 'true') continue;
      if (String(dic['/ColorSpace'] || '').trim() === '/DeviceCMYK') continue;

      const jpegOriginal = bytes.subarray(obj.flujo.inicio, obj.flujo.fin);
      if (!jpegOriginal.length) continue;

      let nuevo;
      try {
        nuevo = await reencodar(jpegOriginal, cfg.ladoMaximo, cfg.calidad);
      } catch {
        continue; // esta imagen no se pudo decodificar: se conserva intacta
      }
      if (nuevo.bytes.length >= jpegOriginal.length * 0.9) continue;

      // Diccionario reconstruido desde cero: solo las claves que siguen siendo
      // válidas tras el reencodado (el resultado siempre es RGB de 8 bits).
      const extras = ['/SMask', '/Mask', '/Intent', '/Interpolate']
        .filter(k => dic[k]).map(k => ` ${k} ${dic[k]}`).join('');
      reemplazos.set(obj.num, {
        datos: nuevo.bytes,
        dic: `<< /Type /XObject /Subtype /Image /Width ${nuevo.ancho} /Height ${nuevo.alto}` +
             ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode${extras}` +
             ` /Length ${nuevo.bytes.length} >>`,
      });
    }

    if (!reemplazos.size) {
      return { ...original, motivo: 'El PDF no tiene imágenes recomprimibles: ya está optimizado.' };
    }

    const salida = escribirCompactado({ bytes, s, objetos, reemplazos, dentroDeFlujos, trailer });
    const ganancia = 1 - salida.length / bytes.length;
    if (ganancia < cfg.gananciaMinima) {
      return { ...original, motivo: 'La recompresión no reducía el tamaño de forma apreciable.' };
    }

    verificar(salida); // lanza si el documento resultante no es coherente

    return {
      blob: new Blob([salida], { type: 'application/pdf' }),
      pesoOriginal: bytes.length,
      pesoFinal: salida.length,
      ahorro: ganancia,
      imagenes: reemplazos.size,
      comprimido: true,
      motivo: '',
    };
  } catch (e) {
    // Cualquier estructura inesperada: el original es siempre la opción segura.
    return { ...original, motivo: 'Estructura de PDF no reconocida (' + (e.message || 'error') + ').' };
  }
}

// Solo para las pruebas (tests/pdf/): permite verificar el analizador y el
// escritor sin depender de un navegador.
export const _internos = {
  aTexto, aBytes, leerDiccionario, indexarObjetos, leerTrailer, saltarBlancos,
  analizarObjeto, verificar,
};
