import React from 'react'
import { Shield, Zap, TrendingUp, AlertTriangle, AlertOctagon } from 'lucide-react'

interface ProductivityBadgeProps {
  score: number
  className?: string
}

export function ProductivityBadge({ score, className = "" }: ProductivityBadgeProps) {
  let label = "Poor"
  let colorClass = "bg-red-100 text-red-700 border-red-200"
  let Icon = AlertOctagon

  if (score >= 90) {
    label = "Excellent"
    colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200"
    Icon = Shield
  } else if (score >= 75) {
    label = "Very Good"
    colorClass = "bg-blue-100 text-blue-700 border-blue-200"
    Icon = Zap
  } else if (score >= 60) {
    label = "Good"
    colorClass = "bg-teal-100 text-teal-700 border-teal-200"
    Icon = TrendingUp
  } else if (score >= 40) {
    label = "Needs Improvement"
    colorClass = "bg-amber-100 text-amber-700 border-amber-200"
    Icon = AlertTriangle
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${colorClass} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  )
}
