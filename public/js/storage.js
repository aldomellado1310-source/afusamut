// Subida de archivos a Firebase Storage (reemplaza el base64 del demo).
import { storage, ref, uploadBytes, getDownloadURL } from './firebase.js';
import { comprimirPDF } from './pdf-compress.js';

// Redimensiona la imagen en el cliente — misma lógica y límite del demo.
export function resizeImage(file, max = 800, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen')),
          'image/jpeg', calidad
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Archivos que ya vienen renderizados en canvas (firma, documento compuesto):
// se conservan como PNG sin recomprimir a JPEG para no perder nitidez del texto.
const PNG_SIN_RECOMPRESION = ['firma.png', 'poder_documento.png'];

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const TIPO_PDF     = 'application/pdf';

// Tope que aplica storage.rules (mantener sincronizado con ese archivo).
export const MAX_PDF_BYTES    = 10 * 1024 * 1024;
export const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

export function esPDF(file) {
  return file && (file.type === TIPO_PDF || /\.pdf$/i.test(file.name || ''));
}

async function subirImagen(file, carpeta, max) {
  if (!TIPOS_IMAGEN.includes(file.type)) {
    throw new Error('Solo se aceptan imágenes JPG, PNG, WEBP o GIF.');
  }
  const blob = file.type === 'image/png' && PNG_SIN_RECOMPRESION.includes(file.name)
    ? file // ya viene lista desde un canvas, conservar PNG sin pérdida
    : await resizeImage(file, max);

  const ext        = blob.type === 'image/png' ? 'png' : 'jpg';
  const nombre     = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, `${carpeta}/${nombre}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return { url: await getDownloadURL(storageRef), peso: blob.size, nombre };
}

export async function uploadImagen(file, carpeta, max = 800) {
  return (await subirImagen(file, carpeta, max)).url;
}

/**
 * Sube un respaldo de rendición: fotografía/escaneo (JPG, PNG, WEBP, GIF) o
 * documento PDF. Las imágenes se redimensionan y los PDF pasan por el
 * compresor propio antes de viajar, para no llenar el bucket con escaneos
 * a resolución de cámara.
 *
 * @returns {Promise<{url:string, tipo:'imagen'|'pdf', peso:number,
 *                    pesoOriginal:number, ahorro:number, comprimido:boolean,
 *                    motivo:string, nombre:string}>}
 */
export async function uploadRespaldo(file, carpeta, { max = 900, onEstado } = {}) {
  if (esPDF(file)) {
    onEstado?.('Comprimiendo PDF…');
    const r = await comprimirPDF(file);
    if (r.pesoFinal > MAX_PDF_BYTES) {
      throw new Error(
        `El PDF pesa ${(r.pesoFinal / 1048576).toFixed(1)} MB y el máximo es 10 MB. ` +
        'Reduce el número de páginas o escanea en menor resolución.'
      );
    }
    const nombre     = `${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
    const storageRef = ref(storage, `${carpeta}/${nombre}`);
    onEstado?.('Subiendo documento…');
    await uploadBytes(storageRef, r.blob, { contentType: TIPO_PDF });
    return {
      url: await getDownloadURL(storageRef),
      tipo: 'pdf',
      nombre,
      peso: r.pesoFinal,
      pesoOriginal: r.pesoOriginal,
      ahorro: r.ahorro,
      comprimido: r.comprimido,
      motivo: r.motivo,
    };
  }

  if (!TIPOS_IMAGEN.includes(file.type)) {
    throw new Error('Formato no admitido. Sube una imagen (JPG, PNG, WEBP, GIF) o un PDF.');
  }
  onEstado?.('Subiendo imagen…');
  const pesoOriginal = file.size;
  const r = await subirImagen(file, carpeta, max);
  return {
    url: r.url, tipo: 'imagen', nombre: file.name || r.nombre,
    peso: r.peso, pesoOriginal,
    ahorro: pesoOriginal ? Math.max(0, 1 - r.peso / pesoOriginal) : 0,
    comprimido: r.peso < pesoOriginal,
    motivo: '',
  };
}
