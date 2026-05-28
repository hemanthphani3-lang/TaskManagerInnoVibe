export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Clock, Calendar, CheckCircle2, UserCircle2, AlertCircle, Target, FileText, LogOut, Trophy, ShieldAlert, DownloadCloud } from "lucide-react"
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { ScoreProgressBar } from "@/components/productivity/ScoreProgressBar"
import { ProductivityBadge } from "@/components/productivity/ProductivityBadge"
import { ReminderCard } from "@/components/productivity/ReminderCard"
import { DashboardProfileCompletionCard } from "@/components/dashboard/DashboardProfileCompletionCard"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"
import Link from "next/link"
import { DashboardLockScreen } from "@/components/employee/DashboardLockScreen"

export default async function EmployeeDashboard({ params }: { params: Promise<{ emp_no: string }> }) {
  const { emp_no } = await params
  
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {}

  if (!user) redirect("/login")

  // Fetch employee details
  const { data: employee } = await supabase
    .from('employees')
    .select('*, departments!department_id(department_name)')
    .eq('id', user.id)
    .single()

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

  // Execute all independent queries concurrently to drastically reduce page load time
  const [
    { data: attendance },
    { data: logoutRequests },
    { data: tasks },
    { data: activityFeed },
    { data: productivityData },
    { data: rankingData },
    { data: kpiData },
    { data: reminders }
  ] = await Promise.all([
    supabase.from('attendance').select('*').eq('employee_id', user.id).gte('created_at', startUTC).lte('created_at', endUTC).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('logout_requests').select('*, work_submissions(work_comment, attachment_url, attachment_type)').eq('employee_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('tasks').select('*').eq('assigned_employee_id', user.id),
    supabase.from('activity_feed').select('*').eq('department_id', employee?.department_id).order('created_at', { ascending: false }).limit(10),
    supabase.from('productivity_scores').select('*').eq('employee_id', user.id).maybeSingle(),
    supabase.from('rankings').select('*').eq('employee_id', user.id).maybeSingle(),
    supabase.from('kpi_metrics').select('*').eq('employee_id', user.id).maybeSingle(),
    supabase.from('reminders').select('*').eq('employee_id', user.id).eq('is_read', false).order('created_at', { ascending: false })
  ])

  const totalTasks = tasks?.length || 0
  const pendingTasks = tasks?.filter(t => ['PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(t.task_status)).length || 0
  const delayedTasks = tasks?.filter(t => t.task_status === 'DELAYED').length || 0
  const completedTasks = tasks?.filter(t => t.task_status === 'COMPLETED').length || 0

  const productivityScore = productivityData?.productivity_score ?? 0
  const attendanceRate = kpiData?.attendance_rate ?? 0
  const completionRate = kpiData?.completion_rate ?? 0
  const employeeRank = rankingData?.rank

  const isCheckedIn = attendance && attendance.work_status !== 'LOGGED_OUT'
  const departmentName = (employee?.departments as { department_name: string } | null)?.department_name || "Unassigned"

  const todayRequest = logoutRequests?.find(req => req.attendance_date === todayIST)
  const isLogoutPending = todayRequest?.approval_status === 'PENDING' || attendance?.work_status === 'LOGOUT_REQUESTED'

  const profileScore = employee ? calculateCompletionPercentage('EMPLOYEE', employee).score : 100

  return (
    <DashboardLockScreen>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {profileScore < 70 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl flex items-center gap-3 shadow-sm animate-pulse">
            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-900">Profile Incomplete — Action Required</h4>
              <p className="text-xs text-red-700 font-medium">Your profile is currently at {profileScore}%. Complete your profile to at least 70% to unlock full module access.</p>
            </div>
          </div>
        )}

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
          {/* Status Card */}
          <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${attendance?.work_status === 'LOGGED_OUT' ? 'bg-slate-50 text-slate-600 shadow-slate-500/20' : isCheckedIn ? 'bg-emerald-50 text-emerald-600 shadow-emerald-500/20' : 'bg-amber-50 text-amber-600 shadow-amber-500/20'} shadow-lg`}>
                  {attendance?.work_status === 'LOGGED_OUT' ? <LogOut className="w-8 h-8" /> : isCheckedIn ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Current Status</p>
                  <h3 className="text-2xl font-black text-[#0A1A2F]">
                    {isCheckedIn ? (isLogoutPending ? 'PENDING LOGOUT' : attendance.work_status.replace(/_/g, ' ')) : 'NOT CHECKED IN'}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                {isCheckedIn && (
                  <>
                    <p className="text-sm text-slate-500">Check-in Time</p>
                    <p className="font-mono text-lg font-bold text-slate-900">
                      {new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </p>
                  </>
                )}
                {attendance?.work_status === 'LOGGED_OUT' && attendance?.working_hours && (
                  <div className="mt-2 flex flex-col items-end">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Hours</span>
                    <span className="font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-sm">
                      {attendance.working_hours}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Productivity Score Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0A1A2F]">Productivity Score</h3>
              {employeeRank && (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-bold">Rank #{employeeRank}</span>
                </div>
              )}
            </div>
            <ScoreProgressBar score={productivityScore} />
            <div className="mt-4">
              <ProductivityBadge score={productivityScore} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Attendance</p>
                <p className="text-lg font-black text-slate-900">{attendanceRate.toFixed(0)}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Completion</p>
                <p className="text-lg font-black text-slate-900">{completionRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <AnalyticsCard title="Assigned Tasks" value={totalTasks} icon={Target} colorClass="text-blue-600" bgClass="bg-blue-50" />
          <AnalyticsCard title="Completed" value={completedTasks} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
          <AnalyticsCard title="Delayed Tasks" value={delayedTasks} icon={AlertCircle} colorClass="text-red-600" bgClass="bg-red-50" />
          <AnalyticsCard title="Leave Balance" value="12 Days" icon={Calendar} colorClass="text-purple-600" bgClass="bg-purple-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="col-span-1 lg:col-span-2 space-y-6">
            {/* Reminders */}
            <ReminderCard reminders={reminders || []} />

            {/* Pending Tasks */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[#0A1A2F]">My Pending Tasks</h3>
                <Link href="/employee/tasks" className="text-sm font-semibold text-[#0066FF] hover:underline">View All</Link>
              </div>
              
              <div className="space-y-3">
                {(tasks || []).filter(t => ['PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(t.task_status)).slice(0, 5).map(task => (
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
          
          <div className="col-span-1">
            <ActivityFeed activities={activityFeed || []} />
          </div>
        </div>
      </div>
    </DashboardLockScreen>
  )
}
