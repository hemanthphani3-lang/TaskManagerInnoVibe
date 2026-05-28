export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, FileText, DownloadCloud, Users, Calendar } from "lucide-react"

export default async function AdminLogoutReportsPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
  if (!user) redirect('/login')

  // Verify user is an Admin
  const { data: adminCheck } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!adminCheck) redirect('/login')

  // Fetch all logout reports company-wide
  const { data: reports } = await supabase
    .from('logout_requests')
    .select(`
      *,
      employees ( employee_name, designation, departments!department_id(department_name) ),
      work_submissions ( work_comment, attachment_url, attachment_type )
    `)
    .order('logout_request_time', { ascending: false })

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader 
          title="Company Logout Reports" 
          description="Global administrative review of all employee logout reports, summaries, and deliverables."
        />

        <div className="mt-8 space-y-6">
          {reports?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No reports found</h3>
              <p className="text-slate-500 mt-1">No logout reports have been submitted yet.</p>
            </div>
          ) : (
            reports?.map((req) => {
              const submission = req.work_submissions?.[0]
              const requestDate = new Date(req.logout_request_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
              const requestTime = new Date(req.logout_request_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })

              return (
                <Card key={req.id} className="p-6 rounded-2xl border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{req.employees?.employee_name}</h3>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase">
                          {(req.employees?.departments as any)?.department_name || 'Operations'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${req.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : req.approval_status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {req.approval_status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mb-4">
                        <span>{req.employees?.designation}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Reported on {requestDate} at {requestTime}
                        </span>
                      </div>

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
