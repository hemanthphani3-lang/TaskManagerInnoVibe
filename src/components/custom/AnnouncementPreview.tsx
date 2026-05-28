"use client"

import { Megaphone, Calendar, FileText, Image as ImageIcon, FileSpreadsheet, FileArchive, ArrowLeft, Send } from "lucide-react"
import { Attachment } from "./AttachmentUploader"

interface AnnouncementPreviewProps {
  title: string
  message: string
  target: string
  attachments: Attachment[]
  voiceUrl: string | null
  role: "admin" | "departments"
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}

export function AnnouncementPreview({
  title,
  message,
  target,
  attachments,
  voiceUrl,
  role,
  onCancel,
  onConfirm,
  loading = false
}: AnnouncementPreviewProps) {
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTargetLabel = () => {
    switch (target) {
      case "ALL":
        return "Everyone (Departments & Employees)"
      case "DEPARTMENTS":
        return "Departments Only"
      case "EMPLOYEES":
        return "Employees Only"
      case "DEPARTMENT_EMPLOYEES":
        return "Your Department Employees"
      default:
        return target
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-[#0066FF] rounded-lg">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Announcement Preview</h3>
            <p className="text-xs text-slate-500">Review your message and media before broadcasting.</p>
          </div>
        </div>
      </div>

      {/* Draft Card */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
        
        {/* Title & Badges */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
            {title || "Untitled Announcement"}
          </h2>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-bold">
              Sender: {role === "admin" ? "Admin" : "Department Head"}
            </span>
            <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1 rounded-full text-xs font-bold">
              Audience: {getTargetLabel()}
            </span>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Just Now
            </span>
          </div>
        </div>

        {/* Message body */}
        <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pt-2">
          {message || <span className="italic text-slate-400">No message content written yet.</span>}
        </div>

        {/* Voice Note Preview */}
        {voiceUrl && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-500">Voice Note</span>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-md">
              <audio src={voiceUrl} controls className="w-full h-8" />
            </div>
          </div>
        )}

        {/* File Attachments List */}
        {attachments.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-500">Attached Files ({attachments.length})</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate leading-none">
                      {file.name}
                    </p>
                    <p className="text-[9px] font-semibold text-slate-400 mt-1">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Edit</span>
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || !title || !message}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[#0066FF]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? "Broadcasting..." : "Broadcast Now"}</span>
        </button>
      </div>
    </div>
  )
}
