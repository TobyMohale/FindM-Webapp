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

  const getStore = async (key: string): Promise<any> => {
    try {
      const res = await fetch(`/api/mock-db/${key}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch from server db, falling back to local storage:", e);
    }
    try { return JSON.parse(localStorage.getItem(`findme_${key}`) || (key === 'orders' ? '[]' : '{}')); } 
    catch { return key === 'orders' ? [] : {}; }
  };

  const setStore = async (key: string, val: any): Promise<void> => {
    try {
      await fetch(`/api/mock-db/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: val })
      });
    } catch (e) {
      console.warn("Could not save to server db, falling back to local storage:", e);
    }
    localStorage.setItem(`findme_${key}`, JSON.stringify(val));
  };

  // Simulate currently logged in user
  let currentUser: any = null;
  if (localStorage.getItem('findme_session')) {
    const saved = localStorage.getItem('findme_current_user');
    if (saved) {
      try { currentUser = JSON.parse(saved); } catch { currentUser = { id: 'mock-user-1', email: 'parent@example.com', full_name: 'Parent User', popia_consent_accepted: true }; }
    } else {
      currentUser = { id: 'mock-user-1', email: 'parent@example.com', full_name: 'Parent User', popia_consent_accepted: true };
    }
  }

  // Real-time subscribers list for the Mock Client
  const mockListeners: Array<{
    channel: string;
    table: string;
    event: string;
    callback: (payload: any) => void;
  }> = [];

  const notifyMockListeners = (table: string, eventType: string, payload: any) => {
    mockListeners.forEach((l) => {
      if (l.table === table && (l.event === '*' || l.event === eventType)) {
        l.callback({
          eventType,
          new: payload,
          old: eventType === 'UPDATE' ? { id: payload.id || payload.tag_id } : undefined,
          schema: 'public',
          table
        });
      }
    });
  };

  supabaseInstance = {
    auth: {
      getUser: async () => {
        await delay();
        return { data: { user: currentUser }, error: null };
      },
      getSession: async () => {
        await delay();
        return { data: { session: currentUser ? { user: currentUser, access_token: 'mock-token', expires_at: 9999999999 } : null }, error: null };
      },
      signInWithOtp: async ({ email }: { email: string }) => {
        await delay();
        currentUser = { id: 'mock-user-1', email, full_name: 'Parent User', popia_consent_accepted: true };
        localStorage.setItem('findme_session', 'true');
        localStorage.setItem('findme_current_user', JSON.stringify(currentUser));
        return { data: { user: currentUser }, error: null };
      },
      signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
        await delay();
        const usersStore: Record<string, any> = await getStore('users');
        let matchedUser = (Object.values(usersStore) as any[]).find((u: any) => u.email === email);
        if (!matchedUser) {
          // Auto register on mock if not exists, or just simulate successful login
          matchedUser = { id: 'mock-' + Math.random().toString(36).substr(2, 9), email, popia_consent_accepted: true };
          usersStore[matchedUser.id] = matchedUser;
          await setStore('users', usersStore);
        }
        currentUser = matchedUser;
        localStorage.setItem('findme_session', 'true');
        localStorage.setItem('findme_current_user', JSON.stringify(currentUser));
        return { data: { user: currentUser }, error: null };
      },
      signUp: async ({ email, password }: { email: string; password?: string }) => {
        await delay();
        const usersStore: Record<string, any> = await getStore('users');
        let matchedUser = (Object.values(usersStore) as any[]).find((u: any) => u.email === email);
        if (matchedUser) {
          return { data: { user: null }, error: new Error('User already exists.') };
        }
        const newUser = { id: 'mock-' + Math.random().toString(36).substr(2, 9), email, popia_consent_accepted: true };
        usersStore[newUser.id] = newUser;
        await setStore('users', usersStore);
        currentUser = newUser;
        localStorage.setItem('findme_session', 'true');
        localStorage.setItem('findme_current_user', JSON.stringify(currentUser));
        return { data: { user: newUser }, error: null };
      },
      signOut: async () => {
        await delay();
        currentUser = null;
        localStorage.removeItem('findme_session');
        localStorage.removeItem('findme_current_user');
        return { error: null };
      },
      resetPasswordForEmail: async (email: string, options?: any) => {
        await delay();
        const usersStore: Record<string, any> = await getStore('users');
        const matchedUser = (Object.values(usersStore) as any[]).find((u: any) => u.email === email);
        if (!matchedUser) {
          return { data: null, error: new Error('No user found with this email address.') };
        }
        // Save a mock reset state in localStorage to verify/test
        localStorage.setItem('findme_mock_reset_email', email);
        return { data: {}, error: null };
      },
      signInWithOAuth: async ({ provider, options }: { provider: string; options?: any }) => {
        await delay();
        currentUser = { id: 'admin-owner', email: 'findmewebapp7@gmail.com', full_name: 'Lead Admin', popia_consent_accepted: true };
        localStorage.setItem('findme_session', 'true');
        localStorage.setItem('findme_current_user', JSON.stringify(currentUser));
        return { data: { provider, url: options?.redirectTo || '/' }, error: null };
      },
      updateUser: async (attributes: { password?: string; data?: any }) => {
        await delay();
        if (attributes.password) {
          console.log('Mock password updated successfully');
        }
        return { data: { user: currentUser || { email: 'mock@example.com' } }, error: null };
      }
    },
    from: (table: string) => {
      const actualTable = table === 'profiles' ? 'users' : table;
      return {
        select: (fieldsStr?: string) => {
          const chain: any = {
            _col: null,
            _val: null,
            _orderCol: null,
            _orderAsc: true,
            eq: function(col: string, val: any) {
              this._col = col;
              this._val = val;
              return this;
            },
            order: function(col: string, opts?: any) {
              this._orderCol = col;
              this._orderAsc = opts?.ascending ?? true;
              return this;
            },
            then: async function(onfulfilled: any) {
              await delay();
              const store = await getStore(actualTable);
              let items = Array.isArray(store) ? store : Object.values(store);
              if (this._col) {
                if (this._col === 'tag_id' || this._col === 'id' || this._col === 'code') {
                  const directMatch = !Array.isArray(store) && store[this._val] ? [store[this._val]] : [];
                  if (directMatch.length > 0) {
                    items = directMatch;
                  } else {
                    items = items.filter((item: any) => 
                      item && (
                        item[this._col] === this._val ||
                        item.tag_id === this._val ||
                        item.id === this._val ||
                        item.code === this._val
                      )
                    );
                  }
                } else {
                  items = items.filter((item: any) => item && item[this._col] === this._val);
                }
              }
              if (this._orderCol) {
                items.sort((a: any, b: any) => {
                  const valA = a[this._orderCol];
                  const valB = b[this._orderCol];
                  if (valA < valB) return this._orderAsc ? -1 : 1;
                  if (valA > valB) return this._orderAsc ? 1 : -1;
                  return 0;
                });
              }
              return onfulfilled({ data: items, error: null });
            }
          };
          return chain;
        },
        update: (payload: any) => ({
          eq: async (col: string, val: string) => {
            await delay();
            const store = await getStore(actualTable);
            let updated: any[] = [];

            if (!Array.isArray(store) && store[val]) {
              store[val] = { ...store[val], ...payload };
              updated.push(store[val]);
              notifyMockListeners(actualTable, 'UPDATE', store[val]);
            } else if (Array.isArray(store)) {
              for (let i = 0; i < store.length; i++) {
                if (store[i] && (store[i][col] === val || store[i].tag_id === val || store[i].id === val || store[i].code === val)) {
                  store[i] = { ...store[i], ...payload };
                  updated.push(store[i]);
                  notifyMockListeners(actualTable, 'UPDATE', store[i]);
                }
              }
            } else {
              for (const k of Object.keys(store)) {
                if (store[k] && (store[k][col] === val || store[k].tag_id === val || store[k].id === val || store[k].code === val)) {
                  store[k] = { ...store[k], ...payload };
                  updated.push(store[k]);
                  notifyMockListeners(actualTable, 'UPDATE', store[k]);
                }
              }
            }

            if (updated.length > 0) {
              await setStore(actualTable, store);
              return { data: updated, error: null };
            }
            return { data: null, error: new Error('Record not found') };
          }
        }),
        insert: async (payload: any[]) => {
          await delay();
          const store = await getStore(actualTable);
          const rows = Array.isArray(payload) ? payload : [payload];
          const insertedRows: any[] = [];
          rows.forEach((row: any) => {
            const key = row.id || row.tag_id || Math.random().toString(36).substr(2, 9);
            const newRow = { id: key, ...row, created_at: new Date().toISOString() };
            store[key] = newRow;
            insertedRows.push(newRow);
            notifyMockListeners(actualTable, 'INSERT', newRow);
          });
          await setStore(actualTable, store);
          return { data: insertedRows, error: null };
        },
        delete: () => {
          const chain: any = {
            _col: null,
            _val: null,
            _isNeq: false,
            neq: function(col: string, val: any) {
              this._col = col;
              this._val = val;
              this._isNeq = true;
              return this;
            },
            eq: function(col: string, val: any) {
              this._col = col;
              this._val = val;
              this._isNeq = false;
              return this;
            },
            then: async function(onfulfilled: any) {
              await delay();
              let store = await getStore(actualTable);
              if (this._col) {
                if (Array.isArray(store)) {
                  if (this._isNeq) {
                    store = store.filter((item: any) => item[this._col] === this._val);
                  } else {
                    store = store.filter((item: any) => item[this._col] !== this._val);
                  }
                } else {
                  if (this._isNeq) {
                    for (const k of Object.keys(store)) {
                      if (store[k][this._col] !== this._val) {
                        delete store[k];
                      }
                    }
                  } else {
                    for (const k of Object.keys(store)) {
                      if (store[k][this._col] === this._val) {
                        delete store[k];
                      }
                    }
                  }
                }
              } else {
                store = Array.isArray(store) ? [] : {};
              }
              await setStore(actualTable, store);
              notifyMockListeners(actualTable, 'DELETE', null);
              return onfulfilled({ error: null });
            }
          };
          return chain;
        }
      };
    },
    rpc: async (fn: string, params: any) => {
      await delay();
      if (fn === 'generate_tag_batch') {
        const batchSize = params.batch_size || 100;
        const store = await getStore('tags');
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
          const newTag = { tag_id: id, owner_id: null, contacts: [], medical: {}, custom_label: '', created_at: new Date().toISOString() };
          store[id] = newTag;
          generated.push({ generated_id: id });
          notifyMockListeners('tags', 'INSERT', newTag);
        }
        await setStore('tags', store);
        return { data: generated, error: null };
      }
      if (fn === 'increment_tag_scan') {
        const tagId = params.target_tag_id;
        const store = await getStore('tags');
        if (store[tagId]) {
          store[tagId].scan_count = (store[tagId].scan_count || 0) + 1;
          store[tagId].last_scanned_at = new Date().toISOString();
          await setStore('tags', store);
          notifyMockListeners('tags', 'UPDATE', store[tagId]);
          return { data: store[tagId], error: null };
        }
        return { data: null, error: new Error('Tag not found') };
      }
      return { data: null, error: new Error('RPC not implemented in mock') };
    },
    channel: (name: string) => {
      return {
        on: function(event: string, filter: any, callback: any) {
          if (event === 'postgres_changes') {
            mockListeners.push({
              channel: name,
              table: filter.table,
              event: filter.event || '*',
              callback
            });
          }
          return this;
        },
        subscribe: function() {
          return this;
        },
        unsubscribe: function() {
          const toRemove = mockListeners.filter(l => l.channel === name);
          toRemove.forEach(l => {
            const idx = mockListeners.indexOf(l);
            if (idx !== -1) mockListeners.splice(idx, 1);
          });
        }
      };
    },
    removeChannel: async (channel: any) => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
      return { error: null };
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
