require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function simulateSubmit() {
  const userId = '1113280d-7cd7-4f12-a84d-b19b88d6ea76'; // The new employee

  // Get employee data to get department_id
  const { data: employee } = await supabase
    .from('employees')
    .select('department_id')
    .eq('id', userId)
    .single()

  if (!employee) return console.error("Employee not found.");

  // Get today's attendance record (IST-aware)
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()
  const today = todayIST

  const { data: attendances } = await supabase
    .from('attendance')
    .select('id, check_in_time, work_status')
    .eq('employee_id', userId)
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
    .order('created_at', { ascending: false })
    .limit(1)

  const attendance = attendances?.[0]

  if (!attendance) {
    return console.error("You have not checked in today.")
  }

  if (attendance.work_status === 'LOGGED_OUT') {
    return console.error("You are already logged out.")
  }

  if (attendance.work_status === 'LOGOUT_REQUESTED') {
    return console.error("A logout request is already pending.")
  }

  // Check for existing logout request today
  const { data: existingRequest } = await supabase
    .from('logout_requests')
    .select('id')
    .eq('employee_id', userId)
    .eq('attendance_date', today)
    .maybeSingle()

  let logoutRequestId;

  if (existingRequest) {
    console.log("Updating existing request");
    const { error: updateError } = await supabase
      .from('logout_requests')
      .update({ approval_status: 'PENDING' })
      .eq('id', existingRequest.id)
    
    if (updateError) return console.error(updateError.message)
    logoutRequestId = existingRequest.id

    await supabase.from('work_submissions').delete().eq('logout_request_id', logoutRequestId)
  } else {
    console.log("Inserting new request");
    const { data: newRequest, error: insertError } = await supabase
      .from('logout_requests')
      .insert({
        employee_id: userId,
        department_id: employee.department_id,
        attendance_date: today,
        approval_status: 'PENDING'
      })
      .select()
      .single()

    if (insertError) return console.error(insertError.message)
    logoutRequestId = newRequest.id
  }

  // Create Work Submission
  const { error: wsError } = await supabase
    .from('work_submissions')
    .insert({
      logout_request_id: logoutRequestId,
      employee_id: userId,
      department_id: employee.department_id,
      work_comment: 'test comment',
      attachment_url: null,
      attachment_type: null
    })

  if (wsError) return console.error(wsError.message)

  // Update Attendance Status
  const { error: attError } = await supabase
    .from('attendance')
    .update({ work_status: 'LOGOUT_REQUESTED' })
    .eq('id', attendance.id)

  if(attError) return console.error(attError.message)

  console.log("Success! Logout request submitted.");
}

simulateSubmit();
