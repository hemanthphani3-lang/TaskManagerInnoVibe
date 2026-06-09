"use client"

import { useTaskCounts } from "@/context/TaskCountsContext"
import { AnalyticsCard } from "./AnalyticsCard"
import { Target, CheckCircle2, Clock } from "lucide-react"

export function RealtimeAdminTaskCards() {
  const { total, pending, completed } = useTaskCounts()

  return (
    <>
      <AnalyticsCard 
        title="Organization Tasks" 
        value={total} 
        icon={Target} 
        colorClass="text-blue-600" 
        bgClass="bg-blue-50" 
        delay={0}
      />
      <AnalyticsCard 
        title="Pending Tasks" 
        value={pending} 
        icon={Clock} 
        colorClass="text-amber-600" 
        bgClass="bg-amber-50" 
        delay={1}
      />
      <AnalyticsCard 
        title="Completed Tasks" 
        value={completed} 
        icon={CheckCircle2} 
        colorClass="text-emerald-600" 
        bgClass="bg-emerald-50" 
        delay={2}
      />
    </>
  )
}
