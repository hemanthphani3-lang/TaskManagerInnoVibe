const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xcvultxpxwhpvtmztyaj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdnVsdHhweHdocHZ0bXp0eWFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcyNDU1MCwiZXhwIjoyMDk1MzAwNTUwfQ.ou1avzJEwMPts0O8AwqhIGhzE6qj5AqjyNP7HJEx_kU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  console.log("Creating admin user...");
  
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@innovibe',
    password: 'admin@123',
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
