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

  // Fetch all employee IDs in the department (excluding Department Heads)
  const { data: emps } = await supabaseAdmin
    .from('employees')
    .select('id, designation')
    .eq('department_id', user.id)

  const empIds = emps?.filter(e => e.designation !== 'Department Head').map(e => e.id) || []

  // Fetch task IDs where any employee or department head is assigned
  const { data: assigneeRecords } = await supabaseAdmin
    .from('task_assignees')
    .select('task_id')
    .in('user_id', [...empIds, user.id])

  const deptTaskIds = assigneeRecords?.map(r => r.task_id) || []

  let tasksQuery = supabaseAdmin
    .from('tasks')
    .select('*, task_assignees(*)')

  if (deptTaskIds.length > 0) {
    tasksQuery = tasksQuery.or(`id.in.(${deptTaskIds.map(id => `"${id}"`).join(',')}),created_by.eq.${user.id},department.eq.${deptName},department_id.eq.${user.id}`)
  } else {
    tasksQuery = tasksQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id},department.eq.${deptName},department_id.eq.${user.id}`)
  }

  const { data: tasks } = await tasksQuery
    .order('created_at', { ascending: false })

  const mappedTasks = tasks?.map(t => ({
    ...t,
    assignee_ids: (t.task_assignees as any[])?.map(a => a.user_id) || []
  })) || []

  return (
    <TaskWorkspaceDashboard
      initialTasks={mappedTasks}
      currentUserId={user.id}
      currentUserRole="DEPARTMENT"
      currentUserDept={deptName}
    />
  )
}
