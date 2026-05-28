"use client"

import { useState } from "react"
import { KeyRound } from "lucide-react"
import { AdminResetPasswordModal } from "./AdminResetPasswordModal"

interface ResetPasswordButtonProps {
  userId: string
  userName: string
}

export function ResetPasswordButton({ userId, userName }: ResetPasswordButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={(e) => {
          e.preventDefault()
          setIsOpen(true)
        }}
        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Reset Password"
      >
        <KeyRound className="w-4 h-4" />
      </button>

      {isOpen && (
        <AdminResetPasswordModal 
          userId={userId}
          userName={userName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
