"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, UploadCloud, Loader2, AlertCircle, FileCheck } from "lucide-react"
import { requestLogoutAndSubmitWork } from "@/app/actions/logout"

interface WorkSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  isReportOptional?: boolean
}

export function WorkSubmissionModal({ isOpen, onClose, isReportOptional = false }: WorkSubmissionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds the 5MB limit.")
      setSelectedFile(null)
      return
    }
    const allowedExtensions = ['zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ""
    if (!allowedExtensions.includes(fileExt) && !file.type.startsWith('image/')) {
      setError("Invalid file type. Only ZIP, PDF, Word, Excel, and JPG/PNG Images are allowed.")
      setSelectedFile(null)
      return
    }
    setError("")
    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    
    if (selectedFile) {
      formData.set('attachment', selectedFile)
    }

    const result = await requestLogoutAndSubmitWork(formData)
    
    if (result.success) {
      if (typeof window !== "undefined") {
        (window as any).__isLoggingOut = true
      }
      try {
        sessionStorage.removeItem("dashboard_verified")
        sessionStorage.removeItem("just_checked_in")
      } catch (e) {}

      // Sign out client
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
      
      window.location.href = "/login"
    } else {
      setError(result.error || "Failed to submit work session report")
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Work Session Report</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Submit today&apos;s progress to complete your shift and log out immediately.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form container - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-thin">
            
            {error && (
              <div className="p-3.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Work Summary (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Work Summary <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="work_summary"
                rows={3}
                required={!isReportOptional}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-800 resize-none"
                placeholder="Briefly summarize your key accomplishments today..."
              />
            </div>

            {/* Completed & Pending Tasks Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tasks Completed
                </label>
                <textarea 
                  name="completed_tasks"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-800 resize-none"
                  placeholder="List tasks finished today..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pending Tasks
                </label>
                <textarea 
                  name="pending_tasks"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-800 resize-none"
                  placeholder="List outstanding items..."
                />
              </div>
            </div>

            {/* Challenges & Time Spent Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Challenges / Blockers
                </label>
                <textarea 
                  name="blockers"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-800 resize-none"
                  placeholder="Any blockers or challenges faced?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Time Spent Notes
                </label>
                <textarea 
                  name="time_spent_notes"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-800 resize-none"
                  placeholder="e.g. 4h Coding, 2h Debugging, 1h Meeting..."
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Notes / Comments
              </label>
              <textarea 
                name="notes"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-800 resize-none"
                placeholder="Additional notes or remarks..."
              />
            </div>

            {/* Drag & Drop File Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Attach Deliverables (Optional)
              </label>
              
              <div 
                className={`relative border border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${
                  dragActive ? "border-blue-500 bg-blue-50/40" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  id="modal-attachment"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".zip,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileCheck className="w-8 h-8 text-emerald-500" />
                    <p className="text-xs font-bold text-slate-700 truncate max-w-xs">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-8 h-8 text-slate-450 mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">Click or drag file here to upload</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      PDF, ZIP, DOCX, XLSX or Images up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-xs border border-transparent hover:border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all text-xs disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? "Submitting..." : "Submit Report & Logout"}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
