export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ArrowLeft, Mail, Phone, Calendar, CheckCircle2, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import { AttendanceSessionHistorySection } from "@/components/employee/AttendanceSessionHistorySection"

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: employeeId } = await params
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  // Fetch employee details
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .eq('department_id', user.id) // Security check
    .single()

  if (!employee) {
    return <div className="p-8">Employee not found or unauthorized.</div>
  }

  // Fetch approved leaves for this employee
  const { data: approvedLeaves } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('approval_status', 'APPROVED')
    .order('start_date', { ascending: false })

  const totalLeavesApproved = approvedLeaves?.length || 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/department/employees" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
            {employee.profile_photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={employee.profile_photo} alt={employee.employee_name} className="w-32 h-32 mx-auto rounded-full object-cover ring-4 ring-slate-50 mb-4" />
            ) : (
              <div className="w-32 h-32 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-4xl ring-4 ring-slate-50 mb-4">
                {employee.employee_name.charAt(0)}
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-900">{employee.employee_name}</h2>
            <p className="text-slate-500 font-medium mb-4">{employee.designation}</p>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wide">
              {employee.account_status}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 mb-2">Contact Info</h3>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{employee.employee_email}</span>
            </div>
            {employee.phone_number && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{employee.phone_number}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Code: <strong className="text-slate-900">{employee.employee_code}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Joined: <strong className="text-slate-900">{new Date(employee.joining_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong></span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Total Approved Leaves</h3>
              <p className="text-sm text-slate-500">Number of leave requests approved historically.</p>
            </div>
            <div className="text-4xl font-black text-[#0066FF] bg-blue-50 px-6 py-4 rounded-xl">
              {totalLeavesApproved}
            </div>
          </div>

          {/* Attendance & Session History */}
          <AttendanceSessionHistorySection employeeId={employeeId} />

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Approved Leave History</h3>
            
            <div className="space-y-4">
              {approvedLeaves && approvedLeaves.length > 0 ? (
                approvedLeaves.map(leave => (
                  <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-[#0066FF]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{leave.leave_type.replace('_', ' ')}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Clock className="w-4 h-4" />
                          <span>{leave.start_date} to {leave.end_date}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          <span className="font-semibold">Reason:</span> {leave.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p>No approved leaves found for this employee.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
