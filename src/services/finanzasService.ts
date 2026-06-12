import {
  collection, doc, addDoc, deleteDoc,
  onSnapshot, query, orderBy, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Movimiento } from '@/types/index';

const COL = 'movimientos';

export function subscribeFinanzas(cb: (movimientos: Movimiento[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy('fecha', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Movimiento)));
  });
}

export async function addMovimiento(data: Omit<Movimiento, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase no configurado.');
  const ref = await addDoc(collection(db, COL), data);
  return ref.id;
}

export async function deleteMovimiento(id: string): Promise<void> {
  if (!db) throw new Error('Firebase no configurado.');
  await deleteDoc(doc(db, COL, id));
}
