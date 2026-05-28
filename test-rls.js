require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkRLS() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'user10@company.com', // I don't know the exact email, but I can use a generic script or check the schema
    password: 'password123'
  });
}
