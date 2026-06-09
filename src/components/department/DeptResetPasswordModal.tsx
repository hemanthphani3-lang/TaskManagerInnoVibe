"use client"

import { useState } from "react"
import { Lock, Loader2, X } from "lucide-react"
import { deptResetEmployeePassword } from "@/app/actions/employees"
import { toast } from "sonner"

interface DeptResetPasswordModalProps {
  userId: string
  userName: string
  onClose: () => void
}

export function DeptResetPasswordModal({ userId, userName, onClose }: DeptResetPasswordModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    const result = await deptResetEmployeePassword(userId, newPassword)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      toast.success("Employee password updated successfully.")
      setTimeout(() => onClose(), 2000)
    } else {
      setError(result.error || "Failed to reset password")
      toast.error(result.error || "Failed to reset password")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900">Reset Password</h2>
              <p className="text-xs text-slate-500">Assign temporary password for {userName}</p>
            </div>
          </div>

          {success ? (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold border border-emerald-200/50 text-sm text-center">
              Password was successfully updated!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-650 text-xs rounded-lg border border-red-150 font-semibold">{error}</div>}
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-semibold placeholder-slate-400"
                  placeholder="Enter new password (min 6 chars)"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-indigo-600/10 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Change Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
