"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { FileText, Image as ImageIcon, FileSpreadsheet, FileArchive, X, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

interface AttachmentUploaderProps {
  role: "admin" | "departments"
  onAttachmentsChange: (attachments: Attachment[]) => void
  disabled?: boolean
}

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png", "zip"]
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export function AttachmentUploader({ role, onAttachmentsChange, disabled = false }: AttachmentUploaderProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "pdf":
        return <FileText className="w-6 h-6 text-red-500" />
      case "doc":
      case "docx":
        return <FileText className="w-6 h-6 text-blue-500" />
      case "xls":
      case "xlsx":
        return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
      case "ppt":
      case "pptx":
        return <FileText className="w-6 h-6 text-orange-500" />
      case "jpg":
      case "jpeg":
      case "png":
        return <ImageIcon className="w-6 h-6 text-indigo-500" />
      case "zip":
        return <FileArchive className="w-6 h-6 text-amber-500" />
      default:
        return <FileText className="w-6 h-6 text-slate-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const validateFile = (file: File): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type: .${ext}. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`)
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large: ${formatFileSize(file.size)}. Max size is 20MB.`)
      return false
    }
    return true
  }

  const handleUpload = async (filesList: FileList) => {
    setError("")
    const validFiles: File[] = []

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i]
      if (validateFile(file)) {
        validFiles.push(file)
      } else {
        return // Stop on validation failure
      }
    }

    if (validFiles.length === 0) return

    const newAttachments = [...attachments]
    
    for (const file of validFiles) {
      const uniqueId = Math.random().toString(36).substring(2, 9)
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const filePath = `${role}/${Date.now()}_${uniqueId}_${sanitizedName}`

      // Add to uploading list
      setUploadingFiles(prev => [...prev, { name: file.name, progress: 10 }])

      try {
        const { data, error: uploadError } = await supabase.storage
          .from("announcements")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("announcements")
          .getPublicUrl(filePath)

        const attachment: Attachment = {
          name: file.name,
          url: publicUrl,
          type: file.type || "application/octet-stream",
          size: file.size,
        }

        newAttachments.push(attachment)
        setAttachments(newAttachments)
        onAttachmentsChange(newAttachments)
      } catch (err: any) {
        console.error("Storage upload error:", err)
        setError(`Failed to upload ${file.name}: ${err.message || err}`)
      } finally {
        // Remove from uploading list
        setUploadingFiles(prev => prev.filter(f => f.name !== file.name))
      }
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files)
    }
  }

  const removeAttachment = (indexToRemove: number) => {
    const updated = attachments.filter((_, idx) => idx !== indexToRemove)
    setAttachments(updated)
    onAttachmentsChange(updated)
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">File Attachments</label>
      
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-[#0066FF] bg-blue-50/50 dark:bg-blue-950/20"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
            <UploadCloud className="w-6 h-6 text-[#0066FF]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Drag & drop files here, or <span className="text-[#0066FF] hover:underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF, DOC, XLS, PPT, JPG, PNG, ZIP (Max 20MB per file)
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-950/50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploading File Cards */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
              <Loader2 className="w-5 h-5 text-[#0066FF] animate-spin" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Uploading...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded File Cards */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-slate-200 dark:hover:border-slate-700 relative group"
            >
              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl shrink-0">
                {getFileIcon(file.name)}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
