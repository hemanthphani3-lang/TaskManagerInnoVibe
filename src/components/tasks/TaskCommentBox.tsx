"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2 } from "lucide-react"
import { addComment } from "@/app/actions/tasks"
import { createClient } from "@/lib/supabase/client"

interface Comment {
  id: string
  comment_text: string
  created_at: string
  user_id: string
  sender_name?: string
  sender_role?: string
  sender_avatar?: string
}

interface TaskCommentBoxProps {
  taskId: string
  initialComments: Comment[]
  currentUserId: string
  currentUserName: string
  currentUserRole: string
  currentUserAvatar?: string
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
}: TaskCommentBoxProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text, setText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const channelName = `realtime_task_comments_${taskId}_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        async (payload) => {
          const newComment = payload.new
          
          setComments(prev => {
            // Check if comment is already in the list
            if (prev.some(c => c.id === newComment.id || (c.id.startsWith('optimistic-') && c.comment_text === newComment.comment_text))) {
              return prev.map(c => {
                if (c.id.startsWith('optimistic-') && c.comment_text === newComment.comment_text) {
                  return {
                    ...c,
                    id: newComment.id,
                    created_at: newComment.created_at
                  }
                }
                return c
              })
            }

            // Fetch sender profile details in background
            const fetchSender = async () => {
              let senderName = "System User"
              let senderRole = "User"
              let senderAvatar = undefined

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

              const formatted: Comment = {
                id: newComment.id,
                comment_text: newComment.comment_text,
                created_at: newComment.created_at,
                user_id: newComment.user_id,
                sender_name: senderName,
                sender_role: senderRole,
                sender_avatar: senderAvatar
              }

              setComments(current => {
                if (current.some(c => c.id === formatted.id)) return current
                return [...current, formatted]
              })
            }

            fetchSender()
            return prev
          })
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

    // Optimistic update — show message instantly
    const optimistic: Comment = {
      id: `optimistic-${Date.now()}`,
      comment_text: text.trim(),
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      sender_name: currentUserName,
      sender_role: currentUserRole,
      sender_avatar: currentUserAvatar,
    }
    setComments(prev => [...prev, optimistic])
    setText("")
    setIsSubmitting(true)

    const result = await addComment(taskId, optimistic.comment_text)
    if (!result.success) {
      // Rollback on error
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

  return (
    <div className="flex flex-col">
      {/* Chat Messages */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 pb-2">
        {comments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}

        {comments.map((comment, idx) => {
          const isMe = comment.user_id === currentUserId
          const senderName = comment.sender_name || "Unknown"
          const senderRole = comment.sender_role || ""
          const initials = senderName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
          const avatarColor = stringToColor(senderName)

          // Group: show sender name only if different from previous
          const prevComment = comments[idx - 1]
          const showSender = !prevComment || prevComment.user_id !== comment.user_id

          return (
            <div key={comment.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar — hide for current user, only show for others on last in a group */}
                {!isMe && (
                  <div className="w-8 flex-shrink-0 self-end mb-1">
                    {showSender && (
                      comment.sender_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.sender_avatar}
                          alt={senderName}
                          className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full ${avatarColor} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>
                          {initials}
                        </div>
                      )
                    )}
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
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-[#0066FF] text-white rounded-br-sm"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                    }`}
                  >
                    {comment.comment_text}
                  </div>
                  <span suppressHydrationWarning className="text-[10px] text-slate-400 mt-1 mx-1">
                    {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                    {" · "}
                    {new Date(comment.created_at).toLocaleDateString([], { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
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
    </div>
  )
}
