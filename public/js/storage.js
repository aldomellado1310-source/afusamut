// Subida de archivos a Firebase Storage (reemplaza el base64 del demo).
import { storage, ref, uploadBytes, getDownloadURL } from './firebase.js';

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

export async function uploadImagen(file, carpeta, max = 800) {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Solo se aceptan imágenes JPG, PNG, WEBP o GIF.');
  }
  const blob = file.type === 'image/png' && file.name === 'firma.png'
    ? file // la firma del canvas ya viene lista, conservar PNG con fondo
    : await resizeImage(file, max);

  const ext        = blob.type === 'image/png' ? 'png' : 'jpg';
  const nombre     = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, `${carpeta}/${nombre}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return await getDownloadURL(storageRef);
}
