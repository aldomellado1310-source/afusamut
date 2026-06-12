// Inicialización Firebase — SDK modular vía CDN (sin bundler).
// Este módulo centraliza la app y re-exporta las funciones del SDK
// para que el resto del código importe siempre desde './firebase.js'.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD0WAehAIV2-eSLVIiDKYidFXOfQjP4cow',
  // Mismo origen que el sitio publicado: con signInWithRedirect, si authDomain
  // es otro dominio (firebaseapp.com) los navegadores que bloquean storage de
  // terceros pierden el resultado del redirect ("Sin redirect pendiente").
  // Hosting sirve el handler /__/auth/* también en web.app.
  authDomain: 'afusamuth.web.app',
  projectId: 'afusamuth',
  storageBucket: 'afusamuth.firebasestorage.app',
  messagingSenderId: '1092576730993',
  appId: '1:1092576730993:web:c20ac282f89f4c7900a0d0',
  measurementId: 'G-6Y4W9HFLT6',
};

export const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// Re-exports del SDK (una sola versión para todo el portal)
export {
  GoogleAuthProvider, OAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export {
  doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  serverTimestamp, writeBatch, runTransaction, getCountFromServer,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export {
  ref, uploadBytes, getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
