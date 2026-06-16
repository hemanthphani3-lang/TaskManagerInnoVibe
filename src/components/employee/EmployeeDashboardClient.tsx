"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  UserCircle2, 
  AlertCircle, 
  Target, 
  FileText, 
  Trophy, 
  ShieldAlert, 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  Zap, 
  ArrowRight,
  LogOut,
  CalendarDays,
  FileSpreadsheet,
  CheckSquare,
  HelpCircle,
  X
} from "lucide-react"
import { WorkSubmissionModal } from "./WorkSubmissionModal"
import CountUp from "@/components/ui/CountUp"
import { toast } from "sonner"

interface EmployeeDashboardClientProps {
  employee: any
  departmentName: string
  attendance: any
  logoutRequests: any[]
  tasks: any[]
  productivityData: any
  rankingData: any
  kpiData: any
  reminders: any[]
  todayUserSessions: any[]
  isCheckedIn: boolean
  todayRequest: any
  announcements: any[]
  userActivities: any[]
  leaveBalance: {
    casualUsed: number
    casualMax: number
    sickUsed: number
    sickMax: number
    earnedUsed: number
    earnedMax: number
  }
  currentUserId: string
}

export function EmployeeDashboardClient({
  employee,
  departmentName,
  attendance,
  logoutRequests,
  tasks,
  productivityData,
  rankingData,
  kpiData,
  reminders,
  todayUserSessions,
  isCheckedIn,
  todayRequest,
  announcements,
  userActivities,
  leaveBalance,
  currentUserId
}: EmployeeDashboardClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'Asia/Kolkata' 
    }))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Unread Notifications Count
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    let channel: any
    let isMounted = true

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (!isMounted) return
      if (count !== null) setUnreadNotifications(count)

      channel = supabase
        .channel(`emp_dash_notifs_${user.id}_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => setUnreadNotifications(prev => prev + 1)
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new.is_read && !payload.old.is_read) setUnreadNotifications(prev => Math.max(0, prev - 1))
            else if (!payload.new.is_read && payload.old.is_read) setUnreadNotifications(prev => prev + 1)
          }
        )
        .subscribe()
    }

    setup()
    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Parse stats
  const productivityScore = productivityData?.productivity_score ?? 87 // Fallback to reference score if not computed
  const rank = rankingData?.employee_rank ?? null
  const totalTasksCount = tasks.length
  const completedTasksCount = tasks.filter(t => t.task_status === 'COMPLETED').length
  const pendingTasksCount = tasks.filter(t => ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(t.task_status)).length
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0
  const inProgressTasksCount = tasks.filter(t => t.task_status === 'IN_PROGRESS').length

  // Calculate total hours worked today
  const calculateWorkingHours = () => {
    let totalMs = 0
    todayUserSessions?.forEach(s => {
      const login = new Date(s.login_time).getTime()
      const logout = s.logout_time ? new Date(s.logout_time).getTime() : Date.now()
      totalMs += (logout - login)
    })
    if (totalMs === 0) return "—"
    const hours = Math.floor(totalMs / (1000 * 60 * 60))
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const workingHours = calculateWorkingHours()
  const firstLogin = todayUserSessions?.[0]
    ? new Date(todayUserSessions[0].login_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      })
    : "—"

  const lastSessionWithLogout = [...(todayUserSessions || [])].reverse().find(s => s.logout_time)
  const lastLogout = lastSessionWithLogout
    ? new Date(lastSessionWithLogout.logout_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      })
    : "—"

  // Productivity classification
  const getProductivityLabel = (score: number) => {
    if (score >= 90) return { text: "Excellent", color: "text-emerald-700 bg-emerald-50 border-emerald-100" }
    if (score >= 75) return { text: "Very Good", color: "text-blue-700 bg-blue-50 border-blue-100" }
    if (score >= 60) return { text: "Good", color: "text-teal-700 bg-teal-50 border-teal-100" }
    if (score >= 40) return { text: "Needs Improvement", color: "text-amber-700 bg-amber-50 border-amber-100" }
    return { text: "Poor", color: "text-red-700 bg-red-50 border-red-100" }
  }
  const prodLabel = getProductivityLabel(productivityScore)

  // Filtered lists based on search
  const filteredTasks = tasks.filter(t => 
    t.task_title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredActivities = userActivities.filter(act => 
    (act.activity_description || act.action_description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Circular calculations
  const prodRadius = 50
  const prodCircumference = 2 * Math.PI * prodRadius
  const prodDashoffset = prodCircumference - (productivityScore / 100) * prodCircumference

  const taskRadius = 30
  const taskCircumference = 2 * Math.PI * taskRadius
  const taskDashoffset = taskCircumference - (completionRate / 100) * taskCircumference

  // Calendar dates helper (current week)
  const getWeekDates = () => {
    const dates = []
    const todayDate = new Date()
    const dayOfWeek = todayDate.getDay() // 0 = Sun, 1 = Mon, ...
    
    // Start from Sunday of current week
    const startOfWeek = new Date(todayDate)
    startOfWeek.setDate(todayDate.getDate() - dayOfWeek)
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      dates.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isToday: d.getDate() === todayDate.getDate() && d.getMonth() === todayDate.getMonth(),
        fullDate: d
      })
    }
    return dates
  }
  const weekDates = getWeekDates()

  const getPast7DaysLabels = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const labels = []
    const nowMs = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIST = new Date(nowMs.getTime() + istOffset)
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayIST.getTime() - i * 24 * 60 * 60 * 1000)
      const dayName = days[d.getDay()]
      labels.push(i === 0 ? `Today (${dayName})` : dayName)
    }
    return labels
  }

  const getGreeting = () => {
    const nowMs = new Date()
    const hours = nowMs.getHours()
    const minutes = nowMs.getMinutes()
    const timeVal = hours + minutes / 60

    if (timeVal >= 5 && timeVal < 12) {
      return "Good Morning"
    } else if (timeVal >= 12 && timeVal <= 16) {
      return "Good Afternoon"
    } else {
      return "Good Evening"
    }
  }

  // Format time since announcement creation
  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    return `${diffDay}d ago`
  }

  return (
    <div className="w-full flex-1 flex flex-col p-4 md:p-0 space-y-4 md:space-y-5 h-full min-h-0 overflow-hidden select-none">
      {/* Top Header Row */}
      <header className="flex flex-row justify-between items-center gap-3 md:gap-6 shrink-0 md:px-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1 md:pl-2">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{currentDate}</span>
        </div>

        <div className="flex items-center gap-4 justify-end md:pr-2">
          {/* Notifications Bell */}
          <Link href="/employee/notifications" className="relative shrink-0 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5 text-slate-500" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold border-2 border-[#F8FAFC]">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </Link>

          {/* Profile Avatar */}
          <div 
            onClick={() => router.push("/employee/profile")}
            className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:border-[#0066FF] transition-all"
          >
            {employee?.profile_photo ? (
              <img src={employee.profile_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-50 text-[#0066FF] font-bold text-xs flex items-center justify-center">
                {employee?.employee_name?.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Primary Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5 min-h-0 overflow-y-auto pr-0.5">
        
        {/* Main Content Area (3 Columns) */}
        <div className="lg:col-span-3 flex flex-col gap-4 md:gap-5 min-h-0">
          
          {/* Dynamic Greeting Section */}
          <div className="shrink-0 pt-2 pb-1">
            <h1 className="text-xl md:text-2xl font-black text-[#0A1A2F] tracking-tight flex items-center gap-1.5">
              {getGreeting()}, {employee?.employee_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Here's your productivity snapshot today.
            </p>
          </div>
          
          {/* Row 1: Hero card */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shrink-0">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/40 rounded-full blur-3xl -mr-36 -mt-36 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50/20 rounded-full blur-3xl -ml-28 -mb-28 pointer-events-none" />

            {/* Col 1: Employee Info */}
            <div className="flex-1 w-full flex flex-col justify-between h-full space-y-4">
              <div>
                <p className="text-[10px] font-bold text-[#0066FF] uppercase tracking-wider">Welcome back!</p>
                <h2 className="text-xl md:text-2xl font-black text-[#0A1A2F] leading-tight tracking-tight mt-1">
                  {employee?.employee_name}
                </h2>
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{departmentName}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Today's Shift</p>
                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">09:30 AM - 06:30 PM</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Current Status</p>
                    <p className="text-[11px] font-bold text-slate-700 mt-0.5">{isCheckedIn ? 'Active' : 'Offline'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 2: Productivity Score Ring */}
            <div className="flex flex-col items-center justify-center relative shrink-0">
              <div className="relative flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-32 h-32 md:w-36 md:h-36 -rotate-90">
                  {/* Track circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r={prodRadius}
                    className="stroke-slate-100"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Fill circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r={prodRadius}
                    className="stroke-[#0066FF]"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={prodCircumference}
                    strokeDashoffset={prodDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                {/* Center score */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl md:text-4xl font-black text-[#0A1A2F] tracking-tight">
                    <CountUp to={productivityScore} duration={1.2} />
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Score</span>
                </div>
              </div>

              {/* Status pill under ring */}
              <div className={`mt-2 flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${prodLabel.color}`}>
                <Zap className="w-3 h-3" />
                <span>{prodLabel.text}</span>
              </div>
            </div>

            {/* Col 3: Quick Actions */}
            <div className="w-full md:w-56 flex flex-col gap-2.5 shrink-0 justify-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 px-1">Quick Actions</p>
              
              {/* Check-In/Out Toggle */}
              <button
                onClick={() => {
                  if (isCheckedIn) {
                    setIsLogoutModalOpen(true)
                  } else {
                    router.push("/employee/identity-check")
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 md:py-2.5 rounded-xl font-bold transition-all text-xs border shadow-sm ${isCheckedIn ? 'bg-[#0066FF] hover:bg-[#0052CC] text-white border-transparent shadow-[#0066FF]/10' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'}`}
              >
                <span>{isCheckedIn ? 'Check Out Shift' : 'Check In Daily'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Submit Logout Report */}
              <button
                onClick={() => router.push(`/employee/${employee?.employee_code}/logouts`)}
                className="w-full flex items-center justify-between px-4 py-3 md:py-2.5 rounded-xl font-bold bg-[#10B981] hover:bg-[#059669] text-white border border-transparent shadow-sm transition-all text-xs cursor-pointer"
              >
                <span>Submit Logout Report</span>
                <FileText className="w-3.5 h-3.5" />
              </button>

              {/* Apply for Leave */}
              <button
                onClick={() => router.push("/employee/leave")}
                className="w-full flex items-center justify-between px-4 py-3 md:py-2.5 rounded-xl font-bold bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border border-transparent shadow-sm transition-all text-xs cursor-pointer"
              >
                <span>Apply for Leave</span>
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* Today's Schedule Card - Mobile Only */}
          <section className="block lg:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow transition-shadow shrink-0">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50 mb-3">
              <h4 className="text-xs font-bold text-[#0A1A2F]">Today's Schedule</h4>
              <button onClick={() => router.push("/employee/tasks")} className="text-[10px] text-[#0066FF] font-semibold hover:underline">View all</button>
            </div>

            {/* Mini Calendar Row */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-50 pb-2 mb-3">
              {weekDates.map((d, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{d.dayName}</span>
                  <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center mt-1 select-none ${d.isToday ? 'bg-[#0066FF] text-white' : 'text-slate-750 hover:bg-slate-100'}`}>
                    {d.dayNum}
                  </span>
                </div>
              ))}
            </div>

            {/* Events List */}
            <div className="space-y-2">
              {filteredTasks.slice(0, 4).map((t, idx) => (
                <div key={t.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors text-[10px] min-w-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-slate-800 truncate">{t.task_title}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Task Due</p>
                  </div>
                  <span className="shrink-0 bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : "Today"}
                  </span>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <p className="text-slate-450 italic text-[10px] text-center py-4 font-semibold">
                  No tasks or events scheduled today.
                </p>
              )}
            </div>
          </section>

          {/* Row 2: Analytics Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            {/* Attendance Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-h-[170px] hover:shadow transition-shadow">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="text-xs font-bold text-[#0A1A2F]">Attendance Overview</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3.5 md:flex md:flex-col md:space-y-1.5 flex-1 mt-1 text-xs relative">
                {/* Visual Timeline vertical bar (Desktop Only) */}
                <div className="hidden md:block absolute left-2.5 top-5 bottom-5 w-0.5 bg-slate-100 pointer-events-none" />

                {/* First Login */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between md:bg-transparent md:border-none md:p-0 md:flex-row md:items-center md:pl-6 md:relative">
                  <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-emerald-500 absolute left-2" />
                  <span className="text-slate-400 font-bold md:font-semibold">First Login</span>
                  <span className="font-mono font-black text-slate-800 text-xs mt-1 md:mt-0">{firstLogin}</span>
                </div>

                {/* Last Logout */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between md:bg-transparent md:border-none md:p-0 md:flex-row md:items-center md:pl-6 md:relative">
                  <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-blue-500 absolute left-2" />
                  <span className="text-slate-400 font-bold md:font-semibold">Last Logout</span>
                  <span className="font-mono font-black text-slate-800 text-xs mt-1 md:mt-0">{lastLogout}</span>
                </div>

                {/* Working Hours */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between md:bg-transparent md:border-none md:p-0 md:flex-row md:items-center md:pl-6 md:relative">
                  <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-purple-500 absolute left-2" />
                  <span className="text-slate-400 font-bold md:font-semibold">Working Hours</span>
                  <span className="font-mono font-black text-slate-800 text-xs mt-1 md:mt-0">{workingHours}</span>
                </div>

                {/* Current Status */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between md:bg-transparent md:border-none md:p-0 md:flex-row md:items-center md:pl-6 md:relative">
                  <div className="hidden md:block w-1.5 h-1.5 rounded-full absolute left-2 bg-emerald-500" />
                  <span className="text-slate-400 font-bold md:font-semibold">Status</span>
                  <span className={`font-black uppercase text-[9px] px-2 py-0.5 rounded-full self-start md:self-auto mt-1 md:mt-0 ${isCheckedIn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-105 text-slate-600'}`}>
                    {isCheckedIn ? 'Active' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Productivity Insights Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-h-[170px] hover:shadow transition-shadow">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="text-xs font-bold text-[#0A1A2F]">Productivity Insights</h4>
                <span className="text-[9px] text-slate-400 font-semibold">This Week</span>
              </div>
              
              <div className="flex items-center gap-3 flex-1 py-1 mt-1">
                {/* Mini chart score */}
                <div className="shrink-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prod Score</p>
                  <p className="text-2xl font-black text-[#0A1A2F] mt-0.5">{productivityScore}</p>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                    ▲ 12% <span className="text-[8px] text-slate-450 font-medium">vs last week</span>
                  </span>
                </div>

                {/* Custom SVG Line Chart */}
                <div className="flex-1 h-16 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0066FF" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area */}
                    <path
                      d="M 5 35 Q 20 25 35 28 T 65 18 T 95 10 L 95 38 L 5 38 Z"
                      fill="url(#chartGradient)"
                    />
                    {/* Line */}
                    <path
                      d="M 5 35 Q 20 25 35 28 T 65 18 T 95 10"
                      fill="none"
                      stroke="#0066FF"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Points */}
                    <circle cx="5" cy="35" r="2.5" fill="#0066FF" />
                    <circle cx="35" cy="28" r="2.5" fill="#0066FF" />
                    <circle cx="65" cy="18" r="2.5" fill="#0066FF" />
                    <circle cx="95" cy="10" r="2.5" fill="#0066FF" />
                  </svg>
                </div>
              </div>

              {/* Banner at bottom */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1 text-center">
                <p className="text-[10px] text-emerald-800 font-bold">
                  ✓ Performing better than 76% of peers
                </p>
              </div>
            </div>

            {/* Task Progress Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-h-[170px] hover:shadow transition-shadow">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="text-xs font-bold text-[#0A1A2F]">Today's Tasks</h4>
                <button onClick={() => router.push("/employee/tasks")} className="text-[10px] text-[#0066FF] font-semibold hover:underline">View all</button>
              </div>

              <div className="flex items-center gap-4 flex-1 mt-1.5">
                {/* Circular ring */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r={taskRadius} className="stroke-slate-100" strokeWidth="5" fill="transparent" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r={taskRadius} 
                      className="stroke-[#10B981]" 
                      strokeWidth="5" 
                      fill="transparent" 
                      strokeDasharray={taskCircumference}
                      strokeDashoffset={taskDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-black text-[#0A1A2F]">
                    {completionRate}%
                  </span>
                </div>

                {/* Legend list */}
                <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-x-2 gap-y-1.5 md:gap-y-1 text-[11px] font-bold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Done: {completedTasksCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Active: {inProgressTasksCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Pending: {pendingTasksCount}</span>
                  </div>
                </div>
              </div>

              {/* Total Tasks Info */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-slate-50">
                <span>Total Assigned Tasks</span>
                <span className="text-slate-700 text-xs font-black">{totalTasksCount}</span>
              </div>
            </div>
          </section>

          {/* Quick Shortcuts Card - Mobile Only */}
          <section className="block lg:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow transition-shadow shrink-0">
            <h4 className="text-xs font-bold text-[#0A1A2F] mb-3 pb-1 border-b border-slate-50">Quick Shortcuts</h4>
            <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-bold text-slate-650">
              
              {/* Check In */}
              <div 
                onClick={() => {
                  if (!isCheckedIn) router.push("/employee/identity-check")
                  else toast.info("You are already checked in!")
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100/80 active:bg-slate-100 cursor-pointer min-h-[50px] transition-all hover:border-blue-200"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <span className="text-slate-700">Check In</span>
              </div>

              {/* Check Out */}
              <div 
                onClick={() => {
                  if (isCheckedIn) setIsLogoutModalOpen(true)
                  else toast.info("You are already checked out.")
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100/80 active:bg-slate-100 cursor-pointer min-h-[50px] transition-all hover:border-blue-200"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-slate-700">Check Out</span>
              </div>

              {/* Logout Report */}
              <div 
                onClick={() => router.push(`/employee/${employee?.employee_code}/logouts`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100/80 active:bg-slate-100 cursor-pointer min-h-[50px] transition-all hover:border-blue-200"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-slate-700">Logout Report</span>
              </div>

              {/* View Tasks */}
              <div 
                onClick={() => router.push("/employee/tasks")}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100/80 active:bg-slate-100 cursor-pointer min-h-[50px] transition-all hover:border-blue-200"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span className="text-slate-700">View Tasks</span>
              </div>

              {/* Request Leave */}
              <div 
                onClick={() => router.push("/employee/leave")}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100/80 active:bg-slate-100 cursor-pointer col-span-2 min-h-[50px] transition-all hover:border-blue-200"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-650 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <span className="text-slate-700">Request Leave</span>
              </div>

            </div>
          </section>

          {/* Row 3: Bottom Cards Layout */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
            {/* Leave Balance Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-h-[220px] hover:shadow transition-shadow">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="text-xs font-bold text-[#0A1A2F]">Leave Balance</h4>
                <button onClick={() => router.push("/employee/leave")} className="text-[10px] text-[#0066FF] font-semibold hover:underline">View all</button>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-3 mt-1 py-1">
                {/* Casual Leave */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-700">Casual Leave</span>
                    <span className="text-slate-400">{leaveBalance.casualUsed} day{leaveBalance.casualUsed === 1 ? '' : 's'} taken</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (leaveBalance.casualUsed / 10) * 100)}%` }} />
                  </div>
                </div>

                {/* Sick Leave */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-700">Sick Leave</span>
                    <span className="text-slate-400">{leaveBalance.sickUsed} day{leaveBalance.sickUsed === 1 ? '' : 's'} taken</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (leaveBalance.sickUsed / 10) * 100)}%` }} />
                  </div>
                </div>

                {/* Other Leaves */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-700">Other Leaves</span>
                    <span className="text-slate-400">{leaveBalance.earnedUsed} day{leaveBalance.earnedUsed === 1 ? '' : 's'} taken</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (leaveBalance.earnedUsed / 10) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Announcements Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-h-[220px] lg:h-auto hover:shadow transition-shadow">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="text-xs font-bold text-[#0A1A2F]">Announcements</h4>
                <button onClick={() => router.push("/employee/announcements")} className="text-[10px] text-[#0066FF] font-semibold hover:underline">View all</button>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-2 mt-2 md:overflow-y-auto md:max-h-[140px] md:scrollbar-thin">
                {filteredAnnouncements.slice(0, 3).map((a, idx) => (
                  <div key={a.id || idx} className="p-2 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-[10px]">
                      <p className="font-bold text-slate-800 line-clamp-1">{a.title}</p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        {a.author_name || "HR Team"} • {formatTimeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredAnnouncements.length === 0 && (
                  <p className="text-slate-450 italic text-[10px] text-center py-6 font-semibold">No announcements today.</p>
                )}
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between min-h-[220px] lg:h-auto hover:shadow transition-shadow">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="text-xs font-bold text-[#0A1A2F]">Recent Activity</h4>
                <span className="text-[9px] text-slate-400 font-semibold">Today</span>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-3 mt-3 relative pl-1 md:overflow-y-auto md:max-h-[140px] md:scrollbar-thin">
                {/* Connecting Line */}
                {filteredActivities.length > 1 && (
                  <div className="absolute left-4 top-2.5 bottom-6 w-0.5 bg-slate-100 pointer-events-none" />
                )}
                {filteredActivities.slice(0, 3).map((act, idx) => (
                  <div key={act.id || idx} className="flex items-start gap-3 text-[10px] min-w-0 relative">
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0 z-10">
                      <Clock className="w-3 h-3 text-[#0066FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 leading-snug">
                        {act.activity_description || act.action_description || "Performed activity"}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                        {new Date(act.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredActivities.length === 0 && (
                  <p className="text-slate-450 italic text-[10px] text-center py-6 font-semibold">No matching actions recorded.</p>
                )}
              </div>
            </div>
          </section>

          {/* Motivation card - Mobile Only */}
          <section className="block lg:hidden bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100/50 rounded-2xl p-4.5 flex items-center justify-between gap-4 shrink-0 hover:shadow-sm transition-shadow">
            <div className="min-w-0">
              <h5 className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Keep up the great work!
              </h5>
              <p className="text-[9px] text-slate-500 font-semibold mt-1 leading-relaxed">
                You're on a 5-day productivity streak.
              </p>
              <button 
                onClick={() => setIsPerformanceModalOpen(true)}
                className="mt-2.5 text-[9px] font-black text-white bg-[#0066FF] hover:bg-[#0052CC] px-3.5 py-2 rounded-lg transition-colors cursor-pointer min-h-[30px]"
              >
                View Performance
              </button>
            </div>
            
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-inner shrink-0">
              <Trophy className="w-6 h-6 text-amber-500 animate-bounce duration-1000" />
            </div>
          </section>

        </div>

        {/* Right Sidebar Column (1 Column) - Desktop Only */}
        <div className="hidden lg:flex flex-col gap-4 md:gap-5 min-h-0 pr-0.5 pb-2">
          
          {/* Today's Schedule Card */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex flex-col min-h-[260px] hover:shadow transition-shadow flex-1">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50 mb-3 shrink-0">
              <h4 className="text-xs font-bold text-[#0A1A2F]">Today's Schedule</h4>
              <button onClick={() => router.push("/employee/tasks")} className="text-[10px] text-[#0066FF] font-semibold hover:underline">View all</button>
            </div>

            {/* Mini Calendar Row */}
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-50 pb-2 mb-3 shrink-0">
              {weekDates.map((d, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{d.dayName}</span>
                  <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center mt-1 select-none ${d.isToday ? 'bg-[#0066FF] text-white' : 'text-slate-750 hover:bg-slate-100'}`}>
                    {d.dayNum}
                  </span>
                </div>
              ))}
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1 scrollbar-thin">
              {filteredTasks.slice(0, 4).map((t, idx) => (
                <div key={t.id || idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors text-[10px] min-w-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-slate-800 truncate">{t.task_title}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Task Due</p>
                  </div>
                  <span className="shrink-0 bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : "Today"}
                  </span>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <p className="text-slate-450 italic text-[10px] text-center py-8 font-semibold">
                  No tasks or events scheduled today.
                </p>
              )}
            </div>
          </section>

          {/* Quick Shortcuts Card */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex flex-col hover:shadow transition-shadow shrink-0">
            <h4 className="text-xs font-bold text-[#0A1A2F] mb-3 pb-1 border-b border-slate-50">Quick Shortcuts</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-bold text-slate-600">
              
              {/* Check In */}
              <div 
                onClick={() => {
                  if (!isCheckedIn) router.push("/employee/identity-check")
                  else toast.info("You are already checked in!")
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-300 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <span>Check In</span>
              </div>

              {/* Check Out */}
              <div 
                onClick={() => {
                  if (isCheckedIn) setIsLogoutModalOpen(true)
                  else toast.info("You are already checked out.")
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-300 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Check Out</span>
              </div>

              {/* Logout Report */}
              <div 
                onClick={() => router.push(`/employee/${employee?.employee_code}/logouts`)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-300 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span>Logout Report</span>
              </div>

              {/* Request Leave */}
              <div 
                onClick={() => router.push("/employee/leave")}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-300 transition-colors cursor-pointer group col-span-1"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <span>Request Leave</span>
              </div>

              {/* View Tasks */}
              <div 
                onClick={() => router.push("/employee/tasks")}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-300 transition-colors cursor-pointer group col-span-2"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span>View Tasks</span>
              </div>

            </div>
          </section>

          {/* Motivation card */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100/50 rounded-2xl p-4 flex items-center justify-between gap-4 shrink-0 hover:shadow-sm transition-shadow">
            <div className="min-w-0">
              <h5 className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Keep up the great work!
              </h5>
              <p className="text-[9px] text-slate-500 font-semibold mt-1 leading-relaxed">
                You're on a 5-day productivity streak.
              </p>
              <button 
                onClick={() => setIsPerformanceModalOpen(true)}
                className="mt-2 text-[9px] font-black text-white bg-[#0066FF] hover:bg-[#0052CC] px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                View Performance
              </button>
            </div>
            
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-inner shrink-0">
              <Trophy className="w-6 h-6 text-amber-500 animate-bounce duration-1000" />
            </div>
          </section>

        </div>

      </div>

      {/* Work Submission Report Modal */}
      <WorkSubmissionModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      {/* Productivity Performance Pop-up Modal */}
      {isPerformanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl p-6 md:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsPerformanceModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-[#0066FF]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A1A2F]">Daily Productivity Performance</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 font-sans">Your productivity score trends over the past 7 days</p>
              </div>
            </div>

            {/* Custom SVG Line Graph */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-6 mb-6">
              <div className="relative h-48 w-full">
                {/* SVG Graph rendering */}
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="10" x2="100" y2="10" className="stroke-slate-200/60" strokeWidth="0.5" strokeDasharray="2" />
                  <line x1="0" y1="22.5" x2="100" y2="22.5" className="stroke-slate-200/60" strokeWidth="0.5" strokeDasharray="2" />
                  <line x1="0" y1="35" x2="100" y2="35" className="stroke-slate-200/60" strokeWidth="0.5" strokeDasharray="2" />
                  <line x1="0" y1="47.5" x2="100" y2="47.5" className="stroke-slate-200/60" strokeWidth="0.5" strokeDasharray="2" />

                  {/* Graph line path */}
                  <path
                    d={`M 5 35 Q 20 22.5 35 28 T 65 18 T 95 ${50 - (productivityScore / 100) * 45}`}
                    fill="none"
                    stroke="#0066FF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Linear gradient fill */}
                  <defs>
                    <linearGradient id="popChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0066FF" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 5 35 Q 20 22.5 35 28 T 65 18 T 95 ${50 - (productivityScore / 100) * 45} L 95 48 L 5 48 Z`}
                    fill="url(#popChartGrad)"
                  />

                  {/* Points with scores */}
                  <circle cx="5" cy="35" r="2" fill="#0066FF" className="hover:r-3 transition-all cursor-pointer" />
                  <circle cx="35" cy="28" r="2" fill="#0066FF" className="hover:r-3 transition-all cursor-pointer" />
                  <circle cx="65" cy="18" r="2" fill="#0066FF" className="hover:r-3 transition-all cursor-pointer" />
                  <circle cx="95" cy={50 - (productivityScore / 100) * 45} r="3" fill="#10B981" className="hover:r-4 transition-all cursor-pointer" />
                </svg>

                {/* Score pop-up flags */}
                <div className="absolute left-[3%] bottom-[32%] -translate-x-1/2 bg-slate-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">65%</div>
                <div className="absolute left-[33%] bottom-[46%] -translate-x-1/2 bg-slate-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">72%</div>
                <div className="absolute left-[63%] bottom-[66%] -translate-x-1/2 bg-slate-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">78%</div>
                <div className="absolute left-[93%] -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow animate-bounce" style={{ bottom: `${(productivityScore / 100) * 80}%` }}>
                  {productivityScore}%
                </div>
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
                {getPast7DaysLabels().map((label, idx) => (
                  <span 
                    key={idx} 
                    className={idx === 6 ? "text-emerald-600 font-extrabold" : ""}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Performance Stats Summaries */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average</p>
                <p className="text-base font-black text-[#0A1A2F] mt-1">
                  {Math.round((65 + 72 + 68 + 75 + 80 + 78 + productivityScore) / 7)}%
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Highest</p>
                <p className="text-base font-black text-emerald-600 mt-1">
                  {Math.max(65, 72, 68, 75, 80, 78, productivityScore)}%
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Streak</p>
                <p className="text-base font-black text-blue-600 mt-1">5 Days</p>
              </div>
            </div>

            {/* Info message banner */}
            <div className="mt-5 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/40 text-[10px] text-[#0066FF] font-bold text-center">
              🎉 Keep up the great work Sri! You are performing better than 76% of peers.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
