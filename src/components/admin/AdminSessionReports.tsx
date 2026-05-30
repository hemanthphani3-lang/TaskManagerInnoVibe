"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Search, Calendar, User, Building, Clock, FileText, DownloadCloud, X, Eye, FileCheck } from "lucide-react"

interface AdminSessionReportsProps {
  initialSessions: any[]
  departments: string[]
  employees: { id: string; name: string }[]
}

export function AdminSessionReports({ initialSessions, departments, employees }: AdminSessionReportsProps) {
  const [selectedEmp, setSelectedEmp] = useState("")
  const [selectedDept, setSelectedDept] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filter sessions
  const filteredSessions = initialSessions.filter(session => {
    // Employee filter
    if (selectedEmp && session.user_id !== selectedEmp) return false

    // Department filter
    if (selectedDept && session.department !== selectedDept) return false

    // Date range filter (IST timezone safe check)
    const sessionDateStr = new Date(session.login_time).toISOString().split('T')[0]
    if (startDate && sessionDateStr < startDate) return false
    if (endDate && sessionDateStr > endDate) return false

    return true
  })

  const handleOpenReport = (session: any) => {
    const report = Array.isArray(session.logout_reports) 
      ? session.logout_reports[0] 
      : session.logout_reports

    if (report) {
      setSelectedReport({
        ...report,
        user_name: session.user_name,
        department: session.department,
        designation: session.designation,
        duration: session.duration,
        login_time: session.login_time,
        logout_time: session.logout_time
      })
      setIsModalOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Filters Panel */}
      <Card className="p-6 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filter Work Sessions</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Employee Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Employee</label>
            <div className="relative">
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-55 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-700 cursor-pointer appearance-none"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Department Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Department</label>
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-55 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-700 cursor-pointer appearance-none"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <Building className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Start Date</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-55 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-700 cursor-pointer"
              />
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">End Date</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-55 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xs font-medium text-slate-700 cursor-pointer"
              />
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Clear Filters button */}
        {(selectedEmp || selectedDept || startDate || endDate) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSelectedEmp("")
                setSelectedDept("")
                setStartDate("")
                setEndDate("")
              }}
              className="text-[10px] font-bold text-[#0066FF] hover:underline"
            >
              Clear Active Filters
            </button>
          </div>
        )}
      </Card>

      {/* Sessions Count */}
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Sessions Found: {filteredSessions.length}
        </span>
      </div>

      {/* Grid List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <FileText className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No session reports found</h4>
            <p className="text-xs text-slate-500 mt-1">No work sessions matched the active filtering criteria.</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const loginDate = new Date(session.login_time)
            const formattedDate = loginDate.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'Asia/Kolkata'
            })
            const formattedLoginTime = loginDate.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
              timeZone: 'Asia/Kolkata'
            })
            const formattedLogoutTime = session.logout_time
              ? new Date(session.logout_time).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata'
                })
              : "Active Session"

            return (
              <Card 
                key={session.session_id} 
                className="p-5 rounded-2xl border-slate-200 hover:border-slate-300 shadow-sm bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row gap-5 justify-between lg:items-center">
                  
                  {/* Left: User Info + Details */}
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden shrink-0 border border-slate-200">
                      {session.profile_photo ? (
                        <img src={session.profile_photo} alt={session.user_name} className="w-full h-full object-cover" />
                      ) : (
                        session.user_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-950 text-base">{session.user_name}</h4>
                        <span className="px-2 py-0.5 bg-blue-50 text-[#0066FF] text-[9px] font-bold rounded-md uppercase border border-blue-100">
                          {session.department || 'Operations'}
                        </span>
                        {!session.logout_time && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-md uppercase border border-emerald-100 animate-pulse">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mt-1 flex-wrap">
                        <span>{session.designation}</span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                          <span>{formattedLoginTime}</span>
                          <span>→</span>
                          <span>{formattedLogoutTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions and Report Status */}
                  <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
                    


                    {session.report_submitted ? (
                      <button
                        onClick={() => handleOpenReport(session)}
                        className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Report</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 italic px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                        No report submitted
                      </span>
                    )}
                  </div>

                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Detailed Report Modal */}
      <AnimatePresence>
        {isModalOpen && selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 overflow-hidden z-10 max-h-[85vh] flex flex-col my-8"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">{selectedReport.user_name} Report</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {selectedReport.designation} • {selectedReport.department}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin text-xs text-slate-700">
                
                {/* Stats Row */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl grid grid-cols-2 gap-3 font-semibold text-slate-500">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">In</span>
                    <span className="text-slate-800 font-mono mt-0.5 block">
                      {new Date(selectedReport.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Out</span>
                    <span className="text-slate-800 font-mono mt-0.5 block">
                      {selectedReport.logout_time ? new Date(selectedReport.logout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : "Active"}
                    </span>
                  </div>
                </div>

                {/* Work Summary */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Summary</span>
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedReport.summary}
                  </div>
                </div>

                {/* Grid for Completed & Pending */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tasks Completed</span>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap min-h-[60px] leading-relaxed">
                      {selectedReport.completed_tasks || <span className="italic text-slate-300">None reported</span>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Tasks</span>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap min-h-[60px] leading-relaxed">
                      {selectedReport.pending_tasks || <span className="italic text-slate-300">None reported</span>}
                    </div>
                  </div>
                </div>

                {/* Blockers & Time Spent */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Challenges / Blockers</span>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap min-h-[60px] leading-relaxed">
                      {selectedReport.blockers || <span className="italic text-slate-300">None reported</span>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Spent Notes</span>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap min-h-[60px] leading-relaxed">
                      {selectedReport.time_spent_notes || <span className="italic text-slate-300">None reported</span>}
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                {selectedReport.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Additional Notes</span>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedReport.notes}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attached Deliverables</span>
                    <div className="space-y-2">
                      {selectedReport.attachments.map((fileObj: any, idx: number) => (
                        <div 
                          key={idx}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileCheck className="w-5 h-5 text-[#0066FF] shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-700 truncate max-w-[220px]">{fileObj.name}</p>
                              <span className="text-[9px] text-slate-400 font-semibold block uppercase">
                                Type: {fileObj.type?.split('/').pop()?.toUpperCase() || 'Unknown'} • {(fileObj.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                          </div>
                          <a 
                            href={fileObj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-[#0066FF] hover:text-[#0052CC] transition-colors shrink-0"
                          >
                            <DownloadCloud className="w-4 h-4" />
                            <span>Download</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
