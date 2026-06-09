"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { submitLeaveRequest } from "@/app/actions/leave"

interface LeaveFormProps {
  departmentId: string
}

export function LeaveForm({ departmentId }: LeaveFormProps) {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await submitLeaveRequest(formData)
      if (result.success) {
        toast.success("Leave request submitted successfully!")
        // Reset form
        ;(e.target as HTMLFormElement).reset()
      } else {
        toast.error(result.error || "Failed to submit leave request.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="departmentId" value={departmentId} />
      
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">Leave Type</label>
        <select name="leaveType" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all">
          <option value="">Select type...</option>
          <option value="SICK_LEAVE">Sick Leave</option>
          <option value="CASUAL_LEAVE">Casual Leave</option>
          <option value="PAID_TIME_OFF">Paid Time Off (PTO)</option>
          <option value="UNPAID_LEAVE">Unpaid Leave</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Start Date</label>
          <input type="date" name="startDate" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">End Date</label>
          <input type="date" name="endDate" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">Reason</label>
        <textarea name="reason" rows={3} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all resize-none" placeholder="Provide a brief reason..."></textarea>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white py-3 rounded-xl font-semibold transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{loading ? "Submitting..." : "Submit Request"}</span>
      </button>
    </form>
  )
}
