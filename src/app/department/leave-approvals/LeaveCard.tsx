"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Clock } from "lucide-react"
import { useRouter } from 'next/navigation';
import { updateLeaveStatus } from "@/app/actions/leave"
import { UserAvatar } from "@/components/custom/UserAvatar"

interface LeaveCardProps {
  leave: { id: string, approval_status: string, leave_type: string, start_date: string, end_date: string, reason: string }
  emp: { employee_name: string, profile_photo: string | null }
}

export function LeaveCard({ leave, emp }: LeaveCardProps) {
  const [optimisticStatus, setOptimisticStatus] = useState(leave.approval_status)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleAction = async (newStatus: 'APPROVED' | 'REJECTED') => {
    if (isPending) return
    setIsPending(true)
    
    // Optimistic Update
    setOptimisticStatus(newStatus)
    
    // Server Action
    let result;
    if (newStatus === 'REJECTED') {
      const reason = window.prompt('Please provide a rejection reason (optional):');
      result = await updateLeaveStatus(leave.id, newStatus, reason ?? undefined);
    } else {
      result = await updateLeaveStatus(leave.id, newStatus);
    }
    
    if (!result.success) {
      // Revert on failure
      setOptimisticStatus(leave.approval_status)
      alert(result.error)
    } else {
      // Refresh the page to reflect changes
      router.refresh();
    }
    
    setIsPending(false)
  }



  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-xl border border-slate-100 gap-6 transition-all duration-300 ${
      optimisticStatus === 'APPROVED' ? 'bg-emerald-50/30 border-emerald-100' : 
      'bg-slate-50'
    }`}>
      <div className="flex items-start gap-4 flex-1 opacity-100 transition-opacity">
        <UserAvatar 
          url={emp?.profile_photo} 
          name={emp?.employee_name} 
          className="w-12 h-12 rounded-full ring-2 ring-white shadow-sm" 
        />
        <div>
          <h4 className="font-bold text-slate-900 text-lg">{emp?.employee_name || 'Unknown'}</h4>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <span className="font-semibold text-[#0066FF]">{leave.leave_type.replace('_', ' ')}</span>
            <span>•</span>
            <Clock className="w-4 h-4" />
            <span>{leave.start_date} to {leave.end_date}</span>
          </div>
          <p className="text-sm text-slate-600 mt-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <span className="font-semibold block mb-1">Reason:</span>
            {leave.reason}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3 min-w-[140px]">
        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-colors ${
          optimisticStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
          optimisticStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 
          'bg-amber-100 text-amber-700'
        }`}>
          {optimisticStatus}
        </span>
        
        {optimisticStatus === 'PENDING' && (
          <div className="flex items-center gap-2 mt-2 w-full">
            <button 
              onClick={() => handleAction('APPROVED')}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
            <button 
              onClick={() => handleAction('REJECTED')}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-semibold transition-transform active:scale-95"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
