require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAll() {
  // 1. List all auth users
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) { console.error("Auth error:", authErr.message); return; }

  console.log("=== ALL AUTH USERS ===");
  console.log(`Total: ${users.length}\n`);
  users.forEach(u => {
    console.log(`  Email: ${u.email}`);
    console.log(`  ID:    ${u.id}`);
    console.log(`  Role:  ${u.user_metadata?.role || 'N/A'}`);
    console.log(`  Created: ${u.created_at}`);
    console.log('');
  });

  // 2. List admins
  const { data: admins } = await supabase.from('admins').select('*');
  console.log("=== ADMINS ===");
  (admins || []).forEach(a => {
    console.log(`  Name: ${a.full_name}, Email: ${a.email}`);
  });
  console.log('');

  // 3. List departments
  const { data: depts } = await supabase.from('departments').select('*');
  console.log("=== DEPARTMENTS ===");
  (depts || []).forEach(d => {
    console.log(`  Name: ${d.department_name}, Email: ${d.department_email}, Code: ${d.department_code}`);
  });
  console.log('');

  // 4. List employees
  const { data: emps } = await supabase.from('employees').select('*');
  console.log("=== EMPLOYEES ===");
  (emps || []).forEach(e => {
    console.log(`  Name: ${e.employee_name}, Email: ${e.employee_email}, Code: ${e.employee_code}, Dept: ${e.department_id}`);
  });
}

listAll();
