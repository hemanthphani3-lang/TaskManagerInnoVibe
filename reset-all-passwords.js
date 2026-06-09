require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULT_PASSWORD = process.env.RESET_PASSWORD;
if (!DEFAULT_PASSWORD) {
  console.error("Error: Please define RESET_PASSWORD in your .env.local file.");
  process.exit(1);
}
async function resetAllPasswords() {
  console.log("Fetching all auth users...");
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error("Error listing users:", listError.message);
    return;
  }

  console.log(`Found ${users.length} users in Supabase Auth. Resetting passwords to '${DEFAULT_PASSWORD}'...`);

  const targetEmails = [
    'admin@innovibe.com',
    'tech@innovibe',
    'admin2@innovibe',
    'srivaruntej@innovibe',
    'srinivas@innovibe',
    'hemanth@innovibe',
    'akshaya@innovibe'
  ];

  for (const email of targetEmails) {
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log(`User with email '${email}' not found in Supabase Auth. Skipping.`);
      continue;
    }

    console.log(`Resetting password for ${email} (ID: ${user.id})...`);
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: DEFAULT_PASSWORD }
    );

    if (error) {
      console.error(`Failed to reset password for ${email}:`, error.message);
    } else {
      console.log(`Successfully reset password for ${email}!`);
    }
  }

  console.log("\nAll target passwords have been reset successfully!");
}

resetAllPasswords();
