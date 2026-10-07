import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/axios';
import { hataMesajiSenkron } from '../utils/hataMesaji';

// Eski ve yeni belge ekranlarında işlem geçmişi, belgenin açılmasını bekletmez.
export default function useTesvikDetailData(resource, id) {
  const [tesvik, setTesvik] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activitiesError, setActivitiesError] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const requestRef = useRef(0);
  const identityRef = useRef({ resource, id });
  identityRef.current = { resource, id };

  const loadData = useCallback(async () => {
    const hasCurrentIdentity = () => identityRef.current.resource === resource && identityRef.current.id === id;
    // Başka belgeye geçildikten sonra tamamlanan bir PATCH, eski callback'i çağırabilir.
    if (!id || !hasCurrentIdentity()) return;
    const requestId = ++requestRef.current;
    const isCurrent = () => hasCurrentIdentity() && requestRef.current === requestId;
    setLoading(true);
    setError(null);
    setActivities([]);
    setActivitiesError(null);
    setActivitiesLoading(true);

    // İki istek bağımsız sonuçlanır: geçmiş yavaş ya da erişilemezken belge açılır.
    api.get('/activities', { params: { targetId: id } })
      .then((response) => {
        if (!isCurrent()) return;
        const data = response?.data?.data?.activities;
        setActivities(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!isCurrent()) return;
        setActivitiesError('İşlem geçmişi şu anda yüklenemedi.');
      })
      .finally(() => {
        if (isCurrent()) setActivitiesLoading(false);
      });

    try {
      const response = await api.get(`/${resource}/${id}`);
      if (!isCurrent()) return;
      setTesvik(response?.data?.data);
      setError(null);
    } catch (hata) {
      if (!isCurrent()) return;
      setError('Veri yüklenemedi: ' + hataMesajiSenkron(hata));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [resource, id]);

  useEffect(() => {
    loadData();
    // Önceki belge veya önceki yeniden denemeden gelen geç yanıtları yok say.
    return () => { requestRef.current += 1; };
  }, [loadData]);

  return { tesvik, activities, loading, error, activitiesError, activitiesLoading, loadData };
}
