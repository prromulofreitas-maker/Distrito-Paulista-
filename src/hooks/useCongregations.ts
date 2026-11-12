import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Congregation } from '../constants/congregations';

export function useCongregations() {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'congregations'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        setCongregations(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Congregation, 'id'>) })));
        setLoading(false);
      },
      error => {
        console.error('Erro ao carregar congregações: ', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { congregations, loading };
}
