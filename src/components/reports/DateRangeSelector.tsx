"use client"

import { Calendar as CalendarIcon, AlertCircle } from "lucide-react"

export type DateRangeType = "7D" | "30D" | "CUSTOM" | "SPECIFIC"

interface DateRangeSelectorProps {
  dateRange: DateRangeType
  setDateRange: (range: DateRangeType) => void
  startDate: string
  setStartDate: (date: string) => void
  endDate: string
  setEndDate: (date: string) => void
  validationError: string
  setValidationError: (error: string) => void
  disabled?: boolean
}

export function DateRangeSelector({
  dateRange,
  setDateRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  validationError,
  setValidationError,
  disabled = false
}: DateRangeSelectorProps) {
  const todayStr = new Date().toISOString().split("T")[0]

  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    setValidationError("")
    if (endDate && val > endDate) {
      setValidationError("Start date cannot be after end date")
    }
  }

  const handleEndDateChange = (val: string) => {
    setEndDate(val)
    setValidationError("")
    if (startDate && val < startDate) {
      setValidationError("End date cannot be before start date")
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date Range</label>
      
      {/* Option Buttons */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDateRange("7D")
            setValidationError("")
          }}
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
            dateRange === "7D"
              ? "border-[#0066FF] bg-blue-50/50 text-[#0066FF] dark:bg-[#0066FF]/10"
              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-sm font-bold block">Last 7 Days</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDateRange("30D")
            setValidationError("")
          }}
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
            dateRange === "30D"
              ? "border-[#0066FF] bg-blue-50/50 text-[#0066FF] dark:bg-[#0066FF]/10"
              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-sm font-bold block">Last 30 Days</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDateRange("SPECIFIC")
            setValidationError("")
            // Reset to today initially
            setStartDate(todayStr)
            setEndDate(todayStr)
          }}
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
            dateRange === "SPECIFIC"
              ? "border-[#0066FF] bg-blue-50/50 text-[#0066FF] dark:bg-[#0066FF]/10"
              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-sm font-bold block">Specific Date</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDateRange("CUSTOM")
            setValidationError("")
            setStartDate("")
            setEndDate("")
          }}
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
            dateRange === "CUSTOM"
              ? "border-[#0066FF] bg-blue-50/50 text-[#0066FF] dark:bg-[#0066FF]/10"
              : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-sm font-bold block">Custom Range</span>
        </button>
      </div>

      {/* Specific Date Picker Input */}
      {dateRange === "SPECIFIC" && (
        <div className="pt-2 space-y-3 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Date</span>
            <div className="relative">
              <input
                type="date"
                max={todayStr}
                disabled={disabled}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setEndDate(e.target.value)
                  setValidationError("")
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all text-sm font-semibold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Picker Inputs */}
      {dateRange === "CUSTOM" && (
        <div className="pt-2 space-y-3 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2">
          {/* Start Date */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</span>
            <div className="relative">
              <input
                type="date"
                max={todayStr}
                disabled={disabled}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all text-sm font-semibold"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</span>
            <div className="relative">
              <input
                type="date"
                max={todayStr}
                disabled={disabled}
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all text-sm font-semibold"
              />
            </div>
          </div>

          {/* ValidationError Message */}
          {validationError && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-950/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
