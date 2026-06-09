export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from "lucide-react"
import { updateLeaveStatus } from "@/app/actions/leave"
import { LeaveCard } from "./LeaveCard"

export default async function DepartmentLeaveApprovalsPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*, employees!employee_id(employee_name, profile_photo)')
    .eq('department_id', user.id)
    .order('created_at', { ascending: false })

  // Filter out leaves that are not pending
  const displayLeaves = leaves?.filter(leave => {
    const status = leave.approval_status ?? leave.status ?? 'PENDING';
    return status === 'PENDING';
  }) || []

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A1A2F]">Leave Approvals</h1>
        <p className="text-slate-500 mt-1">Manage employee leave requests.</p>
      </header>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="space-y-4">
          {displayLeaves.length > 0 ? (
            displayLeaves.map((leave) => {
              const emp = leave.employees as unknown as { employee_name: string, profile_photo: string | null }
              return <LeaveCard key={leave.id} leave={leave} emp={emp} />
            })
          ) : (
            <div className="text-center py-12 text-slate-500">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p>No leave requests pending.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
