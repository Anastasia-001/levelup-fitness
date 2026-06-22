import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authRevision = 0;

    const loadSession = async () => {
      const revision = authRevision;
      const { data, error } = await supabase.auth.getSession();
      if (!mounted || revision !== authRevision) return;
      if (error && __DEV__) console.warn('[LevelUp auth] Initial session failed.', error);
      setSession(data.session);
      setLoading(false);
    };

    void loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authRevision += 1;
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
};
