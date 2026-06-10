"use server"

import { createClient } from "@/lib/supabase/server"

export async function checkInEmployee(employeeId: string, departmentId: string) {
  const supabase = await createClient()

  // Fetch user profile (could be Employee or Department Head)
  let empName = 'Employee'
  let deptName = 'Operations'
  let isEmployee = true

  const { data: employee } = await supabase
    .from('employees')
    .select('employee_name, department_id, departments!department_id(department_name)')
    .eq('id', employeeId)
    .maybeSingle()

  if (employee) {
    empName = employee.employee_name || 'Employee'
    deptName = (employee.departments as any)?.department_name || 'Operations'
  } else {
    // Check if Department Head
    const { data: dept } = await supabase
      .from('departments')
      .select('department_head_name, department_name')
      .eq('id', employeeId)
      .maybeSingle()
    if (dept) {
      empName = dept.department_head_name || 'Department Head'
      deptName = dept.department_name || 'Department'
      isEmployee = false
    } else {
      return { success: false, error: "User profile not found." }
    }
  }

  // Business logic: check if already checked in today
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()
  
  let existing = null
  let checkInCutoff = '09:30:00'

  if (isEmployee) {
    const [{ data: existingAttendance }, { data: deptData }] = await Promise.all([
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
    existing = existingAttendance
    checkInCutoff = deptData?.check_in_cutoff_time || '09:30:00'
  } else {
    // Check if Department Head has checked in today (meaning they have an active work session)
    const { data: activeSession } = await supabase
      .from('work_sessions')
      .select('session_id, status')
      .eq('user_id', employeeId)
      .eq('status', 'ACTIVE')
      .is('logout_time', null)
      .limit(1)
      .maybeSingle()

    if (activeSession) {
      existing = { id: activeSession.session_id, work_status: 'ACTIVE' }
    } else {
      // Also check if they checked out today (have a completed session today)
      const { data: completedSession } = await supabase
        .from('work_sessions')
        .select('session_id')
        .eq('user_id', employeeId)
        .gte('login_time', startUTC)
        .lte('login_time', endUTC)
        .limit(1)
        .maybeSingle()

      if (completedSession) {
        existing = { id: completedSession.session_id, work_status: 'LOGGED_OUT' }
      }
    }
  }

  // Helper to trigger notifications and session logging
  const createLoginSessionAndNotifications = async () => {
    // Check if there is already an active session for this user to prevent duplicates
    const { data: activeSession } = await supabase
      .from('work_sessions')
      .select('session_id')
      .eq('user_id', employeeId)
      .eq('status', 'ACTIVE')
      .is('logout_time', null)
      .limit(1)
      .maybeSingle()

    if (!activeSession) {
      // 1. Create a work session
      await supabase
        .from('work_sessions')
        .insert({
          user_id: employeeId,
          user_name: empName,
          user_role: isEmployee ? 'EMPLOYEE' : 'DEPARTMENT',
          department_id: isEmployee ? departmentId : employeeId, // For dept head, their ID is their department ID
          department: deptName,
          login_time: now.toISOString(),
          status: 'ACTIVE',
          report_submitted: false
        })
    }

    // 2. Generate notification message & formatted time
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    })
    const notificationMessage = isEmployee 
      ? `${empName} (Employee) logged in at ${timeStr}`
      : `${empName} (Department Head) logged in at ${timeStr}`

    // 3. Notify Department Head (only if it's an employee, don't notify department head of their own checkin)
    if (isEmployee) {
      await supabase.from('notifications').insert({
        user_id: departmentId,
        title: 'Employee Logged In',
        message: notificationMessage,
        type: 'SYSTEM'
      })
    }

    // 4. Notify Admins
    const { data: admins } = await supabase.from('admins').select('id')
    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.id,
        title: isEmployee ? 'Employee Logged In' : 'Department Head Logged In',
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
      department_id: isEmployee ? departmentId : employeeId
    })
  }

  if (existing) {
    if (existing.work_status === 'LOGGED_OUT' || existing.work_status === 'LOGOUT_REQUESTED') {
      if (isEmployee) {
        const { error } = await supabase
          .from('attendance')
          .update({ work_status: 'ACTIVE' })
          .eq('id', existing.id)
        if (error) return { success: false, error: error.message }
      }
      
      await createLoginSessionAndNotifications()
      return { success: true }
    }
    return { success: false, error: "Already checked in today." }
  }

  // Determine LATE vs PRESENT using IST time
  const [cutoffHour, cutoffMinute] = checkInCutoff.split(':').map(Number)
  const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const hour = nowIST.getUTCHours()
  const minutes = nowIST.getUTCMinutes()
  const status = (hour > cutoffHour || (hour === cutoffHour && minutes > cutoffMinute)) ? 'LATE' : 'PRESENT'

  if (isEmployee) {
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
  } else {
    // For Department Heads, we don't have attendance row due to table constraints,
    // so their attendance status and existence is derived from work_sessions (Presenter)
  }

  await createLoginSessionAndNotifications()
  return { success: true }
}

