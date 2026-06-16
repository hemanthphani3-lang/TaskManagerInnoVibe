export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Card } from "@/components/ui/card"
import { Users, Plus } from "lucide-react"
import Link from "next/link"
import { WorkforceDirectory } from "@/components/admin/WorkforceDirectory"

export const revalidate = 0

export default async function AdminEmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch employees
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("*, departments!department_id(department_name)")
    .order("created_at", { ascending: false })

  if (empError) {
    console.error("Error fetching employees:", empError)
  }

  // Fetch departments (representing department heads)
  const { data: departments, error: deptError } = await supabase
    .from("departments")
    .select("*")
    .order("created_at", { ascending: false })

  if (deptError) {
    console.error("Error fetching departments/heads:", deptError)
  }

  // Fetch productivity scores and attendance to map in the workforce list
  const [
    { data: productivityScores },
    { data: attendance }
  ] = await Promise.all([
    supabase.from("productivity_scores").select("employee_id, productivity_score"),
    supabase.from("attendance").select("employee_id, attendance_status")
  ])

  // Map to unified workforce structure
  const workforce: any[] = []

  if (employees) {
    employees.forEach((emp) => {
      if (emp.designation === 'Department Head') return

      const score = productivityScores?.find(s => s.employee_id === emp.id)?.productivity_score ?? 0
      const attLogs = attendance?.filter(a => a.employee_id === emp.id) || []
      const presentLogs = attLogs.filter(a => ["PRESENT", "LATE", "HALF_DAY"].includes(a.attendance_status)).length
      const attendanceRate = attLogs.length > 0 ? Math.round((presentLogs / attLogs.length) * 100) : 85

      workforce.push({
        id: emp.id,
        name: emp.employee_name || "Unknown Employee",
        code: emp.employee_code || "EMP-N/A",
        email: emp.employee_email,
        phone: emp.phone_number || "",
        department: emp.departments?.department_name || "Unassigned",
        roleName: emp.designation || "Employee",
        userType: "Employee",
        profileCompletion: emp.profile_completion_percentage ?? 0,
        status: emp.account_status || "Active",
        joiningDate: emp.joining_date,
        onboardingCompleted: !!emp.onboarding_completed,
        productivityScore: score,
        attendanceRate: attendanceRate
      })
    })
  }

  if (departments) {
    departments.forEach((dept) => {
      // Map department heads similarly
      const score = productivityScores?.find(s => s.employee_id === dept.id)?.productivity_score ?? 0
      const attLogs = attendance?.filter(a => a.employee_id === dept.id) || []
      const presentLogs = attLogs.filter(a => ["PRESENT", "LATE", "HALF_DAY"].includes(a.attendance_status)).length
      const attendanceRate = attLogs.length > 0 ? Math.round((presentLogs / attLogs.length) * 100) : 85

      workforce.push({
        id: dept.id,
        name: dept.department_head_name || "Unassigned Dept Head",
        code: dept.department_code || "DEPT-N/A",
        email: dept.department_email,
        phone: dept.phone_number || "",
        department: dept.department_name || "Department",
        roleName: dept.leadership_role || "Department Head",
        userType: "Department Head",
        profileCompletion: dept.profile_completion_percentage ?? 0,
        status: dept.status || "Active",
        joiningDate: dept.joining_date || dept.created_at,
        onboardingCompleted: !!dept.onboarding_completed,
        productivityScore: score,
        attendanceRate: attendanceRate
      })
    })
  }

  // Sort alphabetically by name
  workforce.sort((a, b) => a.name.localeCompare(b.name))

  // Unique department list for the filter
  const departmentsList = Array.from(
    new Set(
      [
        ...(departments?.map(d => d.department_name) || []),
        ...(employees?.map(e => e.departments?.department_name) || [])
      ].filter(Boolean)
    )
  ).sort()

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader 
            title="Workforce Directory" 
            description="Monitor and manage all corporate workforce employees and department heads in one unified directory."
          />
          <Link 
            href="/admin/employees/create" 
            className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-[#0066FF]/20 active:scale-95 text-sm shrink-0"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </Link>
        </div>

        {/* Unified Workforce Directory client component */}
        <WorkforceDirectory 
          initialWorkforce={workforce}
          departmentsList={departmentsList}
        />

      </div>
    </div>
  )
}
