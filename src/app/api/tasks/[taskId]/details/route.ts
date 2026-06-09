import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks/[taskId]/details
 * Returns full task details bypassing RLS for the modal.
 * Only authenticated users who are a collaborator or creator get the data.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
  }

  // 1. Verify session
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()

  // 2. Fetch the task (service role bypasses RLS)
  const { data: task, error: taskErr } = await admin
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()

  if (taskErr || !task) {
    return NextResponse.json({ error: taskErr?.message || 'Task not found' }, { status: 404 })
  }

  // 3. Authorization check — user must be creator or a collaborator
  const { data: assigneeCheck } = await admin
    .from('task_assignees')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = await admin
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  const isAuthorized = task.created_by === user.id || !!assigneeCheck || !!isAdmin.data

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // 4. Fetch assignees from task_assignees
  const { data: assignees } = await admin
    .from('task_assignees')
    .select('*')
    .eq('task_id', taskId)

  // 5. Fetch subtasks
  const { data: subtasks } = await admin
    .from('task_subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  // 6. Fetch comments
  const { data: comments } = await admin
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  // 7. Fetch activity logs
  const { data: activityLogs } = await admin
    .from('task_activity_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  // 8. Helper: resolve user id to name + role
  const resolveUser = async (uid: string) => {
    if (!uid) return { name: 'Unknown', role: 'User', department: '', profilePhoto: '' }

    const { data: emp } = await admin
      .from('employees')
      .select('employee_name, designation, department_id, profile_photo')
      .eq('id', uid)
      .maybeSingle()

    if (emp) {
      let department = 'Unassigned'
      if (emp.department_id) {
        const { data: deptRow } = await admin
          .from('departments')
          .select('department_name')
          .eq('id', emp.department_id)
          .maybeSingle()
        department = deptRow?.department_name || 'Unassigned'
      }
      return {
        name: emp.employee_name || 'Employee',
        role: emp.designation || 'Employee',
        department,
        profilePhoto: emp.profile_photo || ''
      }
    }

    const { data: dept } = await admin
      .from('departments')
      .select('department_head_name, department_name')
      .eq('id', uid)
      .maybeSingle()

    if (dept) {
      return {
        name: dept.department_head_name || 'Dept Head',
        role: 'Department Head',
        department: dept.department_name || 'Department',
        profilePhoto: ''
      }
    }

    const { data: adm } = await admin
      .from('admins')
      .select('full_name')
      .eq('id', uid)
      .maybeSingle()

    if (adm) {
      return {
        name: adm.full_name || 'Administrator',
        role: 'Administrator',
        department: 'Administration',
        profilePhoto: ''
      }
    }

    return { name: 'Unknown User', role: 'User', department: '', profilePhoto: '' }
  }

  // 9. Resolve all user names in parallel
  const uniqueUserIds = Array.from(new Set([
    task.created_by,
    task.assigned_to,
    ...(assignees || []).map((a: any) => a.user_id),
    ...(comments || []).map((c: any) => c.user_id),
    ...(activityLogs || []).map((l: any) => l.action_by),
  ].filter(Boolean)))

  const userMap: Record<string, { name: string; role: string; department: string; profilePhoto: string }> = {}
  await Promise.all(uniqueUserIds.map(async (uid) => {
    userMap[uid] = await resolveUser(uid)
  }))

  // 10. Enrich collaborators
  const enrichedCollaborators = (assignees || []).map((a: any) => ({
    ...a,
    name: userMap[a.user_id]?.name || 'Unknown',
    role: userMap[a.user_id]?.role || 'User',
    department: userMap[a.user_id]?.department || '',
    profilePhoto: userMap[a.user_id]?.profilePhoto || '',
  }))

  // 11. Enrich comments
  const enrichedComments = (comments || []).map((c: any) => ({
    ...c,
    authorName: userMap[c.user_id]?.name || 'Unknown',
    authorRole: userMap[c.user_id]?.role || 'User',
  }))

  // 12. Enrich activity logs
  const enrichedLogs = (activityLogs || []).map((l: any) => ({
    ...l,
    actorName: userMap[l.action_by]?.name || 'Staff',
  }))

  return NextResponse.json({
    task: {
      ...task,
      assigneeName: userMap[task.assigned_to]?.name || 'Unassigned',
      creatorName: userMap[task.created_by]?.name || 'System',
      collaborators: enrichedCollaborators,
      subtasks: subtasks || [],
    },
    comments: enrichedComments,
    activityLogs: enrichedLogs,
  })
}
