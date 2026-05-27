export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { TaskWorkspaceDashboard } from "@/components/tasks/TaskWorkspaceDashboard"

export const revalidate = 0

export default async function DepartmentTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch department details to filter department-specific tasks
  const { data: dept } = await supabaseAdmin
    .from('departments')
    .select('department_name')
    .eq('id', user.id)
    .maybeSingle()

  const deptName = dept?.department_name || ""

  // Fetch tasks assigned to them, assigned by them, or matching department labels
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id},department.eq.${deptName},department_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return (
    <TaskWorkspaceDashboard
      initialTasks={tasks || []}
      currentUserId={user.id}
      currentUserRole="DEPARTMENT"
      currentUserDept={deptName}
    />
  )
}
