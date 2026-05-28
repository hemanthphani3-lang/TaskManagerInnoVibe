require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

  console.log("startUTC:", startUTC);
  console.log("endUTC:", endUTC);

  // Get all attendances today
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .gte('created_at', startUTC)
    .lte('created_at', endUTC);

  console.log("Found records:", data?.length);
  if (data?.length > 0) {
      console.log(data);
  }
  
  if (error) {
    console.error("Error:", error);
  }
}
test();
