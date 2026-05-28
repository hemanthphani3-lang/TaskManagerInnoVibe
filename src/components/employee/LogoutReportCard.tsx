"use client"

import { useState } from "react"
import { UploadCloud, Loader2, CheckCircle2, FileText } from "lucide-react"
import { requestLogoutAndSubmitWork } from "@/app/actions/logout"

interface LogoutReportCardProps {
  employeeId: string
  departmentId: string
  todayRequest: any
  isCheckedIn: boolean
}

export function LogoutReportCard({ employeeId, departmentId, todayRequest, isCheckedIn }: LogoutReportCardProps) {
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
        setError("ZIP, PDF, Docs, Excel, PPT, and Images allowed.")
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

      // Sign out and redirect
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
      
      window.location.href = "/login"
    } else {
      setError(result.error || "Failed to submit work")
      setLoading(false)
    }
  }

  if (!isCheckedIn) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Shift Completed</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
          You have submitted your daily report and completed your shift for today.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full justify-between">
      <div>
        <h3 className="text-base font-bold text-[#0A1A2F] mb-1">Daily Logout Report</h3>
        <p className="text-xs text-slate-400 mb-4 font-medium">Submit today&apos;s progress to complete your shift and logout.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <textarea 
              name="work_comment"
              rows={3}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs resize-none font-medium text-slate-700"
              placeholder="What did you accomplish today? (Required)"
            />
          </div>

          <div className="relative border border-dashed border-slate-200 rounded-xl p-3.5 bg-slate-50/50 hover:bg-slate-50 transition-colors group text-center cursor-pointer">
            <input 
              type="file" 
              name="attachment"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".zip,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
            />
            <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1 group-hover:text-[#0066FF] transition-colors" />
            <p className="text-[11px] font-bold text-slate-600">Attach deliverables (optional)</p>
            <p className="text-[9px] text-slate-400 mt-0.5">ZIP, PDF, DOCX, XLSX, Images up to 5MB</p>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white py-2.5 rounded-xl font-bold shadow-md shadow-[#0066FF]/10 transition-all text-xs disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'Logging out...' : 'Submit & Logout'}
        </button>
      </form>
    </div>
  )
}
