"use client"

import dynamic from "next/dynamic"

export const AttendanceChart = dynamic(
  () => import("@/components/dashboard/charts/AttendanceChart").then(mod => mod.AttendanceChart),
  { ssr: false, loading: () => <div className="w-full h-80 bg-slate-50 animate-pulse rounded-xl" /> }
)

export const TaskChart = dynamic(
  () => import("@/components/dashboard/charts/TaskChart").then(mod => mod.TaskChart),
  { ssr: false, loading: () => <div className="w-full h-80 bg-slate-50 animate-pulse rounded-xl" /> }
)
