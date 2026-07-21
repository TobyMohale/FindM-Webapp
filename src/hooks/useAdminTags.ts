import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAdminTags() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = async () => {
    try {
      setLoading(true);
      // Retrieve tags. Attempt to fetch nested profiles relation if available in real DB schema.
      // Falls back automatically to '*' if profiles selection triggers a client/schema mismatch on mock.
      const { data, error: err } = await supabase
        .from('tags')
        .select('*, profiles(child_name, parent_email, phone)')
        .order('created_at', { ascending: false });

      if (err) {
        // Fallback search with select('*') if profile joins are unsupported or fail
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('tags')
          .select('*');
        if (fallbackErr) throw fallbackErr;
        setTags(fallbackData || []);
      } else {
        setTags(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading administrative tag data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();

    // 2. Real-Time Subscription Setup using Supabase 'realtime'
    const channel = supabase
      .channel('admin-tags-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setTags((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTags((prev) =>
              prev.map((tag) => 
                tag.tag_id === payload.new.tag_id || tag.id === payload.new.id 
                  ? { ...tag, ...payload.new } 
                  : tag
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.tag_id || payload.old?.id;
            setTags((prev) => prev.filter((tag) => tag.tag_id !== deletedId && tag.id !== deletedId));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { tags, setTags, loading, error, refetch: fetchTags };
}
