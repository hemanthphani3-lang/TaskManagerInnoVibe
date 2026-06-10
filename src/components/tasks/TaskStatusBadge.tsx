import React from "react"
import { Clock, CheckCircle2, AlertCircle, PlayCircle, XCircle, RotateCcw } from "lucide-react"

interface TaskStatusBadgeProps {
  status: string
  className?: string
}

function PulsingDot({ color }: { color: string }) {
  let pulseClass = "bg-slate-400"
  if (color === "green") pulseClass = "bg-emerald-500 badge-pulse-green"
  if (color === "amber") pulseClass = "bg-amber-500 badge-pulse-amber"
  if (color === "red") pulseClass = "bg-red-500 badge-pulse-red"
  
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseClass}`}></span>
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${pulseClass}`}></span>
    </span>
  )
}

export function TaskStatusBadge({ status, className = "" }: TaskStatusBadgeProps) {
  let config = {
    color: "bg-slate-100 text-slate-700",
    icon: Clock,
    label: status
  }

  let dotColor = ""

  switch (status) {
    case 'PENDING':
      config = { color: "bg-slate-100 text-slate-700", icon: Clock, label: "Pending" }
      dotColor = "amber"
      break
    case 'ACCEPTED':
      config = { color: "bg-teal-100 text-teal-700", icon: PlayCircle, label: "Accepted" }
      dotColor = "green"
      break
    case 'IN_PROGRESS':
      config = { color: "bg-blue-100 text-[#0066FF]", icon: PlayCircle, label: "In Progress" }
      dotColor = "green"
      break
    case 'WAITING_APPROVAL':
      config = { color: "bg-purple-100 text-purple-700", icon: AlertCircle, label: "Waiting Approval" }
      dotColor = "amber"
      break
    case 'COMPLETED':
      config = { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Completed" }
      break
    case 'REOPENED':
      config = { color: "bg-orange-100 text-orange-700", icon: RotateCcw, label: "Reopened" }
      dotColor = "amber"
      break
    case 'DELAYED':
      config = { color: "bg-red-100 text-red-700", icon: XCircle, label: "Delayed" }
      dotColor = "red"
      break
    case 'REJECTED':
      config = { color: "bg-rose-100 text-rose-700", icon: XCircle, label: "Rejected" }
      dotColor = "red"
      break
    case 'OVERDUE':
      config = { color: "bg-amber-100 text-amber-800 border border-amber-300/40", icon: AlertCircle, label: "Overdue" }
      dotColor = "red"
      break
  }

  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${config.color} ${className}`}>
      {dotColor && <PulsingDot color={dotColor} />}
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {config.label}
    </span>
  )
}

