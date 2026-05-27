"use client"

import { Activity, Clock, CheckCircle2, AlertCircle, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export type ActivityType = 'CHECK_IN' | 'LOGOUT_APPROVED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'TASK_REOPENED' | 'LEAVE_APPROVED'

export interface ActivityItem {
  id: string
  activity_type: string
  activity_user_name: string
  activity_description: string
  created_at: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'CHECK_IN': return <Clock className="w-4 h-4 text-emerald-500" />
    case 'LOGOUT_APPROVED': return <CheckCircle2 className="w-4 h-4 text-blue-500" />
    case 'TASK_COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    case 'TASK_UPDATED': return <Activity className="w-4 h-4 text-indigo-500" />
    case 'TASK_REOPENED': return <AlertCircle className="w-4 h-4 text-amber-500" />
    case 'LEAVE_APPROVED': return <Calendar className="w-4 h-4 text-purple-500" />
    default: return <Activity className="w-4 h-4 text-slate-500" />
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-100 shadow-sm h-[400px] overflow-y-auto custom-scrollbar">
      <h3 className="text-lg font-bold text-[#0A1A2F] mb-6 sticky top-0 bg-white/90 backdrop-blur pb-2 z-10">Live Activity Feed</h3>
      
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <Activity className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative flex gap-4">
              {/* Timeline line */}
              {index !== activities.length - 1 && (
                <div className="absolute left-[19px] top-8 bottom-[-24px] w-[2px] bg-slate-100" />
              )}
              
              <div className="relative z-10 mt-1 shrink-0 w-10 h-10 rounded-full bg-slate-50 border-2 border-white shadow-sm flex items-center justify-center">
                {getActivityIcon(activity.activity_type)}
              </div>
              
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {activity.activity_user_name}
                  </p>
                  <span suppressHydrationWarning className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {(() => {
                      try {
                        return formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
                      } catch (e) {
                        return 'recently'
                      }
                    })()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {activity.activity_description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
