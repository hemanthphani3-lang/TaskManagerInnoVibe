"use client"

import { useEffect, useState } from "react"
import { subscribeToTaskCounts } from "@/lib/realtime/tasksCountsChannel"
import { AnalyticsCard } from "./AnalyticsCard"
import { Target, CheckCircle2, Clock } from "lucide-react"

interface RealtimeAdminDeptTaskCardsProps {
  deptId: string
  initialTotal: number
  initialCompleted: number
  initialPending: number
}

export function RealtimeAdminDeptTaskCards({
  deptId,
  initialTotal,
  initialCompleted,
  initialPending
}: RealtimeAdminDeptTaskCardsProps) {
  const [counts, setCounts] = useState({
    total: initialTotal,
    completed: initialCompleted,
    pending: initialPending
  })

  const fetchCounts = async () => {
    try {
      const res = await fetch(`/api/tasks/counts?dept_id=${deptId}`)
      if (res.ok) {
        const data = await res.json()
        setCounts({
          total: data.total_tasks ?? 0,
          completed: data.completed_tasks ?? 0,
          pending: data.pending_tasks ?? 0
        })
      }
    } catch (err) {
      console.error("Failed to fetch department task counts:", err)
    }
  }

  useEffect(() => {
    // Initial fetch in case something changed since SSR
    fetchCounts()

    // Subscribe to task counts channel broadcasts
    subscribeToTaskCounts(() => {
      fetchCounts()
    })
  }, [deptId])

  return (
    <>
      <AnalyticsCard 
        title="Total Tasks" 
        value={counts.total} 
        icon={Target} 
        colorClass="text-slate-600" 
        bgClass="bg-slate-100" 
      />
      <AnalyticsCard 
        title="Tasks Completed" 
        value={counts.completed} 
        icon={CheckCircle2} 
        colorClass="text-emerald-600" 
        bgClass="bg-emerald-50" 
      />
      <AnalyticsCard 
        title="Pending Tasks" 
        value={counts.pending} 
        icon={Clock} 
        colorClass="text-amber-600" 
        bgClass="bg-amber-50" 
      />
    </>
  )
}
