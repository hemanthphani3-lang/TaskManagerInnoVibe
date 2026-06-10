export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { Clock, Calendar, CheckCircle2, UserCircle2, AlertCircle, Target, FileText, LogOut, Trophy, ShieldAlert, DownloadCloud } from "lucide-react"
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard"
import { ScoreProgressBar } from "@/components/productivity/ScoreProgressBar"
import { ProductivityBadge } from "@/components/productivity/ProductivityBadge"
import { ReminderCard } from "@/components/productivity/ReminderCard"
import { DashboardProfileCompletionCard } from "@/components/dashboard/DashboardProfileCompletionCard"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"
import Link from "next/link"
import { LogoutReportCard } from "@/components/employee/LogoutReportCard"
import { RealtimeEmployeeTaskCards } from "@/components/dashboard/RealtimeEmployeeTaskCards"

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
  const today = todayIST
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

  // Fetch task IDs where user is assigned
  const { data: assigneeRecords } = await supabaseAdmin
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', user.id)

  const assignedTaskIds = assigneeRecords?.map(r => r.task_id) || []

  // Execute all independent queries concurrently to drastically reduce page load time
  const [
    { data: attendance },
    { data: logoutRequests },
    { data: rawTasks },
    { data: productivityData },
    { data: rankingData },
    { data: kpiData },
    { data: reminders },
    { data: todayUserSessions }
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
    supabaseAdmin.from('work_sessions').select('*').eq('user_id', user.id).gte('login_time', startUTC).lte('login_time', endUTC).order('login_time', { ascending: true })
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

  const totalTasks = tasks.length
  const pendingTasks = tasks.filter(t => ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(t.task_status)).length
  const delayedTasks = tasks.filter(t => t.task_status === 'DELAYED').length
  const completedTasks = tasks.filter(t => t.task_status === 'COMPLETED').length

  const productivityScore = productivityData?.productivity_score ?? 0
  const attendanceRate = kpiData?.attendance_rate ?? 0
  const completionRate = kpiData?.completion_rate ?? 0
  const employeeRank = rankingData?.rank

  const todaySessions = todayUserSessions || []
  const sessionsCount = todaySessions.length
  
  const firstSession = todaySessions[0]
  const lastSessionWithLogout = [...todaySessions].reverse().find(s => s.logout_time)
  
  const firstLogin = firstSession
    ? new Date(firstSession.login_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      })
    : "—"

  const lastLogout = lastSessionWithLogout
    ? new Date(lastSessionWithLogout.logout_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      })
    : "—"

  const isCheckedIn = todaySessions.some(s => s.status === 'ACTIVE')
  const departmentName = (employee?.departments as { department_name: string } | null)?.department_name || "Unassigned"

  const todayRequest = logoutRequests?.find(req => req.attendance_date === todayIST)
  const isLogoutPending = todayRequest?.approval_status === 'PENDING' || attendance?.work_status === 'LOGOUT_REQUESTED'

  const profileScore = employee ? calculateCompletionPercentage('EMPLOYEE', employee).score : 100

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#0A1A2F] tracking-tight">Welcome back, {employee?.employee_name?.split(' ')[0]}! 👋</h1>
            <p className="text-slate-500 mt-1 font-medium">Here&apos;s your productivity overview for today.</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-700">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
            </span>
          </div>
        </div>

        {/* Profile Onboarding Completion Compliance Widget */}
        <div className="mb-8">
          <DashboardProfileCompletionCard role="EMPLOYEE" profile={employee || {}} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Today's Attendance Summary Card */}
          <div className="col-span-1 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[#0A1A2F]">Today&apos;s Attendance Summary</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${isCheckedIn ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-650 border border-slate-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isCheckedIn ? 'Active' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 my-2">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">First Login</p>
                    <p className="font-mono text-sm font-bold text-slate-700 mt-0.5">{firstLogin}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Logout</p>
                    <p className="font-mono text-sm font-bold text-slate-700 mt-0.5">{lastLogout}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sessions Today</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full text-xs border border-blue-100">
                    {sessionsCount}
                  </span>
                </div>
              </div>

              {/* Today's Sessions Timeline List */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Today&apos;s Sessions</p>
                {todaySessions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No sessions recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1 scrollbar-thin">
                    {todaySessions.map((session, idx) => {
                      const inTime = new Date(session.login_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                      })
                      const outTime = session.logout_time
                        ? new Date(session.logout_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata'
                          })
                        : "Active"

                      return (
                        <div key={session.session_id} className="flex items-center justify-between text-[11px] bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                          <span className="font-medium text-slate-500">Session {idx + 1}</span>
                          <span className="font-mono font-semibold text-slate-700 flex items-center gap-1">
                            {inTime} <span className="text-slate-400">→</span> <span className={!session.logout_time ? 'text-emerald-600 font-bold' : ''}>{outTime}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Productivity Score Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#0A1A2F]">Productivity Score</h3>
                {employeeRank && (
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">Rank #{employeeRank}</span>
                  </div>
                )}
              </div>
              <ScoreProgressBar score={productivityScore} />
              <div className="mt-3">
                <ProductivityBadge score={productivityScore} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance</p>
                <p className="text-base font-black text-slate-800 mt-0.5">{attendanceRate.toFixed(0)}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completion</p>
                <p className="text-base font-black text-slate-800 mt-0.5">{completionRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Logout Report Card */}
          <LogoutReportCard 
            employeeId={user.id} 
            departmentId={employee.department_id} 
            todayRequest={todayRequest}
            isCheckedIn={isCheckedIn}
          />
        </div>

        {/* KPI Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <RealtimeEmployeeTaskCards />
          <AnalyticsCard title="Leave Balance" value="12 Days" icon={Calendar} colorClass="text-purple-600" bgClass="bg-purple-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="col-span-1 lg:col-span-3 space-y-6">
            {/* Reminders */}
            <ReminderCard reminders={reminders || []} />

            {/* Pending Tasks */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[#0A1A2F]">My Pending Tasks</h3>
                <Link href="/employee/tasks" className="text-sm font-semibold text-[#0066FF] hover:underline">View All</Link>
              </div>
              
              <div className="space-y-3">
                {(tasks || []).filter(t => ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(t.task_status)).slice(0, 5).map(task => (
                  <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${task.priority_level === 'CRITICAL' ? 'bg-red-100 text-red-600' : task.priority_level === 'HIGH' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{task.task_title}</p>
                        <p className="text-xs font-medium text-slate-500">Due: {new Date(task.due_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                      {task.task_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {pendingTasks === 0 && (
                  <p className="text-slate-500 text-center py-6 text-sm">No pending tasks! Great job.</p>
                )}
              </div>
            </div>

            {/* Work Submission History */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Uploaded Work History</h3>
              <div className="space-y-4">
                {logoutRequests && logoutRequests.length > 0 ? (
                  logoutRequests.map(request => {
                    const submission = (request as any).work_submissions?.[0]
                    return (
                      <div key={request.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <p className="font-semibold text-slate-900">
                              {request.attendance_date === today ? "Today's Submission" : new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${request.approval_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : request.approval_status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {request.approval_status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                            {submission?.work_comment || <span className="italic text-slate-400">No report description provided.</span>}
                          </p>
                          {submission?.attachment_url && (
                            <a href={submission.attachment_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0066FF] hover:underline mt-2 inline-flex items-center gap-1">
                              <DownloadCloud className="w-3.5 h-3.5" />
                              View Attached Deliverable
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-slate-500 text-center py-6 text-sm">No work submitted yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}
