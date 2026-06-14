"use client"
export const dynamic = 'force-dynamic'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Building2, User, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react"

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
        router.push('/employee/dashboard')
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-[#F3F5F9] to-[#E8ECF5] font-sans">
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[1150px] relative z-10"
      >
        {/* Main Split Card */}
        <div className="w-full bg-white rounded-[32px] shadow-[0_24px_70px_rgba(0,10,60,0.08)] border border-white/80 overflow-hidden flex flex-col md:flex-row transition-all duration-300">
          
          {/* Left Branding Panel (45%) */}
          <div className="relative md:w-[45%] overflow-hidden shrink-0 hidden md:block">
            <img
              src="/left-branding.png"
              alt="InnoVibe Care.EV"
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          </div>

          {/* Right Login Panel (55%) */}
          <div className="w-full md:w-[55%] bg-white p-8 md:p-16 flex flex-col justify-between shrink-0">
            
            {/* Header / Welcome */}
            <div>
              <h2 className="text-3xl md:text-[34px] font-black text-[#0F172A] tracking-tight leading-none mb-3">
                Welcome <span className="text-[#2563FF]">back!</span>
              </h2>
              <div className="h-[3.5px] w-14 bg-gradient-to-r from-[#2563FF] to-[#35F2B5] rounded-full mb-4" />
              <p className="text-[#64748B] text-sm font-medium">
                Sign in to access your InnoVibe Operations Portal
              </p>
            </div>

            {/* Role Tabs - Segmented Capsule Selector */}
            <div className="mt-8 bg-[#F8FAFC] p-1.5 rounded-2xl border border-slate-100 flex gap-1">
              {roles.map((r) => {
                const Icon = r.icon
                const isSelected = selectedRole === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedRole(r.id); setError(null) }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 ${
                      isSelected
                        ? "bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-slate-100/50"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                    suppressHydrationWarning
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? r.color : 'text-slate-400'}`} />
                    <span>{r.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleLogin} className="space-y-6 mt-8">
              
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 text-xs text-red-600 bg-red-50 rounded-xl border border-red-100 text-center font-semibold leading-relaxed shadow-sm">
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
                    <div className="p-3 text-xs text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 text-center font-bold leading-relaxed shadow-sm">
                      {successMsg}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Corporate Email Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">Corporate Email ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 h-[60px] bg-white border border-[#E2E8F0] rounded-[16px] text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#2563FF] focus:ring-4 focus:ring-[#2563FF]/8 transition-all"
                    placeholder="name@company.com"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 h-[60px] bg-white border border-[#E2E8F0] rounded-[16px] text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#2563FF] focus:ring-4 focus:ring-[#2563FF]/8 transition-all tracking-wide"
                    placeholder="Enter your password"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    suppressHydrationWarning
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot Row */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-[18px] h-[18px] rounded-md border-slate-300 cursor-pointer appearance-none checked:bg-[#2563FF] checked:border-[#2563FF] border-2 transition-all peer"
                    />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                      <path d="M3 8L6 11L11 3.5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 transition-colors">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-[#2563FF] hover:text-[#1D4ED8] transition-colors bg-transparent border-none cursor-pointer p-0 outline-none"
                  suppressHydrationWarning
                >
                  Forgot Password?
                </button>
              </div>

              {/* CTA Submit Button */}
              <button
                type="submit"
                id="login-submit"
                disabled={loading}
                className="w-full h-[60px] bg-gradient-to-r from-[#2563FF] via-[#2E8BFF] to-[#35F2B5] text-white font-extrabold text-sm rounded-[16px] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none group"
                suppressHydrationWarning
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>

            </form>

            {/* Separator / OR */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative px-4 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-widest">or</span>
            </div>

            {/* Security Notice Card */}
            <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
              <div className="p-2 bg-[#2563FF]/8 rounded-xl text-[#2563FF] shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Access restricted to InnoVibe Employees only.</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Contact HR for assistance.</p>
              </div>
            </div>

            {/* Bottom Security Footer */}
            <div className="flex items-center justify-center gap-2 text-slate-400 mt-8 select-none text-[11px] font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Your data is <span className="text-[#2563FF] font-black">safe and secure</span> with us.</span>
            </div>

          </div>

        </div>
      </motion.div>
      
    </div>
  )
}
