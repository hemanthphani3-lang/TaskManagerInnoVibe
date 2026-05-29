"use client"

import React, { useState } from "react"
import { deleteDepartmentAccount } from "@/app/actions/auth"
import { toast } from "sonner"
import { Trash2, Loader2 } from "lucide-react"

interface DeleteDepartmentButtonProps {
  departmentId: string
  departmentName: string
}

export function DeleteDepartmentButton({ departmentId, departmentName }: DeleteDepartmentButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const confirmation = window.confirm(
      `🚨 WARNING: Are you absolutely sure you want to permanently delete the department "${departmentName}"?\n\nThis will permanently delete the department, ALL tasks assigned to it, ALL employees inside this department (and delete their Supabase Auth user accounts), and delete the Department Head auth account. This action CANNOT be undone.`
    )
    
    if (!confirmation) return

    setLoading(true)
    try {
      const res = await deleteDepartmentAccount(departmentId)
      if (res.success) {
        toast.success(`Department "${departmentName}" has been successfully deleted from the organization.`)
        // Force refresh
        window.location.reload()
      } else {
        toast.error(res.error || "Failed to delete department account.")
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
      className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 hover:border-red-200 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:pointer-events-none w-full justify-center mt-3"
      title={`Delete ${departmentName} from the organization`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      <span>Delete Department</span>
    </button>
  )
}
