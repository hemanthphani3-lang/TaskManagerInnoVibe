"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react"
import { addComment, editCrossRoleComment, deleteCrossRoleCommentForEveryone } from "@/app/actions/tasks"
import { createClient } from "@/lib/supabase/client"
import { UserAvatar } from "@/components/custom/UserAvatar"

interface Comment {
  id: string
  comment_text: string
  created_at: string
  user_id: string
  sender_name?: string
  sender_role?: string
  sender_avatar?: string
  is_edited?: boolean
  is_deleted?: boolean
}

interface TaskCommentBoxProps {
  taskId: string
  initialComments: Comment[]
  currentUserId: string
  currentUserName: string
  currentUserRole: string
  currentUserAvatar?: string
  isReadOnly?: boolean
}

// Generate a consistent color from a string (for avatars)
function stringToColor(str: string) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500",
    "bg-rose-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500"
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function TaskCommentBox({
  taskId,
  initialComments,
  currentUserId,
  currentUserName,
  currentUserRole,
  currentUserAvatar,
  isReadOnly = false,
}: TaskCommentBoxProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text, setText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [hiddenCommentIds, setHiddenCommentIds] = useState<string[]>([])

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

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.('.menu-trigger')) {
        return
      }
      setActiveMenuId(null)
    }
    document.addEventListener("click", handleDocumentClick)
    return () => {
      document.removeEventListener("click", handleDocumentClick)
    }
  }, [])

  useEffect(() => {
    const channelName = `realtime_task_comments_${taskId}_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        async (payload) => {
          const { eventType, new: newComment, old: oldComment } = payload

          if (eventType === 'INSERT') {
            let senderName = "System User"
            let senderRole = "User"
            let senderAvatar = undefined

            try {
              const { data: emp } = await supabase.from('employees').select('employee_name, profile_photo, designation').eq('id', newComment.user_id).maybeSingle()
              if (emp) {
                senderName = emp.employee_name
                senderRole = emp.designation || "Employee"
                senderAvatar = emp.profile_photo || undefined
              } else {
                const { data: dept } = await supabase.from('departments').select('department_head_name, leadership_role').eq('id', newComment.user_id).maybeSingle()
                if (dept) {
                  senderName = dept.department_head_name
                  senderRole = dept.leadership_role || "Dept Head"
                } else {
                  const { data: adm } = await supabase.from('admins').select('full_name, organization_role').eq('id', newComment.user_id).maybeSingle()
                  if (adm) {
                    senderName = adm.full_name
                    senderRole = adm.organization_role || "Admin"
                  }
                }
              }
            } catch (err) {
              console.error("Error fetching sender details:", err)
            }

            const formatted: Comment = {
              id: newComment.id,
              comment_text: newComment.comment_text || newComment.message || "",
              created_at: newComment.created_at || newComment.timestamp || new Date().toISOString(),
              user_id: newComment.user_id,
              sender_name: senderName,
              sender_role: senderRole,
              sender_avatar: senderAvatar,
              is_edited: newComment.is_edited || false,
              is_deleted: newComment.is_deleted || false
            }

            setComments(prev => {
              if (prev.some(c => c.id === formatted.id || (c.id.startsWith('optimistic-') && c.comment_text === formatted.comment_text))) {
                return prev.map(c => {
                  if (c.id.startsWith('optimistic-') && c.comment_text === formatted.comment_text) {
                    return {
                      ...c,
                      id: formatted.id,
                      created_at: formatted.created_at,
                      is_edited: formatted.is_edited,
                      is_deleted: formatted.is_deleted
                    }
                  }
                  return c
                })
              }
              return [...prev, formatted]
            })
          } else if (eventType === 'UPDATE') {
            setComments(prev => prev.map(c => {
              if (c.id === newComment.id) {
                return {
                  ...c,
                  comment_text: newComment.comment_text || newComment.message || "",
                  is_edited: newComment.is_edited || false,
                  is_deleted: newComment.is_deleted || false
                }
              }
              return c
            }))
          } else if (eventType === 'DELETE') {
            if (oldComment && oldComment.id) {
              setComments(prev => prev.filter(c => c.id !== oldComment.id))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isSubmitting) return

    const optimistic: Comment = {
      id: `optimistic-${Date.now()}`,
      comment_text: text.trim(),
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      sender_name: currentUserName,
      sender_role: currentUserRole,
      sender_avatar: currentUserAvatar,
      is_edited: false,
      is_deleted: false
    }
    setComments(prev => [...prev, optimistic])
    setText("")
    setIsSubmitting(true)

    const result = await addComment(taskId, optimistic.comment_text)
    if (!result.success) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
      alert("Failed to send: " + result.error)
    }
    setIsSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return
    const prevText = comments.find(c => c.id === commentId)?.comment_text || ""

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, comment_text: editText.trim(), is_edited: true } : c))
    setEditingCommentId(null)

    const result = await editCrossRoleComment(commentId, editText.trim())
    if (!result.success) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, comment_text: prevText } : c))
      alert("Failed to edit message: " + result.error)
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

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, comment_text: "This message was deleted.", is_deleted: true } : c))

    const result = await deleteCrossRoleCommentForEveryone(commentId)
    if (!result.success) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, comment_text: prevComment.comment_text, is_deleted: prevComment.is_deleted } : c))
      alert("Failed to delete message: " + result.error)
    }
  }

  const handleDeleteForMe = (commentId: string) => {
    const nextHidden = [...hiddenCommentIds, commentId]
    setHiddenCommentIds(nextHidden)
    try {
      localStorage.setItem(`hidden_comments_${currentUserId}`, JSON.stringify(nextHidden))
    } catch (err) {
      console.error("Error saving hidden comments:", err)
    }
  }

  const renderMenuButton = (comment: Comment) => {
    if (isReadOnly) return null
    const isMe = comment.user_id === currentUserId
    const isAdmin = currentUserRole === 'ADMIN'
    const isOpen = activeMenuId === comment.id

    return (
      <div className="relative shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setActiveMenuId(isOpen ? null : comment.id)
          }}
          className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-400 hover:text-slate-600 dark:text-slate-450 dark:hover:text-slate-200 transition-colors menu-trigger"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {isOpen && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className={`absolute z-50 py-1.5 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-xs font-medium ${
              isMe ? "right-0 origin-top-right" : "left-0 origin-top-left"
            }`}
          >
            {isMe && (
              <button
                type="button"
                onClick={() => {
                  setEditingCommentId(comment.id)
                  setEditText(comment.comment_text)
                  setActiveMenuId(null)
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Message
              </button>
            )}
            
            {(isMe || isAdmin) && (
              <button
                type="button"
                onClick={() => {
                  handleDeleteForEveryone(comment.id)
                  setActiveMenuId(null)
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 text-red-650 dark:text-red-400 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete for Everyone
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleDeleteForMe(comment.id)
                setActiveMenuId(null)
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete for Me
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderEditInput = (comment: Comment) => {
    return (
      <div className="flex items-center gap-1.5 min-w-[180px] sm:min-w-[240px]">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => handleEditKeyDown(e, comment.id)}
          className="flex-1 bg-white/10 text-white outline-none border-b border-white/50 focus:border-white text-sm py-0.5 px-1 rounded-sm"
          autoFocus
        />
        <button
          type="button"
          onClick={() => handleSaveEdit(comment.id)}
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

  const visibleComments = comments.filter(c => !hiddenCommentIds.includes(c.id))

  return (
    <div className="flex flex-col">
      {/* Chat Messages */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 pb-2">
        {visibleComments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}

        {visibleComments.map((comment, idx) => {
          const isMe = comment.user_id === currentUserId
          const senderName = comment.sender_name || "Unknown"
          const senderRole = comment.sender_role || ""
          const initials = senderName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
          const avatarColor = stringToColor(senderName)

          // Group: show sender name only if different from previous
          const prevComment = visibleComments[idx - 1]
          const showSender = !prevComment || prevComment.user_id !== comment.user_id

          return (
            <div key={comment.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar — hide for current user, only show for others on last in a group */}
                {!isMe && (
                  <div className="w-8 flex-shrink-0 self-end mb-1">
                      <UserAvatar 
                        url={comment.sender_avatar} 
                        name={senderName} 
                        className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" 
                      />
                  </div>
                )}

                {/* Bubble */}
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {showSender && !isMe && (
                    <div className="flex items-baseline gap-1.5 mb-1 ml-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{senderName}</span>
                      {senderRole && (
                        <span className="text-[10px] text-slate-400 capitalize">{senderRole.toLowerCase()}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 group relative">
                    {/* For isMe, the menu button comes BEFORE the bubble */}
                    {isMe && !comment.is_deleted && renderMenuButton(comment)}

                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        comment.is_deleted
                          ? "bg-slate-50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 italic border border-slate-200/50 dark:border-slate-800/40 " + (isMe ? "rounded-br-sm" : "rounded-bl-sm")
                          : isMe
                          ? "bg-[#0066FF] text-white rounded-br-sm"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      {editingCommentId === comment.id ? (
                        renderEditInput(comment)
                      ) : (
                        comment.comment_text
                      )}
                    </div>

                    {/* For others, the menu button comes AFTER the bubble */}
                    {!isMe && !comment.is_deleted && renderMenuButton(comment)}
                  </div>

                  <span suppressHydrationWarning className="text-[10px] text-slate-400 mt-1 mx-1 flex items-center gap-1.5">
                    <span>
                      {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                      {" · "}
                      {new Date(comment.created_at).toLocaleDateString([], { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                    </span>
                    {comment.is_edited && !comment.is_deleted && (
                      <span className="italic text-[9px] text-slate-400 dark:text-slate-500">(edited)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isReadOnly ? (
        <div className="mt-4 p-3.5 border-t border-slate-100 bg-slate-50 dark:bg-slate-900 rounded-2xl text-center text-xs font-semibold text-slate-500">
          This discussion is read-only because your account is inactive.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message... (Enter to send)"
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-2xl shadow-sm transition-all flex items-center justify-center"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      )}
    </div>
  )
}

