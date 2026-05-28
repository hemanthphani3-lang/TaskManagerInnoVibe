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

  const { data: requests } = await supabase
    .from('logout_requests')
    .select(`
      *,
      employees ( employee_name, designation ),
      work_submissions ( work_comment, attachment_url, attachment_type )
    `)
    .eq('department_id', user.id)
    .eq('approval_status', 'PENDING')
    .order('logout_request_time', { ascending: false })

  return (
    <div className="p-4 sm:p-8">
      <PageHeader 
        title="Pending Logout Requests" 
        description="Review work submissions and approve employee sign-outs."
      />

      <div className="mt-8 space-y-6">
        {requests?.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">All clear!</h3>
            <p className="text-slate-500 mt-1">No pending logout requests.</p>
          </div>
        ) : (
          requests?.map((req) => {
            const submission = req.work_submissions?.[0]
            const requestTime = new Date(req.logout_request_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })

            return (
              <Card key={req.id} className="p-6 rounded-2xl border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                  
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{req.employees?.employee_name}</h3>
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                        Requested at {requestTime}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-4">{req.employees?.designation}</p>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Submission</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {submission?.work_comment || <span className="italic text-slate-400">No comment provided.</span>}
                      </p>
                      
                      {submission?.attachment_url && (
                        <a 
                          href={submission.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-[#0066FF] bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                        >
                          <DownloadCloud className="w-4 h-4" />
                          View Attached Work File
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-48">
                    <form action={async () => { "use server"; await approveLogout(req.id); }} className="w-full">
                      <button className="w-full flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-3 rounded-xl font-bold shadow-sm transition-all">
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
                      <button className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold transition-all border border-red-100">
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
    </div>
  )
}
