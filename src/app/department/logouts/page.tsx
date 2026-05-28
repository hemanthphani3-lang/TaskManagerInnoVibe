export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, FileText, DownloadCloud } from "lucide-react"
import { approveLogout, rejectLogout } from "@/app/actions/logout"

export default async function LogoutApprovalsPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
  if (!user) redirect('/login')

  // Fetch all logout reports for this department
  const { data: allReports } = await supabase
    .from('logout_requests')
    .select(`
      *,
      employees ( employee_name, designation ),
      work_submissions ( work_comment, attachment_url, attachment_type )
    `)
    .eq('department_id', user.id)
    .order('logout_request_time', { ascending: false })

  const pendingReports = allReports?.filter(r => r.approval_status === 'PENDING') || []
  const pastReports = allReports?.filter(r => r.approval_status !== 'PENDING') || []

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader 
          title="Pending Logout Reports" 
          description="Review submitted daily work reports, timestamps, and files to approve employee logouts."
        />

        {/* Action Required: Pending Reports */}
        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>Action Required</span>
            {pendingReports.length > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {pendingReports.length}
              </span>
            )}
          </h3>

          {pendingReports.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">All caught up!</h4>
              <p className="text-xs text-slate-500 mt-1">No pending logout reports needing review.</p>
            </div>
          ) : (
            pendingReports.map((req) => {
              const submission = req.work_submissions?.[0]
              const requestDate = new Date(req.logout_request_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
              const requestTime = new Date(req.logout_request_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })

              return (
                <Card key={req.id} className="p-6 rounded-2xl border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{req.employees?.employee_name}</h3>
                        <span className="px-3 py-1 bg-blue-50 text-[#0066FF] text-xs font-bold rounded-full">
                          Reported on {requestDate} at {requestTime}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-500 mb-4">{req.employees?.designation}</p>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Summary Report</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {submission?.work_comment || <span className="italic text-slate-400">No comment provided.</span>}
                        </p>
                        
                        {submission?.attachment_url && (
                          <div className="mt-4 pt-4 border-t border-slate-200/60">
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Attached Deliverables</h5>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs max-w-md shadow-sm">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-5 h-5 text-[#0066FF] shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-700 truncate">
                                    {submission.attachment_type === 'PDF' ? 'Daily_Report.pdf' : 'Attachment_File'}
                                  </p>
                                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Type: {submission.attachment_type || 'Unknown'}</span>
                                </div>
                              </div>
                              <a 
                                href={submission.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-bold text-[#0066FF] hover:text-[#0052CC] transition-colors"
                              >
                                <DownloadCloud className="w-4.5 h-4.5" />
                                View / Download
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-48 shrink-0">
                      <form action={async () => { "use server"; await approveLogout(req.id); }} className="w-full">
                        <button className="w-full flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-3 rounded-xl font-bold shadow-sm transition-all active:scale-[0.98]">
                          <CheckCircle2 className="w-5 h-5" />
                          Approve
                        </button>
                      </form>
                      
                      <form action={async (formData) => {
                        "use server"
                        const reason = formData.get('reason') as string
                        await rejectLogout(req.id, reason)
                      }} className="w-full flex flex-col gap-2">
                        <input 
                          type="text" 
                          name="reason" 
                          placeholder="Rejection reason..." 
                          required 
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                        />
                        <button className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold transition-all border border-red-100 active:scale-[0.98]">
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      </form>
                    </div>

                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* History: Processed Reports */}
        <div className="mt-12 space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3">
            Processed Reports History
          </h3>

          {pastReports.length === 0 ? (
            <p className="text-slate-400 text-xs font-semibold text-center py-6">No processed logout reports in history.</p>
          ) : (
            pastReports.map((req) => {
              const submission = req.work_submissions?.[0]
              const requestDate = new Date(req.logout_request_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
              const requestTime = new Date(req.logout_request_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })

              return (
                <Card key={req.id} className="p-5 rounded-2xl border-slate-150 shadow-sm bg-white/80 hover:shadow-md transition-all">
                  <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-800">{req.employees?.employee_name}</h4>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded">
                          {requestDate} at {requestTime}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${req.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                          {req.approval_status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mb-3">{req.employees?.designation}</p>

                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Submitted Summary</h5>
                        <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-wrap">
                          {submission?.work_comment || <span className="italic text-slate-400">No comment provided.</span>}
                        </p>
                        
                        {req.rejection_reason && (
                          <p className="text-xs text-red-600 font-semibold mt-2 pt-2 border-t border-slate-200/40">
                            Rejection Reason: {req.rejection_reason}
                          </p>
                        )}

                        {submission?.attachment_url && (
                          <div className="mt-3 pt-3 border-t border-slate-200/40 flex items-center justify-between gap-3 text-[11px] max-w-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="font-bold text-slate-600 truncate">
                                {submission.attachment_type === 'PDF' ? 'Daily_Report.pdf' : 'Attachment_File'}
                              </span>
                            </div>
                            <a 
                              href={submission.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#0066FF] hover:underline shrink-0"
                            >
                              View / Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </Card>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}


