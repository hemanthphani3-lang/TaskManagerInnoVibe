"use server"

import { createClient } from "@/lib/supabase/server"

export async function checkInEmployee(employeeId: string, departmentId: string) {
  const supabase = await createClient()

  // Fetch user profile (could be Employee or Department Head)
  let empName = 'Employee'
  let deptName = 'Operations'
  let isEmployee = true

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
    const { data: employee } = await supabase
      .from('employees')
      .select('employee_name, department_id, departments!department_id(department_name)')
      .eq('id', employeeId)
      .maybeSingle()

    if (employee) {
      empName = employee.employee_name || 'Employee'
      deptName = (employee.departments as any)?.department_name || 'Operations'
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
      .eq('id', isEmployee ? departmentId : employeeId)
      .maybeSingle()
  ])
  existing = existingAttendance
  checkInCutoff = deptData?.check_in_cutoff_time || '09:30:00'

  // Helper to trigger notifications and session logging
  const createLoginSessionAndNotifications = async () => {
    // Check if there is already an active session for this user to prevent duplicates
    const { data: activeSession } = await supabase
      .from('work_sessions')
      .select('session_id, login_time')
      .eq('user_id', employeeId)
      .eq('status', 'ACTIVE')
      .is('logout_time', null)
      .limit(1)
      .maybeSingle()

    let shouldCreateNew = true
    if (activeSession) {
      const sessionDay = getISTDateStringFromUTC(activeSession.login_time)
      if (sessionDay === todayIST) {
        shouldCreateNew = false
      } else {
        // Stale session from a previous day! Close it.
        const loginDate = new Date(activeSession.login_time)
        const autoLogoutTime = new Date(loginDate.getTime() + 9 * 60 * 60 * 1000)

        // 1. Create a default report to prevent broken/silent failures in the UI
        const { data: newReport } = await supabase
          .from('logout_reports')
          .insert({
            session_id: activeSession.session_id,
            user_id: employeeId,
            summary: "No detailed work report was submitted. System-generated report due to stale session auto-closure.",
            completed_tasks: "",
            pending_tasks: "",
            blockers: "",
            notes: "This session was closed automatically by the system because it was left open from a previous day.",
            attachments: [],
            time_spent_notes: "",
            submitted_at: autoLogoutTime.toISOString()
          })
          .select('report_id')
          .single()

        await supabase
          .from('work_sessions')
          .update({
            logout_time: autoLogoutTime.toISOString(),
            status: 'COMPLETED',
            duration: '9h 0m',
            report_submitted: true,
            report_id: newReport?.report_id || null
          })
          .eq('session_id', activeSession.session_id)
      }
    }

    if (shouldCreateNew) {
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
      const { error } = await supabase
        .from('attendance')
        .update({ work_status: 'ACTIVE' })
        .eq('id', existing.id)
      if (error) return { success: false, error: error.message }
      
      await createLoginSessionAndNotifications()
      
      // Trigger productivity calculation
      try {
        const { ProductivityEngine } = await import("@/lib/services/ProductivityEngine")
        await ProductivityEngine.calculateEmployeeProductivity(employeeId, isEmployee ? departmentId : employeeId)
      } catch (err) {
        console.error("Failed to calculate productivity after check-in:", err)
      }

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

  const { error } = await supabase
    .from('attendance')
    .insert({
      employee_id: employeeId,
      department_id: isEmployee ? departmentId : employeeId,
      login_time: now.toISOString(),
      check_in_time: now.toISOString(),
      attendance_status: status,
      work_status: 'ACTIVE'
    })

  if (error) return { success: false, error: error.message }

  await createLoginSessionAndNotifications()

  // Trigger productivity calculation
  try {
    const { ProductivityEngine } = await import("@/lib/services/ProductivityEngine")
    await ProductivityEngine.calculateEmployeeProductivity(employeeId, isEmployee ? departmentId : employeeId)
  } catch (err) {
    console.error("Failed to calculate productivity after check-in:", err)
  }

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

function formatTimeField(timeStr: string | null, dateStr: string): string | null {
  if (!timeStr) return null
  // If it's already a full ISO timestamp or contains timezone info, convert via formatISTTime (UTC→IST)
  if (timeStr.includes('T') || timeStr.includes('Z') || timeStr.includes('+')) {
    return formatISTTime(timeStr)
  }
  // Plain HH:MM:SS string — stored as IST time in the DB (TIME column)
  // Reconstruct as a proper IST datetime so formatISTTime returns it unchanged
  const d = new Date(`${dateStr}T${timeStr}+05:30`)
  if (isNaN(d.getTime())) return timeStr
  return formatISTTime(d.toISOString())
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
  let usersList: { id: string; name: string; role: string; departmentId: string; departmentName: string; employeeCode: string }[] = []

  if (targetDepartmentId) {
    const [employeesRes, targetDeptRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, employee_name, designation, department_id, employee_code, departments!department_id(department_name)')
        .eq('department_id', targetDepartmentId),
      supabase
        .from('departments')
        .select('id, department_name, department_head_name')
        .eq('id', targetDepartmentId)
        .maybeSingle()
    ])

    let headEmpRecord: any = null
    if (employeesRes.data) {
      employeesRes.data.forEach(e => {
        if (e.designation === 'Department Head') {
          headEmpRecord = e
          return
        }
        usersList.push({
          id: e.id,
          name: e.employee_name,
          role: 'Employee',
          departmentId: e.department_id,
          departmentName: (e.departments as any)?.department_name || 'Operations',
          employeeCode: e.employee_code || e.id.substring(0, 8)
        })
      })
    }

    if (targetDeptRes.data) {
      const headName = targetDeptRes.data.department_head_name
      if (headName && headName !== '-') {
        usersList.push({
          id: targetDeptRes.data.id,
          name: headName,
          role: 'Department Head',
          departmentId: targetDeptRes.data.id,
          departmentName: targetDeptRes.data.department_name,
          employeeCode: headEmpRecord?.employee_code || `${targetDeptRes.data.department_name.substring(0, 3).toUpperCase()}-HEAD`
        })
      }
    }
  } else {
    // Admin with no department filter -> fetch all employees and all department heads
    const [employeesRes, deptsRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, employee_name, designation, department_id, employee_code, departments!department_id(department_name)'),
      supabase
        .from('departments')
        .select('id, department_name, department_head_name')
    ])

    const deptHeadEmployeeMap = new Map<string, any>()
    if (employeesRes.data) {
      employeesRes.data.forEach(e => {
        if (e.designation === 'Department Head') {
          deptHeadEmployeeMap.set(e.id, e)
          return
        }
        usersList.push({
          id: e.id,
          name: e.employee_name,
          role: 'Employee',
          departmentId: e.department_id,
          departmentName: (e.departments as any)?.department_name || 'Operations',
          employeeCode: e.employee_code || e.id.substring(0, 8)
        })
      })
    }

    if (deptsRes.data) {
      deptsRes.data.forEach(d => {
        if (!d.department_head_name || d.department_head_name === '-') return
        const headEmpRecord = deptHeadEmployeeMap.get(d.id)
        usersList.push({
          id: d.id,
          name: d.department_head_name,
          role: 'Department Head',
          departmentId: d.id,
          departmentName: d.department_name,
          employeeCode: headEmpRecord?.employee_code || `${d.department_name.substring(0, 3).toUpperCase()}-HEAD`
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

  // 4. Fetch all work sessions and daily attendance records in the date range
  const startUTC = new Date(`${startDate}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${endDate}T23:59:59.999+05:30`).toISOString()
  const userIds = usersList.map(u => u.id)

  const [sessionsRes, attendanceRes, leavesRes] = await Promise.all([
    supabase
      .from('work_sessions')
      .select('session_id, user_id, login_time, logout_time, status')
      .in('user_id', userIds)
      .gte('login_time', startUTC)
      .lte('login_time', endUTC)
      .order('login_time', { ascending: true }),
    supabase
      .from('attendance')
      .select('id, employee_id, login_time, check_in_time, attendance_status, work_status, logout_time, created_at')
      .in('employee_id', userIds)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC),
    supabase
      .from('leave_requests')
      .select('employee_id, leave_type, approval_status, start_date, end_date')
      .in('employee_id', userIds)
      .lte('start_date', selectedDate)
      .gte('end_date', selectedDate)
  ])

  if (sessionsRes.error) {
    throw new Error(sessionsRes.error.message)
  }
  if (attendanceRes.error) {
    throw new Error(attendanceRes.error.message)
  }

  const sessions = sessionsRes.data
  const attendanceRecords = attendanceRes.data
  const leaves = leavesRes.data || []

  const leaveMap: Record<string, { type: string; status: string }> = {}
  leaves.forEach(l => {
    leaveMap[l.employee_id] = {
      type: l.leave_type,
      status: l.approval_status
    }
  })

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

  // Group attendance records by user_id and day
  const userAttendanceMap: Record<string, Record<string, any>> = {}
  usersList.forEach(u => {
    userAttendanceMap[u.id] = {}
  })

  if (attendanceRecords) {
    attendanceRecords.forEach(a => {
      if (!userAttendanceMap[a.employee_id]) return
      const dayStr = getISTDateStringFromUTC(a.created_at)
      if (dayStr) {
        userAttendanceMap[a.employee_id][dayStr] = a
      }
    })
  }

  // Calculate stats for each user
  const records = usersList.map(u => {
    const history: Record<string, 'Present' | 'Late' | 'Absent'> = {}
    let presentDays = 0
    let totalDaysSoFar = 0

    daysList.forEach(day => {
      if (day > todayIST) return // Don't track future days

      totalDaysSoFar++
      const attRecord = userAttendanceMap[u.id][day]

      if (!attRecord) {
        history[day] = 'Absent'
      } else {
        const statusStr = attRecord.attendance_status === 'LATE' ? 'Late' : 'Present'
        history[day] = statusStr
        presentDays++
      }
    })

    const attendancePercentage = totalDaysSoFar > 0 
      ? Math.round((presentDays / totalDaysSoFar) * 100) 
      : 100

    // Selected date details
    const selectedDateSessions = userSessionsMap[u.id][selectedDate] || []
    const attRecordOnSelectedDate = userAttendanceMap[u.id][selectedDate]
    let statusOnSelectedDate: 'Present' | 'Late' | 'Absent' = 'Absent'
    let firstCheckIn: string | null = null
    let lastCheckOut: string | null = null

    if (attRecordOnSelectedDate) {
      statusOnSelectedDate = attRecordOnSelectedDate.attendance_status === 'LATE' ? 'Late' : 'Present'
      firstCheckIn = formatISTTime(attRecordOnSelectedDate.login_time || attRecordOnSelectedDate.check_in_time)
      
      if (attRecordOnSelectedDate.work_status === 'ACTIVE') {
        lastCheckOut = 'Active'
      } else {
        lastCheckOut = formatTimeField(attRecordOnSelectedDate.logout_time, selectedDate)
      }
    } else if (selectedDateSessions.length > 0) {
      // Fallback to work sessions just in case
      statusOnSelectedDate = history[selectedDate] || 'Present'
      firstCheckIn = formatISTTime(selectedDateSessions[0].login_time)
      
      const lastSession = selectedDateSessions[selectedDateSessions.length - 1]
      if (lastSession.status === 'ACTIVE' && lastSession.logout_time === null) {
        lastCheckOut = 'Active'
      } else {
        lastCheckOut = formatISTTime(lastSession.logout_time)
      }
    }

    // Expected reporting cutoff
    const cutoff = cutoffMap[u.role === 'Department Head' ? u.id : u.departmentId] || '09:30:00'
    const [cutoffHour, cutoffMinute] = cutoff.split(':').map(Number)
    const formattedCutoff = formatTimeField(cutoff, selectedDate) || '09:30 AM'

    // Delay duration
    let delayDuration: string | null = null
    const firstLogin = attRecordOnSelectedDate?.login_time || attRecordOnSelectedDate?.check_in_time || (selectedDateSessions.length > 0 ? selectedDateSessions[0].login_time : null)
    if (statusOnSelectedDate === 'Late' && firstLogin) {
      const { hour, minute } = getISTTimeComponents(firstLogin)
      const checkInTotalMins = hour * 60 + minute
      const cutoffTotalMins = cutoffHour * 60 + cutoffMinute
      const diffMins = checkInTotalMins - cutoffTotalMins
      if (diffMins > 0) {
        const diffHrs = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        delayDuration = diffHrs > 0 ? `${diffHrs}h ${mins}m` : `${mins}m`
      }
    }

    // Leave status
    const leaveInfo = leaveMap[u.id]
    let leaveStatus: 'Leave Approved' | 'Leave Pending' | 'No Leave Submitted' = 'No Leave Submitted'
    if (leaveInfo) {
      if (leaveInfo.status === 'APPROVED') {
        leaveStatus = 'Leave Approved'
      } else if (leaveInfo.status === 'PENDING') {
        leaveStatus = 'Leave Pending'
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
      sessions: formattedSessions,
      employeeCode: u.employeeCode,
      sessionStatus: lastCheckOut === 'Active' ? 'Active' : 'Logged Out',
      cutoffTime: formattedCutoff,
      delayDuration,
      leaveStatus
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
