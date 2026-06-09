"use client"

import { useTaskCounts } from "@/context/TaskCountsContext"
import { AnalyticsCard } from "./AnalyticsCard"
import { Target, CheckCircle2, Clock } from "lucide-react"

export function RealtimeEmployeeTaskCards() {
  const { assignedToMe, pending, completed } = useTaskCounts()

  return (
    <>
      <AnalyticsCard 
        title="Assigned Tasks" 
        value={assignedToMe} 
        icon={Target} 
        colorClass="text-blue-600" 
        bgClass="bg-blue-50" 
      />
      <AnalyticsCard 
        title="Pending Tasks" 
        value={pending} 
        icon={Clock} 
        colorClass="text-amber-600" 
        bgClass="bg-amber-50" 
      />
      <AnalyticsCard 
        title="Completed Tasks" 
        value={completed} 
        icon={CheckCircle2} 
        colorClass="text-emerald-600" 
        bgClass="bg-emerald-50" 
      />
    </>
  )
}
