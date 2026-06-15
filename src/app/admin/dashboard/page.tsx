export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { Building2, Users, CheckCircle2, Clock, Activity, Target, XCircle, ArrowLeft, TrendingUp, LogOut, FileText } from "lucide-react"
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { AttendanceChart, TaskChart } from "@/components/dashboard/charts/DynamicCharts"
import { LeaderboardTable } from "@/components/productivity/LeaderboardTable"
import { ProductivityBadge } from "@/components/productivity/ProductivityBadge"
import type { LeaderboardEntry } from "@/components/productivity/LeaderboardTable"
import Link from "next/link"
import { RealtimeAdminTaskCards } from "@/components/dashboard/RealtimeAdminTaskCards"
import { RealtimeAdminDeptTaskCards } from "@/components/dashboard/RealtimeAdminDeptTaskCards"
import { UserAvatar } from "@/components/custom/UserAvatar"
import { AnimatedCounter } from "@/components/custom/AnimatedCounter"

export default async function AdminDashboard(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  try {
    const searchParams = await props.searchParams
    const dept_id = searchParams.dept_id as string | undefined

    const supabase = await createClient()
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch (e) {
      // ignore, handle via redirect below
    }

    if (!user) redirect("/login")

    const today = new Date().toISOString().split('T')[0]
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    // IST-aware dates for work sessions
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
    const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
    const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

    const supabaseAdmin = createServiceClient()

    // Build dynamic queries based on dept_id filter
    let logoutsQuery = supabaseAdmin.from('logout_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'PENDING')
    if (dept_id) logoutsQuery = logoutsQuery.eq('department_id', dept_id)

    let sessionsQuery = supabaseAdmin.from('work_sessions').select('*').gte('login_time', startUTC).lte('login_time', endUTC)
    if (dept_id) sessionsQuery = sessionsQuery.eq('department_id', dept_id)

    let tasksQuery = supabaseAdmin.from('tasks').select('id, department_id, assigned_to, assigned_employee_id, task_status')
    if (dept_id) tasksQuery = tasksQuery.eq('department_id', dept_id)

    let activityQuery = supabaseAdmin.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(10)
    if (dept_id) activityQuery = activityQuery.eq('department_id', dept_id)

    let productivityQuery = supabaseAdmin
      .from('productivity_scores')
      .select('employee_id, department_id, productivity_score')
      .order('productivity_score', { ascending: false })
      .limit(10)
    if (dept_id) productivityQuery = productivityQuery.eq('department_id', dept_id)

    // Execute all independent queries concurrently to drastically reduce page load time
    const [
      { data: departments },
      { data: globalEmployees },
      { data: globalAttendance },
      { count: pendingLogouts },
      { data: tasks },
      { data: activityFeed },
      { data: productivityScores },
      { data: todaySessions }
    ] = await Promise.all([
      supabaseAdmin.from('departments').select('id, department_name, department_head_name'),
      supabaseAdmin.from('employees').select('id, department_id, employee_name, designation, profile_photo'),
      supabaseAdmin.from('attendance').select('employee_id, department_id, attendance_status, work_status, working_hours, created_at').gte('created_at', `${last7Days[0]}T00:00:00Z`).lte('created_at', `${today}T23:59:59Z`),
      logoutsQuery,
      tasksQuery,
      activityQuery,
      productivityQuery,
      sessionsQuery
    ])

    // Calculate work session statistics for today
    const activeSessionsList = (todaySessions || []).filter(s => s.status === 'ACTIVE' && s.logout_time === null)
    const activeUsersToday = new Set(activeSessionsList.map(s => s.user_id)).size
    const loggedInUsersToday = new Set((todaySessions || []).map(s => s.user_id)).size
    const loggedOutUsersToday = (todaySessions || []).filter(s => s.status === 'COMPLETED').length
    const reportsSubmittedToday = (todaySessions || []).filter(s => s.report_submitted).length

    let onboardingAdmins: any[] = []
    let onboardingDepts: any[] = []
    let onboardingEmps: any[] = []

    try {
      const [adminsRes, deptsRes, empsRes] = await Promise.all([
        supabaseAdmin.from('admins').select('id, full_name, email, onboarding_completed, profile_completion_percentage, mandatory_fields_completed'),
        supabaseAdmin.from('departments').select('id, department_name, department_head_name, onboarding_completed, profile_completion_percentage, mandatory_fields_completed'),
        supabaseAdmin.from('employees').select('id, employee_name, employee_email, designation, onboarding_completed, profile_completion_percentage, mandatory_fields_completed')
      ])
      if (adminsRes.data) onboardingAdmins = adminsRes.data
      if (deptsRes.data) onboardingDepts = deptsRes.data
      if (empsRes.data) onboardingEmps = empsRes.data
    } catch (e) {
      console.warn("Onboarding database columns not yet created. Skipping onboarding analytics fetch.", e)
    }

  // Extract Department Head IDs to filter them out of employee lists & stats
  const deptHeadIds = new Set(
    (globalEmployees || [])
      .filter(e => e.designation === 'Department Head')
      .map(e => e.id)
  )

  // Calculate onboarding statistics safely
  const allUsersOnboarding = [
    ...onboardingAdmins.map(a => ({ id: a.id, name: a.full_name || 'Admin', email: a.email || '', role: 'ADMIN', completed: !!a.onboarding_completed, percentage: a.profile_completion_percentage || 0, mandatoryFields: a.mandatory_fields_completed || [] })),
    ...onboardingDepts.map(d => ({ id: d.id, name: d.department_head_name || d.department_name || 'Dept Head', email: '', role: 'DEPT HEAD', completed: !!d.onboarding_completed, percentage: d.profile_completion_percentage || 0, mandatoryFields: d.mandatory_fields_completed || [] })),
    ...onboardingEmps.filter(e => e.designation !== 'Department Head').map(e => ({ id: e.id, name: e.employee_name || 'Employee', email: e.employee_email || '', role: 'EMPLOYEE', completed: !!e.onboarding_completed, percentage: e.profile_completion_percentage || 0, mandatoryFields: e.mandatory_fields_completed || [] }))
  ]

  const completedOnboarding = allUsersOnboarding.filter(u => u.completed).length
  const incompleteUsers = allUsersOnboarding.filter(u => !u.completed)
  const totalWorkforceOnboarding = allUsersOnboarding.length

  const totalDepartments = departments?.length || 0

  const rawGlobalTodayAttendance = globalAttendance?.filter(a => a.created_at.startsWith(today)) || []
  const globalTodayAttendance = Array.from(new Map(rawGlobalTodayAttendance.map(a => [a.employee_id, a])).values()).filter(a => !deptHeadIds.has(a.employee_id))

  const combinedEmployees = (globalEmployees || []).filter(e => e.designation !== 'Department Head')

  // Combine raw global attendance
  const combinedGlobalTodayAttendance = globalTodayAttendance

  // Drill-down data
  const employees = dept_id ? combinedEmployees.filter(e => e.department_id === dept_id) : combinedEmployees
  const totalEmployees = employees?.length || 0

  const attendance = dept_id ? globalAttendance?.filter(a => a.department_id === dept_id) : globalAttendance
  const rawTodayAttendance = attendance?.filter(a => a.created_at.startsWith(today)) || []
  const todayAttendance = Array.from(new Map(rawTodayAttendance.map(a => [a.employee_id, a])).values()).filter(a => !deptHeadIds.has(a.employee_id))

  const combinedTodayAttendance = todayAttendance

  const presentCount = combinedTodayAttendance.filter(a => a.attendance_status === 'PRESENT' || a.attendance_status === 'HALF_DAY').length
  const lateCount = combinedTodayAttendance.filter(a => a.attendance_status === 'LATE').length
  const totalCheckedIn = presentCount + lateCount
  const absentCount = totalEmployees - totalCheckedIn
  const activeSessions = combinedTodayAttendance.filter(a => a.work_status === 'ACTIVE' || a.work_status === 'LOGOUT_REQUESTED').length

  const loggedOutWithHours = combinedTodayAttendance.filter(a => a.work_status === 'LOGGED_OUT' && a.working_hours)
  let avgHoursDisplay = "0h 0m"
  if (loggedOutWithHours.length > 0) {
    let totalMins = 0
    loggedOutWithHours.forEach(record => {
      const parts = record.working_hours.match(/(\d+)h\s*(\d+)m/)
      if (parts) {
        totalMins += parseInt(parts[1]) * 60 + parseInt(parts[2])
      }
    })
    const avgMins = Math.floor(totalMins / loggedOutWithHours.length)
    avgHoursDisplay = `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`
  }

  const totalTasks = tasks?.length || 0
  const completedTasks = tasks?.filter(t => t.task_status === 'COMPLETED').length || 0
  const delayedTasks = tasks?.filter(t => t.task_status === 'DELAYED').length || 0

  // Build Employee Leaderboard (excluding Department Heads)
  const filteredProductivityScores = (productivityScores || []).filter(score => !deptHeadIds.has(score.employee_id))
  const employeeLeaderboard: LeaderboardEntry[] = filteredProductivityScores.map((score, idx) => {
    const emp = globalEmployees?.find(e => e.id === score.employee_id)
    const dept = departments?.find(d => d.id === score.department_id)
    return {
      id: score.employee_id,
      rank: idx + 1,
      name: emp?.employee_name || 'Unknown',
      subtitle: dept?.department_name || 'Unknown Dept',
      score: score.productivity_score ?? 0,
      avatarUrl: emp?.profile_photo ?? undefined,
    }
  })

  // Org-wide productivity percentage (excluding Department Heads)
  const orgProductivity = filteredProductivityScores.length > 0
    ? Math.round(filteredProductivityScores.reduce((sum, s) => sum + (s.productivity_score ?? 0), 0) / filteredProductivityScores.length)
    : 0

  // Chart Data
  const attendanceChartData = last7Days.map(date => {
    const dayRecordsRaw = attendance?.filter(a => a.created_at.startsWith(date)) || []
    const dayRecords = Array.from(new Map(dayRecordsRaw.map(a => [a.employee_id, a])).values()).filter(a => !deptHeadIds.has(a.employee_id))
    const present = dayRecords.filter(a => ['PRESENT', 'HALF_DAY', 'LATE'].includes(a.attendance_status)).length
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
      present: present,
      absent: Math.max(0, totalEmployees - present)
    }
  })

  const taskChartData = (departments || []).filter(d => dept_id ? d.id === dept_id : true).map(dept => {
    const deptTasks = tasks?.filter(t => t.department_id === dept.id) || []
    return {
      name: (dept.department_name || '').substring(0, 3).toUpperCase(),
      completed: deptTasks.filter(t => t.task_status === 'COMPLETED').length,
      pending: deptTasks.filter(t => ['PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(t.task_status)).length,
      delayed: deptTasks.filter(t => t.task_status === 'DELAYED').length
    }
  })

  const selectedDepartment = departments?.find(d => d.id === dept_id)

  return (
    <div className="p-4 sm:p-6 md:p-8 pb-20">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            {dept_id && (
              <Link href="/admin/dashboard" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0A1A2F]">
              {dept_id ? `${selectedDepartment?.department_name} Overview` : 'Admin Command Center'}
            </h1>
          </div>
          <p className="text-slate-500 mt-1">
            {dept_id ? `Detailed drill-down for ${selectedDepartment?.department_name} operations.` : 'Live operational overview & workforce analytics.'}
          </p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 font-semibold rounded-lg text-sm flex items-center gap-2 border border-emerald-100 shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          System Online
        </div>
      </header>

      {!dept_id ? (
        // ─── GLOBAL VIEW ───────────────────────────────────────────────────
        <>
          {/* Org-level summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <AnalyticsCard title="Total Departments" value={totalDepartments} icon={Building2} colorClass="text-[#0066FF]" bgClass="bg-blue-50" delay={0} />
            <AnalyticsCard title="Total Workforce" value={globalEmployees?.length || 0} icon={Users} colorClass="text-indigo-600" bgClass="bg-indigo-50" delay={1} />
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Org Productivity</p>
              <p className="text-3xl font-black text-[#0A1A2F]">
                <AnimatedCounter value={orgProductivity} />
              </p>
              <ProductivityBadge score={orgProductivity} className="mt-2" />
            </div>
            <AnalyticsCard title="Active Users Today" value={activeUsersToday} icon={Activity} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
          </div>

          {/* Organization Task Status */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Organization Task Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RealtimeAdminTaskCards />
            </div>
          </div>

          {/* Today's Shift Activity Cards */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Today's Shift Activity</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <AnalyticsCard title="Active Users" value={activeUsersToday} icon={Activity} colorClass="text-emerald-600" bgClass="bg-emerald-50" delay={0} />
              <AnalyticsCard title="Logged In" value={loggedInUsersToday} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50" delay={1} />
              <AnalyticsCard title="Logged Out" value={loggedOutUsersToday} icon={LogOut} colorClass="text-slate-500" bgClass="bg-slate-50" delay={2} />
              <AnalyticsCard title="Reports Submitted" value={reportsSubmittedToday} icon={FileText} colorClass="text-purple-600" bgClass="bg-purple-50" delay={3} />
            </div>
          </div>

          {/* Global Leaderboard + Department breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <LeaderboardTable entries={employeeLeaderboard} title="🏆 Top Employees Leaderboard" />

            {/* Department Productivity Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-[#0A1A2F]">Department Breakdown</h3>
              </div>
              <div className="p-4 space-y-3 overflow-auto max-h-96">
                {departments?.map((dept) => {
                  const deptEmployees = combinedEmployees.filter(e => e.department_id === dept.id).length || 0
                  const deptAttendance = combinedGlobalTodayAttendance.filter(a => a.department_id === dept.id).length || 0
                  const percent = deptEmployees > 0 ? Math.round((deptAttendance / deptEmployees) * 100) : 0
                  const deptScores = (productivityScores || []).filter(s => s.department_id === dept.id);
                  const deptAvgScore = deptScores.length ? Math.round(deptScores.reduce((sum, s) => sum + (s.productivity_score ?? 0), 0) / deptScores.length) : 0;

                  return (
                    <Link
                      key={dept.id}
                      href={`/admin/dashboard?dept_id=${dept.id}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-black text-sm group-hover:border-blue-300">
                          {(dept.department_name || '').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{dept.department_name}</p>
                          <p className="text-xs text-slate-500">{deptEmployees} employees • {deptAttendance} present</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-500">Attendance</p>
                          <p className="font-bold text-slate-900">{percent}%</p>
                        </div>
                      <ProductivityBadge score={Number(deptAvgScore)} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Workforce Onboarding Status & Incomplete Profiles Tracker */}
          {onboardingAdmins.length > 0 || onboardingDepts.length > 0 || onboardingEmps.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 animate-fadeIn">
              {/* Workforce Onboarding Stats Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0A1A2F]">Workforce Onboarding</h3>
                    <span className="px-2.5 py-1 bg-blue-50 text-[#0066FF] border border-blue-100 rounded-full text-xs font-bold">
                      {completedOnboarding} / {totalWorkforceOnboarding} Done
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    Track onboarding completion status across Admins, Department Heads, and Employees. Access is restricted until they achieve at least 70% profile completion.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Stats row */}
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Global Compliance Rate</span>
                    <span className="text-2xl font-black text-slate-800">
                      {totalWorkforceOnboarding > 0 ? Math.round((completedOnboarding / totalWorkforceOnboarding) * 100) : 100}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full animate-progress"
                      style={{ width: `${totalWorkforceOnboarding > 0 ? (completedOnboarding / totalWorkforceOnboarding) * 100 : 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl text-center">
                      <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">Completed</span>
                      <strong className="text-xl font-bold text-slate-800">{completedOnboarding}</strong>
                    </div>
                    <div className="p-3 bg-amber-50/50 border border-amber-100/50 rounded-xl text-center">
                      <span className="text-[10px] text-amber-600 font-bold block uppercase tracking-wider">Incomplete</span>
                      <strong className="text-xl font-bold text-slate-800">{incompleteUsers.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incomplete Profiles List */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#0A1A2F]">Pending Onboarding Tasks</h3>
                  <span className="text-xs font-semibold text-slate-500">{incompleteUsers.length} profiles pending completion</span>
                </div>
                
                <div className="p-4 overflow-y-auto max-h-[300px] flex-1 divide-y divide-slate-50">
                  {incompleteUsers.map((emp) => {
                    const possibleFields = ['dob', 'gender', 'address', 'city', 'state', 'pin_code', 'aadhaar_number', 'pan_number', 'phone_number']
                    const missing: string[] = []
                    
                    possibleFields.forEach(f => {
                      if (!emp.mandatoryFields || !emp.mandatoryFields.includes(f)) {
                        missing.push(f.replace('_', ' '))
                      }
                    })

                    const missingString = missing.length > 0 ? missing.slice(0, 3).join(', ') + (missing.length > 3 ? '...' : '') : 'role details/contacts'

                    let progressColor = 'bg-red-500'
                    if (emp.percentage >= 40) progressColor = 'bg-amber-500'

                    return (
                      <div key={`${emp.id}-${emp.role}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 uppercase border border-slate-200">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 flex items-center gap-2">
                              {emp.name}
                              <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-bold uppercase">
                                {emp.role}
                              </span>
                            </p>
                            <p className="text-[10px] text-red-500 font-medium">Missing: {missingString}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:text-right">
                          <div className="w-32">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span>Progress</span>
                              <span>{emp.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div className={`h-full ${progressColor} rounded-full`} style={{ width: `${emp.percentage}%` }} />
                            </div>
                          </div>
                          
                          <div className="px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            Access Blocked
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {incompleteUsers.length === 0 && (
                    <div className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold">All profiles are successfully onboarded!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        // ─── DRILL-DOWN VIEW ───────────────────────────────────────────────
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
            <AnalyticsCard title="Staff Count" value={totalEmployees} icon={Users} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
            <AnalyticsCard title="Present Today" value={presentCount} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
            <AnalyticsCard title="Absent Today" value={absentCount} icon={XCircle} colorClass="text-red-600" bgClass="bg-red-50" />
            <AnalyticsCard title="Active Sessions" value={activeSessions} icon={Activity} colorClass="text-blue-600" bgClass="bg-blue-50" />
            <AnalyticsCard title="Reports Submitted" value={reportsSubmittedToday} icon={FileText} colorClass="text-purple-600" bgClass="bg-purple-50" />
            <RealtimeAdminDeptTaskCards 
              deptId={dept_id!} 
              initialTotal={totalTasks} 
              initialCompleted={completedTasks} 
              initialPending={totalTasks - completedTasks} 
            />
            <AnalyticsCard title="Avg Work Hours" value={avgHoursDisplay} icon={Clock} colorClass="text-purple-600" bgClass="bg-purple-50" />
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dept Score</p>
              <p className="text-3xl font-black text-[#0A1A2F]">
                <AnimatedCounter value={orgProductivity} />
              </p>
              <ProductivityBadge score={orgProductivity} className="mt-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="col-span-1 lg:col-span-2 space-y-8">
              <AttendanceChart data={attendanceChartData} />
              <TaskChart data={taskChartData} />
              
              {/* Department Employees List */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Employees List</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                        <th className="pb-3 font-semibold">Employee</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Productivity</th>
                        <th className="pb-3 font-semibold">Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees?.map((emp) => {
                         const empAttendance = combinedTodayAttendance.find(a => a.employee_id === emp.id)
                         const empScore = productivityScores?.find(s => s.employee_id === emp.id)?.productivity_score ?? 0
                         const isHead = emp.designation === 'Department Head'
                         const empTasks = tasks?.filter(t => isHead ? (t.assigned_to === emp.id || t.assigned_employee_id === emp.id) : t.assigned_employee_id === emp.id) || []
                         const completed = empTasks.filter(t => t.task_status === 'COMPLETED').length
                         const total = empTasks.length
                         
                         const empSessions = (todaySessions || [])
                           .filter(s => s.user_id === emp.id)
                           .sort((a, b) => new Date(a.login_time).getTime() - new Date(b.login_time).getTime())

                         const isEmpActive = empSessions.some(s => s.status === 'ACTIVE' && s.logout_time === null)
                        
                        return (
                          <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <UserAvatar 
                                  url={emp.profile_photo} 
                                  name={emp.employee_name} 
                                  className="w-10 h-10 rounded-full" 
                                />
                                <div>
                                  <p className="font-semibold text-slate-900">{emp.employee_name}</p>
                                  <p className="text-xs text-slate-500">{emp.designation}</p>
                                  {empSessions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5 max-w-xs sm:max-w-md">
                                      {empSessions.map((session, idx) => {
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
                                          <span key={session.session_id} className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${!session.logout_time ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                            S{idx + 1}: {inTime} → {outTime}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${!empAttendance ? 'bg-slate-100 text-slate-600' : empAttendance.attendance_status === 'LATE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {empAttendance?.attendance_status || 'ABSENT'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${!isEmpActive ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                                  {isEmpActive ? 'ACTIVE' : 'OFFLINE'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4">
                              <ProductivityBadge score={empScore} />
                            </td>
                            <td className="py-4">
                              <div className="text-sm">
                                <span className="font-semibold text-slate-900">{completed}</span>
                                <span className="text-slate-500"> / {total}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {employees?.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">
                            No employees found in this department.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-span-1 space-y-8">
              <LeaderboardTable entries={employeeLeaderboard} title="Dept Leaderboard" />
              <ActivityFeed activities={activityFeed || []} />
            </div>
          </div>
        </>
      )}

    </div>
  )
  } catch (error: any) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-red-50 text-red-900 border border-red-200 rounded-xl mt-8">
        <h2 className="text-2xl font-bold mb-4">Server Component Crash (Raw)</h2>
        <div className="bg-white p-4 rounded border border-red-100 overflow-auto text-sm font-mono whitespace-pre-wrap">
          {error?.message || String(error)}
          <br /><br />
          {error?.stack}
        </div>
      </div>
    )
  }
}