function getISTDateStringFromUTC(utcString: string): string {
  const d = new Date(utcString)
  if (isNaN(d.getTime())) return ""
  const istTime = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
  return istTime.toISOString().split('T')[0]
}

function formatISTTime(utcString: string | null): string | null {
  if (!utcString) return null
  const d = new Date(utcString)
  if (isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  })
}

export async function getAttendanceReport(
  startDate: string, // YYYY-MM-DD (IST)
  endDate: string,   // YYYY-MM-DD (IST)
  selectedDate: string, // YYYY-MM-DD (IST)
  departmentId?: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Unauthorized")
  }

  // 1. Determine user role and department access
  const [adminRes, deptRes] = await Promise.all([
    supabase.from('admins').select('id').eq('id', user.id).maybeSingle(),
    supabase.from('departments').select('id, department_name').eq('id', user.id).maybeSingle()
  ])

  const isAdmin = !!adminRes.data
  const isDeptHead = !!deptRes.data

  if (!isAdmin && !isDeptHead) {
    throw new Error("Unauthorized access")
  }

  // Force Department Head to only see their own department's data
  let targetDepartmentId = departmentId
  if (isDeptHead) {
    targetDepartmentId = user.id
  }

  // 2. Fetch all employees & department heads we need to display
  let usersList: { id: string; name: string; role: string; departmentId: string; departmentName: string }[] = []

  if (targetDepartmentId) {
    const [employeesRes, targetDeptRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, employee_name, designation, department_id, departments!department_id(department_name)')
        .eq('department_id', targetDepartmentId),
      supabase
        .from('departments')
        .select('id, department_name, department_head_name')
        .eq('id', targetDepartmentId)
        .maybeSingle()
    ])

    if (employeesRes.data) {
      employeesRes.data.forEach(e => {
        usersList.push({
          id: e.id,
          name: e.employee_name,
          role: 'Employee',
          departmentId: e.department_id,
          departmentName: (e.departments as any)?.department_name || 'Operations'
        })
      })
    }

    if (targetDeptRes.data) {
      usersList.push({
        id: targetDeptRes.data.id,
        name: targetDeptRes.data.department_head_name || 'Department Head',
        role: 'Department Head',
        departmentId: targetDeptRes.data.id,
        departmentName: targetDeptRes.data.department_name
      })
    }
  } else {
    // Admin with no department filter -> fetch all employees and all department heads
    const [employeesRes, deptsRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, employee_name, designation, department_id, departments!department_id(department_name)'),
      supabase
        .from('departments')
        .select('id, department_name, department_head_name')
    ])

    if (employeesRes.data) {
      employeesRes.data.forEach(e => {
        usersList.push({
          id: e.id,
          name: e.employee_name,
          role: 'Employee',
          departmentId: e.department_id,
          departmentName: (e.departments as any)?.department_name || 'Operations'
        })
      })
    }

    if (deptsRes.data) {
      deptsRes.data.forEach(d => {
        usersList.push({
          id: d.id,
          name: d.department_head_name || 'Department Head',
          role: 'Department Head',
          departmentId: d.id,
          departmentName: d.department_name
        })
      })
    }
  }

  // 3. If no users are found, return empty
  if (usersList.length === 0) {
    return {
      summary: { totalStrength: 0, presentCount: 0, absentCount: 0, lateCount: 0 },
      records: []
    }
  }

  // 4. Fetch all work sessions for these users in the date range
  const startUTC = new Date(`${startDate}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${endDate}T23:59:59.999+05:30`).toISOString()
  const userIds = usersList.map(u => u.id)

  const { data: sessions, error: sessionsErr } = await supabase
    .from('work_sessions')
    .select('session_id, user_id, login_time, logout_time, status')
    .in('user_id', userIds)
    .gte('login_time', startUTC)
    .lte('login_time', endUTC)
    .order('login_time', { ascending: true })

  if (sessionsErr) {
    throw new Error(sessionsErr.message)
  }

  // 5. Fetch all department cutoffs
  const { data: deptCutoffs } = await supabase
    .from('departments')
    .select('id, check_in_cutoff_time')

  const cutoffMap: Record<string, string> = {}
  if (deptCutoffs) {
    deptCutoffs.forEach(d => {
      cutoffMap[d.id] = d.check_in_cutoff_time || '09:30:00'
    })
  }

  // 6. Generate list of dates in the range
  const daysList: string[] = []
  let current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    daysList.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  const todayIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Helper for IST time comparison
  const getISTTimeComponents = (utcString: string) => {
    const d = new Date(utcString)
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
    return {
      hour: ist.getUTCHours(),
      minute: ist.getUTCMinutes()
    }
  }

  // Group sessions by user_id and day
  const userSessionsMap: Record<string, Record<string, any[]>> = {}
  usersList.forEach(u => {
    userSessionsMap[u.id] = {}
    daysList.forEach(day => {
      userSessionsMap[u.id][day] = []
    })
  })

  if (sessions) {
    sessions.forEach(s => {
      if (!userSessionsMap[s.user_id]) return
      const dayStr = getISTDateStringFromUTC(s.login_time)
      if (userSessionsMap[s.user_id][dayStr]) {
        userSessionsMap[s.user_id][dayStr].push(s)
      }
    })
  }

  // Calculate stats for each user
  const records = usersList.map(u => {
    const history: Record<string, 'Present' | 'Late' | 'Absent'> = {}
    let presentDays = 0
    let totalDaysSoFar = 0

    const cutoff = cutoffMap[u.role === 'Department Head' ? u.id : u.departmentId] || '09:30:00'
    const [cutoffHour, cutoffMinute] = cutoff.split(':').map(Number)

    daysList.forEach(day => {
      if (day > todayIST) return // Don't track future days

      totalDaysSoFar++
      const daySessions = userSessionsMap[u.id][day]

      if (daySessions.length === 0) {
        history[day] = 'Absent'
      } else {
        const firstLogin = daySessions[0].login_time
        const { hour, minute } = getISTTimeComponents(firstLogin)
        const isLate = (hour > cutoffHour || (hour === cutoffHour && minute > cutoffMinute))
        const statusStr = isLate ? 'Late' : 'Present'
        
        history[day] = statusStr
        presentDays++
      }
    })

    const attendancePercentage = totalDaysSoFar > 0 
      ? Math.round((presentDays / totalDaysSoFar) * 100) 
      : 100

    // Selected date details
    const selectedDateSessions = userSessionsMap[u.id][selectedDate] || []
    let statusOnSelectedDate: 'Present' | 'Late' | 'Absent' = 'Absent'
    let firstCheckIn: string | null = null
    let lastCheckOut: string | null = null

    if (selectedDateSessions.length > 0) {
      statusOnSelectedDate = history[selectedDate] || 'Present'
      firstCheckIn = formatISTTime(selectedDateSessions[0].login_time)
      
      const lastSession = selectedDateSessions[selectedDateSessions.length - 1]
      if (lastSession.status === 'ACTIVE' && lastSession.logout_time === null) {
        lastCheckOut = 'Active'
      } else {
        lastCheckOut = formatISTTime(lastSession.logout_time)
      }
    }

    // Standardize sessions list format for details view
    const formattedSessions = selectedDateSessions.map(s => ({
      session_id: s.session_id,
      login_time: formatISTTime(s.login_time),
      logout_time: s.logout_time ? formatISTTime(s.logout_time) : 'Active',
      status: s.status
    }))

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      departmentName: u.departmentName,
      status: statusOnSelectedDate,
      firstCheckIn,
      lastCheckOut,
      attendancePercentage,
      history,
      sessions: formattedSessions
    }
  })

  // Compute overall summary stats for the selected date
  let presentCount = 0
  let absentCount = 0
  let lateCount = 0

  records.forEach(r => {
    if (r.status === 'Present') presentCount++
    else if (r.status === 'Late') lateCount++
    else if (r.status === 'Absent') absentCount++
  })

  return {
    summary: {
      totalStrength: records.length,
      presentCount: presentCount + lateCount, // total present includes late
      absentCount,
      lateCount
    },
    records
  }
}

export async function getUserDailySessions(userId: string, date: string) {
  const supabase = await createClient()
  
  const startUTC = new Date(`${date}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${date}T23:59:59.999+05:30`).toISOString()

  const { data, error } = await supabase
    .from('work_sessions')
    .select('session_id, login_time, logout_time, status')
    .eq('user_id', userId)
    .gte('login_time', startUTC)
    .lte('login_time', endUTC)
    .order('login_time', { ascending: true })

  if (error) {
    console.error("Error fetching user daily sessions:", error)
    return []
  }

  return (data || []).map(s => ({
    session_id: s.session_id,
    login_time: formatISTTime(s.login_time),
    logout_time: s.logout_time ? formatISTTime(s.logout_time) : 'Active',
    status: s.status
  }))
}
