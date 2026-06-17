"use client"

import React, { useState, useEffect } from "react"
import { respondToTask, addCrossRoleComment, updateCrossRoleTaskStatus, deleteCrossRoleTask, editCrossRoleComment, deleteCrossRoleCommentForEveryone } from "@/app/actions/tasks"
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
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Pencil,
  Check
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
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [task, setTask] = useState<any>(null)

  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState<any[]>([])
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [hiddenCommentIds, setHiddenCommentIds] = useState<string[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [uploadingCommentFile, setUploadingCommentFile] = useState(false)
  const [commentFileUrl, setCommentFileUrl] = useState("")
  const [commentFileName, setCommentFileName] = useState("")
  
  


  const [submittingAction, setSubmittingAction] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [showClarifyInput, setShowClarifyInput] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [clarifyNotes, setClarifyNotes] = useState("")

  // Fetch complete task details via API route (uses service role, bypasses RLS)
  const loadTaskDetails = async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/details`, { cache: 'no-store' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Failed to load task (HTTP ${res.status})`)
      }

      const json = await res.json()

      setTask(json.task)
      setComments(json.comments || [])
      setActivityLogs(json.activityLogs || [])
    } catch (err: any) {
      const msg = err?.message || 'Failed to load task details'
      console.error('loadTaskDetails error:', msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Load hidden comments from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`hidden_comments_${currentUserId}`)
      if (stored) {
        setHiddenCommentIds(JSON.parse(stored))
      }
    } catch (err) {
      console.error("Error reading hidden comments:", err)
    }
  }, [currentUserId])

  // Click away listener for options dropdown
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuId(null)
    }
    document.addEventListener("click", handleDocumentClick)
    return () => {
      document.removeEventListener("click", handleDocumentClick)
    }
  }, [])

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails()
      setShowRejectInput(false)
      setShowClarifyInput(false)
      setRejectionReason("")
      setClarifyNotes("")
    }
  }, [isOpen, taskId])

  useEffect(() => {
    if (!isOpen || !taskId) return

    const channelName = `realtime_modal_details_${taskId}_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`
        },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            console.log("[Realtime] Task deleted, closing modal...")
            toast.info("This task has been deleted.")
            onClose()
          } else {
            console.log("[Realtime] Task updated, reloading details...")
            loadTaskDetails()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignees',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          console.log("[Realtime] Task assignees updated, reloading details...")
          loadTaskDetails()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_subtasks',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          console.log("[Realtime] Task subtasks updated, reloading details...")
          loadTaskDetails()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          console.log("[Realtime] Task comments updated, reloading details...")
          loadTaskDetails()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_activity_logs',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          console.log("[Realtime] Task activity logs updated, reloading details...")
          loadTaskDetails()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, taskId, supabase])

  // If the modal is closed, render nothing
  if (!isOpen) return null;

  // Show full-screen spinner while loading data
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
        <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin" />
      </div>
    );
  }

  // If task data hasn't loaded after fetching, show a placeholder
  if (!task) {
    return (
      <div className="p-6 text-slate-400">Task details unavailable.</div>
    );
  }

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



  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return
    const prevText = comments.find(c => c.id === commentId)?.message || comments.find(c => c.id === commentId)?.comment_text || ""

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, message: editText.trim(), comment_text: editText.trim(), is_edited: true } : c))
    setEditingCommentId(null)

    const result = await editCrossRoleComment(commentId, editText.trim())
    if (!result.success) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, message: prevText, comment_text: prevText } : c))
      toast.error("Failed to edit message: " + result.error)
    } else {
      toast.success("Message edited successfully")
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveEdit(commentId)
    } else if (e.key === "Escape") {
      setEditingCommentId(null)
    }
  }

  const handleDeleteForEveryone = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this message for everyone?")) return

    const prevComment = comments.find(c => c.id === commentId)
    if (!prevComment) return

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, message: "This message was deleted.", comment_text: "This message was deleted.", is_deleted: true } : c))

    const result = await deleteCrossRoleCommentForEveryone(commentId)
    if (!result.success) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, message: prevComment.message, comment_text: prevComment.comment_text, is_deleted: prevComment.is_deleted } : c))
      toast.error("Failed to delete message: " + result.error)
    } else {
      toast.success("Message deleted for everyone")
    }
  }

  const handleDeleteForMe = (commentId: string) => {
    const nextHidden = [...hiddenCommentIds, commentId]
    setHiddenCommentIds(nextHidden)
    try {
      localStorage.setItem(`hidden_comments_${currentUserId}`, JSON.stringify(nextHidden))
      toast.success("Message deleted for me")
    } catch (err) {
      console.error("Error saving hidden comments:", err)
    }
  }

  const renderMenuButton = (comm: any) => {
    const isMe = comm.user_id === currentUserId
    const isAdmin = currentUserRole === 'ADMIN'
    const isOpen = activeMenuId === comm.id

    return (
      <div className="relative shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setActiveMenuId(isOpen ? null : comm.id)
          }}
          className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {isOpen && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className={`absolute z-50 py-1.5 w-36 bg-slate-900 border border-slate-850 rounded-xl shadow-xl text-xs font-semibold ${
              isMe ? "right-0 origin-top-right" : "left-0 origin-top-left"
            }`}
          >
            {isMe && (
              <button
                type="button"
                onClick={() => {
                  setEditingCommentId(comm.id)
                  setEditText(comm.message || comm.comment_text || '')
                  setActiveMenuId(null)
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 transition"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Message
              </button>
            )}
            
            {(isMe || isAdmin) && (
              <button
                type="button"
                onClick={() => {
                  handleDeleteForEveryone(comm.id)
                  setActiveMenuId(null)
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 text-red-400 flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete for Everyone
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleDeleteForMe(comm.id)
                setActiveMenuId(null)
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete for Me
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderEditInput = (comm: any) => {
    return (
      <div className="flex items-center gap-1.5 min-w-[180px] sm:min-w-[240px]">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => handleEditKeyDown(e, comm.id)}
          className="flex-1 bg-white/10 text-white outline-none border-b border-white/50 focus:border-white text-xs py-0.5 px-1 rounded-sm"
          autoFocus
        />
        <button
          type="button"
          onClick={() => handleSaveEdit(comm.id)}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setEditingCommentId(null)}
          className="p-1 hover:bg-white/10 rounded transition-colors text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Subtask Action Helpers
  const handleAddSubtask = async (title: string) => {
    const { createSubtask } = await import("@/app/actions/tasks")
    const res = await createSubtask(taskId, title)
    if (res.success) {
      toast.success("Subtask added.")
      await loadTaskDetails()
    } else {
      toast.error(res.error || "Failed to add subtask.")
    }
  }

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    const { toggleSubtask } = await import("@/app/actions/tasks")
    const res = await toggleSubtask(subtaskId, isCompleted)
    if (res.success) {
      await loadTaskDetails()
    } else {
      toast.error(res.error || "Failed to toggle subtask.")
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { deleteSubtask } = await import("@/app/actions/tasks")
    const res = await deleteSubtask(subtaskId)
    if (res.success) {
      toast.success("Subtask deleted.")
      await loadTaskDetails()
    } else {
      toast.error(res.error || "Failed to delete subtask.")
    }
  }

  // Visual layout configurations
  const isCreator = task?.created_by === currentUserId
  const isAdmin = currentUserRole === 'ADMIN'
  const currentUserCollaborator = task?.collaborators?.find((c: any) => c.user_id === currentUserId)
  const isCollaborator = !!currentUserCollaborator
  const isPendingForUser = currentUserCollaborator?.status === 'PENDING'
  const isCompletable = (task?.status !== 'COMPLETED') && (isCollaborator && currentUserCollaborator.status !== 'COMPLETED' || isCreator || isAdmin)

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
              {task?.title || task?.task_title}
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
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left side: Task core details, timelines, attachments */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:border-r lg:border-slate-800">
              
              {/* Status & Priority Badge Panel */}
              <div className="flex items-center gap-3 flex-wrap bg-slate-950/30 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <TaskStatusBadge status={task?.status || task?.task_status} />
                
                <span className="text-xs font-semibold text-slate-500 ml-2">Priority:</span>
                <PriorityBadge priority={task?.priority || task?.priority_level} />
              </div>

              {/* Scope/Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description / Deliverables</h4>
                <div className="bg-slate-950/40 border border-slate-800/60 p-5 rounded-2xl text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {task?.description || task?.task_description}
                </div>
              </div>

              {/* TEAM MEMBERS / COLLABORATORS */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Members</h4>
                <div className="bg-slate-950/30 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-800/40 text-[#0066FF] flex items-center justify-center font-bold text-sm shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Created By (Owner)</span>
                        <span className="text-sm font-bold text-white block">
                          {task?.creatorName}
                        </span>
                        {task?.created_by_role && (
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Role: {task.created_by_role}
                          </span>
                        )}
                      </div>
                    </div>
                    {task?.created_by === currentUserId && (
                      <span className="text-[9px] bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded font-extrabold uppercase">
                        You (Owner)
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Collaborators & Individual Progress</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {task.collaborators?.map((col: any) => {
                        const isCurrentUser = col.user_id === currentUserId
                        return (
                          <div key={col.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                            isCurrentUser 
                              ? 'bg-blue-950/15 border-blue-800/40' 
                              : 'bg-slate-950/20 border-slate-800/60'
                          }`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              {col.profilePhoto ? (
                                <img src={col.profilePhoto} alt={col.name || "User"} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                                  {(col.name || "U").charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white block truncate">{col.name || "Unknown User"}</span>
                                <span className="text-[9px] text-slate-400 block truncate">{col.role || "Role"} ✦ {col.department || "Department"}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                col.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : col.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-[#0066FF] border border-[#0066FF]/20'
                                : col.status === 'ACCEPTED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : col.status === 'BLOCKED' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-slate-800 text-slate-400'
                              }`}>
                                {(col.status || 'PENDING').replace('_', ' ')}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[8px] text-[#0066FF] font-extrabold uppercase tracking-wider">Current User</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtask Checklist System */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subtasks checklist</h4>
                <div className="bg-slate-950/30 border border-slate-800 p-5 rounded-2xl space-y-4">
                  {/* Create Subtask Form */}
                  {(isCreator || isAdmin) && (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Add a subtask..."
                        id="new-subtask-input"
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-[#0066FF] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-700 outline-none transition"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim()
                            if (val) {
                              e.currentTarget.value = ""
                              await handleAddSubtask(val)
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={async () => {
                          const input = document.getElementById('new-subtask-input') as HTMLInputElement
                          if (input && input.value.trim()) {
                            const val = input.value.trim()
                            input.value = ""
                            await handleAddSubtask(val)
                          }
                        }}
                        className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl text-xs font-bold transition active:scale-95 shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Subtasks List */}
                  {(!task.subtasks || task.subtasks.length === 0) ? (
                    <p className="text-slate-500 text-xs italic">No subtasks created yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {task.subtasks.map((sub: any) => {
                        const canManageSub = isCreator || isAdmin || isCollaborator
                        return (
                          <div key={sub.id} className="flex items-center justify-between gap-3 p-3 bg-slate-950/20 border border-slate-855 hover:border-slate-800 rounded-xl transition">
                            <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                              <input 
                                type="checkbox"
                                checked={sub.is_completed}
                                disabled={!canManageSub}
                                onChange={async (e) => {
                                  await handleToggleSubtask(sub.id, e.target.checked)
                                }}
                                className="w-4.5 h-4.5 rounded border-slate-850 text-[#0066FF] focus:ring-[#0066FF] bg-slate-950 outline-none cursor-pointer disabled:opacity-50"
                              />
                              <span className={`text-xs text-slate-300 truncate font-semibold ${sub.is_completed ? 'line-through text-slate-500' : ''}`}>
                                {sub.title}
                              </span>
                            </label>
                            {(isCreator || isAdmin) && (
                              <button 
                                type="button"
                                onClick={async () => {
                                  await handleDeleteSubtask(sub.id)
                                }}
                                className="text-slate-500 hover:text-red-400 transition shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                    {task.deadline || task.due_date 
                      ? new Date(task.deadline || task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'No target deadline'}
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
                    <p className="text-xs text-slate-300 mt-1">{task?.rejection_reason}</p>
                  </div>
                </div>
              )}

              {task?.clarification_text && (
                <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-2xl flex gap-3 text-amber-500 text-sm shadow-sm shadow-amber-900/5">
                  <HelpCircle className="w-5 h-5 shrink-0 text-amber-500" />
                  <div>
                    <h5 className="font-bold">Clarification Comments</h5>
                    <p className="text-xs text-slate-300 mt-1">{task?.clarification_text}</p>
                  </div>
                </div>
              )}

              {/* Attachments list */}
              {(() => {
                const rawAttachments = task.attachment_urls || task.attachments || [];
                const normalizedAttachments = Array.isArray(rawAttachments)
                  ? rawAttachments.filter(Boolean).map((file: any) => {
                      if (typeof file === 'string') {
                        const name = file.substring(file.lastIndexOf('/') + 1) || 'Attachment';
                        return { name, url: file };
                      }
                      return file;
                    })
                  : [];
                
                if (normalizedAttachments.length === 0) return null;

                return (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Documentation</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {normalizedAttachments.map((file: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4.5 h-4.5 text-[#0066FF] shrink-0" />
                            <span className="font-bold text-slate-300 truncate">{file.name || 'Attachment'}</span>
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
                );
              })()}

              {/* Action Buttons Panel */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                
                {/* 1. Standard Pending response states */}
                {isPendingForUser && !showRejectInput && !showClarifyInput && (
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
            <div className={`w-full lg:w-[380px] shrink-0 bg-slate-950/20 flex flex-col border-t border-slate-800 lg:border-t-0 overflow-hidden transition-all duration-300 ${
              isChatExpanded 
                ? 'h-[420px] lg:h-full' 
                : 'h-[52px] lg:h-full'
            }`}>
              
              {/* Chat Header */}
              <div 
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsChatExpanded(!isChatExpanded)
                  }
                }}
                className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 cursor-pointer lg:cursor-default hover:bg-slate-950/60 lg:hover:bg-slate-950/40 select-none shrink-0"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-[#0066FF]" />
                  <h4 className="font-extrabold text-white text-sm">Ecosystem Discussion</h4>
                </div>
                
                {/* Mobile Toggle Icon */}
                <div className="lg:hidden p-1 hover:bg-slate-800 rounded-lg transition-colors">
                  {isChatExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-slate-400 animate-bounce" />
                  )}
                </div>
              </div>

              {/* Message scroll list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px] lg:max-h-none">
                {comments.filter((comm) => !hiddenCommentIds.includes(comm.id)).length === 0 ? (
                  <div className="text-center py-12 text-slate-600 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                    <p className="text-xs font-semibold">No workspace discussion yet.</p>
                  </div>
                ) : (
                  comments
                    .filter((comm) => !hiddenCommentIds.includes(comm.id))
                    .map((comm) => {
                      const isMe = comm.user_id === currentUserId
                      return (
                        <div key={comm.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'} group`}>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            {comm.authorName} ({comm.authorRole})
                          </span>
                          
                          <div className="flex items-center gap-2 relative">
                            {/* For isMe, menu button comes BEFORE the bubble */}
                            {isMe && !comm.is_deleted && renderMenuButton(comm)}

                            <div className={`p-3 rounded-2xl text-xs space-y-1.5 shadow-sm border ${
                              comm.is_deleted
                                ? 'bg-slate-950/40 border-slate-900 text-slate-500 italic ' + (isMe ? 'rounded-tr-none' : 'rounded-tl-none')
                                : isMe 
                                ? 'bg-[#0066FF] border-[#0066FF] text-white rounded-tr-none shadow-blue-500/5' 
                                : 'bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none shadow-slate-950/5'
                            }`}>
                              {editingCommentId === comm.id ? (
                                renderEditInput(comm)
                              ) : (
                                <>
                                  <p className="leading-relaxed break-words">{comm.message || comm.comment_text || ''}</p>
                                  
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
                                </>
                              )}
                            </div>

                            {/* For others, menu button comes AFTER the bubble */}
                            {!isMe && !comm.is_deleted && renderMenuButton(comm)}
                          </div>

                          <span className="text-[8px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span>
                              {new Date(comm.created_at).toLocaleTimeString('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                            </span>
                            {comm.is_edited && !comm.is_deleted && (
                              <span className="italic text-[7.5px] text-slate-500 dark:text-slate-600">(edited)</span>
                            )}
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


      </div>
    </div>
  )
}
