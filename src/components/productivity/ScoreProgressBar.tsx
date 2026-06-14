'use client'

import React from 'react'
import { motion } from 'framer-motion'
import CountUp from '@/components/ui/CountUp'

interface ScoreProgressBarProps {
  score: number
  label?: string
}

export function ScoreProgressBar({ score, label = "Productivity Score" }: ScoreProgressBarProps) {
  let color = "bg-red-500"
  if (score >= 90) color = "bg-emerald-500"
  else if (score >= 75) color = "bg-blue-500"
  else if (score >= 60) color = "bg-teal-500"
  else if (score >= 40) color = "bg-amber-500"

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <span className="text-xl font-black text-[#0A1A2F]">
          <CountUp to={score} duration={1} />
        </span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}
