"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, Unlock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"

export function DashboardLockScreen({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    // 1. Check if we just checked in or verified in this browser session
    const isVerified = sessionStorage.getItem("dashboard_verified") === "true"
    const justCheckedIn = sessionStorage.getItem("just_checked_in") === "true"
    
    // 2. Check navigation type: was this page loaded directly / refreshed?
    let isDirectNav = false
    try {
      const navigationEntries = performance.getEntriesByType("navigation")
      if (navigationEntries.length > 0) {
        const navType = (navigationEntries[0] as PerformanceNavigationTiming).type
        isDirectNav = navType === "navigate" || navType === "reload"
      }
    } catch (e) {
      console.warn("Performance Navigation Timing API not fully supported:", e)
      isDirectNav = true // fallback to secure by default
    }

    // 3. Determine lock status
    if (justCheckedIn) {
      // Just checked in via the identity page -> automatically verified
      sessionStorage.setItem("dashboard_verified", "true")
      sessionStorage.removeItem("just_checked_in")
      setIsLocked(false)
    } else if (isVerified && !isDirectNav) {
      // Already verified and reached via internal SPA transition -> no lock
      setIsLocked(false)
    } else {
      // Direct URL entry, page refresh, or unverified -> lock
      setIsLocked(true)
      
      // Fetch user's email for password challenge
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setEmail(data.user.email)
        }
      })
    }
  }, [supabase])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Unable to retrieve user credentials. Please try logging in again.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Challenge the password by attempting to sign in using current user's email
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError("Invalid password. Please try again.")
        setLoading(false)
        return
      }

      // Success! Set the verified token
      sessionStorage.setItem("dashboard_verified", "true")
      setIsLocked(false)
    } catch (err: any) {
      setError(err?.message || "An unexpected verification error occurred.")
      setLoading(false)
    }
  }

  // Prevent flash of content during initial mount check
  if (isLocked === null) {
    return (
      <div className="min-h-screen bg-[#0A1128] flex items-center justify-center flex-col">
        <Loader2 className="w-10 h-10 text-[#0066FF] animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">Securing session...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Actual Dashboard Content */}
      <div className={isLocked ? "filter blur-md pointer-events-none select-none transition-all duration-500" : "transition-all duration-500"}>
        {children}
      </div>

      {/* Lock Screen Overlay */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 bg-[#070D1E]/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-[400px] bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Top Accent Light */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Lock Icon Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-blue-950/40 border border-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/5">
                  <Lock className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Dashboard Locked</h2>
                <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed px-4">
                  For your security, please confirm your password to access confidential workspace metrics.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleUnlock} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded-xl flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Email Indicator (Disabled) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Email</label>
                  <input
                    type="text"
                    disabled
                    value={email || "Loading..."}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-mono focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enter Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-white placeholder-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-sm py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 disabled:opacity-75 disabled:cursor-not-allowed active:scale-98"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Verify & Unlock</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
