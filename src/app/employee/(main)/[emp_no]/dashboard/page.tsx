export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { EmployeeDashboardClient } from "@/components/employee/EmployeeDashboardClient"

export default async function EmployeeDashboard({ params }: { params: Promise<{ emp_no: string }> }) {
  const { emp_no } = await params
  
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {}

  if (!user) redirect("/login")

  const supabaseAdmin = createServiceClient()

  // Fetch employee details
  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('*, departments!department_id(department_name)')
    .eq('id', user.id)
    .maybeSingle()

  if (!employee) redirect("/login")

  // Prevent URL tampering - check if the logged in employee's code matches the route
  if (employee.employee_code !== emp_no) {
    redirect(`/employee/${employee.employee_code}/dashboard`)
  }

  // Fetch today's attendance (IST-aware)
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

  // Fetch task IDs where user is assigned
  const { data: assigneeRecords } = await supabaseAdmin
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', user.id)

  const assignedTaskIds = assigneeRecords?.map(r => r.task_id) || []

  // Execute all queries concurrently to optimize page load time
  const [
    { data: attendance },
    { data: logoutRequests },
    { data: rawTasks },
    { data: productivityData },
    { data: rankingData },
    { data: kpiData },
    { data: reminders },
    { data: todayUserSessions },
    { data: announcementsRaw },
    { data: userActivities },
    { data: approvedLeaves }
  ] = await Promise.all([
    supabaseAdmin.from('attendance').select('*').eq('employee_id', user.id).gte('created_at', startUTC).lte('created_at', endUTC).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from('logout_requests').select('*, work_submissions(work_comment, attachment_url, attachment_type)').eq('employee_id', user.id).order('created_at', { ascending: false }).limit(5),
    assignedTaskIds.length > 0
      ? supabaseAdmin.from('tasks').select('*, task_assignees(*)').or(`id.in.(${assignedTaskIds.map(id => `"${id}"`).join(',')}),created_by.eq.${user.id}`).limit(100)
      : supabaseAdmin.from('tasks').select('*, task_assignees(*)').or(`assigned_to.eq.${user.id},created_by.eq.${user.id},assigned_employee_id.eq.${user.id}`).limit(100),
    supabaseAdmin.from('productivity_scores').select('*').eq('employee_id', user.id).maybeSingle(),
    supabaseAdmin.from('rankings').select('*').eq('employee_id', user.id).maybeSingle(),
    supabaseAdmin.from('kpi_metrics').select('*').eq('employee_id', user.id).maybeSingle(),
    supabaseAdmin.from('reminders').select('*').eq('employee_id', user.id).eq('reminder_status', 'UNREAD').order('created_at', { ascending: false }),
    supabaseAdmin.from('work_sessions').select('*').eq('user_id', user.id).gte('login_time', startUTC).lte('login_time', endUTC).order('login_time', { ascending: true }),
    supabaseAdmin.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('activity_feed').select('*').eq('activity_user', user.id).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('leave_requests').select('*').eq('employee_id', user.id).eq('approval_status', 'APPROVED')
  ])

  // Map raw tasks to override overall status with individual assignee status
  const allTasks = rawTasks?.map(t => {
    const userAssignee = (t.task_assignees as any[])?.find(a => a.user_id === user.id)
    return {
      ...t,
      task_status: userAssignee?.status || t.task_status || t.status || 'PENDING'
    }
  }) || []

  // Filter ONLY tasks assigned to this employee (excluding tasks they created but assigned to someone else)
  const tasks = allTasks.filter(t => 
    (t.task_assignees as any[])?.some(a => a.user_id === user.id) || 
    t.assigned_to === user.id
  )

  const isCheckedIn = todayUserSessions?.some(s => s.status === 'ACTIVE') ?? false
  const departmentName = (employee?.departments as { department_name: string } | null)?.department_name || "Unassigned"
  const todayRequest = logoutRequests?.find(req => req.attendance_date === todayIST)

  // Calculate dynamic leave balances (month-locked, updates to 0 every month)
  const todayISTDate = new Date(new Date().getTime() + istOffset)
  const currentMonth = todayISTDate.getMonth()
  const currentYear = todayISTDate.getFullYear()

  let casualUsed = 0
  let sickUsed = 0
  let earnedUsed = 0
  approvedLeaves?.forEach((leave: any) => {
    const start = new Date(leave.start_date)
    const end = new Date(leave.end_date)
    
    // Filter leaves starting within the current calendar month
    if (start.getMonth() === currentMonth && start.getFullYear() === currentYear) {
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      if (leave.leave_type === 'CASUAL_LEAVE') {
        casualUsed += diffDays
      } else if (leave.leave_type === 'SICK_LEAVE') {
        sickUsed += diffDays
      } else {
        earnedUsed += diffDays
      }
    }
  })

  const leaveBalance = {
    casualUsed,
    casualMax: 12,
    sickUsed,
    sickMax: 12,
    earnedUsed,
    earnedMax: 20
  }

  return (
    <EmployeeDashboardClient
      employee={employee}
      departmentName={departmentName}
      attendance={attendance}
      logoutRequests={logoutRequests || []}
      tasks={tasks}
      productivityData={productivityData}
      rankingData={rankingData}
      kpiData={kpiData}
      reminders={reminders || []}
      todayUserSessions={todayUserSessions || []}
      isCheckedIn={isCheckedIn}
      todayRequest={todayRequest}
      announcements={announcementsRaw || []}
      userActivities={userActivities || []}
      leaveBalance={leaveBalance}
      currentUserId={user.id}
    />
  )
}
