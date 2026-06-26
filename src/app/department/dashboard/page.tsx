export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { DepartmentDashboardClient } from "@/components/dashboard/DepartmentDashboardClient"

import { checkAndGenerateBirthdayNotifications, getBirthdaysToday } from "@/app/actions/birthday"

export default async function DepartmentDashboard() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}

  if (!user) redirect("/login")

  // Run birthday notification check and fetch today's birthdays
  await checkAndGenerateBirthdayNotifications()
  const birthdaysToday = await getBirthdaysToday()

  const supabaseAdmin = createServiceClient()

  // ── Fetch Department Head Profile ──────────────────────────────────────────
  const { data: deptProfile } = await supabaseAdmin
    .from('departments')
    .select('*')
    .eq('id', user.id)
    .single()

  const deptName = deptProfile?.department_name || "Department"

  // ── Date Calculations (IST Timezone Considerations) ───────────────────────
  const now = new Date()
  const offset = 5.5 * 60 * 60 * 1000 // IST
  const today = new Date(now.getTime() + offset).toISOString().split('T')[0]
  
  // Calculate date 30 days ago to fetch full historical analytics
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(now.getTime() + offset - i * 24 * 60 * 60 * 1000)
    return d.toISOString().split('T')[0]
  }).reverse()

  const startUTC = `${last30Days[0]}T00:00:00+05:30`
  const endUTC = `${today}T23:59:59+05:30`

  // ── Fetch Employees under this department ──────────────────────────────────
  const { data: employeesRaw } = await supabaseAdmin
    .from('employees')
    .select('id, employee_name, designation, profile_photo, department_id')
    .eq('department_id', user.id)

  const employees = employeesRaw || []
  const regularEmployees = employees.filter(e => e.designation !== 'Department Head')
  const empIds = regularEmployees.map(e => e.id)

  // ── Fetch Task IDs where any employee of the department is assigned ───────
  let tasksQuery = supabaseAdmin
    .from('tasks')
    .select('id, task_status, assigned_employee_id, created_at, due_date, title')

  if (empIds.length > 0) {
    tasksQuery = tasksQuery.or(`assigned_employee_id.in.(${empIds.map(id => `"${id}"`).join(',')}),created_by.eq.${user.id},department.eq.${deptName},department_id.eq.${user.id}`)
  } else {
    tasksQuery = tasksQuery.or(`assigned_employee_id.eq.${user.id},created_by.eq.${user.id},department.eq.${deptName},department_id.eq.${user.id}`)
  }

  // ── Promise.all Data Queries ───────────────────────────────────────────────
  const [
    { data: attendanceRaw },
    { count: logoutReportsCount },
    { count: pendingLeavesCount },
    { data: tasksRaw },
    { data: activityFeedRaw },
    { data: productivityScoresRaw },
    { data: rankingsRaw },
    { data: workSessionsRaw }
  ] = await Promise.all([
    // Attendance for last 30 days
    supabaseAdmin
      .from('attendance')
      .select('id, employee_id, department_id, attendance_status, work_status, check_in_time, login_time, logout_time, created_at')
      .eq('department_id', user.id)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC),
    
    // Pending logout reports count today
    supabaseAdmin
      .from('logout_requests')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', user.id)
      .eq('approval_status', 'PENDING'),
    
    // Pending leaves count
    supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', user.id)
      .eq('approval_status', 'PENDING'),
    
    // Tasks Query
    tasksQuery,
    
    // Activity feed
    supabaseAdmin
      .from('activity_feed')
      .select('id, activity_type, activity_user_name, activity_description, created_at')
      .eq('department_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    
    // Productivity scores
    supabaseAdmin
      .from('productivity_scores')
      .select('employee_id, productivity_score')
      .eq('department_id', user.id),
    
    // Rankings
    supabaseAdmin
      .from('rankings')
      .select('employee_id, employee_rank, score')
      .eq('department_id', user.id),
    
    // Work sessions for last 30 days
    supabaseAdmin
      .from('work_sessions')
      .select('session_id, user_id, login_time, logout_time, status, duration')
      .eq('department_id', user.id)
      .gte('login_time', startUTC)
      .lte('login_time', endUTC)
  ])

  // Map database structures to fit component props
  const attendance = attendanceRaw || []
  const tasks = tasksRaw || []
  const workSessions = workSessionsRaw || []
  const productivityScores = productivityScoresRaw || []
  const rankings = rankingsRaw || []
  const activityFeed = activityFeedRaw || []

  return (
    <DepartmentDashboardClient
      departmentName={deptName}
      departmentId={user.id}
      employees={employees}
      attendance={attendance}
      tasks={tasks}
      workSessions={workSessions}
      productivityScores={productivityScores}
      rankings={rankings}
      activityFeed={activityFeed}
      pendingLeavesCount={pendingLeavesCount || 0}
      logoutReportsToday={logoutReportsCount || 0}
      birthdaysToday={birthdaysToday}
      currentUserId={user.id}
    />
  )
}
