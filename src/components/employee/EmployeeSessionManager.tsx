"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/custom/Sidebar"
import { WorkSubmissionModal } from "./WorkSubmissionModal"

export function EmployeeSessionManager({ children, links }: { children: React.ReactNode; links: { label: string; href: string; iconName: string; badgeCount?: number }[] }) {
  const [showModal, setShowModal] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Listen for backend forceful logout when department approves the request
    let subscription: import('@supabase/supabase-js').RealtimeChannel
    let pollInterval: NodeJS.Timeout | null = null
    let isMounted = true

    const checkLogoutApproved = async (userId: string) => {
      const nowMs = new Date()
      const istOffset = 5.5 * 60 * 60 * 1000
      const todayIST = new Date(nowMs.getTime() + istOffset).toISOString().split('T')[0]
      const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
      const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

      const { data } = await supabase
        .from('attendance')
        .select('work_status')
        .eq('employee_id', userId)
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (isMounted && data?.work_status === 'LOGGED_OUT') {
        router.push('/employee/identity-check')
        router.refresh()
      }
    }

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      // Use a unique channel name to prevent Strict Mode race conditions
      const channelName = `employee_session_${user.id}_${Math.random().toString(36).substring(2, 9)}`
      
      if (!isMounted) return

      subscription = supabase.channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance',
          filter: `employee_id=eq.${user.id}`
        }, async (payload: { new: { work_status?: string } }) => {
          if (isMounted && payload.new.work_status === 'LOGGED_OUT') {
            router.push('/employee/identity-check')
            router.refresh()
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'logout_requests',
          filter: `employee_id=eq.${user.id}`
        }, async (payload: { new: { approval_status?: string } }) => {
          if (isMounted && payload.new.approval_status === 'APPROVED') {
            router.push('/employee/identity-check')
            router.refresh()
          }
        })
        .subscribe()

      // Polling fallback: check every 10 seconds for approval
      pollInterval = setInterval(() => checkLogoutApproved(user.id), 10000)
    }

    setupRealtime()
    return () => {
      isMounted = false
      if (subscription) supabase.removeChannel(subscription)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [supabase, router])

  const handleLogoutIntercept = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const nowMs = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIST = new Date(nowMs.getTime() + istOffset).toISOString().split('T')[0]
    const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
    const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

    const { data: attendance } = await supabase
      .from('attendance')
      .select('work_status')
      .eq('employee_id', user.id)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!attendance) {
      // Not checked in today at all → direct auth sign-out
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } else if (attendance.work_status === 'LOGGED_OUT') {
      // Already officially logged out → go to identity check to re-check-in
      router.push('/employee/identity-check')
    } else {
      // Check if there is already a pending logout request for today
      const { data: pendingReq } = await supabase
        .from('logout_requests')
        .select('id')
        .eq('employee_id', user.id)
        .eq('attendance_date', todayIST)
        .eq('approval_status', 'PENDING')
        .maybeSingle()

      if (pendingReq || attendance.work_status === 'LOGOUT_REQUESTED') {
        alert("Your logout request is currently pending. Please wait for your department to approve it.")
      } else {
        // Active session → must submit work
        setShowModal(true)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar title="Employee Portal" links={links} onLogoutClick={handleLogoutIntercept} />
      
      <div className="md:pl-64 pt-16 md:pt-0 flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>

      <WorkSubmissionModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
