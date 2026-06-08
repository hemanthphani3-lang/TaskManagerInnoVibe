"use client"

import { useState } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { deescalateTask } from "@/app/actions/tasks"
import { useRouter } from "next/navigation"

export function DeescalateTaskButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDeescalate = async () => {
    if (!confirm("Are you sure you want to de-escalate this task? This removes the escalation flag.")) return

    setLoading(true)
    const result = await deescalateTask(taskId)
    setLoading(false)
    
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || "Failed to de-escalate task.")
    }
  }

  return (
    <button
      onClick={handleDeescalate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl font-semibold transition-all disabled:opacity-50 text-sm"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
      Resolve Escalation
    </button>
  )
}
