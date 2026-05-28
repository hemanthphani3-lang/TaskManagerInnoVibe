"use client"

import React, { useState } from "react"
import { deleteEmployeeAccount } from "@/app/actions/auth"
import { toast } from "sonner"
import { Trash2, Loader2 } from "lucide-react"

interface DeleteEmployeeButtonProps {
  userId: string
  userName: string
}

export function DeleteEmployeeButton({ userId, userName }: DeleteEmployeeButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const confirmation = window.confirm(
      `🚨 WARNING: Are you absolutely sure you want to permanently delete the employee profile for "${userName}"?\n\nThis will completely remove their company directory profile, all attendance records, and delete their Supabase Auth user account. This action CANNOT be undone.`
    )
    
    if (!confirmation) return

    setLoading(true)
    try {
      const res = await deleteEmployeeAccount(userId)
      if (res.success) {
        toast.success(`Employee "${userName}" and their account have been successfully deleted from the organization.`)
        // Force refresh to update the admin workforce listing
        window.location.reload()
      } else {
        toast.error(res.error || "Failed to delete employee account.")
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during deletion.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-red-100 hover:border-red-200 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
      title={`Delete ${userName} from the organization`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      <span>Delete</span>
    </button>
  )
}
