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
  FileText,
  MoreVertical,
  KeyRound,
  Lock,
  Unlock,
  Eye
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { ResetPasswordButton } from "@/components/settings/ResetPasswordButton"
import { DeleteEmployeeButton } from "@/components/admin/DeleteEmployeeButton"
import { ProductivityBadge } from "@/components/productivity/ProductivityBadge"
import { updateEmployeeStatus, promoteToDepartmentHead, demoteFromDepartmentHead } from "@/app/actions/auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdminResetPasswordModal } from "@/components/settings/AdminResetPasswordModal"
import { createClient } from "@/lib/supabase/client"

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
  productivityScore?: number
  attendanceRate?: number
  originalHeadId?: string
  lastSavedAt?: string
  createdAt?: string
}

interface WorkforceDirectoryProps {
  initialWorkforce: WorkforceMember[]
  departmentsList: string[]
}

export function WorkforceDirectory({ initialWorkforce, departmentsList }: WorkforceDirectoryProps) {
  const router = useRouter()
  const [workforce, setWorkforce] = useState<WorkforceMember[]>(initialWorkforce)
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [selectedCardPopup, setSelectedCardPopup] = useState<"TOTAL" | "ACTIVE" | "ONLINE" | "DEPT_HEADS" | "INACTIVE" | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterUserType, setFilterUserType] = useState<"ALL" | "Employee" | "Department Head">("ALL")
  const [filterDepartment, setFilterDepartment] = useState<"ALL" | string>("ALL")
  const [filterProfileStatus, setFilterProfileStatus] = useState<"ALL" | "COMPLETED" | "INCOMPLETE">("ALL")
  const [filterAccountStatus, setFilterAccountStatus] = useState<"ALL" | "Active" | "Inactive">("ALL")
  const [sortBy, setSortBy] = useState<"name" | "score-desc" | "attendance-desc">("name")

  // Dropdown / Action modal states
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
  const [resetPasswordMember, setResetPasswordMember] = useState<{ id: string; name: string } | null>(null)
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    memberId: string
    name: string
    targetStatus: 'ACTIVE' | 'INACTIVE'
  } | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Promotion and Demotion states
  const [promotingMember, setPromotingMember] = useState<WorkforceMember | null>(null)
  const [selectedPromoDeptId, setSelectedPromoDeptId] = useState<string>("")
  const [availableDepts, setAvailableDepts] = useState<{ id: string; department_name: string }[]>([])
  const [demotingMember, setDemotingMember] = useState<WorkforceMember | null>(null)
  const [isPromotingOrDemoting, setIsPromotingOrDemoting] = useState<boolean>(false)

  const fetchFreshWorkforce = async () => {
    const supabase = createClient()
    
    // Fetch employees
    const { data: employees } = await supabase
      .from("employees")
      .select("*, departments!department_id(department_name)")
      .order("created_at", { ascending: false })

    // Fetch departments (representing department heads)
    const { data: departments } = await supabase
      .from("departments")
      .select("*")
      .order("created_at", { ascending: false })

    // Fetch productivity scores and attendance
    const [
      { data: productivityScores },
      { data: attendance }
    ] = await Promise.all([
      supabase.from("productivity_scores").select("employee_id, productivity_score"),
      supabase.from("attendance").select("employee_id, attendance_status")
    ])

    const freshWorkforce: WorkforceMember[] = []

    if (employees) {
      employees.forEach((emp) => {
        if (emp.designation === 'Department Head') return
        if (departments?.some(d => d.id === emp.id)) return

        const score = productivityScores?.find(s => s.employee_id === emp.id)?.productivity_score ?? 0
        const attLogs = attendance?.filter(a => a.employee_id === emp.id) || []
        const presentLogs = attLogs.filter(a => ["PRESENT", "LATE", "HALF_DAY"].includes(a.attendance_status)).length
        const attendanceRate = attLogs.length > 0 ? Math.round((presentLogs / attLogs.length) * 100) : 85

        freshWorkforce.push({
          id: emp.id,
          name: emp.employee_name || "Unknown Employee",
          code: emp.employee_code || "EMP-N/A",
          email: emp.employee_email,
          phone: emp.phone_number || "",
          department: emp.departments?.department_name || "Unassigned",
          roleName: emp.designation || "Employee",
          userType: "Employee",
          profileCompletion: emp.profile_completion_percentage ?? 0,
          status: emp.account_status || "Active",
          joiningDate: emp.joining_date,
          onboardingCompleted: !!emp.onboarding_completed,
          productivityScore: score,
          attendanceRate: attendanceRate,
          originalHeadId: undefined,
          lastSavedAt: emp.last_saved_at || emp.created_at,
          createdAt: emp.created_at
        })
      })
    }

    if (departments) {
      departments.forEach((dept) => {
        const score = productivityScores?.find(s => s.employee_id === dept.id)?.productivity_score ?? 0
        const attLogs = attendance?.filter(a => a.employee_id === dept.id) || []
        const presentLogs = attLogs.filter(a => ["PRESENT", "LATE", "HALF_DAY"].includes(a.attendance_status)).length
        const attendanceRate = attLogs.length > 0 ? Math.round((presentLogs / attLogs.length) * 100) : 85

        freshWorkforce.push({
          id: dept.id,
          name: dept.department_head_name || "Unassigned Dept Head",
          code: dept.department_code || "DEPT-N/A",
          email: dept.department_email,
          phone: dept.phone_number || "",
          department: dept.department_name || "Department",
          roleName: dept.leadership_role || "Department Head",
          userType: "Department Head",
          profileCompletion: dept.profile_completion_percentage ?? 0,
          status: dept.status || "Active",
          joiningDate: dept.joining_date || dept.created_at,
          onboardingCompleted: !!dept.onboarding_completed,
          productivityScore: score,
          attendanceRate: attendanceRate,
          originalHeadId: dept.original_head_id || dept.id,
          lastSavedAt: dept.last_saved_at || dept.created_at,
          createdAt: dept.created_at
        })
      })
    }

    freshWorkforce.sort((a, b) => a.name.localeCompare(b.name))
    setWorkforce(freshWorkforce)
  }

  const fetchActiveSessions = async (supabaseClient: any) => {
    const { data } = await supabaseClient
      .from('work_sessions')
      .select('*')
      .eq('status', 'ACTIVE')
      .is('logout_time', null)
    if (data) {
      setActiveSessions(data)
    }
  }

  // Subscribe to real-time events to ensure summary cards and directory are always in sync
  React.useEffect(() => {
    const supabase = createClient()
    fetchActiveSessions(supabase)

    const empSub = supabase
      .channel('realtime_directory_employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchFreshWorkforce()
      })
      .subscribe()

    const deptSub = supabase
      .channel('realtime_directory_departments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
        fetchFreshWorkforce()
      })
      .subscribe()

    const sessionSub = supabase
      .channel('realtime_directory_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_sessions' }, () => {
        fetchActiveSessions(supabase)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(empSub)
      supabase.removeChannel(deptSub)
      supabase.removeChannel(sessionSub)
    }
  }, [])

  React.useEffect(() => {
    if (promotingMember) {
      const supabaseClient = createClient()
      supabaseClient
        .from('departments')
        .select('id, department_name')
        .eq('status', 'ACTIVE')
        .then(({ data }) => {
          if (data) setAvailableDepts(data)
        })
    } else {
      setAvailableDepts([])
      setSelectedPromoDeptId("")
    }
  }, [promotingMember])

  const handlePromote = async () => {
    if (!promotingMember || !selectedPromoDeptId) return
    setIsPromotingOrDemoting(true)
    try {
      const res = await promoteToDepartmentHead(promotingMember.id, selectedPromoDeptId)
      if (res.success) {
        toast.success(`Successfully promoted ${promotingMember.name} to Department Head`)
        router.refresh()
        setTimeout(() => {
          window.location.reload()
        }, 150)
        setPromotingMember(null)
      } else {
        toast.error(res.error || "Failed to promote employee")
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during promotion")
    } finally {
      setIsPromotingOrDemoting(false)
    }
  }

  const handleDemote = async () => {
    if (!demotingMember) return
    setIsPromotingOrDemoting(true)
    try {
      const res = await demoteFromDepartmentHead(demotingMember.id)
      if (res.success) {
        toast.success(`Successfully removed Department Head role from ${demotingMember.name}`)
        router.refresh()
        setTimeout(() => {
          window.location.reload()
        }, 150)
        setDemotingMember(null)
      } else {
        toast.error(res.error || "Failed to demote department head")
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred during demotion")
    } finally {
      setIsPromotingOrDemoting(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!confirmStatusModal) return
    setIsUpdatingStatus(true)
    try {
      const res = await updateEmployeeStatus(confirmStatusModal.memberId, confirmStatusModal.targetStatus)
      if (res.success) {
        toast.success(`Employee status updated to ${confirmStatusModal.targetStatus}`)
        router.refresh()
        setTimeout(() => {
          window.location.reload()
        }, 150)
      } else {
        toast.error(res.error || "Failed to update employee status")
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred")
    } finally {
      setIsUpdatingStatus(false)
      setConfirmStatusModal(null)
    }
  }

  // Filtered Workforce list
  const filteredWorkforce = useMemo(() => {
    let result = initialWorkforce.filter(member => {
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

      // 5. Account Status Match
      if (filterAccountStatus !== "ALL") {
        if (filterAccountStatus === "Active" && member.status.toLowerCase() !== "active") return false
        if (filterAccountStatus === "Inactive" && member.status.toLowerCase() !== "inactive") return false
      }

      return true
    })

    // Sorting
    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "score-desc") {
      result.sort((a, b) => (b.productivityScore ?? 0) - (a.productivityScore ?? 0))
    } else if (sortBy === "attendance-desc") {
      result.sort((a, b) => (b.attendanceRate ?? 0) - (a.attendanceRate ?? 0))
    }

    return result
  }, [workforce, searchQuery, filterUserType, filterDepartment, filterProfileStatus, filterAccountStatus, sortBy])

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const totalWorkforce = workforce.length
    const activeWorkforce = workforce.filter(m => m.status.toLowerCase() !== 'inactive').length
    const deptHeads = workforce.filter(m => m.userType === "Department Head" && m.status.toLowerCase() !== 'inactive').length
    const inactiveMembers = workforce.filter(m => m.status.toLowerCase() === 'inactive').length

    // Online Members: active in work_sessions AND account status is active
    const activeUserIds = new Set(activeSessions.map(s => s.user_id))
    const onlineMembers = workforce.filter(m => activeUserIds.has(m.id) && m.status.toLowerCase() !== 'inactive').length

    return {
      totalWorkforce,
      activeWorkforce,
      deptHeads,
      onlineMembers,
      inactiveMembers
    }
  }, [workforce, activeSessions])

  const popupMembersList = useMemo(() => {
    if (!selectedCardPopup) return []
    const activeUserIds = new Set(activeSessions.map(s => s.user_id))
    
    switch (selectedCardPopup) {
      case "TOTAL":
        return workforce
      case "ACTIVE":
        return workforce.filter(m => m.status.toLowerCase() !== 'inactive')
      case "ONLINE":
        return workforce.filter(m => activeUserIds.has(m.id) && m.status.toLowerCase() !== 'inactive')
      case "DEPT_HEADS":
        return workforce.filter(m => m.userType === "Department Head" && m.status.toLowerCase() !== 'inactive')
      case "INACTIVE":
        return workforce.filter(m => m.status.toLowerCase() === 'inactive')
      default:
        return []
    }
  }, [selectedCardPopup, workforce, activeSessions])

  const getMemberStatusInfo = (member: WorkforceMember) => {
    const activeUserIds = new Set(activeSessions.map(s => s.user_id))
    if (member.status.toLowerCase() === 'inactive') {
      return {
        label: 'Inactive',
        badgeClass: 'bg-rose-50 text-rose-705 border-rose-200/50',
        dotClass: 'bg-rose-500'
      }
    }
    if (activeUserIds.has(member.id)) {
      return {
        label: 'Online',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
        dotClass: 'bg-emerald-500 animate-pulse'
      }
    }
    return {
      label: 'Offline',
      badgeClass: 'bg-slate-50 text-slate-500 border-slate-200/60',
      dotClass: 'bg-slate-400'
    }
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Workforce */}
        <Card 
          onClick={() => setSelectedCardPopup("TOTAL")}
          className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-[0.98] transition-all select-none group"
        >
          <div className="w-12 h-12 bg-blue-50 text-[#0066FF] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Workforce</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.totalWorkforce}</h3>
          </div>
        </Card>

        {/* Active Workforce */}
        <Card 
          onClick={() => setSelectedCardPopup("ACTIVE")}
          className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white cursor-pointer hover:border-emerald-300 hover:shadow-md active:scale-[0.98] transition-all select-none group"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workforce</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.activeWorkforce}</h3>
          </div>
        </Card>

        {/* Dept Heads */}
        <Card 
          onClick={() => setSelectedCardPopup("DEPT_HEADS")}
          className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white cursor-pointer hover:border-indigo-300 hover:shadow-md active:scale-[0.98] transition-all select-none group"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dept Heads</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.deptHeads}</h3>
          </div>
        </Card>

        {/* Online Members */}
        <Card 
          onClick={() => setSelectedCardPopup("ONLINE")}
          className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white cursor-pointer hover:border-teal-300 hover:shadow-md active:scale-[0.98] transition-all select-none group"
        >
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Online Members</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.onlineMembers}</h3>
          </div>
        </Card>

        {/* Inactive Members */}
        <Card 
          onClick={() => setSelectedCardPopup("INACTIVE")}
          className="px-5 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white cursor-pointer hover:border-rose-300 hover:shadow-md active:scale-[0.98] transition-all select-none group"
        >
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactive Members</p>
            <h3 className="text-2xl font-black text-slate-900">{metrics.inactiveMembers}</h3>
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

            {/* Account Status Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[160px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account</span>
              <select
                value={filterAccountStatus}
                onChange={e => setFilterAccountStatus(e.target.value as any)}
                className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL">All Accounts</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[160px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sort</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none w-full cursor-pointer"
              >
                <option value="name">Alphabetical</option>
                <option value="score-desc">Productivity (High)</option>
                <option value="attendance-desc">Attendance (High)</option>
              </select>
            </div>

          </div>
        </div>
      </Card>

      {/* Directory Table Grid Card */}
      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-auto max-h-[600px] relative w-full scrollbar-thin min-h-[300px]">
          <table className="w-full text-left border-collapse table-auto min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="sticky top-0 left-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-40 border-b border-slate-100 border-r border-slate-200/40">Workforce Member</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-30 border-b border-slate-100">User Type</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-30 border-b border-slate-100">Department</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-30 border-b border-slate-100">Role</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-30 border-b border-slate-100">Account Status</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center z-30 border-b border-slate-100">Productivity</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center z-30 border-b border-slate-100">Attendance</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-30 border-b border-slate-100">Profile Status</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-30 border-b border-slate-100">Contact</th>
                <th className="sticky top-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-30 border-b border-slate-100">Joined Date</th>
                <th className="sticky top-0 right-0 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right z-40 border-b border-slate-100 border-l border-slate-200/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkforce.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-slate-400 font-semibold">
                    No workforce members matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredWorkforce.map((member) => {
                  const isInactive = member.status.toLowerCase() === 'inactive';
                  return (
                    <tr key={member.id} className={`group hover:bg-slate-50/40 transition-colors ${isInactive ? "opacity-60 bg-slate-50/40 dark:bg-slate-900/40" : ""}`}>
                      {/* Member profile info */}
                      <td className={`sticky left-0 px-6 py-4 z-20 border-r border-slate-100/80 dark:border-slate-800/80 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors ${isInactive ? "bg-slate-100/70 dark:bg-slate-900/70" : "bg-white dark:bg-slate-950"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border ${
                            isInactive
                              ? "bg-slate-100 border-slate-300 text-slate-400"
                              : member.userType === "Department Head"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600"
                                : "bg-emerald-50 border-emerald-200 text-emerald-600"
                          }`}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className={`font-bold text-slate-900 text-sm ${isInactive ? "text-slate-400 line-through" : ""}`}>{member.name}</div>
                              {isInactive && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 uppercase tracking-wider">
                                  Inactive
                                </span>
                              )}
                            </div>
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
                      {(() => {
                        const statusInfo = getMemberStatusInfo(member)
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${statusInfo.dotClass}`} />
                            {statusInfo.label}
                          </span>
                        )
                      })()}
                    </td>

                    {/* Productivity Score */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-black text-slate-800">
                          {member.productivityScore ?? 0}
                        </span>
                        <ProductivityBadge score={member.productivityScore ?? 0} className="scale-90" />
                      </div>
                    </td>

                    {/* Attendance Rate */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${
                        (member.attendanceRate ?? 0) >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/20' :
                        (member.attendanceRate ?? 0) >= 75 ? 'bg-blue-50 text-blue-700 border border-blue-250/20' :
                        'bg-amber-50 text-amber-700 border border-amber-250/20'
                      }`}>
                        {member.attendanceRate ?? 85}%
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
                    <td className={`sticky right-0 px-6 py-4 text-right z-20 border-l border-slate-100/80 dark:border-slate-800/80 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors ${isInactive ? "bg-slate-100/70 dark:bg-slate-900/70" : "bg-white dark:bg-slate-950"}`}>
                      <div className="flex items-center justify-end relative">
                        <button
                          onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdownId === member.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveDropdownId(null)}
                            />
                            <div className="absolute right-0 top-10 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1.5 text-left text-xs font-semibold animate-scaleUp">
                              <Link 
                                href={`/admin/employees/${member.id}`}
                                onClick={() => setActiveDropdownId(null)}
                                className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2.5 transition"
                              >
                                <Eye className="w-4.5 h-4.5 text-slate-400" />
                                View Profile
                              </Link>
                              
                              <button
                                onClick={() => {
                                  setResetPasswordMember({ id: member.id, name: member.name })
                                  setActiveDropdownId(null)
                                }}
                                className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2.5 transition text-left"
                              >
                                <KeyRound className="w-4.5 h-4.5 text-slate-400" />
                                Reset Password
                              </button>

                              {member.userType === "Employee" && (
                                <>
                                  {member.status.toLowerCase() === 'inactive' ? (
                                    <button
                                      onClick={() => {
                                        setConfirmStatusModal({
                                          memberId: member.id,
                                          name: member.name,
                                          targetStatus: 'ACTIVE'
                                        })
                                        setActiveDropdownId(null)
                                      }}
                                      className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-600 flex items-center gap-2.5 transition text-left"
                                    >
                                      <Unlock className="w-4.5 h-4.5 text-emerald-500" />
                                      Reactivate Employee
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setConfirmStatusModal({
                                            memberId: member.id,
                                            name: member.name,
                                            targetStatus: 'INACTIVE'
                                          })
                                          setActiveDropdownId(null)
                                        }}
                                        className="w-full px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 flex items-center gap-2.5 transition text-left"
                                      >
                                        <Lock className="w-4.5 h-4.5 text-rose-500" />
                                        Mark as Inactive
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPromotingMember(member)
                                          setActiveDropdownId(null)
                                        }}
                                        className="w-full px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 flex items-center gap-2.5 transition text-left"
                                      >
                                        <Shield className="w-4.5 h-4.5 text-indigo-500" />
                                        Assign as Dept Head
                                      </button>
                                    </>
                                  )}
                                </>
                              )}

                              {member.userType === "Department Head" && (
                                <button
                                  onClick={() => {
                                    setDemotingMember(member)
                                    setActiveDropdownId(null)
                                  }}
                                  className="w-full px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 flex items-center gap-2.5 transition text-left"
                                >
                                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                                  Remove Dept Head Role
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reset Password Modal */}
      {resetPasswordMember && (
        <AdminResetPasswordModal 
          userId={resetPasswordMember.id}
          userName={resetPasswordMember.name}
          onClose={() => setResetPasswordMember(null)}
        />
      )}

      {/* Custom Confirmation Modal */}
      {confirmStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                confirmStatusModal.targetStatus === 'INACTIVE' 
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' 
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {confirmStatusModal.targetStatus === 'INACTIVE' 
                  ? 'Mark Employee as Inactive?' 
                  : 'Reactivate Employee?'}
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              {confirmStatusModal.targetStatus === 'INACTIVE' 
                ? 'Mark Employee as Inactive? This employee will no longer participate in the organization but all historical data will be preserved.'
                : 'Reactivate Employee? Reactivating will restore their full dashboard and permission access.'}
            </p>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmStatusModal(null)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 ${
                  confirmStatusModal.targetStatus === 'INACTIVE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isUpdatingStatus ? 'Updating...' : confirmStatusModal.targetStatus === 'INACTIVE' ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign as Department Head Modal */}
      {promotingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Assign as Department Head
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Promote employee <strong className="text-slate-900 dark:text-white">{promotingMember.name}</strong> to Department Head. Please select the target department to assign them to.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Department</label>
              <select
                value={selectedPromoDeptId}
                onChange={(e) => setSelectedPromoDeptId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose a Department --</option>
                {availableDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPromotingMember(null)}
                disabled={isPromotingOrDemoting}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={isPromotingOrDemoting || !selectedPromoDeptId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
              >
                {isPromotingOrDemoting ? 'Promoting...' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Department Head Role Modal */}
      {demotingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 dark:bg-rose-950/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Remove Department Head Role?
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Are you sure you want to remove the Department Head role from <strong className="text-slate-900 dark:text-white">{demotingMember.name}</strong>? This will restore their Employee-only permissions, and restore the original department head as the active head.
            </p>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDemotingMember(null)}
                disabled={isPromotingOrDemoting}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDemote}
                disabled={isPromotingOrDemoting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
              >
                {isPromotingOrDemoting ? 'Demoting...' : 'Remove Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card Details Modal Popup */}
      {selectedCardPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col space-y-6 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedCardPopup === "TOTAL" ? "bg-blue-50 text-[#0066FF]" :
                  selectedCardPopup === "ACTIVE" ? "bg-emerald-50 text-emerald-600" :
                  selectedCardPopup === "ONLINE" ? "bg-teal-50 text-teal-600" :
                  selectedCardPopup === "DEPT_HEADS" ? "bg-indigo-50 text-indigo-600" :
                  "bg-rose-50 text-rose-600"
                }`}>
                  {selectedCardPopup === "TOTAL" && <Users className="w-5 h-5" />}
                  {selectedCardPopup === "ACTIVE" && <UserCheck className="w-5 h-5" />}
                  {selectedCardPopup === "ONLINE" && <User className="w-5 h-5" />}
                  {selectedCardPopup === "DEPT_HEADS" && <Shield className="w-5 h-5" />}
                  {selectedCardPopup === "INACTIVE" && <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {selectedCardPopup === "TOTAL" && "Total Workforce Members"}
                    {selectedCardPopup === "ACTIVE" && "Active Workforce Members"}
                    {selectedCardPopup === "ONLINE" && "Online Members"}
                    {selectedCardPopup === "DEPT_HEADS" && "Active Department Heads"}
                    {selectedCardPopup === "INACTIVE" && "Inactive Members"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Total: {popupMembersList.length}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedCardPopup(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable Members List Table */}
            <div className="flex-1 overflow-y-auto">
              {popupMembersList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-semibold">
                  No members found in this category.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-450 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="px-4 py-3">Name</th>
                      {selectedCardPopup === "ONLINE" ? (
                        <>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Login Time</th>
                          <th className="px-4 py-3">Status</th>
                        </>
                      ) : selectedCardPopup === "INACTIVE" ? (
                        <>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Inactive Since</th>
                          <th className="px-4 py-3">Inactivated By</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {popupMembersList.map((member) => {
                      const session = activeSessions.find(s => s.user_id === member.id)
                      const loginTimeStr = session?.login_time
                        ? new Date(session.login_time).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                        : 'N/A'
                      
                      const inactiveSinceStr = member.lastSavedAt
                        ? new Date(member.lastSavedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'N/A'

                      return (
                        <tr key={member.id} className="hover:bg-slate-50/40 text-xs font-semibold text-slate-700 transition">
                          <td className="px-4 py-3.5 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{member.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{member.code}</p>
                            </div>
                          </td>
                          {selectedCardPopup === "ONLINE" ? (
                            <>
                              <td className="px-4 py-3.5">{member.roleName}</td>
                              <td className="px-4 py-3.5">{member.department}</td>
                              <td className="px-4 py-3.5 font-mono text-[10px] text-slate-500">{loginTimeStr}</td>
                              <td className="px-4 py-3.5">
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-250/20 animate-pulse">
                                  ONLINE
                                </span>
                              </td>
                            </>
                          ) : selectedCardPopup === "INACTIVE" ? (
                            <>
                              <td className="px-4 py-3.5">{member.roleName}</td>
                              <td className="px-4 py-3.5">{member.department}</td>
                              <td className="px-4 py-3.5 text-slate-500 font-medium">{inactiveSinceStr}</td>
                              <td className="px-4 py-3.5">
                                <span className="bg-slate-105 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">
                                  Admin
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3.5">{member.roleName}</td>
                              <td className="px-4 py-3.5">{member.department}</td>
                              <td className="px-4 py-3.5 text-slate-550">{member.email}</td>
                              <td className="px-4 py-3.5">
                                {(() => {
                                  const statusInfo = getMemberStatusInfo(member)
                                  return (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                                      <span className={`w-1 h-1 rounded-full mr-1 shrink-0 ${statusInfo.dotClass}`} />
                                      {statusInfo.label}
                                    </span>
                                  )
                                })()}
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end items-center pt-4 border-t border-slate-100 gap-3">
              {selectedCardPopup === "ONLINE" && (
                <button
                  onClick={() => {
                    setSelectedCardPopup(null)
                    router.push("/admin/attendance")
                  }}
                  className="px-5 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Go to Attendance
                </button>
              )}
              <button
                onClick={() => setSelectedCardPopup(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition cursor-pointer"
              >
                Close
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}
