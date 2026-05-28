"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { WorkSubmissionModal } from "./WorkSubmissionModal"

export function StatusActions() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="mt-4 md:mt-0 shrink-0">
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-red-500/20 transition-all active:scale-[0.98] text-sm cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Submit Work & Logout
      </button>

      <WorkSubmissionModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
