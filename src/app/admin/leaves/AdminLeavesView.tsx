"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, Search, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateLeaveStatus } from "@/app/actions/leave"

interface ResolvedLeave {
  id: string
  employee_id: string
  department_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  approval_status: string
  approved_by: string | null
  created_at: string
  rejection_reason?: string | null
  requesterName: string
  requesterRole: string
  requesterDesignation: string
  requesterPhoto: string | null
  deptName: string
  resolvedByName: string | null
}

interface AdminLeavesViewProps {
  initialLeaves: ResolvedLeave[]
}

export function AdminLeavesView({ initialLeaves }: AdminLeavesViewProps) {
  const [leaves, setLeaves] = useState<ResolvedLeave[]>(initialLeaves)
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING")
  const [searchTerm, setSearchTerm] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  const router = useRouter()

  // Get distinct departments for filter dropdown
  const departmentsList = Array.from(new Set(leaves.map(l => l.deptName))).filter(d => d !== "Unassigned")

  const handleAction = async (requestId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    if (processingId) return
    setProcessingId(requestId)

    let reason: string | undefined = undefined
    if (newStatus === 'REJECTED') {
      const promptVal = window.prompt("Please provide a rejection reason (optional):")
      if (promptVal === null) {
        setProcessingId(null)
        return // Cancelled by user
      }
      reason = promptVal
    }

    // Server Action
    const result = await updateLeaveStatus(requestId, newStatus, reason)
    
    if (result.success) {
      toast.success(`Leave request ${newStatus.toLowerCase()} successfully!`)
      
      // Update local state
      setLeaves(prev => prev.map(leave => {
        if (leave.id === requestId) {
          return {
            ...leave,
            approval_status: newStatus,
            rejection_reason: reason || null
          }
        }
        return leave
      }))
      router.refresh()
    } else {
      toast.error(result.error || "Failed to update leave request status.")
    }
    
    setProcessingId(null)
  }

  // Filter leaves
  const filteredLeaves = leaves.filter(leave => {
    // 1. Tab filter
    const status = leave.approval_status || "PENDING"
    const matchesTab = activeTab === "PENDING" ? status === "PENDING" : status !== "PENDING"
    
    // 2. Search term filter
    const matchesSearch = leave.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          leave.reason.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 3. Department filter
    const matchesDept = deptFilter === "" || leave.deptName === deptFilter

    // 4. Role filter
    const matchesRole = roleFilter === "" || leave.requesterRole === roleFilter

    return matchesTab && matchesSearch && matchesDept && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by employee name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/25 transition-all text-slate-800"
          />
        </div>
        <div>
          <select 
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/25 transition-all text-slate-800"
          >
            <option value="">All Departments</option>
            {departmentsList.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div>
          <select 
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/25 transition-all text-slate-800"
          >
            <option value="">All Roles</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="DEPARTMENT">Department Heads</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "PENDING" ? "border-[#0066FF] text-[#0066FF]" : "border-transparent text-slate-450 hover:text-slate-700"}`}
        >
          Pending Approvals
        </button>
        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-all cursor-pointer ${activeTab === "HISTORY" ? "border-[#0066FF] text-[#0066FF]" : "border-transparent text-slate-450 hover:text-slate-700"}`}
        >
          Leave History
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredLeaves.length > 0 ? (
          filteredLeaves.map((leave) => (
            <div 
              key={leave.id}
              className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-xl border border-slate-100 gap-6 transition-all duration-300 bg-white shadow-sm ${
                leave.approval_status === 'APPROVED' ? 'border-emerald-100 bg-emerald-50/5' : 
                leave.approval_status === 'REJECTED' ? 'border-red-100 bg-red-50/5' : ''
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                {leave.requesterPhoto ? (
                  <img src={leave.requesterPhoto} alt="Profile" className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg ring-2 ring-white shadow-sm">
                    {leave.requesterName.charAt(0)}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-lg">{leave.requesterName}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {leave.deptName}
                    </span>
                    {leave.requesterRole === 'DEPARTMENT' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 uppercase">
                        Dept Head
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-semibold">
                    <span className="text-[#0066FF] font-bold">{leave.leave_type.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{leave.start_date} to {leave.end_date}</span>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 shadow-inner mt-3 leading-relaxed max-w-2xl">
                    <span className="font-bold block mb-1 text-xs text-slate-400 uppercase tracking-wider">Reason:</span>
                    {leave.reason}
                  </p>

                  {/* Resolution Notes in History */}
                  {leave.approval_status !== 'PENDING' && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <span>Decided By: <strong className="text-slate-700">{leave.resolvedByName || "System / Unspecified"}</strong></span>
                      {leave.rejection_reason && (
                        <span>• Rejection Reason: <strong className="text-red-600 italic">{leave.rejection_reason}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Action Blocks */}
              <div className="flex flex-col items-end gap-3 min-w-[150px] shrink-0 justify-center">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                  leave.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  leave.approval_status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' : 
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {leave.approval_status}
                </span>
                
                {leave.approval_status === 'PENDING' && (
                  <div className="flex items-center gap-2 mt-2 w-full">
                    <button 
                      onClick={() => handleAction(leave.id, 'APPROVED')}
                      disabled={processingId !== null}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button 
                      onClick={() => handleAction(leave.id, 'REJECTED')}
                      disabled={processingId !== null}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-500">
            <CalendarIcon className="w-12 h-12 text-slate-350 mx-auto mb-4" />
            <p className="font-semibold text-sm">No leave requests found matching filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
