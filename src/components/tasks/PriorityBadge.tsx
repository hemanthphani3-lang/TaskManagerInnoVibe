import React from "react"
import { Flame, ArrowUpRight, ArrowRight, ArrowDownRight } from "lucide-react"

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  let config = {
    color: "bg-slate-100 text-slate-700",
    icon: ArrowRight,
    label: priority
  }

  switch (priority) {
    case 'CRITICAL':
      config = { color: "bg-rose-100 text-rose-700 border border-rose-200", icon: Flame, label: "Critical" }
      break
    case 'HIGH':
      config = { color: "bg-orange-100 text-orange-700 border border-orange-200", icon: ArrowUpRight, label: "High" }
      break
    case 'MEDIUM':
      config = { color: "bg-blue-100 text-blue-700 border border-blue-200", icon: ArrowRight, label: "Medium" }
      break
    case 'LOW':
      config = { color: "bg-slate-100 text-slate-700 border border-slate-200", icon: ArrowDownRight, label: "Low" }
      break
  }

  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm ${config.color} ${className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
