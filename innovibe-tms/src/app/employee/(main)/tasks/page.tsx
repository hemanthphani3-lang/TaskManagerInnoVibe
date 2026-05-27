export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { TaskWorkspaceDashboard } from "@/components/tasks/TaskWorkspaceDashboard"

export const revalidate = 0

export default async function EmployeeTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch employee's department details
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('departments!department_id(department_name)')
    .eq('id', user.id)
    .maybeSingle()

  const deptName = (emp?.departments as any)?.department_name || ""

  // Fetch tasks where the employee is the assignee or the creator
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id},assigned_employee_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return (
    <TaskWorkspaceDashboard
      initialTasks={tasks || []}
      currentUserId={user.id}
      currentUserRole="EMPLOYEE"
      currentUserDept={deptName}
    />
  )
}
