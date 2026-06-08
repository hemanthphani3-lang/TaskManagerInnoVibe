import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ArrowLeft, Clock, Users, CheckCircle2, XCircle, Activity, Target } from "lucide-react"
import Link from "next/link"

export default async function DepartmentBreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: departmentId } = await params
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  // Fetch department details
  const { data: department } = await supabase
    .from('departments')
    .select('*')
    .eq('id', departmentId)
    .single()

  if (!department) {
    return <div className="p-8">Department not found</div>
  }

  // Fetch all employees in this department
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_name, designation')
    .eq('department_id', departmentId)

  const totalEmployees = employees?.length || 0

  // Fetch today's attendance
  const today = new Date().toISOString().split('T')[0]
  const { data: attendance } = await supabase
    .from('attendance')
    .select('employee_id, attendance_status, check_in_time, work_status, working_hours')
    .eq('department_id', departmentId)
    .gte('created_at', `${today}T00:00:00Z`)
    .lte('created_at', `${today}T23:59:59Z`)

  const presentCount = attendance?.filter(a => a.attendance_status === 'PRESENT' || a.attendance_status === 'HALF_DAY').length || 0
  const lateCount = attendance?.filter(a => a.attendance_status === 'LATE').length || 0
  const totalCheckedIn = presentCount + lateCount
  const absentCount = totalEmployees - totalCheckedIn
  const attendancePercentage = totalEmployees > 0 ? Math.round((totalCheckedIn / totalEmployees) * 100) : 0

  const activeSessions = attendance?.filter(a => a.work_status === 'ACTIVE' || a.work_status === 'LOGOUT_REQUESTED').length || 0
  
  // Calculate average work hours (for those who have logged out)
  const loggedOutWithHours = attendance?.filter(a => a.work_status === 'LOGGED_OUT' && a.working_hours) || []
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

  const { count: pendingLogouts } = await supabase
    .from('logout_requests')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', departmentId)
    .eq('approval_status', 'PENDING')

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <Link 
          href={`/admin/departments/${departmentId}/edit`}
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 font-medium transition-colors text-sm shadow-sm self-start sm:self-auto"
        >
          <span>Edit Department Details</span>
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A1A2F]">{department.department_name} Breakdown</h1>
        <p className="text-slate-500 mt-1">Head: {department.department_head_name} | {department.department_email}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Employees</p>
              <h3 className="text-2xl font-bold text-[#0A1A2F]">{totalEmployees}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Check-Ins</p>
              <h3 className="text-2xl font-bold text-[#0A1A2F]">{totalCheckedIn}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm border-blue-200 bg-blue-50/20 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-blue-100 text-[#0066FF]">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Sessions</p>
              <h3 className="text-2xl font-bold text-[#0A1A2F]">{activeSessions}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Avg. Work Hours</p>
              <h3 className="text-2xl font-bold text-[#0A1A2F]">{avgHoursDisplay}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm border-amber-200 bg-amber-50/20 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Logouts</p>
              <h3 className="text-2xl font-bold text-[#0A1A2F]">{pendingLogouts || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between">
             <div>
                <p className="text-sm font-medium text-slate-500">Attendance %</p>
                <h3 className="text-2xl font-bold text-[#0A1A2F]">{attendancePercentage}%</h3>
             </div>
             <div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{ borderColor: attendancePercentage > 85 ? '#10B981' : attendancePercentage > 60 ? '#F59E0B' : '#EF4444' }}>
                <span className="text-sm font-bold" style={{ color: attendancePercentage > 85 ? '#10B981' : attendancePercentage > 60 ? '#F59E0B' : '#EF4444' }}>{attendancePercentage}%</span>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Employee Attendance List</h3>
        <div className="space-y-4">
          {employees && employees.length > 0 ? (
            employees.map((emp) => {
              const record = attendance?.find(a => a.employee_id === emp.id)
              const status = record ? record.attendance_status : 'ABSENT'
              
              return (
                <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold">
                      {emp.employee_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{emp.employee_name}</p>
                      <p className="text-xs text-slate-500">{emp.designation}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    {record && (
                      <p className="font-mono text-sm text-slate-700">
                        {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                      </p>
                    )}
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      status === 'LATE' ? 'bg-amber-100 text-amber-700' : 
                      status === 'ABSENT' ? 'bg-red-100 text-red-700' : 
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {status}
                    </span>
                    {record && (
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          record.work_status === 'LOGGED_OUT' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'
                      }`}>
                          {record.work_status === 'ACTIVE' ? 'ACTIVE' : record.work_status === 'LOGOUT_REQUESTED' ? 'PENDING LOGOUT' : 'LOGGED OUT'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-slate-500 text-center py-8">No employees found in this department.</p>
          )}
        </div>
      </div>
    </div>
  )
}
