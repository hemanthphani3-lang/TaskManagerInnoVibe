export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { ArrowLeft, Calendar, Clock, AlignLeft, CheckCircle2, RotateCcw } from "lucide-react"
import Link from "next/link"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"
import { updateTaskStatus } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { TaskCommentBox } from "@/components/tasks/TaskCommentBox"
import { AlertOctagon } from "lucide-react"
import { DeescalateTaskButton } from "@/components/tasks/DeescalateTaskButton"

export default async function AdminTaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}

  if (!user) redirect('/login')

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch task, comments, activity logs in parallel
  let task = null
  let rawComments: any[] = []
  let logs = []

  try {
    const results = await Promise.all([
      supabaseAdmin
        .from('tasks')
        .select('*, employees!assigned_employee_id(*, departments!department_id(department_name))')
        .eq('id', taskId)
        .maybeSingle(),
      supabaseAdmin
        .from('task_comments')
        .select('id, comment_text, created_at, user_id')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('task_activity_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
    ])
    
    task = results[0].data
    rawComments = results[1].data || []
    logs = results[2].data || []
  } catch (error) {
    console.error("Error fetching task details:", error)
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Task not found</h2>
          <p className="text-slate-500 mb-4">This task doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <Link href="/admin/tasks" className="text-[#0066FF] font-medium hover:underline">← Back to Tasks</Link>
        </div>
      </div>
    )
  }

  const emp = task.employees as unknown as { id: string, employee_name: string, profile_photo: string | null, designation: string, departments?: { department_name: string } }

  // Collect all unique commenter IDs (excluding current user)
  const commenterIds = [...new Set((rawComments || []).map(c => c.user_id).filter(id => id !== user!.id))]

  // Resolve commenter names from both employees and departments tables in parallel
  const [{ data: empCommenters }, { data: deptCommenters }] = await Promise.all([
    commenterIds.length > 0
      ? supabase.from('employees').select('id, employee_name, profile_photo, designation').in('id', commenterIds)
      : Promise.resolve({ data: [] }),
    commenterIds.length > 0
      ? supabase.from('departments').select('id, department_name').in('id', commenterIds)
      : Promise.resolve({ data: [] })
  ])

  // Build a lookup map: user_id → { name, role, avatar }
  const senderMap = new Map<string, { name: string; role: string; avatar?: string }>()

  for (const e of (empCommenters || [])) {
    senderMap.set(e.id, { name: e.employee_name, role: 'Employee', avatar: e.profile_photo || undefined })
  }
  for (const d of (deptCommenters || [])) {
    senderMap.set(d.id, { name: d.department_name, role: 'Department' })
  }

  // Enrich comments with sender info
  const comments = (rawComments || []).map(c => {
    if (c.user_id === user!.id) {
      return { ...c, sender_name: 'Admin', sender_role: 'Admin' }
    }
    const sender = senderMap.get(c.user_id)
    return { ...c, sender_name: sender?.name || 'Unknown', sender_role: sender?.role || '', sender_avatar: sender?.avatar }
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href="/admin/tasks" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Tasks
          </Link>
          {task.is_escalated && (
            <DeescalateTaskButton taskId={task.id} />
          )}
        </div>

        {task.is_escalated && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/50 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-xl">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-red-800 dark:text-red-400">Task Escalated by Department</h3>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                This task requires your immediate administrative attention. Once the blocking issues are resolved, you can remove this escalation flag.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 mb-3">{task.task_title}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <TaskStatusBadge status={task.task_status} />
              <PriorityBadge priority={task.priority_level} />
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-400" />
                Due: {new Date(task.due_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </div>
            </div>
          </div>

          {/* Admin Approval/Reopen Actions */}
          {(task.task_status === 'WAITING_APPROVAL' || task.task_status === 'COMPLETED') && (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              {task.task_status === 'WAITING_APPROVAL' && (
                <form action={async () => {
                  "use server"
                  await updateTaskStatus(task.id, 'COMPLETED')
                }}>
                  <Button type="submit" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl px-6">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve as Complete
                  </Button>
                </form>
              )}
              <form action={async () => {
                "use server"
                await updateTaskStatus(task.id, 'REOPENED', 'Task was reopened by admin after review.')
              }}>
                <Button type="submit" variant="outline" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 rounded-xl px-6">
                  <RotateCcw className="w-4 h-4 mr-2" /> Reopen Task
                </Button>
              </form>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlignLeft className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-slate-900 text-lg">Description</h3>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{task.task_description}</p>
            </div>

            {/* WhatsApp-style Discussion */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Discussion</h3>
              <TaskCommentBox
                taskId={task.id}
                initialComments={comments}
                currentUserId={user!.id}
                currentUserName="Admin"
                currentUserRole="Admin"
              />
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Assignee */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Assignee</h3>
              <div className="flex items-center gap-4">
                {emp?.profile_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={emp.profile_photo} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center text-lg font-bold">
                    {emp?.employee_name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{emp?.employee_name}</p>
                  <p className="text-sm text-slate-500">{emp?.designation}</p>
                  {emp?.departments?.department_name && (
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">{emp.departments.department_name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Activity Log
              </h3>
              {logs && logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-xs">{log.action_type.replace(/_/g, ' ')}</span>
                        <time className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</time>
                      </div>
                      <p className="text-xs text-slate-600">{log.action_description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">No activity yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
