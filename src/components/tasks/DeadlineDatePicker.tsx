"use client"

import React, { useRef } from "react"
import { toast } from "sonner"

interface DeadlineDatePickerProps {
  name?: string
  id?: string
  required?: boolean
  className?: string
  value?: string
  onChange?: (val: string) => void
  defaultValue?: string
}

export function DeadlineDatePicker({ name = "due_date", id = "due_date", required = true, className = "", value, onChange, defaultValue = "" }: DeadlineDatePickerProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)
  
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  return (
    <input 
      ref={dateInputRef}
      type="date"
      id={id}
      name={name}
      required={required}
      min={todayStr}
      value={value}
      defaultValue={value !== undefined ? undefined : defaultValue}
      onChange={(e) => {
        const selectedDate = e.target.value
        if (selectedDate && selectedDate < todayStr) {
          toast.error("Back-date selection is blocked. Please select today or a future date.")
          e.target.value = ""
          if (onChange) onChange("")
        } else {
          if (onChange) onChange(selectedDate)
        }
      }}
      className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm ${className}`}
    />
  )
}
