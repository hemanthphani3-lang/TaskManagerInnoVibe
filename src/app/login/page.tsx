"use client"
export const dynamic = 'force-dynamic'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Building2, User, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react"
import Image from "next/image"

type Role = 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE'

const roles = [
  {
    id: 'ADMIN' as Role,
    label: 'Admin',
    icon: Shield,
    color: 'text-blue-600',
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    ring: 'ring-blue-500/20',
    hover: 'hover:border-blue-300',
  },
  {
    id: 'DEPARTMENT' as Role,
    label: 'Department',
    icon: Building2,
    color: 'text-emerald-600',
    border: 'border-emerald-500',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-500/20',
    hover: 'hover:border-emerald-300',
  },
  {
    id: 'EMPLOYEE' as Role,
    label: 'Employee',
    icon: User,
    color: 'text-purple-600',
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    ring: 'ring-purple-500/20',
    hover: 'hover:border-purple-300',
  },
]

const errorMessages: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password. Please try again.',
  'Email not confirmed': 'Your email has not been confirmed. Contact HR.',
  'default': 'Login failed. Please check your credentials.',
}

function getRoleTable(role: Role): string {
  if (role === 'ADMIN') return 'admins'
  if (role === 'DEPARTMENT') return 'departments'
  return 'employees'
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('ADMIN')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setLoading(true)
    setError(null)

    try {
      // Step 1: Sign in with Supabase Auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !authData?.user) {
        const msg = signInError?.message || 'default'
        setError(errorMessages[msg] || errorMessages['default'])
        setLoading(false)
        return
      }

      const userId = authData.user.id

      // Step 2: Verify the user exists in the selected role's table
      const tableName = getRoleTable(selectedRole)
      const { data: roleData, error: roleError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', userId)
        .single()

      if (roleError || !roleData) {
        // User exists in auth but NOT in the selected role table → wrong portal
        await supabase.auth.signOut()
        setError(`You are not registered as a ${selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}. Please select the correct portal.`)
        setLoading(false)
        return
      }

      // Step 3: Route to the correct dashboard
      if (selectedRole === 'ADMIN') {
        router.push('/admin/dashboard')
      } else if (selectedRole === 'DEPARTMENT') {
        router.push('/department/dashboard')
      } else {
        router.push('/employee/identity-check')
      }

      router.refresh()
    } catch (err: any) {
      console.error("Login request error:", err)
      const errMsg = err?.message || String(err)
      if (errMsg.includes("Failed to fetch") || errMsg.includes("fetch")) {
        setError("Network Connection Failed: Could not reach the authentication server. Please check your internet connection or disable any Adblockers / Brave Shields that might be blocking requests to 'supabase.co'.")
      } else {
        setError(errMsg || "An unexpected error occurred. Please try again.")
      }
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!email.trim()) {
      setError("Please enter your Corporate Email ID first, then click Forgot Password again.")
      return
    }

    try {
      setLoading(true)
      // Call the server action to notify the admin
      const { sendForgotPasswordRequest } = await import("@/app/actions/auth")
      const res = await sendForgotPasswordRequest(email)
      
      if (res.success) {
        setSuccessMsg("Request is sent to the admin, Please contact for the password.")
        alert("Request is sent to the admin, Please contact for the password.")
      } else {
        setError(res.error || "Failed to notify the admin. Please try again.")
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred. Please contact the administrator.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center relative font-sans overflow-hidden"
      style={{ backgroundImage: "url('/bg-login.png')" }}
    >
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-white rounded-[20px] shadow-2xl p-6 sm:p-8 border border-slate-100">

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="InnoVibe Logo" width={160} height={48} className="h-10 sm:h-12 w-auto object-contain" />
          </div>

          {/* Header */}
          <div className="text-center mb-5">
            <h1 className="text-[20px] font-bold text-slate-800 tracking-tight">InnoVibe Operations Portal</h1>
            <p className="text-slate-500 text-[12px] mt-1 font-medium">Sign in using your official workspace credentials.</p>
            <div className="w-8 h-0.5 bg-blue-500 mx-auto mt-3 rounded-full" />
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
            {roles.map((r) => {
              const Icon = r.icon
              const isSelected = selectedRole === r.id
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setSelectedRole(r.id); setError(null) }}
                  className={`flex flex-col items-center justify-center py-2 sm:py-3 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? `${r.border} ${r.bg} ring-2 ${r.ring} shadow-sm`
                      : `border-slate-200 ${r.hover} hover:bg-slate-50`
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-1.5 transition-colors ${isSelected ? r.color : 'text-slate-400'}`}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                  />
                  <span className={`text-[11px] sm:text-xs font-semibold transition-colors ${isSelected ? r.color : 'text-slate-400'}`}>
                    {r.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-2.5 text-[12px] text-red-600 bg-red-50 rounded-lg border border-red-100 text-center font-medium">
                    {error}
                  </div>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-2.5 text-[12px] text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100 text-center font-semibold leading-relaxed">
                    {successMsg}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-slate-700">Corporate Email ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-slate-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium tracking-wide"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer appearance-none checked:bg-blue-600 checked:border-blue-600 border-2 transition-all peer"
                  />
                  <svg className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                    <path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
                  </svg>
                </div>
                <span className="text-[12px] font-medium text-slate-600 group-hover:text-slate-800 transition-colors">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors bg-transparent border-none cursor-pointer p-0 outline-none"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full bg-[#0D5EF4] hover:bg-[#0B4FD3] text-white font-semibold text-[14px] py-2.5 sm:py-3 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <div className="bg-white px-2">
                <ShieldCheck className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-500">
              Access restricted to InnoVibe Employees only.<br />
              Contact HR for assistance.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
