export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeDetailsView } from "@/components/department/EmployeeDetailsView"

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
    .eq('department_id', user.id) // Security check: must belong to the department head's department
    .single()

  if (!employee) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Employee profile not found or unauthorized access.
      </div>
    )
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
    <EmployeeDetailsView 
      employee={employee}
      approvedLeaves={approvedLeaves || []}
      totalLeavesApproved={totalLeavesApproved}
    />
  )
}
