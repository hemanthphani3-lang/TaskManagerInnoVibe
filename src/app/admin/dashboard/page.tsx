import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Building2, Users, CheckCircle2, Clock, Activity, Target, XCircle, ArrowLeft, TrendingUp } from "lucide-react"
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { AttendanceChart, TaskChart } from "@/components/dashboard/charts/DynamicCharts"
import { LeaderboardTable } from "@/components/productivity/LeaderboardTable"
import { ProductivityBadge } from "@/components/productivity/ProductivityBadge"
import type { LeaderboardEntry } from "@/components/productivity/LeaderboardTable"
import Link from "next/link"

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

  // Build dynamic queries based on dept_id filter
  let logoutsQuery = supabase.from('logout_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'PENDING')
  if (dept_id) logoutsQuery = logoutsQuery.eq('department_id', dept_id)

  let tasksQuery = supabase.from('tasks').select('id, department_id, assigned_employee_id, task_status')
  if (dept_id) tasksQuery = tasksQuery.eq('department_id', dept_id)

  let activityQuery = supabase.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(10)
  if (dept_id) activityQuery = activityQuery.eq('department_id', dept_id)

  let productivityQuery = supabase
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
    { data: productivityScores }
  ] = await Promise.all([
    supabase.from('departments').select('id, department_name, department_head_name'),
    supabase.from('employees').select('id, department_id, employee_name, designation, profile_photo'),
    supabase.from('attendance').select('employee_id, department_id, attendance_status, work_status, working_hours, created_at').gte('created_at', `${last7Days[0]}T00:00:00Z`).lte('created_at', `${today}T23:59:59Z`),
    logoutsQuery,
    tasksQuery,
    activityQuery,
    productivityQuery
  ])

  const totalDepartments = departments?.length || 0

  const rawGlobalTodayAttendance = globalAttendance?.filter(a => a.created_at.startsWith(today)) || []
  const globalTodayAttendance = Array.from(new Map(rawGlobalTodayAttendance.map(a => [a.employee_id, a])).values())

  // Drill-down data
  const employees = dept_id ? globalEmployees?.filter(e => e.department_id === dept_id) : globalEmployees
  const totalEmployees = employees?.length || 0

  const attendance = dept_id ? globalAttendance?.filter(a => a.department_id === dept_id) : globalAttendance
  const rawTodayAttendance = attendance?.filter(a => a.created_at.startsWith(today)) || []
  const todayAttendance = Array.from(new Map(rawTodayAttendance.map(a => [a.employee_id, a])).values())

  const presentCount = todayAttendance.filter(a => a.attendance_status === 'PRESENT' || a.attendance_status === 'HALF_DAY').length
  const lateCount = todayAttendance.filter(a => a.attendance_status === 'LATE').length
  const totalCheckedIn = presentCount + lateCount
  const absentCount = totalEmployees - totalCheckedIn
  const activeSessions = todayAttendance.filter(a => a.work_status === 'ACTIVE' || a.work_status === 'LOGOUT_REQUESTED').length

  const loggedOutWithHours = todayAttendance.filter(a => a.work_status === 'LOGGED_OUT' && a.working_hours)
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

  // Build Employee Leaderboard
  const employeeLeaderboard: LeaderboardEntry[] = (productivityScores || []).map((score, idx) => {
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

  // Org-wide productivity percentage
  const orgProductivity = productivityScores && productivityScores.length > 0
    ? productivityScores.reduce((sum, s) => sum + (s.productivity_score ?? 0), 0) / productivityScores.length
    : 0

  // Chart Data
  const attendanceChartData = last7Days.map(date => {
    const dayRecordsRaw = attendance?.filter(a => a.created_at.startsWith(date)) || []
    const dayRecords = Array.from(new Map(dayRecordsRaw.map(a => [a.employee_id, a])).values())
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
              <p className="text-3xl font-black text-[#0A1A2F]">{orgProductivity.toFixed(0)}</p>
              <ProductivityBadge score={orgProductivity} className="mt-2" />
            </div>
            <AnalyticsCard title="Pending Logouts" value={pendingLogouts || 0} icon={Target} colorClass="text-amber-600" bgClass="bg-amber-50" />
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
                  const deptEmployees = globalEmployees?.filter(e => e.department_id === dept.id).length || 0
                  const deptAttendance = globalTodayAttendance.filter(a => a.department_id === dept.id).length || 0
                  const percent = deptEmployees > 0 ? Math.round((deptAttendance / deptEmployees) * 100) : 0
                  const deptAvgScore = (productivityScores || []).filter(s => s.department_id === dept.id)
                    .reduce((sum, s, _, arr) => sum + (s.productivity_score ?? 0) / arr.length, 0) ?? 0

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
                        <ProductivityBadge score={deptAvgScore} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        // ─── DRILL-DOWN VIEW ───────────────────────────────────────────────
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
            <AnalyticsCard title="Staff Count" value={totalEmployees} icon={Users} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
            <AnalyticsCard title="Present Today" value={presentCount} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
            <AnalyticsCard title="Absent Today" value={absentCount} icon={XCircle} colorClass="text-red-600" bgClass="bg-red-50" />
            <AnalyticsCard title="Active Sessions" value={activeSessions} icon={Activity} colorClass="text-blue-600" bgClass="bg-blue-50" />
            <AnalyticsCard title="Pending Logouts" value={pendingLogouts || 0} icon={Target} colorClass="text-amber-600" bgClass="bg-amber-50" />
            <AnalyticsCard title="Total Tasks" value={totalTasks} icon={Building2} colorClass="text-slate-600" bgClass="bg-slate-100" />
            <AnalyticsCard title="Tasks Completed" value={completedTasks} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-50" delay={2} />
            <AnalyticsCard title="Tasks Delayed" value={delayedTasks} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-50" delay={3} />
            <AnalyticsCard title="Avg Work Hours" value={avgHoursDisplay} icon={Clock} colorClass="text-purple-600" bgClass="bg-purple-50" />
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dept Score</p>
              <p className="text-3xl font-black text-[#0A1A2F]">{orgProductivity.toFixed(0)}</p>
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
                        const empAttendance = todayAttendance.find(a => a.employee_id === emp.id)
                        const empScore = productivityScores?.find(s => s.employee_id === emp.id)?.productivity_score ?? 0
                        const empTasks = tasks?.filter(t => t.assigned_employee_id === emp.id) || []
                        const completed = empTasks.filter(t => t.task_status === 'COMPLETED').length
                        const total = empTasks.length
                        
                        return (
                          <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                                  {emp.profile_photo ? (
                                    <img src={emp.profile_photo} alt={emp.employee_name || 'User'} className="w-full h-full object-cover" />
                                  ) : (
                                    (emp.employee_name || 'U').charAt(0)
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{emp.employee_name}</p>
                                  <p className="text-xs text-slate-500">{emp.designation}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${!empAttendance ? 'bg-slate-100 text-slate-600' : empAttendance.attendance_status === 'LATE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {empAttendance?.attendance_status || 'ABSENT'}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${!empAttendance || empAttendance.work_status === 'LOGGED_OUT' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                                  {empAttendance?.work_status || 'OFFLINE'}
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
  } catch (error) {
    const err = error as Error;
    return (
      <div className="p-8 max-w-4xl mx-auto bg-red-50 text-red-900 border border-red-200 rounded-xl mt-8">
        <h2 className="text-2xl font-bold mb-4">Server Component Crash (Raw)</h2>
        <div className="bg-white p-4 rounded border border-red-100 overflow-auto text-sm font-mono whitespace-pre-wrap">
          {err?.message || String(error)}
          <br /><br />
          {err?.stack}
        </div>
      </div>
    )
  }
}
