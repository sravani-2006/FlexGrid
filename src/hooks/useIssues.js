import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('public:issues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, (payload) => {
        console.log('Real-time change received:', payload);
        if (payload.eventType === 'INSERT') {
          setIssues((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setIssues((prev) => prev.map((i) => (i.id === payload.new.id ? payload.new : i)));
        } else if (payload.eventType === 'DELETE') {
          setIssues((prev) => prev.filter((i) => i.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { issues, loading, error, fetchIssues, refresh: fetchIssues };
};
