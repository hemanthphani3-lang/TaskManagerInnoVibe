"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Edit, 
  Lock 
} from "lucide-react"
import { AttendanceSessionHistorySection } from "@/components/employee/AttendanceSessionHistorySection"
import { EditEmployeeModal } from "./EditEmployeeModal"
import { DeptResetPasswordModal } from "./DeptResetPasswordModal"

interface EmployeeDetailsViewProps {
  employee: any
  approvedLeaves: any[]
  totalLeavesApproved: number
}

export function EmployeeDetailsView({ employee, approvedLeaves, totalLeavesApproved }: EmployeeDetailsViewProps) {
  const router = useRouter()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Back link & Top buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          href="/department/employees" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-[#0066FF]/10 transition active:scale-95"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Employee
          </button>
          
          <button
            onClick={() => setIsResetOpen(true)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 transition active:scale-95"
          >
            <Lock className="w-3.5 h-3.5 text-slate-450" />
            Reset Password
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
            {employee.profile_photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={employee.profile_photo} 
                alt={employee.employee_name} 
                className="w-32 h-32 mx-auto rounded-full object-cover ring-4 ring-slate-50 mb-4" 
              />
            ) : (
              <div className="w-32 h-32 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-4xl ring-4 ring-slate-50 mb-4">
                {employee.employee_name.charAt(0)}
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-900">{employee.employee_name}</h2>
            <p className="text-slate-500 font-medium mb-4">{employee.designation}</p>
            <div className="flex flex-col items-center gap-2">
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide border ${
                employee.account_status === 'Active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : employee.account_status === 'Locked'
                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {employee.account_status || 'Active'}
              </span>
              
              {/* Profile completion tracking */}
              <div className="w-full max-w-[180px] bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-2 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-450">
                  <span>Profile Completion</span>
                  <span className="text-slate-750">{employee.profile_completion_percentage ?? 0}%</span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${employee.profile_completion_percentage ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 mb-2">Contact Info</h3>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{employee.employee_email}</span>
            </div>
            {employee.phone_number && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{employee.phone_number}</span>
              </div>
            )}
            {employee.alternate_phone && (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-xs">Alt: {employee.alternate_phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Code: <strong className="text-slate-900">{employee.employee_code}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Joined: <strong className="text-slate-900">{new Date(employee.joining_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong></span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Total Approved Leaves</h3>
              <p className="text-sm text-slate-500">Number of leave requests approved historically.</p>
            </div>
            <div className="text-4xl font-black text-[#0066FF] bg-blue-50 px-6 py-4 rounded-xl">
              {totalLeavesApproved}
            </div>
          </div>

          {/* Attendance & Session History */}
          <AttendanceSessionHistorySection employeeId={employee.id} />

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Approved Leave History</h3>
            
            <div className="space-y-4">
              {approvedLeaves && approvedLeaves.length > 0 ? (
                approvedLeaves.map(leave => (
                  <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-[#0066FF]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{leave.leave_type.replace('_', ' ')}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Clock className="w-4 h-4" />
                          <span>{leave.start_date} to {leave.end_date}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          <span className="font-semibold">Reason:</span> {leave.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p>No approved leaves found for this employee.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Edit Employee Modal */}
      {isEditOpen && (
        <EditEmployeeModal 
          employee={employee}
          onClose={() => setIsEditOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Reset Password Modal */}
      {isResetOpen && (
        <DeptResetPasswordModal 
          userId={employee.id}
          userName={employee.employee_name}
          onClose={() => setIsResetOpen(false)}
        />
      )}
    </div>
  )
}
