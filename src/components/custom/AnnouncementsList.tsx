"use client"

import { Megaphone, Calendar, FileText, Image as ImageIcon, FileSpreadsheet, FileArchive, Download, Volume2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

interface Announcement {
  id: string
  title: string
  message: string
  sender_role: string
  target_audience: string
  created_at: string
  department_name?: string
  attachments?: Attachment[]
  voice_note_url?: string | null
  created_by_name?: string
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

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />
      case "doc":
      case "docx":
        return <FileText className="w-5 h-5 text-blue-500" />
      case "xls":
      case "xlsx":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
      case "ppt":
      case "pptx":
        return <FileText className="w-5 h-5 text-orange-500" />
      case "jpg":
      case "jpeg":
      case "png":
        return <ImageIcon className="w-5 h-5 text-indigo-500" />
      case "zip":
        return <FileArchive className="w-5 h-5 text-amber-500" />
      default:
        return <FileText className="w-5 h-5 text-slate-500" />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
                  
                  {announcement.created_by_name && (
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                      Posted by: {announcement.created_by_name}
                    </span>
                  )}

                  {(viewerRole === 'ADMIN' || viewerRole === 'DEPARTMENT') && getTargetBadge(announcement.target_audience, announcement.department_name)}
                  
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pl-13 space-y-4">
            {/* Announcement Message */}
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
              {announcement.message}
            </p>

            {/* Embedded Audio Player */}
            {announcement.voice_note_url && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl max-w-md border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-950/30 text-red-500 rounded-lg shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <audio src={announcement.voice_note_url} controls className="w-full h-8" />
                </div>
              </div>
            )}

            {/* Downloadable Attachment Cards */}
            {announcement.attachments && announcement.attachments.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attachments</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {announcement.attachments.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50/40 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 rounded-xl border border-slate-100 dark:border-slate-800 transition-all group"
                    >
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 shrink-0">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#0066FF] transition-colors leading-tight">
                          {file.name}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-1">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <div className="text-slate-400 group-hover:text-[#0066FF] p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
