"use client"

import React, { useState } from "react"
import { deleteCrossRoleTask } from "@/app/actions/tasks"
import { toast } from "sonner"
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface DeleteTaskButtonProps {
  taskId: string
  taskTitle: string
  redirectUrl?: string
}

export function DeleteTaskButton({ taskId, taskTitle, redirectUrl = "/admin/tasks" }: DeleteTaskButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    const confirmation = window.confirm(
      `🚨 WARNING: Are you absolutely sure you want to permanently delete the task "${taskTitle}"?\n\nThis will completely remove the task, all associated comments, discussion logs, and audits. This action CANNOT be undone.`
    )
    
    if (!confirmation) return

    setLoading(true)
    try {
      const res = await deleteCrossRoleTask(taskId)
      if (res.success) {
        toast.success(`Task "${taskTitle}" has been successfully deleted.`)
        router.push(redirectUrl)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to delete task.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during deletion.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-100 hover:border-red-200 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
      title={`Delete Task: ${taskTitle}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      <span>Delete Task</span>
    </button>
  )
}
