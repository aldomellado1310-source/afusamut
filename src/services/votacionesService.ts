import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, arrayUnion, increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Votacion } from '@/types/index';

const COL = 'votaciones';

export function subscribeVotaciones(cb: (votaciones: Votacion[]) => void): Unsubscribe {
  if (!db) return () => {};
  const q = query(collection(db, COL), orderBy('fechaInicio', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Votacion)));
  });
}

export async function addVotacion(data: Omit<Votacion, 'id'>): Promise<string> {
  if (!db) throw new Error('Firebase no configurado.');
  const ref = await addDoc(collection(db, COL), data);
  return ref.id;
}

export async function updateVotacion(id: string, data: Partial<Votacion>): Promise<void> {
  if (!db) throw new Error('Firebase no configurado.');
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

/**
 * Emite un voto de forma atómica:
 * - Incrementa votosRecibidos
 * - Incrementa el índice correcto en votosPorOpcion
 * - Registra el uid del votante para evitar doble voto
 */
export async function emitirVoto(
  votacionId: string,
  opcionIndex: number,
  uid: string,
): Promise<void> {
  if (!db) throw new Error('Firebase no configurado.');
  const ref = doc(db, COL, votacionId);

  // Build the field path for the specific index using dot notation
  const updateData: Record<string, unknown> = {
    votosRecibidos: increment(1),
    votantes: arrayUnion(uid),
  };
  // Firestore doesn't support array element increment directly,
  // so we store votosPorOpcion as a map keyed by index string
  updateData[`votos.${opcionIndex}`] = increment(1);

  await updateDoc(ref, updateData);
}

export async function deleteVotacion(id: string): Promise<void> {
  if (!db) throw new Error('Firebase no configurado.');
  await deleteDoc(doc(db, COL, id));
}
