"use client"

import { useEffect, useState } from "react"
import { animate } from "framer-motion"

interface AnimatedCounterProps {
  value: number | string
  duration?: number
}

export function AnimatedCounter({ value, duration = 1.2 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  
  // Extract number and suffix safely
  const numericString = String(value).replace(/[^0-9.]/g, "")
  const numericValue = numericString ? parseFloat(numericString) : NaN
  const hasSuffix = typeof value === "string" && isNaN(Number(value))
  const suffix = typeof value === "string" ? value.replace(/[0-9.]/g, "") : ""

  useEffect(() => {
    if (isNaN(numericValue)) {
      return
    }

    const controls = animate(0, numericValue, {
      duration: duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.floor(latest))
      }
    })

    return () => controls.stop()
  }, [numericValue, duration])

  if (isNaN(numericValue)) {
    return <span>{value}</span>
  }

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  )
}
