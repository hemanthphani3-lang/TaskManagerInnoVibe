"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function requestLogoutAndSubmitWork(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const summary = formData.get('work_summary') as string
  const completedTasks = formData.get('completed_tasks') as string || ""
  const pendingTasks = formData.get('pending_tasks') as string || ""
  const blockers = formData.get('blockers') as string || ""
  const notes = formData.get('notes') as string || ""
  const timeSpentNotes = formData.get('time_spent_notes') as string || ""
  const file = formData.get('attachment') as File

  if (!summary) {
    return { success: false, error: "Work Summary is required." }
  }

  // Get department data to check if this is a Department Head
  const { data: dept } = await supabase
    .from('departments')
    .select('id, department_name, department_head_name')
    .eq('id', user.id)
    .maybeSingle()

  let employee = null
  let departmentHead = null

  if (dept) {
    departmentHead = dept
  } else {
    const { data: emp } = await supabase
      .from('employees')
      .select('department_id, employee_code, employee_name, departments!department_id(department_name)')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!emp) {
      return { success: false, error: "User profile not found." }
    }
    employee = emp
  }

  // Get today's attendance record (IST-aware)
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

  let checkInTime = new Date(`${todayIST}T09:00:00+05:30`).toISOString()
  let attendanceId = null

  const { data: attendances } = await supabase
    .from('attendance')
    .select('id, check_in_time, work_status')
    .eq('employee_id', user.id)
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
    .order('created_at', { ascending: false })
    .limit(1)

  const attendance = attendances?.[0]

  if (!attendance) {
    return { success: false, error: "You have not checked in today." }
  }

  if (attendance.work_status === 'LOGGED_OUT') {
    return { success: false, error: "You are already logged out." }
  }

  if (attendance.check_in_time) {
    checkInTime = new Date(attendance.check_in_time).toISOString()
  }
  attendanceId = attendance.id

  // Handle File Upload
  let attachmentsList: any[] = []

  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('daily-work-submissions')
      .upload(fileName, file)

    if (uploadError) return { success: false, error: uploadError.message }

    const { data: { publicUrl } } = supabase.storage
      .from('daily-work-submissions')
      .getPublicUrl(fileName)

    attachmentsList.push({
      name: file.name,
      url: publicUrl,
      type: file.type || 'application/octet-stream',
      size: file.size
    })
  }

  const logoutDate = new Date()
  // DB attendance.logout_time is a TIME column — store as IST time string (HH:MM:SS in IST)
  const logoutISTTimeStr = logoutDate.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' })

  // Find existing active session for this user to update
  const { data: existingSession } = await supabaseAdmin
    .from('work_sessions')
    .select('session_id, login_time')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .is('logout_time', null)
    .order('login_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sessionId = null
  let sessionLoginTime = checkInTime

  const loginTimeObj = existingSession ? new Date(existingSession.login_time) : new Date(checkInTime)
  const durationMs = logoutDate.getTime() - loginTimeObj.getTime()
  const durationHrs = Math.floor(durationMs / (1000 * 60 * 60))
  const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  const durationStr = `${durationHrs}h ${durationMins}m`

  if (existingSession) {
    sessionId = existingSession.session_id
    sessionLoginTime = existingSession.login_time

    const { error: sessUpdateErr } = await supabaseAdmin
      .from('work_sessions')
      .update({
        logout_time: logoutDate.toISOString(),
        duration: durationStr,
        status: 'COMPLETED',
        report_submitted: true
      })
      .eq('session_id', sessionId)

    if (sessUpdateErr) {
      console.error("Failed to update work session:", sessUpdateErr)
      return { success: false, error: sessUpdateErr.message }
    }
  } else {
    // 1. Create a work session record on the fly for this checkout (fallback)
    const { data: activeSession, error: sessInsertErr } = await supabaseAdmin
      .from('work_sessions')
      .insert({
        user_id: user.id,
        user_name: employee ? (employee.employee_name || 'Employee') : (departmentHead?.department_head_name || 'Department Head'),
        user_role: employee ? 'EMPLOYEE' : 'DEPARTMENT',
        department_id: employee ? employee.department_id : (departmentHead?.id || null),
        department: employee ? ((employee.departments as any)?.department_name || 'Technology') : (departmentHead?.department_name || 'Technology'),
        login_time: checkInTime,
        logout_time: logoutDate.toISOString(),
        duration: durationStr,
        status: 'COMPLETED',
        report_submitted: true
      })
      .select('session_id')
      .single()

    if (sessInsertErr || !activeSession) {
      console.error("Failed to insert work session:", sessInsertErr)
      return { success: false, error: sessInsertErr?.message || "Failed to create work session." }
    }
    sessionId = activeSession.session_id
  }

  // 2. Create Logout Report
  const { data: newReport, error: reportErr } = await supabaseAdmin
    .from('logout_reports')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      summary: summary,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      blockers: blockers,
      notes: notes,
      attachments: attachmentsList,
      time_spent_notes: timeSpentNotes,
      submitted_at: logoutDate.toISOString()
    })
    .select('report_id')
    .single()

  if (reportErr) return { success: false, error: reportErr.message }

  // 3. Link report back to the work session
  await supabaseAdmin
    .from('work_sessions')
    .update({
      report_id: newReport.report_id
    })
    .eq('session_id', sessionId)

  // 4. Update attendance
  if (attendanceId) {
    const { error: attUpdateErr } = await supabaseAdmin
      .from('attendance')
      .update({
        logout_time: logoutISTTimeStr,
        work_status: 'LOGGED_OUT'
      })
      .eq('id', attendanceId)

    if (attUpdateErr) {
      console.error("Failed to update attendance to LOGGED_OUT:", attUpdateErr)
    }
  }

  // 5. Send Notifications
  const timeStr = logoutDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  })
  const notificationMessage = employee 
    ? `${employee.employee_name} (Employee) logged out at ${timeStr}`
    : `${departmentHead?.department_head_name || 'Department Head'} (Department Head) logged out at ${timeStr}`

  // Notify Department Head (only if employee)
  if (employee) {
    await supabaseAdmin.from('notifications').insert({
      user_id: employee.department_id,
      title: 'Employee Logged Out',
      message: notificationMessage,
      type: 'SYSTEM'
    })
  }

  // Notify Admins
  const { data: admins } = await supabaseAdmin.from('admins').select('id')
  if (admins && admins.length > 0) {
    const adminNotifications = admins.map(admin => ({
      user_id: admin.id,
      title: employee ? 'Employee Logged Out' : 'Department Head Logged Out',
      message: notificationMessage,
      type: 'SYSTEM'
    }))
    await supabaseAdmin.from('notifications').insert(adminNotifications)
  }

  // Add to Activity Feed
  await supabaseAdmin.from('activity_feed').insert({
    activity_type: 'LOGOUT',
    activity_user: user.id,
    activity_user_name: employee ? (employee.employee_name || 'Employee') : (departmentHead?.department_head_name || 'Department Head'),
    activity_description: `Logged out at ${timeStr}`,
    department_id: employee ? employee.department_id : (departmentHead?.id || null)
  })

  if (employee?.employee_code) {
    revalidatePath(`/employee/${employee.employee_code}/dashboard`)
  }
  revalidatePath('/employee/dashboard')
  revalidatePath('/department/logouts')
  revalidatePath('/admin/logouts')
  return { success: true }
}

// Deprecated approval functions (retained as stubs to prevent compilation errors if referenced externally)
export async function approveLogout(requestId: string) {
  return { success: false, error: "Logout approvals are deprecated in the Work Session Reporting System." }
}

export async function rejectLogout(requestId: string, reason: string) {
  return { success: false, error: "Logout approvals are deprecated in the Work Session Reporting System." }
}
