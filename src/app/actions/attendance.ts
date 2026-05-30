"use server"

import { createClient } from "@/lib/supabase/server"

export async function checkInEmployee(employeeId: string, departmentId: string) {
  const supabase = await createClient()

  // Fetch employee details for sessions and notifications
  const { data: employee } = await supabase
    .from('employees')
    .select('employee_name, departments!department_id(department_name)')
    .eq('id', employeeId)
    .single()

  const empName = employee?.employee_name || 'Employee'
  const deptName = (employee?.departments as any)?.department_name || 'Operations'

  // Business logic: check if already checked in today
  // Use IST-aware bounds: IST is UTC+5:30, so today 00:00 IST = yesterday 18:30 UTC
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()
  
  // Run both queries in parallel to save ~200-400ms
  const [{ data: existing }, { data: dept }] = await Promise.all([
    supabase
      .from('attendance')
      .select('id, work_status')
      .eq('employee_id', employeeId)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('departments')
      .select('check_in_cutoff_time')
      .eq('id', departmentId)
      .single()
  ])

  // Helper to trigger notifications and session logging
  const createLoginSessionAndNotifications = async () => {
    // 1. Create a work session
    await supabase
      .from('work_sessions')
      .insert({
        user_id: employeeId,
        user_name: empName,
        user_role: 'EMPLOYEE',
        department_id: departmentId,
        department: deptName,
        login_time: now.toISOString(),
        report_submitted: false
      })

    // 2. Generate notification message & formatted time
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    })
    const notificationMessage = `${empName} (Employee) logged in at ${timeStr}`

    // 3. Notify Department Head
    await supabase.from('notifications').insert({
      user_id: departmentId,
      title: 'Employee Logged In',
      message: notificationMessage,
      type: 'SYSTEM'
    })

    // 4. Notify Admins
    const { data: admins } = await supabase.from('admins').select('id')
    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.id,
        title: 'Employee Logged In',
        message: notificationMessage,
        type: 'SYSTEM'
      }))
      await supabase.from('notifications').insert(adminNotifications)
    }

    // 5. Add to activity feed
    await supabase.from('activity_feed').insert({
      activity_type: 'LOGIN',
      activity_user: employeeId,
      activity_user_name: empName,
      activity_description: `Logged in at ${timeStr}`,
      department_id: departmentId
    })
  }

  if (existing) {
    if (existing.work_status === 'LOGGED_OUT' || existing.work_status === 'LOGOUT_REQUESTED') {
      const { error } = await supabase
        .from('attendance')
        .update({ work_status: 'ACTIVE' })
        .eq('id', existing.id)
      if (error) return { success: false, error: error.message }
      
      await createLoginSessionAndNotifications()
      return { success: true }
    }
    return { success: false, error: "Already checked in today." }
  }

  // Determine LATE vs PRESENT using IST time
  const cutoffTime = dept?.check_in_cutoff_time || '09:30:00'
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number)
  const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const hour = nowIST.getUTCHours()
  const minutes = nowIST.getUTCMinutes()
  const status = (hour > cutoffHour || (hour === cutoffHour && minutes > cutoffMinute)) ? 'LATE' : 'PRESENT'

  const { error } = await supabase
    .from('attendance')
    .insert({
      employee_id: employeeId,
      department_id: departmentId,
      login_time: now.toISOString(),
      check_in_time: now.toISOString(),
      attendance_status: status,
      work_status: 'ACTIVE'
    })

  if (error) return { success: false, error: error.message }

  await createLoginSessionAndNotifications()
  return { success: true }
}
