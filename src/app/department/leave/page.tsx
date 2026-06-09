export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react"
import { LeaveForm } from "@/app/employee/(main)/leave/LeaveForm"

export default async function DepartmentLeavePage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error in department leave page:", error)
  }

  if (!user) redirect("/login")

  // Verify they are a Department Head
  const { data: deptProfile } = await supabase
    .from('departments')
    .select('id, department_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!deptProfile) redirect("/login")

  // Fetch the department head's leave requests (leaves submitted by them)
  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A1A2F]">Request Leave</h1>
        <p className="text-slate-500 mt-1">Submit leave requests to Admins and track your history.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">New Leave Request</h3>
            
            {/* Note to the Department Head */}
            <div className="mb-5 p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex gap-3 text-xs text-purple-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-purple-600 mt-0.5" />
              <p>As a Department Head, your leave requests go directly to the Admin for approval.</p>
            </div>

            {/* LeaveForm with departmentId set to empty string so it translates to null (handled by Admin) */}
            <LeaveForm departmentId="" />
          </div>
        </div>

        {/* History Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#0A1A2F] mb-6">Your Leave History</h3>
            <div className="space-y-4">
              {leaves && leaves.length > 0 ? (
                leaves.map((leave) => (
                  <div 
                    key={leave.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-[#0066FF]">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{leave.leave_type.replace(/_/g, ' ')}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Clock className="w-4 h-4" />
                          <span>{leave.start_date} to {leave.end_date}</span>
                        </div>
                        <p className="text-xs text-slate-650 mt-2 bg-white/70 px-3 py-2 rounded-lg border border-slate-100 max-w-md">
                          <strong className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider block">Reason:</strong>
                          {leave.reason}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {(() => {
                        const status = leave.approval_status ?? 'PENDING';
                        const badgeClass =
                          status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : status === 'REJECTED'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200';
                        return (
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${badgeClass}`}> 
                            {status}
                          </span>
                        );
                      })()}
                      {leave.approval_status === 'REJECTED' && leave.rejection_reason && (
                        <p className="text-xs text-red-650 mt-1 font-semibold max-w-[200px] text-right whitespace-pre-wrap">
                          Reason: {leave.rejection_reason}
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
