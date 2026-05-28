require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing ATTENDANCE query...");
  const q1 = await supabase.from('attendance').select('*, employees(employee_name, employee_code), departments(department_name)').limit(1);
  if (q1.error) console.error("ATTENDANCE ERROR:", q1.error.message);
  else console.log("ATTENDANCE DATA:", q1.data);
  
  console.log("\nTesting PRODUCTIVITY query...");
  const q2 = await supabase.from('productivity_scores').select('*, employees(employee_name, employee_code), departments(department_name)').limit(1);
  if (q2.error) console.error("PRODUCTIVITY ERROR:", q2.error.message);
  else console.log("PRODUCTIVITY DATA:", q2.data);
  
  console.log("\nTesting TASKS query...");
  const q3 = await supabase.from('tasks').select('*, employees(employee_name, employee_code), departments(department_name)').limit(1);
  if (q3.error) console.error("TASKS ERROR:", q3.error.message);
  else console.log("TASKS DATA:", q3.data);
}

test();
