import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ywpidzojetdhyezmkjxb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey!);

async function test() {
  const email = `test-${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  console.log("Signup error:", error?.message);
  console.log("Session:", !!data?.session);
}
test();
