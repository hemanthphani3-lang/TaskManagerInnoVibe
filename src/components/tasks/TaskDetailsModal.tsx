"use client"

import React, { useState, useEffect } from "react"
import { respondToTask, addCrossRoleComment, updateCrossRoleTaskStatus, deleteCrossRoleTask } from "@/app/actions/tasks"
import { TaskStatusBadge } from "./TaskStatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { 
  X, 
  Calendar, 
  User, 
  Building2, 
  Paperclip, 
  Send, 
  Clock, 
  MessageSquare, 
  Download, 
  AlertTriangle,
  Play,
  CheckCircle,
  XOctagon,
  HelpCircle,
  Trash2,
  Loader2,
  FileText,
  ChevronRight
} from "lucide-react"

interface TaskDetailsModalProps {
  taskId: string
  isOpen: boolean
  onClose: () => void
  onActionSuccess: () => void
  currentUserId: string
  currentUserRole: "ADMIN" | "DEPARTMENT" | "EMPLOYEE"
}

export function TaskDetailsModal({ 
  taskId, 
  isOpen, 
  onClose, 
  onActionSuccess, 
  currentUserId,
  currentUserRole
}: TaskDetailsModalProps) {
  const supabase = createClient()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [uploadingCommentFile, setUploadingCommentFile] = useState(false)
  const [commentFileUrl, setCommentFileUrl] = useState("")
  const [commentFileName, setCommentFileName] = useState("")
  
  // Dialog Actions State
  const [submittingAction, setSubmittingAction] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showClarifyInput, setShowClarifyInput] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [clarifyNotes, setClarifyNotes] = useState("")

  // Fetch complete task details (RLS bypassed on necessary fields or queried directly)
  const loadTaskDetails = async () => {
    if (!taskId) return
    setLoading(true)
    try {
      // 1. Fetch Task
      const { data: tData, error: tErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (tErr) throw tErr

      // Fetch Assignee Name
      let assigneeName = "Unknown Assignee"
      if (tData.assigned_to) {
        const { data: emp } = await supabase.from('employees').select('employee_name').eq('id', tData.assigned_to).maybeSingle()
        if (emp) {
          assigneeName = emp.employee_name
        } else {
          const { data: dept } = await supabase.from('departments').select('department_head_name').eq('id', tData.assigned_to).maybeSingle()
          if (dept) {
            assigneeName = dept.department_head_name
          } else {
            const { data: adm } = await supabase.from('admins').select('full_name').eq('id', tData.assigned_to).maybeSingle()
            if (adm) assigneeName = adm.full_name
          }
        }
      }

      // Fetch Creator Name
      let creatorName = "System Creator"
      if (tData.created_by) {
        const { data: emp } = await supabase.from('employees').select('employee_name').eq('id', tData.created_by).maybeSingle()
        if (emp) {
          creatorName = emp.employee_name
        } else {
          const { data: dept } = await supabase.from('departments').select('department_head_name').eq('id', tData.created_by).maybeSingle()
          if (dept) {
            creatorName = dept.department_head_name
          } else {
            const { data: adm } = await supabase.from('admins').select('full_name').eq('id', tData.created_by).maybeSingle()
            if (adm) creatorName = adm.full_name
          }
        }
      }

      setTask({
        ...tData,
        assigneeName,
        creatorName
      })

      // 2. Fetch comments with user profiles fallback
      const { data: cData } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      // Fetch user profile names for comments
      const mappedComments: any[] = []
      if (cData) {
        for (const comm of cData) {
          let authorName = "System User"
          let authorRole = "User"

          // Query Employee
          const { data: emp } = await supabase.from('employees').select('employee_name').eq('id', comm.user_id).maybeSingle()
          if (emp) {
            authorName = emp.employee_name
            authorRole = "Employee"
          } else {
            const { data: dept } = await supabase.from('departments').select('department_head_name').eq('id', comm.user_id).maybeSingle()
            if (dept) {
              authorName = dept.department_head_name
              authorRole = "Dept Head"
            } else {
              const { data: adm } = await supabase.from('admins').select('full_name').eq('id', comm.user_id).maybeSingle()
              if (adm) {
                authorName = adm.full_name
                authorRole = "Admin"
              }
            }
          }

          mappedComments.push({
            ...comm,
            authorName,
            authorRole
          })
        }
      }
      setComments(mappedComments)

      // 3. Fetch Activity logs
      const { data: lData } = await supabase
        .from('task_activity_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      
      const mappedLogs: any[] = []
      if (lData) {
        for (const log of lData) {
          let actorName = "Staff"
          const { data: emp } = await supabase.from('employees').select('employee_name').eq('id', log.action_by).maybeSingle()
          if (emp) actorName = emp.employee_name
          else {
            const { data: dept } = await supabase.from('departments').select('department_head_name').eq('id', log.action_by).maybeSingle()
            if (dept) actorName = dept.department_head_name
            else {
              const { data: adm } = await supabase.from('admins').select('full_name').eq('id', log.action_by).maybeSingle()
              if (adm) actorName = adm.full_name
            }
          }

          mappedLogs.push({
            ...log,
            actorName
          })
        }
      }
      setActivityLogs(mappedLogs)

    } catch (err: any) {
      toast.error("Failed to load task details.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails()
      setShowRejectInput(false)
      setShowClarifyInput(false)
      setRejectionReason("")
      setClarifyNotes("")
    }
  }, [isOpen, taskId])

  if (!isOpen) return null

  // Workflow triggers
  const handleAccept = async () => {
    setSubmittingAction(true)
    const res = await respondToTask(taskId, 'ACCEPT')
    if (res.success) {
      toast.success("Task accepted! Work status transitioned to In Progress.")
      await loadTaskDetails()
      onActionSuccess()
    } else {
      toast.error(res.error || "Failed to accept task.")
    }
    setSubmittingAction(false)
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) return toast.error("Please provide a rejection reason.")
    setSubmittingAction(true)
    const res = await respondToTask(taskId, 'REJECT', rejectionReason)
    if (res.success) {
      toast.success("Task rejected. Notification dispatched to creator.")
      setShowRejectInput(false)
      await loadTaskDetails()
      onActionSuccess()
    } else {
      toast.error(res.error || "Failed to reject task.")
    }
    setSubmittingAction(false)
  }

  const handleClarify = async () => {
    if (!clarifyNotes.trim()) return toast.error("Please explain your clarification request.")
    setSubmittingAction(true)
    const res = await respondToTask(taskId, 'CLARIFY', clarifyNotes)
    if (res.success) {
      toast.success("Clarification request sent to task creator.")
      setShowClarifyInput(false)
      await loadTaskDetails()
      onActionSuccess()
    } else {
      toast.error(res.error || "Failed to submit clarification request.")
    }
    setSubmittingAction(false)
  }

  const handleComplete = async () => {
    setSubmittingAction(true)
    const res = await updateCrossRoleTaskStatus(taskId, 'COMPLETED')
    if (res.success) {
      toast.success("Congratulations! Task marked as completed successfully.")
      await loadTaskDetails()
      onActionSuccess()
    } else {
      toast.error(res.error || "Failed to complete task.")
    }
    setSubmittingAction(false)
  }

  const handleDelete = async () => {
    if (!confirm("Are you absolutely sure you want to delete this task? This action is permanent.")) return
    setSubmittingAction(true)
    const res = await deleteCrossRoleTask(taskId)
    if (res.success) {
      toast.success("Task deleted successfully.")
      onClose()
      onActionSuccess()
    } else {
      toast.error(res.error || "Failed to delete task.")
    }
    setSubmittingAction(false)
  }

  // Upload Chat file attachment
  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCommentFile(true)
    try {
      const fileExt = file.name.split('.').pop()
      const path = `comments/${currentUserId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`
      
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(path)

      setCommentFileUrl(publicUrl)
      setCommentFileName(file.name)
      toast.success("File attached to comment.")
    } catch (err: any) {
      toast.error("File attachment failed.")
    } finally {
      setUploadingCommentFile(false)
    }
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && !commentFileUrl) return

    try {
      const msg = newMessage.trim()
      setNewMessage("")
      const attachUrl = commentFileUrl
      setCommentFileUrl("")
      setCommentFileName("")

      const res = await addCrossRoleComment(taskId, msg || `Sent attachment: ${commentFileName}`, attachUrl)
      if (res.success) {
        await loadTaskDetails()
      } else {
        toast.error("Failed to post comment.")
      }
    } catch (err) {
      toast.error("Error sending message.")
    }
  }

  // Visual layout configurations
  const isPending = task?.status === 'PENDING'
  const isAssignee = task?.assigned_to === currentUserId
  const isCreator = task?.created_by === currentUserId
  const isAdmin = currentUserRole === 'ADMIN'
  const isCompletable = (task?.status === 'IN_PROGRESS' || task?.status === 'PENDING') && (isAssignee || isCreator || isAdmin)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-blue-950/60 text-[#0066FF] border border-[#0066FF]/20 px-2.5 py-1 rounded-full font-bold uppercase shrink-0">
              {task?.department || "TMS"} Task
            </span>
            <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
            <h3 className="font-extrabold text-white text-base line-clamp-1">
              {loading ? "Loading details..." : (task?.title || task?.task_title)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {(isCreator || isAdmin) && !loading && (
              <button 
                onClick={handleDelete}
                disabled={submittingAction}
                title="Delete Task"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 rounded-xl transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition border border-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Container */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#0066FF] animate-spin mb-4" />
            <p className="text-slate-400 text-sm font-semibold">Retrieving workspace discussion & audits...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left side: Task core details, timelines, attachments */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:border-r lg:border-slate-800">
              
              {/* Status & Priority Badge Panel */}
              <div className="flex items-center gap-3 flex-wrap bg-slate-950/30 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <TaskStatusBadge status={task.status || task.task_status} />
                
                <span className="text-xs font-semibold text-slate-500 ml-2">Priority:</span>
                <PriorityBadge priority={task.priority || task.priority_level} />
              </div>

              {/* Scope/Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description / Deliverables</h4>
                <div className="bg-slate-950/40 border border-slate-800/60 p-5 rounded-2xl text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {task.description || task.task_description}
                </div>
              </div>

              {/* Creator & Assignee Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-800/40 text-[#0066FF] flex items-center justify-center font-bold text-sm shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Assigned By</span>
                    <span className="text-sm font-bold text-white block">{task.creatorName || `${task.created_by_role || "ADMIN"} Head`}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">Role: {task.created_by_role || "ADMIN"}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Assigned To</span>
                    <span className="text-sm font-bold text-white block">{task.assigneeName || task.assigned_to_role}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">Role: {task.assigned_to_role}</span>
                  </div>
                </div>

              </div>

              {/* Deadlines timeline details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-slate-800 py-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Created At</span>
                  <span className="text-sm font-bold text-slate-300 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {new Date(task.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Target Deadline</span>
                  <span className="text-sm font-bold text-slate-300 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Completed At</span>
                  <span className="text-sm font-bold text-slate-300 mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    {task.completed_at ? new Date(task.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : "Not yet complete"}
                  </span>
                </div>
              </div>

              {/* Rejection / Clarification alerts */}
              {task.status === 'REJECTED' && (
                <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl flex gap-3 text-red-400 text-sm shadow-sm shadow-red-900/5">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                  <div>
                    <h5 className="font-bold">Task Rejection Reason</h5>
                    <p className="text-xs text-slate-300 mt-1">{task.rejection_reason}</p>
                  </div>
                </div>
              )}

              {task.clarification_text && (
                <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-2xl flex gap-3 text-amber-500 text-sm shadow-sm shadow-amber-900/5">
                  <HelpCircle className="w-5 h-5 shrink-0 text-amber-500" />
                  <div>
                    <h5 className="font-bold">Clarification Comments</h5>
                    <p className="text-xs text-slate-300 mt-1">{task.clarification_text}</p>
                  </div>
                </div>
              )}

              {/* Attachments list */}
              {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Documentation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {task.attachments.map((file: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4.5 h-4.5 text-[#0066FF] shrink-0" />
                          <span className="font-bold text-slate-300 truncate">{file.name}</span>
                        </div>
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noreferrer"
                          download
                          title="Download attachment"
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 shrink-0 transition"
                        >
                          <Download className="w-4.5 h-4.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Panel */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                
                {/* 1. Standard Pending response states */}
                {isPending && isAssignee && !showRejectInput && !showClarifyInput && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={handleAccept}
                      disabled={submittingAction}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/10 transition active:scale-95 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Accept & Start Task
                    </button>
                    <button 
                      onClick={() => setShowClarifyInput(true)}
                      className="px-4 py-2.5 border border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Clarify
                    </button>
                    <button 
                      onClick={() => setShowRejectInput(true)}
                      className="px-4 py-2.5 bg-red-950/30 text-red-400 hover:bg-red-950/60 border border-red-900/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <XOctagon className="w-4 h-4" />
                      Reject Task
                    </button>
                  </div>
                )}

                {/* Rejection input field */}
                {showRejectInput && (
                  <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl space-y-3">
                    <label className="text-xs font-bold text-slate-400">Rejection Explanation Notes</label>
                    <textarea 
                      placeholder="Explain why you cannot accept this task at this time..."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 outline-none transition resize-none"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={handleReject}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                      >
                        Submit Rejection
                      </button>
                      <button 
                        onClick={() => setShowRejectInput(false)}
                        className="px-4 py-2 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold transition hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Clarification input field */}
                {showClarifyInput && (
                  <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl space-y-3">
                    <label className="text-xs font-bold text-slate-400">Clarification Request Questions</label>
                    <textarea 
                      placeholder="Detail what requirements or timelines need to be clarified..."
                      value={clarifyNotes}
                      onChange={e => setClarifyNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 outline-none transition resize-none"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={handleClarify}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                      >
                        Submit Clarification
                      </button>
                      <button 
                        onClick={() => setShowClarifyInput(false)}
                        className="px-4 py-2 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold transition hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Completion action */}
                {isCompletable && (
                  <div>
                    <button 
                      onClick={handleComplete}
                      disabled={submittingAction}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/10 transition active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Task Completed
                    </button>
                  </div>
                )}

              </div>

              {/* Activity log trail */}
              {activityLogs.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Activity History</h4>
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                    {activityLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2.5 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1 shrink-0" />
                        <div>
                          <p className="text-white">{log.action_description}</p>
                          <span className="text-[9px] text-white/70 font-bold block mt-0.5 uppercase tracking-wider">
                            {log.actorName} ✦ {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeStyle: 'short', dateStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right side: Live discussion chat */}
            <div className="w-full lg:w-[380px] shrink-0 bg-slate-950/20 flex flex-col h-full overflow-hidden">
              
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-950/40">
                <MessageSquare className="w-4.5 h-4.5 text-[#0066FF]" />
                <h4 className="font-extrabold text-white text-sm">Ecosystem Discussion</h4>
              </div>

              {/* Message scroll list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px] lg:max-h-none">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                    <p className="text-xs font-semibold">No workspace discussion yet.</p>
                  </div>
                ) : (
                  comments.map((comm) => {
                    const isMe = comm.user_id === currentUserId
                    return (
                      <div key={comm.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'}`}>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                          {comm.authorName} ({comm.authorRole})
                        </span>
                        
                        <div className={`p-3 rounded-2xl text-xs space-y-1.5 shadow-sm border ${
                          isMe 
                            ? 'bg-[#0066FF] border-[#0066FF] text-white rounded-tr-none shadow-blue-500/5' 
                            : 'bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none shadow-slate-950/5'
                        }`}>
                          <p className="leading-relaxed break-words">{comm.comment_text}</p>
                          
                          {/* File Attachment inside comment */}
                          {comm.attachment && (
                            <a 
                              href={comm.attachment}
                              target="_blank"
                              rel="noreferrer"
                              className={`p-2 border rounded-xl flex items-center justify-between gap-3 text-[10px] mt-2 group truncate transition ${
                                isMe 
                                  ? 'bg-blue-700/60 border-blue-500/50 hover:bg-blue-700' 
                                  : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate font-bold text-slate-200">Download Attached File</span>
                              </div>
                              <Download className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition shrink-0" />
                            </a>
                          )}
                        </div>

                        <span className="text-[8px] text-slate-500 mt-1 block">
                          {new Date(comm.created_at).toLocaleTimeString('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Selected comment file indicator */}
              {commentFileName && (
                <div className="px-4 py-2.5 bg-[#0066FF]/10 border-t border-slate-800 text-[10px] font-bold text-[#0066FF] flex justify-between items-center animate-slideUp">
                  <span className="truncate pr-4 flex items-center gap-1">
                    📎 File attached: {commentFileName}
                  </span>
                  <button 
                    onClick={() => {
                      setCommentFileName("")
                      setCommentFileUrl("")
                    }}
                    className="p-1 hover:bg-[#0066FF]/20 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0 flex items-center gap-2">
                <div className="relative shrink-0">
                  <input 
                    type="file"
                    onChange={handleChatFileUpload}
                    disabled={uploadingCommentFile}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:pointer-events-none"
                  />
                  <button 
                    type="button"
                    disabled={uploadingCommentFile}
                    className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition disabled:opacity-50 shrink-0 active:scale-95"
                  >
                    {uploadingCommentFile ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <input 
                  type="text"
                  placeholder="Ask a question or type comment..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-700 outline-none transition min-w-0"
                />

                <button 
                  type="submit"
                  disabled={!newMessage.trim() && !commentFileUrl}
                  className="w-10 h-10 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white flex items-center justify-center disabled:opacity-50 transition active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
