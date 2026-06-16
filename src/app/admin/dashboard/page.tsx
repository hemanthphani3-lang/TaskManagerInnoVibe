export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { AdminDashboardClient } from "@/components/dashboard/AdminDashboardClient"

export default async function AdminDashboard() {
  try {
    const supabase = await createClient()
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch (e) {
      // ignore, redirect below
    }

    if (!user) redirect("/login")

    const today = new Date().toISOString().split('T')[0]
    
    // Generate dates for the last 30 days to support "This Month"
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    const startUTC30 = `${last30Days[0]}T00:00:00Z`
    const endUTC30 = `${today}T23:59:59Z`

    const supabaseAdmin = createServiceClient()

    // Execute independent queries concurrently
    const [
      { data: departments },
      { data: employees },
      { data: attendance },
      { data: tasks },
      { data: workSessions },
      { data: productivityScores },
      { count: pendingLeavesCount },
      { count: pendingLogoutsCount },
      { data: activityFeed }
    ] = await Promise.all([
      supabaseAdmin.from('departments').select('id, department_name, department_head_name'),
      supabaseAdmin.from('employees').select('id, department_id, employee_name, designation, profile_photo, onboarding_completed, profile_completion_percentage, account_status'),
      supabaseAdmin.from('attendance').select('employee_id, department_id, attendance_status, work_status, working_hours, created_at').gte('created_at', startUTC30).lte('created_at', endUTC30),
      supabaseAdmin.from('tasks').select('id, task_status, due_date, department_id, assigned_employee_id, created_at'),
      supabaseAdmin.from('work_sessions').select('session_id, user_id, status, login_time, logout_time, report_submitted, department_id').gte('login_time', startUTC30).lte('login_time', endUTC30),
      supabaseAdmin.from('productivity_scores').select('employee_id, department_id, productivity_score, calculated_at'),
      supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'PENDING'),
      supabaseAdmin.from('logout_requests').select('*', { count: 'exact', head: true }).eq('approval_status', 'PENDING'),
      supabaseAdmin.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(10)
    ])

    return (
      <AdminDashboardClient
        departments={departments || []}
        employees={employees || []}
        attendance={attendance || []}
        tasks={tasks || []}
        workSessions={workSessions || []}
        productivityScores={productivityScores || []}
        pendingLeavesCount={pendingLeavesCount || 0}
        pendingLogoutsCount={pendingLogoutsCount || 0}
        activityFeed={activityFeed || []}
      />
    )
  } catch (error: any) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-red-50 text-red-900 border border-red-200 rounded-xl mt-8">
        <h2 className="text-2xl font-bold mb-4">Server Component Crash (Dashboard)</h2>
        <div className="bg-white p-4 rounded border border-red-100 overflow-auto text-sm font-mono whitespace-pre-wrap">
          {error?.message || String(error)}
          <br /><br />
          {error?.stack}
        </div>
      </div>
    )
  }
}
