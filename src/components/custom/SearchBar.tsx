"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState, useEffect } from "react"

interface SearchBarProps {
  placeholder?: string
  onSearch: (value: string) => void
}

export function SearchBar({ placeholder = "Search...", onSearch }: SearchBarProps) {
  const [value, setValue] = useState("")

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value)
    }, 300)
    return () => clearTimeout(handler)
  }, [value, onSearch])

  return (
    <div className="relative max-w-sm w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-slate-400" />
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 bg-white border-slate-200 focus-visible:ring-[#0066FF] shadow-sm rounded-xl"
      />
    </div>
  )
}
