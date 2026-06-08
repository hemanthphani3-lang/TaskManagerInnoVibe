import React from "react"
import { Clock, CheckCircle2, AlertCircle, PlayCircle, XCircle, RotateCcw } from "lucide-react"

interface TaskStatusBadgeProps {
  status: string
  className?: string
}

export function TaskStatusBadge({ status, className = "" }: TaskStatusBadgeProps) {
  let config = {
    color: "bg-slate-100 text-slate-700",
    icon: Clock,
    label: status
  }

  switch (status) {
    case 'PENDING':
      config = { color: "bg-slate-100 text-slate-700", icon: Clock, label: "Pending" }
      break
    case 'IN_PROGRESS':
      config = { color: "bg-blue-100 text-[#0066FF]", icon: PlayCircle, label: "In Progress" }
      break
    case 'WAITING_APPROVAL':
      config = { color: "bg-purple-100 text-purple-700", icon: AlertCircle, label: "Waiting Approval" }
      break
    case 'COMPLETED':
      config = { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Completed" }
      break
    case 'REOPENED':
      config = { color: "bg-orange-100 text-orange-700", icon: RotateCcw, label: "Reopened" }
      break
    case 'DELAYED':
      config = { color: "bg-red-100 text-red-700", icon: XCircle, label: "Delayed" }
      break
  }

  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.color} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}
