"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, UploadCloud, Loader2 } from "lucide-react"
import { requestLogoutAndSubmitWork } from "@/app/actions/logout"

interface WorkSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WorkSubmissionModal({ isOpen, onClose }: WorkSubmissionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const file = formData.get('attachment') as File | null
    
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit.")
        setLoading(false)
        return
      }
      
      const allowedTypes = ['application/zip', 'application/x-zip-compressed', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
      if (!file.type.startsWith('image/') && !allowedTypes.includes(file.type)) {
        setError("Invalid file type. Only ZIP, PDF, Docs, Excel, PPT, and Images are allowed.")
        setLoading(false)
        return
      }
    }

    const result = await requestLogoutAndSubmitWork(formData)
    
    if (result.success) {
      try {
        sessionStorage.removeItem("dashboard_verified")
        sessionStorage.removeItem("just_checked_in")
      } catch (e) {}

      // Import client and sign out
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
      
      window.location.href = "/login"
    } else {
      setError(result.error || "Failed to submit work")
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 sm:p-8 overflow-hidden"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Submit Today&apos;s Work</h2>
            <p className="text-sm text-slate-500">
              Please submit a summary of your work or upload a file to complete your logout for today.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Work Summary Comment</label>
              <textarea 
                name="work_comment"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm resize-none"
                placeholder="What did you accomplish today?"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Upload Work Files (Optional if commented)</label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors group text-center">
                <input 
                  type="file" 
                  name="attachment"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".zip,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-[#0066FF] transition-colors" />
                <p className="text-sm font-medium text-slate-600">Click or drag files here to attach</p>
                <p className="text-xs text-slate-400 mt-1">Supports Images, PDFs, Docs, Excel, and ZIPs</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-[#0066FF]/20 transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Logging out...' : 'Submit & Logout'}
              </button>
            </div>
            
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
