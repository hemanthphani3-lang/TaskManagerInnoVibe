export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { AdminLeavesView } from "./AdminLeavesView"

export default async function AdminLeavesPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  // Verify Admin role
  const { data: adminCheck } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminCheck) redirect("/login")

  // Fetch all leave requests, employees, departments, and admins in parallel
  const [leavesRes, employeesRes, departmentsRes, adminsRes] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('employees')
      .select('id, employee_name, designation, profile_photo'),
    supabase
      .from('departments')
      .select('id, department_name, department_email, department_head_name, profile_photo'),
    supabase
      .from('admins')
      .select('id, full_name')
  ])

  const leaves = leavesRes.data || []
  const employees = employeesRes.data || []
  const departments = departmentsRes.data || []
  const admins = adminsRes.data || []

  // Resolve names and details for each leave request
  const resolvedLeaves = leaves.map(leave => {
    // 1. Resolve requester details
    let requesterName = "Unknown User"
    let requesterRole = "EMPLOYEE"
    let requesterDesignation = "Staff"
    let requesterPhoto = null
    let deptName = "Unassigned"

    const emp = employees.find(e => e.id === leave.employee_id)
    if (emp) {
      requesterName = emp.employee_name
      requesterRole = "EMPLOYEE"
      requesterDesignation = emp.designation || "Employee"
      requesterPhoto = emp.profile_photo
      
      const dept = departments.find(d => d.id === leave.department_id)
      if (dept) deptName = dept.department_name
    } else {
      // Check if it's a Department Head
      const deptHead = departments.find(d => d.id === leave.employee_id)
      if (deptHead) {
        requesterName = deptHead.department_head_name || (deptHead.department_name + " Head")
        requesterRole = "DEPARTMENT"
        requesterDesignation = "Department Head"
        requesterPhoto = deptHead.profile_photo || null
        deptName = deptHead.department_name
      }
    }

    // 2. Resolve approved/rejected by name
    let resolvedByName = null
    if (leave.approved_by) {
      const resolverAdmin = admins.find(a => a.id === leave.approved_by)
      if (resolverAdmin) {
        resolvedByName = resolverAdmin.full_name + " (Admin)"
      } else {
        const resolverDept = departments.find(d => d.id === leave.approved_by)
        if (resolverDept) {
          resolvedByName = resolverDept.department_name + " Head"
        }
      }
    }

    return {
      ...leave,
      requesterName,
      requesterRole,
      requesterDesignation,
      requesterPhoto,
      deptName,
      resolvedByName
    }
  })

  return (
    <div className="p-4 sm:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader 
          title="Organization Leave Approvals" 
          description="Manage, review, and approve leave requests for all employees and department heads."
        />

        <div className="mt-8">
          <AdminLeavesView initialLeaves={resolvedLeaves} />
        </div>
      </div>
    </div>
  )
}
