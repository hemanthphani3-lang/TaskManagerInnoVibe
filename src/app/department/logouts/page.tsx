export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Card } from "@/components/ui/card"
import { FileText, DownloadCloud, Clock } from "lucide-react"

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

  const reports = allReports || []

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader 
          title="Employee Daily Work Reports" 
          description="View submitted daily work reports, working hours, and deliverables from your department team."
        />

        {/* History: Processed Reports */}
        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>Work Reports Log</span>
            {reports.length > 0 && (
              <span className="px-2.5 py-0.5 bg-blue-100 text-[#0066FF] text-xs font-bold rounded-full">
                {reports.length}
              </span>
            )}
          </h3>

          {reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">No reports yet</h4>
              <p className="text-xs text-slate-500 mt-1">Daily logout reports submitted by your team will appear here.</p>
            </div>
          ) : (
            reports.map((req) => {
              const submission = req.work_submissions?.[0]
              const requestDate = new Date(req.logout_request_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
              const requestTime = new Date(req.logout_request_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })

              return (
                <Card key={req.id} className="p-6 rounded-2xl border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{req.employees?.employee_name}</h3>
                        <span className="px-3 py-1 bg-blue-50 text-[#0066FF] text-xs font-bold rounded-full">
                          Logged out on {requestDate} at {requestTime}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mb-4">
                        <span>{req.employees?.designation}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Hours Logged: {req.total_working_hours || "N/A"}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Daily Progress Summary</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {submission?.work_comment || <span className="italic text-slate-400">No summary comment provided.</span>}
                        </p>
                        
                        {submission?.attachment_url && (
                          <div className="mt-4 pt-4 border-t border-slate-200/60">
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Attached Deliverables</h5>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs max-w-md shadow-sm">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-5 h-5 text-[#0066FF] shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-700 truncate">
                                    {submission.attachment_type?.includes('pdf') || submission.attachment_type === 'PDF' ? 'Daily_Report.pdf' : 'Attachment_File'}
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
