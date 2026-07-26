import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ywpidzojetdhyezmkjxb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey!);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'johannesburgwebstudio@gmail.com',
    password: 'password123'
  });
  console.log("Error:", error?.message);
}
test();
