require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('logout_requests')
    .select(`
      *,
      employees ( employee_name, designation ),
      work_submissions ( work_comment, attachment_url, attachment_type )
    `)
    .eq('approval_status', 'PENDING')
    .order('logout_request_time', { ascending: false });

  if (error) {
    console.error("Error fetching logout requests:", error);
  } else {
    console.log("Success, found records:", JSON.stringify(data, null, 2));
  }
}
test();
