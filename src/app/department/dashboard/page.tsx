export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Users, Clock, CheckCircle2, XCircle, Target, Activity, AlertCircle, ShieldAlert, FileText } from "lucide-react"
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { AttendanceChart } from "@/components/dashboard/charts/DynamicCharts"
import { RealtimeLeaderboard } from "@/components/productivity/RealtimeLeaderboard"
import { ProductivityBadge } from "@/components/productivity/ProductivityBadge"
import { DashboardProfileCompletionCard } from "@/components/dashboard/DashboardProfileCompletionCard"
import { calculateCompletionPercentage } from "@/lib/onboarding-utils"

export default async function DepartmentDashboard() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}

  if (!user) redirect("/login")

  // ── Fetch Department Head Profile ──────────────────────────────────────────
  const { data: deptProfile } = await supabase
    .from('departments')
    .select('*')
    .eq('id', user.id)
    .single()

  const profileScore = deptProfile ? calculateCompletionPercentage('DEPARTMENT', deptProfile).score : 100

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  }).reverse()

  // IST timezone setup
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

  const [
    { data: employees },
    { data: attendance },
    { count: logoutReportsToday },
    { count: pendingLeaves },
    { data: tasks },
    { data: activityFeed },
    { data: productivityScores },
    { data: rankings },
    { data: todayTeamSessions }
  ] = await Promise.all([
    supabase.from('employees').select('id, employee_name, designation, profile_photo').eq('department_id', user!.id),
    supabase.from('attendance').select('employee_id, attendance_status, check_in_time, work_status, working_hours, created_at').eq('department_id', user!.id).gte('created_at', `${last7Days[0]}T00:00:00Z`).lte('created_at', `${today}T23:59:59Z`),
    supabase.from('logout_requests').select('*', { count: 'exact', head: true }).eq('department_id', user!.id).eq('attendance_date', today),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('department_id', user!.id).eq('approval_status', 'PENDING'),
    supabase.from('tasks').select('id, task_status, assigned_employee_id').eq('department_id', user!.id),
    supabase.from('activity_feed').select('*').eq('department_id', user!.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('productivity_scores').select('employee_id, productivity_score').eq('department_id', user!.id).order('productivity_score', { ascending: false }),
    supabase.from('rankings').select('employee_id, employee_rank, score').eq('department_id', user!.id),
    supabase.from('work_sessions').select('logout_time, report_submitted, status').eq('department_id', user!.id).gte('login_time', startUTC).lte('login_time', endUTC)
  ])

  // Calculate today's team sessions statistics
  const teamOnline = (todayTeamSessions || []).filter(s => s.status === 'ACTIVE').length
  const teamReportsSubmitted = (todayTeamSessions || []).filter(s => s.status === 'COMPLETED').length
  // Team session hours calculation removed

  // ── Computed Stats ────────────────────────────────────────────────────────
  const totalEmployees = employees?.length || 0

  const rawTodayAttendance = attendance?.filter(a => a.created_at.startsWith(today)) || []
  const todayAttendance = Array.from(new Map(rawTodayAttendance.map(a => [a.employee_id, a])).values())

  const presentCount = todayAttendance.filter(a => a.attendance_status === 'PRESENT' || a.attendance_status === 'HALF_DAY').length || 0
  const lateCount = todayAttendance.filter(a => a.attendance_status === 'LATE').length || 0
  const totalCheckedIn = presentCount + lateCount
  const absentCount = totalEmployees - totalCheckedIn
  const activeCount = todayAttendance.filter(a => a.work_status === 'ACTIVE').length || 0
  const attendancePercentage = totalEmployees > 0 ? Math.round((totalCheckedIn / totalEmployees) * 100) : 0

  const totalTasks = tasks?.length || 0
  const completedTasks = tasks?.filter(t => t.task_status === 'COMPLETED').length || 0
  const delayedTasks = tasks?.filter(t => t.task_status === 'DELAYED').length || 0

  // Average working hours calculation removed

  // Chart data
  const attendanceChartData = last7Days.map(date => {
    const dayRecordsRaw = attendance?.filter(a => a.created_at.startsWith(date)) || []
    const dayRecords = Array.from(new Map(dayRecordsRaw.map(a => [a.employee_id, a])).values())
    const present = dayRecords.filter(a => ['PRESENT', 'HALF_DAY', 'LATE'].includes(a.attendance_status)).length
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
      present,
      absent: Math.max(0, totalEmployees - present)
    }
  })

  // Leaderboard
  const leaderboardEntries = (productivityScores || [])
    .map((score, idx) => {
      const emp = employees?.find(e => e.id === score.employee_id)
      const rank = rankings?.find(r => r.employee_id === score.employee_id)
      return {
        id: score.employee_id,
        rank: rank?.employee_rank ?? (idx + 1),
        name: emp?.employee_name || 'Unknown',
        subtitle: emp?.designation || 'Employee',
        score: score.productivity_score ?? 0,
        avatarUrl: emp?.profile_photo ?? undefined,
      }
    })
    .sort((a, b) => a.rank - b.rank)

  // Delayed employees
  const delayedEmployeeIds = [...new Set((tasks || []).filter(t => t.task_status === 'DELAYED').map(t => t.assigned_employee_id))]
  const delayedEmployees = employees?.filter(e => delayedEmployeeIds.includes(e.id)) || []

  // Avg productivity score
  const avgScore = productivityScores && productivityScores.length > 0
    ? productivityScores.reduce((sum, s) => sum + (s.productivity_score ?? 0), 0) / productivityScores.length
    : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 md:p-8 pb-20">

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A1A2F]">Department Command Center</h1>
          <p className="text-slate-500 mt-1">Real-time team operations and analytics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-100 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live
        </div>
      </header>

      {/* Onboarding card */}
      <div className="mb-8">
        <DashboardProfileCompletionCard role="DEPARTMENT" profile={deptProfile || {}} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        <AnalyticsCard title="Dept Workforce" value={totalEmployees} icon={Users} colorClass="text-indigo-600" bgClass="bg-indigo-50" delay={0} />
        <AnalyticsCard title="Absent Today" value={absentCount} icon={XCircle} colorClass="text-red-600" bgClass="bg-red-50" />
        <AnalyticsCard title="Active Now" value={activeCount} icon={Activity} colorClass="text-blue-600" bgClass="bg-blue-50" />
        <AnalyticsCard title="Logged Out Today" value={logoutReportsToday || 0} icon={Target} colorClass="text-amber-600" bgClass="bg-amber-50" />
        <AnalyticsCard title="Total Tasks" value={totalTasks} icon={Target} colorClass="text-slate-600" bgClass="bg-slate-100" />
        <AnalyticsCard title="Completed Tasks" value={completedTasks} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-50" delay={1} />
        <AnalyticsCard title="Delayed Tasks" value={delayedTasks} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-50" delay={2} />
        <AnalyticsCard title="Pending Leaves" value={pendingLeaves || 0} icon={Clock} colorClass="text-purple-600" bgClass="bg-purple-50" />
        <AnalyticsCard title="Dept Avg Score" value={`${avgScore.toFixed(0)}`} icon={Activity} colorClass="text-teal-600" bgClass="bg-teal-50" />
      </div>

      {/* Team Shift Activity Cards */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Today's Team Shift Activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <AnalyticsCard title="Team Online" value={teamOnline} icon={Activity} colorClass="text-emerald-600" bgClass="bg-emerald-50" delay={0} />
          <AnalyticsCard title="Team Reports Submitted" value={teamReportsSubmitted} icon={FileText} colorClass="text-[#0066FF]" bgClass="bg-blue-50" delay={1} />
          <AnalyticsCard title="Total Checked In" value={totalCheckedIn} icon={Users} colorClass="text-purple-600" bgClass="bg-purple-50" delay={2} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left col: Attendance Chart + Delayed Employees */}
        <div className="lg:col-span-2 space-y-8">
          {/* Attendance Progress Circle */}
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="60" className="stroke-slate-100" strokeWidth="12" fill="none" />
                <circle
                  cx="72" cy="72" r="60"
                  className={`transition-all duration-1000 ease-out ${attendancePercentage >= 90 ? 'stroke-emerald-500' : attendancePercentage >= 75 ? 'stroke-amber-500' : 'stroke-red-500'}`}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="376.99"
                  strokeDashoffset={376.99 - (376.99 * attendancePercentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-[#0A1A2F]">{attendancePercentage}%</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Today</span>
              </div>
            </div>
            <div className="flex-1 w-full">
              <h3 className="text-base font-bold text-[#0A1A2F] mb-4">Attendance Overview</h3>
              <div className="space-y-3">
                {[
                  { label: 'Present', value: presentCount, color: 'bg-emerald-500' },
                  { label: 'Late Arrivals', value: lateCount, color: 'bg-amber-500' },
                  { label: 'Absent', value: absentCount, color: 'bg-red-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${totalEmployees > 0 ? (item.value / totalEmployees) * 100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-600 w-6 text-right">{item.value}</span>
                    <span className="text-xs text-slate-500 w-16">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AttendanceChart data={attendanceChartData} />

          {/* Delayed Employees Alert */}
          {delayedEmployees.length > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
              <h3 className="text-base font-bold text-orange-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Employees with Delayed Tasks ({delayedEmployees.length})
              </h3>
              <div className="space-y-3">
                {delayedEmployees.map(emp => {
                  const empDelayCount = tasks?.filter(t => t.task_status === 'DELAYED' && t.assigned_employee_id === emp.id).length || 0
                  const empScore = productivityScores?.find(s => s.employee_id === emp.id)?.productivity_score ?? 0
                  return (
                    <div key={emp.id} className="flex items-center justify-between bg-white rounded-xl p-4 border border-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                          {(emp.employee_name || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{emp.employee_name}</p>
                          <p className="text-xs text-slate-500">{emp.designation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">{empDelayCount} delayed</span>
                        <ProductivityBadge score={empScore} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Team Live Status */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Team Live Status</h3>
            <div className="space-y-3">
              {todayAttendance && todayAttendance.length > 0 ? (
                todayAttendance.map((record) => {
                  const emp = employees?.find(e => e.id === record.employee_id)
                  return (
                    <div key={record.employee_id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold">
                          {emp?.employee_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{emp?.employee_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{emp?.designation || 'Employee'}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="font-mono text-sm text-slate-700">
                          {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${record.attendance_status === 'LATE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {record.attendance_status}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${record.work_status === 'LOGGED_OUT' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                            {record.work_status === 'ACTIVE' ? 'ACTIVE' : record.work_status === 'LOGOUT_REQUESTED' ? 'PENDING LOGOUT' : 'LOGGED OUT'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-slate-500 text-center py-8">No check-ins yet today.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right col: Leaderboard + Activity */}
        <div className="space-y-8">
          <RealtimeLeaderboard
            departmentId={user!.id}
            initialEntries={leaderboardEntries.slice(0, 10)}
            employees={employees || []}
            title="Team Leaderboard"
          />
          <ActivityFeed activities={activityFeed || []} />
        </div>
      </div>
    </div>
  )
}
