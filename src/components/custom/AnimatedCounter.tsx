"use client"

import CountUp from "@/components/ui/CountUp"

interface AnimatedCounterProps {
  value: number | string
  duration?: number
}

export function AnimatedCounter({ value, duration = 1.2 }: AnimatedCounterProps) {
  // Extract number and suffix safely
  const numericString = String(value).replace(/[^0-9.]/g, "")
  const numericValue = numericString ? parseFloat(numericString) : NaN
  const suffix = typeof value === "string" ? value.replace(/[0-9.]/g, "") : ""

  if (isNaN(numericValue)) {
    return <span>{value}</span>
  }

  return (
    <span>
      <CountUp to={numericValue} duration={duration} />
      {suffix}
    </span>
  )
}
