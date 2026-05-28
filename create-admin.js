require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  console.log("Creating admin user...");
  
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("Error: Please define ADMIN_PASSWORD in your .env.local file.");
    return;
  }

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@innovibe',
    password: password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
      console.log("Auth user already exists. Looking up their ID...");
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) { console.error("Error fetching users:", listError.message); return; }
      const existing = users.find(u => u.email === 'admin@innovibe');
      if (existing) await insertIntoAdminsTable(existing.id);
    } else {
      console.error("Error creating auth user:", authError.message);
    }
    return;
  }

  const userId = authData.user.id;
  console.log("Auth user created with ID:", userId);
  await insertIntoAdminsTable(userId);
}

async function insertIntoAdminsTable(userId) {
    console.log("Assigning to admins table...");
    const { error: dbError } = await supabase.from('admins').upsert({
        id: userId,
        full_name: 'Admin User',
        email: 'admin@innovibe'
    });

    if (dbError) {
        console.error("Error inserting into admins table:", dbError.message);
        return;
    }

    console.log("Admin user successfully created in the admins table!");
}

createAdmin();
