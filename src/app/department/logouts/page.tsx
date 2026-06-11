export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { AdminSessionReports } from "@/components/admin/AdminSessionReports"

export default async function LogoutApprovalsPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
  if (!user) redirect('/login')

  // Fetch department profile to verify and get department name
  const { data: deptProfile } = await supabase
    .from('departments')
    .select('department_name')
    .eq('id', user.id)
    .single()

  if (!deptProfile) redirect('/login')

  // Fetch sessions and employees strictly for this department
  const [sessionsRes, employeesRes] = await Promise.all([
    supabase
      .from('work_sessions')
      .select(`
        *,
        logout_reports:logout_reports!logout_reports_session_id_fkey (*)
      `)
      .eq('department_id', user.id)
      .order('login_time', { ascending: false }),
    supabase
      .from('employees')
      .select('id, employee_name, designation, profile_photo')
      .eq('department_id', user.id)
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

  // Format distinct lists (only their own department)
  const departmentsList = [deptProfile.department_name]
  const employeesList = (employeesRes.data || [])
    .filter(e => e.designation !== 'Department Head')
    .map(e => ({
      id: e.id,
      name: e.employee_name
    }))

  return (
    <div className="p-4 sm:p-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader 
          title="Team Session Reports" 
          description="Monitor work session logs and daily work report submissions for your department team."
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
