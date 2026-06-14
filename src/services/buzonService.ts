import {
  collection, doc, addDoc, updateDoc,
  onSnapshot, query, orderBy, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ticket } from '@/types/index';

const COL = 'tickets';

export function subscribeBuzon(cb: (tickets: Ticket[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy('fecha', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket)));
  });
}

export async function addTicket(data: Omit<Ticket, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase no configurado.');
  const ref = await addDoc(collection(db, COL), data);
  return ref.id;
}

export async function resolverTicket(id: string, respuesta: string): Promise<void> {
  if (!db) throw new Error('Firebase no configurado.');
  await updateDoc(doc(db, COL, id), { estado: 'Resuelto', respuesta });
}
