export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { TaskWorkspaceDashboard } from "@/components/tasks/TaskWorkspaceDashboard"

export const revalidate = 0

export default async function EmployeeTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  // Fetch employee department and assignee records in parallel
  const [empRes, assigneeRecordsRes] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('departments!department_id(department_name)')
      .eq('id', user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', user.id)
  ])

  const emp = empRes.data
  const assigneeRecords = assigneeRecordsRes.data
  const assignedTaskIds = assigneeRecords?.map(r => r.task_id) || []

  let tasksQuery = supabaseAdmin
    .from('tasks')
    .select('*, task_assignees(*)')

  if (assignedTaskIds.length > 0) {
    tasksQuery = tasksQuery.or(`id.in.(${assignedTaskIds.map(id => `"${id}"`).join(',')}),created_by.eq.${user.id}`)
  } else {
    tasksQuery = tasksQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id},assigned_employee_id.eq.${user.id}`)
  }

  const { data: tasks } = await tasksQuery
    .order('created_at', { ascending: false })
    .limit(100)

  const deptName = (emp?.departments as any)?.department_name || ""

  // Map tasks to override status with individual collaborator progress for employee view
  const mappedTasks = (tasks ?? []).filter(Boolean).map(t => {
    const userAssignee = (t.task_assignees as any[])?.find(a => a.user_id === user.id)
    return {
      ...t,
      description: t.description || t.task_description || '',
      status: userAssignee?.status || t.status || t.task_status || 'PENDING',
      task_status: userAssignee?.status || t.task_status || t.status || 'PENDING',
      assignee_ids: (t.task_assignees as any[])?.map(a => a.user_id) || []
    }
  }) || []

  return (
    <TaskWorkspaceDashboard
      initialTasks={mappedTasks}
      currentUserId={user.id}
      currentUserRole="EMPLOYEE"
      currentUserDept={deptName}
    />
  )
}
