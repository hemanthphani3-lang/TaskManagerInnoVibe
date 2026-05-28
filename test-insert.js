require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const userId = '1113280d-7cd7-4f12-a84d-b19b88d6ea76'; 
  const departmentId = '7a37f197-a75c-49db-af32-ac901649e8fc';
  const logoutRequestId = '783bdefd-58ef-468d-b5b2-c412627e9cf6'; // The ID we just created

  console.log("Attempting work submission insert...");
  const { data, error } = await supabase
    .from('work_submissions')
    .insert({
      logout_request_id: logoutRequestId,
      employee_id: userId,
      department_id: departmentId,
      work_comment: 'Test comment',
      attachment_url: null,
      attachment_type: null
    })
    .select();

  if (error) {
    console.error("Work Submission Insert Error:", error);
  } else {
    console.log("Success:", data);
  }
}
test();
