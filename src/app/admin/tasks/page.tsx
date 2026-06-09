export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { TaskWorkspaceDashboard } from "@/components/tasks/TaskWorkspaceDashboard"

export const revalidate = 0

export default async function AdminTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all tasks globally for Admin view with assignee details
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*, task_assignees(*)')
    .order('created_at', { ascending: false })

  const mappedTasks = tasks?.map(t => ({
    ...t,
    assignee_ids: (t.task_assignees as any[])?.map(a => a.user_id) || []
  })) || []

  return (
    <TaskWorkspaceDashboard
      initialTasks={mappedTasks}
      currentUserId={user.id}
      currentUserRole="ADMIN"
    />
  )
}
