"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LogOut, LayoutDashboard, Building2, Users, User, Calendar, ListTodo, Menu, X, FileText, Bell, Megaphone, Settings as SettingsIcon, UserCircle, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useEffect } from "react"

const iconMap: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  departments: Building2,
  employees: Users,
  identity: User,
  calendar: Calendar,
  tasks: ListTodo,
  file: FileText,
  bell: Bell,
  megaphone: Megaphone,
  settings: SettingsIcon,
  profile: UserCircle,
}

interface SidebarProps {
  title: string
  links: { label: string; href: string; iconName: string; badgeCount?: number }[]
  onLogoutClick?: () => void
  floating?: boolean
}

export function Sidebar({ title, links, onLogoutClick, floating = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(true)

  useEffect(() => {
    let channel: any;
    let isMounted = true;

    const setupNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      // Initial fetch
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      if (!isMounted) return
      if (count !== null) setUnreadNotifications(count)

      // Realtime subscription using a unique name to avoid conflicts across parallel runs
      const channelName = `sidebar_notifications_${user.id}_${Math.random().toString(36).substring(7)}`
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => setUnreadNotifications(prev => prev + 1)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.new.is_read && !payload.old.is_read) {
              setUnreadNotifications(prev => Math.max(0, prev - 1))
            } else if (!payload.new.is_read && payload.old.is_read) {
              setUnreadNotifications(prev => prev + 1) // Just in case it's marked unread
            }
          }
        )
        .subscribe()
    }

    setupNotifications()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      (window as any).__isLoggingOut = true
    }
    if (onLogoutClick) {
      onLogoutClick()
    } else {
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <>
      {/* Mobile Hamburger Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="InnoVibe" width={28} height={28} className="w-7 h-7 object-contain" />
          <span className="font-bold text-[#0A1A2F] text-lg">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 pt-16 md:pt-0 ${
        floating 
          ? 'md:inset-y-4 md:left-4 md:w-60 md:h-[calc(100vh-2rem)] md:rounded-2xl md:border md:border-slate-200/80 md:shadow-sm md:border-r-slate-200/80' 
          : ''
      }`}>
        {/* Desktop Logo & Title */}
        <div className="p-6 border-b border-slate-100 hidden md:block">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="InnoVibe" width={32} height={32} className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="font-bold text-[#0A1A2F] text-lg leading-tight">InnoVibe</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#0066FF]">{title}</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
          const isLocked = !onboardingCompleted && link.label !== 'Dashboard' && link.label !== 'Profile'
          const Icon = isLocked ? Lock : (iconMap[link.iconName] || LayoutDashboard)
  
          // Override badgeCount for notifications
          const displayBadgeCount = link.iconName === 'bell' ? unreadNotifications : link.badgeCount
  
            return (
              <Link
                key={link.href}
                href={isLocked ? "#" : link.href}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault()
                    toast.error("Please complete your profile to 70% to unlock this section!")
                    return
                  }
                  setIsOpen(false)
                }}
                title={isLocked ? "Complete profile to 70% to unlock" : undefined}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
                  isLocked
                    ? "text-slate-400 cursor-not-allowed opacity-55 select-none hover:bg-transparent"
                    : isActive 
                    ? "text-[#0066FF] font-semibold" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/60 font-medium"
                }`}
              >
                <Icon className={`w-5 h-5 transition-all duration-250 group-hover:scale-110 ${isLocked ? "text-slate-350" : isActive ? "text-[#0066FF]" : "text-slate-400 group-hover:text-slate-600"}`} />
                <span className="flex-1 transition-all duration-250 group-hover:translate-x-0.5">{link.label}</span>
                
                {isLocked && <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />}

                {displayBadgeCount !== undefined && displayBadgeCount > 0 && !isLocked && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm badge-pulse-red">
                    {displayBadgeCount}
                  </span>
                )}
                
                {isActive && !isLocked && (
                  <>
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-blue-50/80 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                    <motion.div
                      layoutId="sidebar-active-border"
                      className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#0066FF] rounded-r-full"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  </>
                )}
              </Link>
            )
        })}
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-100 space-y-4">
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 font-medium transition-all duration-200"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

    {/* Mobile Bottom Navigation Bar */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-40 flex justify-around items-center px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
      {[
        { label: "Dashboard", iconName: "dashboard" },
        { label: "Tasks", iconName: "tasks" },
        { label: "Leave", iconName: "calendar" },
        { label: "Notifications", iconName: "bell", showBadge: true },
        { label: "Profile", iconName: "profile" }
      ].map(item => {
        const matchedLink = links.find(l => l.label.toLowerCase() === item.label.toLowerCase())
        if (!matchedLink) return null
        
        const isActive = pathname === matchedLink.href || pathname.startsWith(`${matchedLink.href}/`)
        const isLocked = !onboardingCompleted && item.label !== 'Dashboard' && item.label !== 'Profile'
        const Icon = isLocked ? Lock : (iconMap[item.iconName] || LayoutDashboard)
        const displayBadgeCount = item.showBadge ? unreadNotifications : 0

        return (
          <Link
            key={matchedLink.href}
            href={isLocked ? "#" : matchedLink.href}
            onClick={(e) => {
              if (isLocked) {
                e.preventDefault()
                toast.error("Please complete your profile to 70% to unlock this section!")
                return
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold ${
              isLocked 
                ? "text-slate-350 cursor-not-allowed opacity-55"
                : isActive 
                ? "text-[#0066FF]" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "text-[#0066FF] scale-105" : "text-slate-450"}`} />
              {displayBadgeCount > 0 && !isLocked && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {displayBadgeCount}
                </span>
              )}
            </div>
            <span className="mt-1 font-semibold">{item.label}</span>
          </Link>
        )
      })}
    </div>
    </>
  )
}
