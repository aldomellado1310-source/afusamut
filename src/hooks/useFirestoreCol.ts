import { useEffect, useState } from 'react';
import type { Unsubscribe } from 'firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';

/**
 * Generic hook that subscribes to a Firestore collection via an onSnapshot
 * subscriber function. Falls back to the provided initial data when Firebase
 * is not configured (demo mode).
 */
export function useFirestoreCol<T>(
  subscribe: (cb: (data: T[]) => void) => Unsubscribe,
  fallback: T[],
): T[] {
  const [data, setData] = useState<T[]>(fallback);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = subscribe(setData);
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return data;
}
