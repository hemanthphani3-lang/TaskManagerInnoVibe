export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserCircle2 } from "lucide-react"
import ActionButtons from "./ActionButtons"
import IdentityCheckCard from "./IdentityCheckCard"

export default async function EmployeeIdentityCheck() {
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}

  if (!user) redirect("/login")

  // Fetch profile
  let employee = null
  let isDeptHead = false
  let departmentName = "Unassigned"

  // 1. Try to fetch from departments first (representing Department Heads)
  const { data: dept } = await supabase
    .from('departments')
    .select('id, department_name, department_head_name, profile_photo, leadership_role')
    .eq('id', user!.id)
    .maybeSingle()

  if (dept) {
    isDeptHead = true
    departmentName = dept.department_name || "Department"
    employee = {
      id: dept.id,
      employee_name: dept.department_head_name,
      designation: dept.leadership_role || "Department Head",
      profile_photo: dept.profile_photo,
      department_id: dept.id
    }
  } else {
    // 2. Fetch standard employee profile
    const { data: emp } = await supabase
      .from('employees')
      .select(`
        *,
        departments!department_id(department_name)
      `)
      .eq('id', user!.id)
      .maybeSingle()

    if (emp) {
      employee = emp
      departmentName = (emp?.departments as any)?.department_name || "Unassigned"
      if (emp.account_status === 'Inactive' || emp.account_status === 'INACTIVE') {
        redirect(`/employee/${emp.employee_code || 'dashboard'}/dashboard`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <IdentityCheckCard
        employeeName={employee?.employee_name || user!.email || "Employee"}
        designation={employee?.designation || "Employee"}
        profilePhoto={employee?.profile_photo}
        departmentName={departmentName}
      >
        <ActionButtons
          employeeId={employee?.id || ""}
          departmentId={employee?.department_id || ""}
          isDepartmentHead={isDeptHead}
        />
      </IdentityCheckCard>
    </div>
  )
}
