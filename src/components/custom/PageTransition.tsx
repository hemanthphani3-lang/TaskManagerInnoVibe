"use client"

import React from "react"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
      className="w-full h-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  )
}
