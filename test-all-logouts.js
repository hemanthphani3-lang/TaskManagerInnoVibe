require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLogouts() {
  const { data, error } = await supabase
    .from('logout_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching logout requests:", error);
  } else {
    console.log("All logout requests:");
    console.log(data);
  }
}
checkLogouts();
