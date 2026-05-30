"use client"

import { useState } from "react"
import { CheckCircle2, FileText, ArrowRight } from "lucide-react"
import { WorkSubmissionModal } from "./WorkSubmissionModal"

interface LogoutReportCardProps {
  employeeId: string
  departmentId: string
  todayRequest: any
  isCheckedIn: boolean
}

export function LogoutReportCard({ employeeId, departmentId, todayRequest, isCheckedIn }: LogoutReportCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isCheckedIn) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3 border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Shift Completed</h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
          You have submitted your daily report and completed your shift for today.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full justify-between min-h-[300px]">
      <div>
        <h3 className="text-base font-bold text-[#0A1A2F] mb-1">Daily Logout Report</h3>
        <p className="text-xs text-slate-400 mb-4 font-medium">Submit today&apos;s progress to complete your shift and logout.</p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 my-2">
        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center border border-blue-100">
          <FileText className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-700">Ready to wrap up?</p>
          <p className="text-[10px] text-slate-400 max-w-[190px] mx-auto leading-relaxed">
            Ensure all your work tasks, blockers, and deliverables are reported accurately.
          </p>
        </div>
      </div>

      <div>
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white py-2.5 rounded-xl font-bold shadow-md shadow-[#0066FF]/10 transition-all text-xs cursor-pointer group"
        >
          <span>Complete Shift & Logout</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <WorkSubmissionModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )
}
