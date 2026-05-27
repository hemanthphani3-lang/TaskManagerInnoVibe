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

  // Fetch all tasks globally for Admin view
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <TaskWorkspaceDashboard
      initialTasks={tasks || []}
      currentUserId={user.id}
      currentUserRole="ADMIN"
    />
  )
}
