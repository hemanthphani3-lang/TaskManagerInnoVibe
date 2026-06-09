"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Users, 
  Building2, 
  Calendar, 
  Phone, 
  Search, 
  Filter, 
  Plus, 
  Shield, 
  UserCheck, 
  AlertTriangle,
  Mail,
  User,
  Activity,
  CheckCircle,
  FileText
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { ResetPasswordButton } from "@/components/settings/ResetPasswordButton"
import { DeleteEmployeeButton } from "@/components/admin/DeleteEmployeeButton"

interface WorkforceMember {
  id: string
  name: string
  code: string
  email: string
  phone: string
  department: string
  roleName: string
  userType: 'Employee' | 'Department Head'
  profileCompletion: number
  status: 'Active' | 'Inactive' | 'Locked' | string
  joiningDate: string
  onboardingCompleted: boolean
}

interface WorkforceDirectoryProps {
  initialWorkforce: WorkforceMember[]
  departmentsList: string[]
}

export function WorkforceDirectory({ initialWorkforce, departmentsList }: WorkforceDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterUserType, setFilterUserType] = useState<"ALL" | "Employee" | "Department Head">("ALL")
  const [filterDepartment, setFilterDepartment] = useState<"ALL" | string>("ALL")
  const [filterProfileStatus, setFilterProfileStatus] = useState<"ALL" | "COMPLETED" | "INCOMPLETE">("ALL")

  // Filtered Workforce list
  const filteredWorkforce = useMemo(() => {
    return initialWorkforce.filter(member => {
      // 1. Search Query Match
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        member.name.toLowerCase().includes(searchLower) ||
        member.code.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.department.toLowerCase().includes(searchLower) ||
        member.roleName.toLowerCase().includes(searchLower)

      if (!matchesSearch) return false

      // 2. User Type Match
      if (filterUserType !== "ALL" && member.userType !== filterUserType) {
        return false
      }

      // 3. Department Match
      if (filterDepartment !== "ALL" && member.department !== filterDepartment) {
        return false
      }

      // 4. Profile Status Match
      if (filterProfileStatus !== "ALL") {
        const isCompleted = member.profileCompletion === 100
        if (filterProfileStatus === "COMPLETED" && !isCompleted) return false
        if (filterProfileStatus === "INCOMPLETE" && isCompleted) return false
      }

      return true
    })
  }, [initialWorkforce, searchQuery, filterUserType, filterDepartment, filterProfileStatus])

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const total = initialWorkforce.length
    const employees = initialWorkforce.filter(m => m.userType === "Employee").length
    const departmentHeads = initialWorkforce.filter(m => m.userType === "Department Head").length
    const completed = initialWorkforce.filter(m => m.profileCompletion === 100).length
    const pending = total - completed

    return {
      total,
      employees,
      departmentHeads,
      completed,
      pending
    }
  }, [initialWorkforce])

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-250/30'
    if (s === 'locked') return 'bg-amber-50 text-amber-700 border-amber-250/30'
    return 'bg-rose-50 text-rose-700 border-rose-250/30' // Inactive / others
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Workforce */}
        <Card className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white">
          <div className="w-12 h-12 bg-blue-50 text-[#0066FF] rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Workforce</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.total}</h3>
          </div>
        </Card>

        {/* Employees */}
        <Card className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employees</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.employees}</h3>
          </div>
        </Card>

        {/* Department Heads */}
        <Card className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dept Heads</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.departmentHeads}</h3>
          </div>
        </Card>

        {/* Profiles Completed */}
        <Card className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profiles Completed</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.completed}</h3>
          </div>
        </Card>

        {/* Profiles Pending */}
        <Card className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profiles Pending</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.pending}</h3>
          </div>
        </Card>
      </div>

      {/* Control Panel: Search & Filters */}
      <Card className="p-5 rounded-2xl border-slate-200 shadow-sm bg-white">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Dynamic Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by name, employee ID, email, department, role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition duration-150"
            />
          </div>

          {/* Filter Dropdowns Group */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            
            {/* User Type Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[150px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Type</span>
              <select
                value={filterUserType}
                onChange={e => setFilterUserType(e.target.value as any)}
                className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="Employee">Employee</option>
                <option value="Department Head">Dept Head</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[170px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dept</span>
              <select
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL">All Depts</option>
                {departmentsList.map((deptName) => (
                  <option key={deptName} value={deptName}>
                    {deptName}
                  </option>
                ))}
              </select>
            </div>

            {/* Profile Status Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[160px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
              <select
                value={filterProfileStatus}
                onChange={e => setFilterProfileStatus(e.target.value as any)}
                className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL">All Profiles</option>
                <option value="COMPLETED">Completed</option>
                <option value="INCOMPLETE">Incomplete</option>
              </select>
            </div>

          </div>
        </div>
      </Card>

      {/* Directory Table Grid Card */}
      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Workforce Member</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">User Type</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Account Status</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Profile Status</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Joined Date</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkforce.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-semibold">
                    No workforce members matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredWorkforce.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Member profile info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border ${
                          member.userType === "Department Head"
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                            : "bg-emerald-50 border-emerald-200 text-emerald-600"
                        }`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{member.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{member.code}</div>
                        </div>
                      </div>
                    </td>

                    {/* User Type Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-sm ${
                        member.userType === "Department Head"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      }`}>
                        {member.userType}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/40 text-slate-700 text-xs font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {member.department}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700 text-xs">{member.roleName}</span>
                    </td>

                    {/* Account Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(member.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 shrink-0" />
                        {member.status}
                      </span>
                    </td>

                    {/* Profile Completion tracking */}
                    <td className="px-6 py-4">
                      {(() => {
                        const percentage = member.profileCompletion
                        const getProgressColor = () => {
                          if (percentage < 40) return 'bg-red-500'
                          if (percentage < 70) return 'bg-amber-500'
                          return 'bg-emerald-500'
                        }
                        const getTextColor = () => {
                          if (percentage < 40) return 'text-red-600 bg-red-50'
                          if (percentage < 70) return 'text-amber-600 bg-amber-50'
                          return 'text-emerald-600 bg-emerald-50'
                        }
                        return (
                          <div className="space-y-1.5 w-32">
                            <div className="flex justify-between items-center text-xs">
                              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${getTextColor()}`}>
                                {percentage}%
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {percentage === 100 ? 'Done' : percentage >= 70 ? 'Ready' : 'Locked'}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })()}
                    </td>

                    {/* Contact Details */}
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {member.email}
                      </div>
                      {member.phone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {member.phone}
                        </div>
                      )}
                    </td>

                    {/* Joining Date */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {member.joiningDate ? new Date(member.joiningDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link 
                          href={`/admin/employees/${member.id}`}
                          className="inline-flex items-center gap-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-[#0066FF] px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:border-blue-200 transition-all active:scale-95 shadow-sm"
                        >
                          View Profile
                        </Link>
                        <ResetPasswordButton userId={member.id} userName={member.name} />
                        {member.userType === "Employee" && (
                          <DeleteEmployeeButton userId={member.id} userName={member.name} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
