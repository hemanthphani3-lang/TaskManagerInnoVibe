"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/custom/Sidebar"
import { WorkSubmissionModal } from "@/components/employee/WorkSubmissionModal"
import { BeforeUnloadPrompt } from "@/components/custom/BeforeUnloadPrompt"

import { PageTransition } from "@/components/custom/PageTransition"

export function EmployeeSessionManager({ children, links }: { children: React.ReactNode; links: { label: string; href: string; iconName: string; badgeCount?: number }[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCheckedIn, setIsCheckedIn] = useState(false)

  useEffect(() => {
    // Listen for backend forceful logout when department approves the request
    let subscription: import('@supabase/supabase-js').RealtimeChannel
    let pollInterval: NodeJS.Timeout | null = null

    const checkLogoutApproved = async (userId: string) => {
      const { data: empData } = await supabase
        .from('employees')
        .select('account_status')
        .eq('id', userId)
        .maybeSingle()

      if (empData?.account_status === 'Inactive' || empData?.account_status === 'INACTIVE') {
        return
      }

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

      setIsCheckedIn(data?.work_status === 'ACTIVE')

      if (data?.work_status === 'LOGGED_OUT') {
        if (typeof window !== "undefined") {
          (window as any).__isLoggingOut = true
        }
        router.push('/employee/identity-check')
        router.refresh()
      }
    }

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await checkLogoutApproved(user.id)

      // Use a unique channel name to prevent Strict Mode race conditions
      const channelName = `employee_session_${user.id}_${Date.now()}`
      subscription = supabase.channel(channelName)
         .on('postgres_changes', {
           event: 'UPDATE',
           schema: 'public',
           table: 'attendance',
           filter: `employee_id=eq.${user.id}`
         }, async (payload: { new: { work_status?: string } }) => {
           const { data: empData } = await supabase
             .from('employees')
             .select('account_status')
             .eq('id', user.id)
             .maybeSingle()

           if (empData?.account_status === 'Inactive' || empData?.account_status === 'INACTIVE') {
             return
           }

           if (payload.new.work_status === 'LOGGED_OUT') {
             if (typeof window !== "undefined") {
               (window as any).__isLoggingOut = true
             }
             router.push('/employee/identity-check')
             router.refresh()
           } else if (payload.new.work_status === 'ACTIVE') {
             setIsCheckedIn(true)
           } else {
             setIsCheckedIn(false)
           }
         })
         .subscribe()

      // Polling fallback: check every 10 seconds for approval / status
      pollInterval = setInterval(() => checkLogoutApproved(user.id), 10000)
    }

    setupRealtime()
    return () => {
      if (subscription) supabase.removeChannel(subscription)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [router])

  const handleLogoutClick = async () => {
    if (isCheckedIn) {
      setIsModalOpen(true)
    } else {
      if (typeof window !== "undefined") {
        (window as any).__isLoggingOut = true
      }
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <BeforeUnloadPrompt enabled={isCheckedIn} />
      <Sidebar 
        title="Employee Portal" 
        links={links} 
        onLogoutClick={handleLogoutClick}
        floating={true}
      />
      
      <div className="md:pl-[272px] md:pr-4 md:py-4 pt-16 pb-20 md:pb-0 md:pt-0 flex flex-col min-h-screen md:h-screen md:overflow-hidden transition-all duration-300">
        <main className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      <WorkSubmissionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

