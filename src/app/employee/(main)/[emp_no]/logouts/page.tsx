export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { SessionHistoryList } from "@/components/employee/SessionHistoryList"

export default async function EmployeeLogoutReportsPage({ params }: { params: Promise<{ emp_no: string }> }) {
  const { emp_no } = await params
  const supabase = await createClient()
  
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect('/login')

  // Fetch employee details to verify
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!employee || employee.employee_code !== emp_no) {
    redirect(`/employee/${employee?.employee_code || 'dashboard'}/logouts`)
  }

  // Fetch employee's full history of work sessions joined with logout reports
  const { data: sessions } = await supabase
    .from('work_sessions')
    .select(`
      *,
      logout_reports:logout_reports!logout_reports_session_id_fkey (*)
    `)
    .eq('user_id', user.id)
    .order('login_time', { ascending: false })

  const sessionsList = sessions || []

  return (
    <div className="p-4 sm:p-8 pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        <PageHeader 
          title="My Session History" 
          description="Review your past checked-in shifts, working hours, and submitted daily work session reports."
        />

        <SessionHistoryList sessions={sessionsList} />
      </div>
    </div>
  )
}
