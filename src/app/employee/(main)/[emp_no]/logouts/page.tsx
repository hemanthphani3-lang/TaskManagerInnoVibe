export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Card } from "@/components/ui/card"
import { FileText, DownloadCloud, CheckCircle2, XCircle, Clock, Calendar, AlertCircle } from "lucide-react"

export default async function EmployeeLogoutReportsPage({ params }: { params: Promise<{ emp_no: string }> }) {
  const { emp_no } = await params
  const supabase = await createClient()
  
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect('/login')

  // Fetch employee details to verify
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!employee || employee.employee_code !== emp_no) {
    redirect(`/employee/${employee?.employee_code || 'dashboard'}/logouts`)
  }

  // Fetch employee's full history of logout reports
  const { data: reports } = await supabase
    .from('logout_requests')
    .select(`
      *,
      work_submissions ( work_comment, attachment_url, attachment_type )
    `)
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  // Calculate statistics
  const totalSubmissions = reports?.length || 0
  const approvedSubmissions = reports?.filter(r => r.approval_status === 'APPROVED').length || 0
  const pendingSubmissions = reports?.filter(r => r.approval_status === 'PENDING').length || 0
  const rejectedSubmissions = reports?.filter(r => r.approval_status === 'REJECTED').length || 0

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <PageHeader 
          title="My Logout Reports" 
          description="Review your past daily work reports, timestamps, attachments, and manager approval statuses."
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">Total Reports</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{totalSubmissions}</span>
          </Card>
          <Card className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-emerald-500 uppercase block tracking-wider">Approved</span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">{approvedSubmissions}</span>
          </Card>
          <Card className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-amber-500 uppercase block tracking-wider">Pending</span>
            <span className="text-2xl font-black text-amber-600 block mt-1">{pendingSubmissions}</span>
          </Card>
          <Card className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-red-500 uppercase block tracking-wider">Rejected</span>
            <span className="text-2xl font-black text-red-600 block mt-1">{rejectedSubmissions}</span>
          </Card>
        </div>

        {/* Reports List */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>Report History</span>
          </h3>

          {reports?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No reports found</h3>
              <p className="text-slate-500 mt-1">You haven&apos;t submitted any logout reports yet.</p>
            </div>
          ) : (
            reports?.map((req) => {
              const submission = req.work_submissions?.[0]
              const requestDate = new Date(req.logout_request_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
              const requestTime = new Date(req.logout_request_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })

              return (
                <Card key={req.id} className="p-6 rounded-2xl border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    
                    <div className="flex-1 min-w-0 w-full">
                      {/* Meta Header */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900">
                          Daily Report for {requestDate}
                        </h4>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase">
                          {requestTime}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${req.approval_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : req.approval_status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {req.approval_status}
                        </span>
                      </div>

                      {/* Working Hours Info */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Working Hours logged: {req.total_working_hours || "Pending Approval"}
                        </span>
                      </div>

                      {/* Submitted Work details */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">My Work Summary</h5>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {submission?.work_comment || <span className="italic text-slate-400">No comment was provided.</span>}
                        </p>
                        
                        {req.rejection_reason && (
                          <div className="mt-4 pt-4 border-t border-red-100 bg-red-50/50 p-3 rounded-lg flex gap-2 items-start text-xs text-red-700 font-semibold">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                            <div>
                              <span className="font-bold block uppercase text-[10px] tracking-wider text-red-500 mb-1">Rejection Reason</span>
                              <p className="leading-relaxed font-medium">{req.rejection_reason}</p>
                            </div>
                          </div>
                        )}

                        {submission?.attachment_url && (
                          <div className="mt-4 pt-4 border-t border-slate-200/60">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Attached Deliverables</h5>
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
