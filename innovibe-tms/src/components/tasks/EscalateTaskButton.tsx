"use client"

import { useState } from "react"
import { AlertOctagon, Loader2 } from "lucide-react"
import { escalateTask } from "@/app/actions/tasks"
import { useRouter } from "next/navigation"

export function EscalateTaskButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEscalate = async () => {
    if (!confirm("Are you sure you want to escalate this task to Admin? This indicates the task is critically delayed or requires administrative intervention.")) return

    setLoading(true)
    const result = await escalateTask(taskId)
    setLoading(false)
    
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || "Failed to escalate task.")
    }
  }

  return (
    <button
      onClick={handleEscalate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-xl font-semibold transition-all disabled:opacity-50 text-sm"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />}
      Escalate to Admin
    </button>
  )
}
