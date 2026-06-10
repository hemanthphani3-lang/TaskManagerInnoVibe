"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/custom/Sidebar"
import { WorkSubmissionModal } from "@/components/employee/WorkSubmissionModal"
import { BeforeUnloadPrompt } from "@/components/custom/BeforeUnloadPrompt"

import { PageTransition } from "@/components/custom/PageTransition"

interface DepartmentSessionManagerProps {
  children: React.ReactNode
  links: { label: string; href: string; iconName: string; badgeCount?: number }[]
}

export function DepartmentSessionManager({ children, links }: DepartmentSessionManagerProps) {
  const supabase = createClient()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleLogoutClick = () => {
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <BeforeUnloadPrompt enabled={true} />
      
      <Sidebar 
        title="Department" 
        links={links} 
        onLogoutClick={handleLogoutClick}
      />
      
      <div className="md:pl-64 pt-16 md:pt-0 flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 w-full flex flex-col">
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

