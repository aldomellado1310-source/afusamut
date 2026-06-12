import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { RolUsuario } from '@/types/index';

// ── Sign in ────────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase Auth no configurado.');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Sign out ───────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

// ── Get role from Firestore ────────────────────────────────────────────────────
export async function getUserRole(uid: string): Promise<RolUsuario> {
  if (!db) return 'socio';
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (snap.exists()) {
    return (snap.data()?.['rol'] as RolUsuario) ?? 'socio';
  }
  // First-time user: create document with default role
  await setDoc(doc(db, 'usuarios', uid), { rol: 'socio' }, { merge: true });
  return 'socio';
}

// ── Auth state listener ────────────────────────────────────────────────────────
export function onAuthChange(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}
