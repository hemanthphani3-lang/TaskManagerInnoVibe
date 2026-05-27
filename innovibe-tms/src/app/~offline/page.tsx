"use client"

import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">You are offline</h1>
        <p className="text-slate-500">
          It looks like you&apos;ve lost your internet connection. Please check your network settings and try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 w-full bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-3 rounded-xl font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
