"use client"

import { useState, useEffect } from "react"
import { BirthdayPerson } from "@/app/actions/birthday"
import { X, Gift } from "lucide-react"

interface BirthdayCelebrationProps {
  currentUserId: string
  birthdays: BirthdayPerson[]
}

export function BirthdayCelebration({ currentUserId, birthdays }: BirthdayCelebrationProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    if (!currentUserId || birthdays.length === 0) return

    // Find if current user has a birthday today
    const birthdayUser = birthdays.find(b => b.id === currentUserId)
    if (!birthdayUser) return

    setUserName(birthdayUser.name)

    // Get today's date string in IST format (YYYY-MM-DD)
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayISTStr = new Date(now.getTime() + istOffset).toISOString().split('T')[0]

    const storageKey = `birthday_banner_shown_${currentUserId}_${todayISTStr}`
    const alreadyShown = localStorage.getItem(storageKey)

    if (!alreadyShown) {
      setShowBanner(true)
    }
  }, [currentUserId, birthdays])

  const handleDismiss = () => {
    if (!currentUserId) return
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayISTStr = new Date(now.getTime() + istOffset).toISOString().split('T')[0]

    const storageKey = `birthday_banner_shown_${currentUserId}_${todayISTStr}`
    localStorage.setItem(storageKey, "true")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden select-none">
      
      {/*Confetti & Balloons Animations Background using CSS only */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating Balloon 1 */}
        <div className="absolute bottom-[-100px] left-[10%] w-12 h-16 bg-red-400 rounded-full opacity-60 animate-[floatUp_8s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}>
          <div className="w-0.5 h-10 bg-slate-300 mx-auto mt-16" />
        </div>
        {/* Floating Balloon 2 */}
        <div className="absolute bottom-[-100px] left-[30%] w-14 h-18 bg-blue-400 rounded-full opacity-60 animate-[floatUp_10s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}>
          <div className="w-0.5 h-12 bg-slate-300 mx-auto mt-18" />
        </div>
        {/* Floating Balloon 3 */}
        <div className="absolute bottom-[-100px] right-[20%] w-10 h-14 bg-emerald-400 rounded-full opacity-60 animate-[floatUp_9s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}>
          <div className="w-0.5 h-8 bg-slate-300 mx-auto mt-14" />
        </div>
        {/* Floating Balloon 4 */}
        <div className="absolute bottom-[-100px] right-[40%] w-12 h-16 bg-purple-400 rounded-full opacity-60 animate-[floatUp_11s_ease-in-out_infinite]" style={{ animationDelay: '3s' }}>
          <div className="w-0.5 h-10 bg-slate-300 mx-auto mt-16" />
        </div>

        {/* Confetti streams */}
        <div className="absolute top-0 left-[20%] w-2 h-2 bg-yellow-400 rotate-45 animate-[fall_5s_linear_infinite]" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-0 left-[40%] w-3 h-1.5 bg-pink-400 rounded-full animate-[fall_7s_linear_infinite]" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-0 left-[60%] w-2 h-2.5 bg-blue-400 animate-[fall_6s_linear_infinite]" style={{ animationDelay: '0s' }} />
        <div className="absolute top-0 right-[20%] w-1.5 h-3 bg-green-400 rotate-12 animate-[fall_8s_linear_infinite]" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-0 right-[40%] w-2.5 h-2.5 bg-orange-400 animate-[fall_6.5s_linear_infinite]" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Banner Card */}
      <div className="relative w-full max-w-[480px] bg-white rounded-[32px] shadow-[0_24px_70px_rgba(0,10,60,0.15)] border border-slate-100 p-8 flex flex-col items-center text-center animate-[popIn_0.4s_ease-out]">
        
        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gift / Birthday Icon */}
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#0066FF] border border-blue-100 flex items-center justify-center mb-6 shadow-sm animate-bounce" style={{ animationDuration: '2s' }}>
          <Gift className="w-8 h-8" />
        </div>

        {/* Birthday Title */}
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1A2F] tracking-tight leading-tight">
          🎉 Happy Birthday,<br />
          <span className="text-[#0066FF]">{userName}</span>!
        </h2>

        {/* Birthday Message */}
        <p className="text-slate-500 text-sm font-semibold leading-relaxed mt-4 px-2">
          Wishing you a fantastic year ahead from the Innovibe Team.
        </p>

        {/* Celebrate Button */}
        <button 
          onClick={handleDismiss}
          className="w-full mt-8 h-[50px] bg-gradient-to-r from-[#2563FF] via-[#2E8BFF] to-[#35F2B5] text-white font-extrabold text-xs rounded-[14px] shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
          Thank you!
        </button>
      </div>

      {/* Inject custom animations */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-110vh) rotate(20deg);
            opacity: 0;
          }
        }
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0.3;
          }
        }
        @keyframes popIn {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
