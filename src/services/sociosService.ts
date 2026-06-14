import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Socio } from '@/types/index';

const COL = 'socios';

export function subscribeSocios(cb: (socios: Socio[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy('nombre'));
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Socio))),
    () => cb([]),
  );
}

export async function addSocio(data: Omit<Socio, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase no configurado.');
  const ref = await addDoc(collection(db, COL), data);
  return ref.id;
}

export async function updateSocio(id: string, data: Partial<Socio>): Promise<void> {
  if (!db) throw new Error('Firebase no configurado.');
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteSocio(id: string): Promise<void> {
  if (!db) throw new Error('Firebase no configurado.');
  await deleteDoc(doc(db, COL, id));
}
