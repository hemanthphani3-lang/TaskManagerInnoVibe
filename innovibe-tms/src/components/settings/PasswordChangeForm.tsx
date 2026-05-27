"use client"

import { useState } from "react"
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { updateSelfPassword } from "@/app/actions/settings"

export function PasswordChangeForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    const result = await updateSelfPassword(newPassword)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setError(result.error || "Failed to update password.")
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">Change Password</h2>
          <p className="text-sm text-slate-500">Update your account password securely.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800/50">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Password successfully updated!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all dark:text-white"
              placeholder="••••••••"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
          <input 
            type={showPassword ? "text" : "password"} 
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full pl-4 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] outline-none transition-all dark:text-white"
            placeholder="••••••••"
            required
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit"
            disabled={loading}
            className="flex items-center justify-center w-full sm:w-auto px-6 py-2.5 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  )
}
