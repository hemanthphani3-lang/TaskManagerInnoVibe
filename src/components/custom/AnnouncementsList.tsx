"use client"

import { Megaphone, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Announcement {
  id: string
  title: string
  message: string
  sender_role: string
  target_audience: string
  created_at: string
  department_name?: string
}

interface AnnouncementsListProps {
  announcements: Announcement[]
  viewerRole: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE'
}

export function AnnouncementsList({ announcements, viewerRole }: AnnouncementsListProps) {
  if (announcements.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
        <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Announcements</h3>
        <p className="text-slate-500">There are no announcements to display at this time.</p>
      </div>
    )
  }

  const getTargetBadge = (target: string, deptName?: string) => {
    switch (target) {
      case 'ALL': return <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1 rounded-full text-xs font-bold">To: Everyone</span>
      case 'DEPARTMENTS': return <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-1 rounded-full text-xs font-bold">To: Departments</span>
      case 'EMPLOYEES': return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold">To: Employees</span>
      case 'DEPARTMENT_EMPLOYEES': return <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 px-2.5 py-1 rounded-full text-xs font-bold">To: {deptName ? `${deptName} Employees` : 'Dept Employees'}</span>
      default: return null
    }
  }

  const getSenderBadge = (role: string, deptName?: string) => {
    if (role === 'ADMIN') {
      return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-bold">From: Admin</span>
    }
    return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold">From: {deptName || 'Department'}</span>
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <div 
          key={announcement.id} 
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {announcement.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {getSenderBadge(announcement.sender_role, announcement.department_name)}
                  {(viewerRole === 'ADMIN' || viewerRole === 'DEPARTMENT') && getTargetBadge(announcement.target_audience, announcement.department_name)}
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="pl-13">
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
              {announcement.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
