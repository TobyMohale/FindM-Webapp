import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasRealSupabase = Boolean(supabaseUrl && supabaseAnonKey);

// Allow forcing mock mode to bypass email rate limits during evaluation / prototype testing
export const isForcedMock = (): boolean => {
  return localStorage.getItem('findme_force_mock') === 'true';
};

export const setForcedMock = (useMock: boolean) => {
  if (useMock) {
    localStorage.setItem('findme_force_mock', 'true');
  } else {
    localStorage.removeItem('findme_force_mock');
  }
};

let supabaseInstance: any;

if (hasRealSupabase && !isForcedMock()) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  if (hasRealSupabase) {
    console.warn('⚠️ Supabase credentials detected, but running with Mock Client bypass due to manual toggle or email rate limit.');
  } else {
    console.warn('⚠️ No Supabase credentials found. Running with Local Storage Mock Client.');
  }
  
  // Robust Mock Client for the AI Studio Preview environment
  const MOCK_DELAY = 300;
  const delay = () => new Promise(r => setTimeout(r, MOCK_DELAY));

  const getStore = (key: string) => {
    try { return JSON.parse(localStorage.getItem(`findme_${key}`) || '{}'); } 
    catch { return {}; }
  };
  const setStore = (key: string, val: any) => localStorage.setItem(`findme_${key}`, JSON.stringify(val));

  // Seed demo data if missing or has old default number
  const tags = getStore('tags');
  if (!tags['demo01'] || tags['demo01'].parent_whatsapp === '+27821234567') {
    tags['demo01'] = {
      tag_id: 'demo01',
      owner_id: 'mock-user-1',
      child_name: 'Amo Dlamini',
      avatar: '🦸‍♀️',
      parent_whatsapp: '',
      contacts: [{ name: 'Thandeka Dlamini', relation: 'Mom', phone: '', whatsapp: true }],
      medical: { allergies: 'Peanuts', conditions: 'Asthma', notes: '' },
      created_at: new Date().toISOString(),
      claimed_at: new Date().toISOString()
    };
    setStore('tags', tags);
  }

  const users = getStore('users');
  if (!users['mock-user-1']) {
    users['mock-user-1'] = { id: 'mock-user-1', email: 'parent@example.com', full_name: 'Parent User', popia_consent_accepted: true };
    setStore('users', users);
  }

  // Simulate currently logged in user
  let currentUser = localStorage.getItem('findme_session') ? users['mock-user-1'] : null;

  supabaseInstance = {
    auth: {
      getUser: async () => {
        await delay();
        return { data: { user: currentUser }, error: null };
      },
      signInWithOtp: async ({ email }: { email: string }) => {
        await delay();
        // Auto-login in mock
        currentUser = users['mock-user-1'];
        localStorage.setItem('findme_session', 'true');
        return { data: {}, error: null };
      },
      signOut: async () => {
        await delay();
        currentUser = null;
        localStorage.removeItem('findme_session');
        return { error: null };
      }
    },
    from: (table: string) => ({
      select: () => ({
        eq: async (col: string, val: string) => {
          await delay();
          const store = getStore(table);
          if (col === 'tag_id') {
            return { data: store[val] ? [store[val]] : [], error: null };
          }
          if (col === 'owner_id') {
            const matches = Object.values(store).filter((t: any) => t.owner_id === val);
            return { data: matches, error: null };
          }
          return { data: [], error: null };
        }
      }),
      update: (payload: any) => ({
        eq: async (col: string, val: string) => {
          await delay();
          const store = getStore(table);
          if (col === 'tag_id' && store[val]) {
            store[val] = { ...store[val], ...payload };
            setStore(table, store);
            return { data: [store[val]], error: null };
          }
          return { data: null, error: new Error('Record not found') };
        }
      }),
      insert: async (payload: any[]) => {
        await delay();
        const store = getStore(table);
        const rows = Array.isArray(payload) ? payload : [payload];
        rows.forEach((row: any) => {
          store[row.tag_id || row.id] = { ...row, created_at: new Date().toISOString() };
        });
        setStore(table, store);
        return { data: payload, error: null };
      }
    }),
    rpc: async (fn: string, params: any) => {
      await delay();
      if (fn === 'generate_tag_batch') {
        const batchSize = params.batch_size || 100;
        const store = getStore('tags');
        const generated = [];
        const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
        const genId = () => {
          let id = '';
          for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
          return id;
        };
        for (let i = 0; i < batchSize; i++) {
          let id = genId();
          while (store[id]) id = genId();
          store[id] = { tag_id: id, owner_id: null, contacts: [], medical: {}, created_at: new Date().toISOString() };
          generated.push({ generated_id: id });
        }
        setStore('tags', store);
        return { data: generated, error: null };
      }
      return { data: null, error: new Error('RPC not implemented in mock') };
    }
  };
}

export const supabase = supabaseInstance;
export const generateId = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export const cleanPhone = (p: string) => {
  let n = (p || '').replace(/[^\d+]/g, '');
  if (n.startsWith('0')) n = '+27' + n.slice(1);
  if (!n.startsWith('+')) n = '+' + n;
  return n;
};
