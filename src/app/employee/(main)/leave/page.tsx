import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { submitLeaveRequest } from "@/app/actions/leave"

export default async function EmployeeLeavePage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  const { data: employee } = await supabase
    .from('employees')
    .select('department_id')
    .eq('id', user.id)
    .single()

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A1A2F]">Leave Management</h1>
        <p className="text-slate-500 mt-1">Apply for leave and view your request history.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">New Request</h3>
            <form action={async (formData) => { "use server"; await submitLeaveRequest(formData); }} className="space-y-4">
              <input type="hidden" name="departmentId" value={employee?.department_id} />
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Leave Type</label>
                <select name="leaveType" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all">
                  <option value="">Select type...</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="PAID_TIME_OFF">Paid Time Off (PTO)</option>
                  <option value="UNPAID_LEAVE">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Start Date</label>
                  <input type="date" name="startDate" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">End Date</label>
                  <input type="date" name="endDate" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Reason</label>
                <textarea name="reason" rows={3} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all resize-none" placeholder="Provide a brief reason..."></textarea>
              </div>

              <button type="submit" className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white py-3 rounded-xl font-semibold transition-colors mt-2">
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Leave History</h3>
            <div className="space-y-4">
              {leaves && leaves.length > 0 ? (
                leaves.map((leave) => (
                  <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-[#0066FF]">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{leave.leave_type.replace('_', ' ')}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Clock className="w-4 h-4" />
                          <span>{leave.start_date} to {leave.end_date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        leave.approval_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                        leave.approval_status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {leave.approval_status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>You haven&apos;t submitted any leave requests yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
