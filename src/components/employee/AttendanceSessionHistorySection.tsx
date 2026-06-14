"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Clock, Calendar, FileText, DownloadCloud, X, Eye, FileCheck, Loader2 } from "lucide-react"

interface AttendanceSessionHistorySectionProps {
  employeeId: string
}

export function AttendanceSessionHistorySection({ employeeId }: AttendanceSessionHistorySectionProps) {
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function loadSessions() {
      if (!employeeId) return
      setLoading(true)
      const { data, error } = await supabase
        .from('work_sessions')
        .select(`
          *,
          logout_reports:logout_reports!logout_reports_session_id_fkey (*)
        `)
        .eq('user_id', employeeId)
        .order('login_time', { ascending: false })
      
      if (data) setSessions(data)
      setLoading(false)
    }

    loadSessions()
  }, [employeeId])

  const handleOpenReport = (session: any) => {
    const report = Array.isArray(session.logout_reports) 
      ? (session.logout_reports[0] || null)
      : (session.logout_reports || null)
    
    const fallbackReport = {
      summary: "No detailed work report was submitted.",
      completed_tasks: "",
      pending_tasks: "",
      blockers: "",
      time_spent_notes: "",
      notes: "System-generated or auto-closed session report.",
      attachments: []
    }

    const reportData = report || fallbackReport

    setSelectedReport({
      ...reportData,
      user_name: session.user_name,
      department: session.department,
      duration: session.duration,
      login_time: session.login_time,
      logout_time: session.logout_time
    })
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="text-xs text-slate-500 font-semibold ml-2">Loading shift history...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-6">
      <h2 className="text-lg font-black text-[#0A1A2F] border-b border-slate-100 pb-3 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" />
        Attendance & Session History
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Calendar className="w-10 h-10 text-slate-350 mx-auto mb-3" />
          <p className="text-xs font-semibold">No attendance shifts recorded for this employee.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
          {sessions.map((session) => {
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
              : "Active"

            return (
              <div 
                key={session.session_id}
                className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{formattedDate}</span>
                    {!session.logout_time && session.status === 'ACTIVE' && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-bold rounded uppercase border border-emerald-100 animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-slate-450 mt-1 font-semibold">
                    <span>IN: {formattedLoginTime}</span>
                    <span>•</span>
                    <span>OUT: {formattedLogoutTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {session.report_submitted ? (
                    <button
                      onClick={() => handleOpenReport(session)}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-650 hover:text-blue-600 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-2 py-1 rounded">
                      No Report
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal viewer */}
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
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 overflow-hidden z-10 max-h-[85vh] flex flex-col my-8 text-xs text-slate-700"
            >
              <div className="flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">{selectedReport.user_name} Report</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{selectedReport.department}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin">
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

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Summary</span>
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedReport.summary}
                  </div>
                </div>

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

                {selectedReport.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Additional Notes</span>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedReport.notes}
                    </div>
                  </div>
                )}

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
