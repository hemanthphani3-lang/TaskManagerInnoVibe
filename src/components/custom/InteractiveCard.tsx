"use client"

import React, { useRef, useState } from "react"
import { motion, useMotionValue, useSpring, useTransform, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface InteractiveCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  enableTilt?: boolean
}

export function InteractiveCard({ 
  children, 
  className, 
  enableTilt = true,
  ...props 
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Track relative coordinates
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  
  // Motion values for normalized mouse positions (-0.5 to 0.5)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Spring configurations for smooth tilting
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 25 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 25 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setCoords({ x, y })
    
    if (enableTilt) {
      const normalizedX = (x / rect.width) - 0.5
      const normalizedY = (y / rect.height) - 0.5
      mouseX.set(normalizedX)
      mouseY.set(normalizedY)
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: enableTilt ? rotateX : 0,
        rotateY: enableTilt ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 1000
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-100 bg-white/90 dark:bg-slate-900/90 dark:border-slate-800 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20 group/glow",
        className
      )}
      {...props}
    >
      {/* Subtle radial cursor reflection overlay */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px -z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(150px circle at ${coords.x}px ${coords.y}px, rgba(0, 102, 255, 0.08), transparent 80%)`
          }}
        />
      )}
      
      {/* Light border reflection glow */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-[1px] -z-20 rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(120px circle at ${coords.x}px ${coords.y}px, rgba(0, 102, 255, 0.25), transparent 70%)`
          }}
        />
      )}

      {/* Tilt parallax depth wrapper */}
      <div 
        style={{ 
          transform: enableTilt && isHovered ? "translateZ(6px)" : "translateZ(0px)",
          transition: "transform 0.2s ease",
          transformStyle: "preserve-3d"
        }}
        className="w-full h-full"
      >
        {children}
      </div>
    </motion.div>
  )
}
