export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { LeaveForm } from "./LeaveForm"

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
            <LeaveForm departmentId={employee?.department_id || ""} />
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
                      {(() => {
                        const status = leave.approval_status ?? leave.status ?? 'PENDING';
                        const badgeClass =
                          status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700';
                        return (
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${badgeClass}`}> 
                            {status}
                          </span>
                        );
                      })()}
                      {leave.approval_status === 'REJECTED' && leave.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                          Rejection Reason: {leave.rejection_reason}
                        </p>
                      )}
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
