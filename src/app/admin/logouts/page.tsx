export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { AdminSessionReports } from "@/components/admin/AdminSessionReports"

export default async function AdminLogoutReportsPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
  if (!user) redirect('/login')

  // Verify user is an Admin
  const { data: adminCheck } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminCheck) redirect('/login')

  // Fetch sessions, employees, and departments company-wide
  const [sessionsRes, employeesRes, departmentsRes] = await Promise.all([
    supabase
      .from('work_sessions')
      .select(`
        *,
        logout_reports:logout_reports!logout_reports_session_id_fkey (*)
      `)
      .order('login_time', { ascending: false }),
    supabase
      .from('employees')
      .select('id, employee_name, designation, profile_photo'),
    supabase
      .from('departments')
      .select('id, department_name')
  ])

  // Resolve employee/department head photo/designation for sessions
  const sessionsList = (sessionsRes.data || []).map(s => {
    if (s.user_role === 'DEPARTMENT') {
      return {
        ...s,
        designation: 'Department Head',
        profile_photo: null
      }
    }
    const emp = (employeesRes.data || []).find(e => e.id === s.user_id)
    return {
      ...s,
      designation: emp?.designation || 'Staff',
      profile_photo: emp?.profile_photo || null
    }
  })

  // Format distinct lists
  const departmentsList = (departmentsRes.data || []).map(d => d.department_name)
  const employeesList = (employeesRes.data || []).map(e => ({
    id: e.id,
    name: e.employee_name
  }))

  return (
    <div className="p-4 sm:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader 
          title="Work Session Reports" 
          description="Global administrative review of all employee shift sessions and daily work summaries."
        />

        <div className="mt-8">
          <AdminSessionReports 
            initialSessions={sessionsList}
            departments={departmentsList}
            employees={employeesList}
          />
        </div>
      </div>
    </div>
  )
}
