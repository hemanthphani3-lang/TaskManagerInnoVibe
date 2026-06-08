import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ArrowLeft, Calendar, AlignLeft, PlayCircle, CheckCircle2, Paperclip, Clock, AlertOctagon } from "lucide-react"
import Link from "next/link"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"
import { updateTaskStatus } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { TaskCommentBox } from "@/components/tasks/TaskCommentBox"
import { TaskAttachmentUploader } from "@/components/tasks/TaskAttachmentUploader"

interface DBComment {
  id: string
  comment_text: string
  created_at: string
  user_id: string
}

interface DBActivityLog {
  id: string
  action_type: string
  action_description: string
  created_at: string
}

export default async function EmployeeTaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}
  if (!user) redirect('/login')

  // Fetch task, comments, logs, and current employee profile — all in parallel
  let task = null
  let rawComments: DBComment[] = []
  let logs: DBActivityLog[] = []
  let empProfile = null

  try {
    const results = await Promise.all([
      supabase.from('tasks').select('*').eq('id', taskId).eq('assigned_employee_id', user!.id).maybeSingle(),
      supabase.from('task_comments').select('id, comment_text, created_at, user_id').eq('task_id', taskId).order('created_at', { ascending: true }),
      supabase.from('task_activity_logs').select('*').eq('task_id', taskId).order('created_at', { ascending: false }),
      supabase.from('employees').select('employee_name, profile_photo').eq('id', user!.id).maybeSingle()
    ])
    
    task = results[0].data
    rawComments = results[1].data || []
    logs = results[2].data || []
    empProfile = results[3].data
  } catch (error) {
    console.error("Error fetching task details:", error)
  }

  if (!task) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Task not found</h2>
        <Link href="/employee/tasks" className="text-[#0066FF] font-medium hover:underline">← Back to Tasks</Link>
      </div>
    )
  }

  // Resolve sender names for all other commenters
  const commenterIds = [...new Set((rawComments || []).map(c => c.user_id).filter((id: string) => id !== user!.id))]
  const [{ data: empCommenters }, { data: deptCommenters }] = await Promise.all([
    commenterIds.length > 0
      ? supabase.from('employees').select('id, employee_name, profile_photo').in('id', commenterIds)
      : Promise.resolve({ data: [] }),
    commenterIds.length > 0
      ? supabase.from('departments').select('id, department_name').in('id', commenterIds)
      : Promise.resolve({ data: [] })
  ])

  const senderMap = new Map<string, { name: string; role: string; avatar?: string }>()
  for (const e of (empCommenters || [])) senderMap.set(e.id, { name: e.employee_name, role: 'Employee', avatar: e.profile_photo || undefined })
  for (const d of (deptCommenters || [])) senderMap.set(d.id, { name: d.department_name, role: 'Department' })

  const comments = (rawComments || []).map((c) => {
    if (c.user_id === user!.id) return { ...c, sender_name: empProfile?.employee_name || 'Me', sender_role: 'Employee', sender_avatar: empProfile?.profile_photo || undefined }
    const sender = senderMap.get(c.user_id)
    return { ...c, sender_name: sender?.name || 'Unknown', sender_role: sender?.role || '', sender_avatar: sender?.avatar }
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/employee/tasks" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>

        {task.is_escalated && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 shadow-sm flex gap-3">
            <AlertOctagon className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-red-900 mb-1">Task Escalated by Department</h4>
              <p className="text-sm text-red-700">This task has been escalated to Admin review due to delays or critical issues. Please prioritize its completion or provide immediate updates in the discussion below.</p>
            </div>
          </div>
        )}

        {task.task_status === 'REOPENED' && task.reopen_reason && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 shadow-sm flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-bold mb-1">Task was Reopened by Department</h4>
              <p className="text-sm">{task.reopen_reason}</p>
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

          {/* Employee Status Actions */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            {(task.task_status === 'PENDING' || task.task_status === 'REOPENED') && (
              <form action={async () => {
                "use server"
                await updateTaskStatus(task.id, 'IN_PROGRESS')
              }}>
                <Button type="submit" className="bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl px-6">
                  <PlayCircle className="w-4 h-4 mr-2" /> Start Work
                </Button>
              </form>
            )}

            {task.task_status === 'IN_PROGRESS' && (
              <form action={async () => {
                "use server"
                await updateTaskStatus(task.id, 'WAITING_APPROVAL')
              }}>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 shadow-sm shadow-purple-500/20">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Submit for Approval
                </Button>
              </form>
            )}

            {task.task_status === 'WAITING_APPROVAL' && (
              <span className="px-4 py-2 text-sm font-bold text-slate-500">Waiting for department review...</span>
            )}
            
            {task.task_status === 'COMPLETED' && (
              <span className="px-4 py-2 text-sm font-bold text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Task Completed!
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlignLeft className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-slate-900 text-lg">Instructions</h3>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {task.task_description}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Discussion</h3>
              <TaskCommentBox
                taskId={task.id}
                initialComments={comments}
                currentUserId={user!.id}
                currentUserName={empProfile?.employee_name || 'Me'}
                currentUserRole="Employee"
                currentUserAvatar={empProfile?.profile_photo || undefined}
              />
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                Attachments
              </h3>
              
              {/* Note: We would fetch attachments similar to comments here. For brevity, assuming user wants to upload. */}
              <TaskAttachmentUploader taskId={task.id} />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Activity Log
              </h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {logs?.map(log => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-slate-300 group-[.is-active]:bg-[#0066FF] text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900 text-[10px]">{log.action_type.replace('_', ' ')}</div>
                        <time className="text-[9px] text-slate-500">{new Date(log.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</time>
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-2">{log.action_description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
